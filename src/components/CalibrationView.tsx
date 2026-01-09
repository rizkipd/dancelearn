import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keypoint, CalibrationStatus } from '../types/pose';
import { LANDMARKS } from '../engines/PoseNormalizer';

interface CalibrationViewProps {
  keypoints: Keypoint[] | null;
  isReady: boolean;
  onCalibrationComplete: () => void;
  onBack: () => void;
}

export function CalibrationView({
  keypoints,
  isReady: _isReady,
  onCalibrationComplete,
  onBack,
}: CalibrationViewProps) {
  void _isReady; // Reserved for future model ready indicator
  const { t } = useTranslation(['training', 'common']);
  const [status, setStatus] = useState<CalibrationStatus>({
    bodyInFrame: false,
    goodLighting: false,
    properDistance: false,
    isReady: false,
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('[CalibrationView] Keypoints:', keypoints ? `${keypoints.length} landmarks` : 'null');
    console.log('[CalibrationView] isPoseReady:', _isReady);
  }, [keypoints, _isReady]);

  useEffect(() => {
    if (!keypoints) {
      setStatus({
        bodyInFrame: false,
        goodLighting: false,
        properDistance: false,
        isReady: false,
      });
      return;
    }

    const requiredLandmarks = [
      LANDMARKS.LEFT_SHOULDER,
      LANDMARKS.RIGHT_SHOULDER,
      LANDMARKS.LEFT_HIP,
      LANDMARKS.RIGHT_HIP,
      LANDMARKS.LEFT_KNEE,
      LANDMARKS.RIGHT_KNEE,
      LANDMARKS.LEFT_ANKLE,
      LANDMARKS.RIGHT_ANKLE,
    ];

    const visibleLandmarks = requiredLandmarks.filter(idx => {
      const kp = keypoints[idx];
      return kp && (kp.visibility ?? 0) > 0.5;
    });

    const bodyInFrame = visibleLandmarks.length >= 6;

    const avgConfidence = requiredLandmarks.reduce((sum, idx) => {
      return sum + (keypoints[idx]?.visibility ?? 0);
    }, 0) / requiredLandmarks.length;

    const goodLighting = avgConfidence > 0.6;

    const leftHip = keypoints[LANDMARKS.LEFT_HIP];
    const rightHip = keypoints[LANDMARKS.RIGHT_HIP];
    const leftShoulder = keypoints[LANDMARKS.LEFT_SHOULDER];

    let properDistance = false;
    if (leftHip && rightHip && leftShoulder) {
      const torsoHeight = Math.abs(leftShoulder.y - leftHip.y);
      properDistance = torsoHeight > 0.15 && torsoHeight < 0.6;
    }

    const allReady = bodyInFrame && goodLighting && properDistance;

    setStatus({
      bodyInFrame,
      goodLighting,
      properDistance,
      isReady: allReady,
    });
  }, [keypoints]);

  useEffect(() => {
    if (status.isReady && countdown === null) {
      setCountdown(3);
    } else if (!status.isReady && countdown !== null) {
      setCountdown(null);
    }
  }, [status.isReady, countdown]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      onCalibrationComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(c => (c !== null ? c - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onCalibrationComplete]);

  const completedChecks = [status.bodyInFrame, status.goodLighting, status.properDistance].filter(Boolean).length;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Calibration frame overlay */}
      <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-white/20 rounded-2xl">
        {/* Corner accents */}
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-purple-500 rounded-tl-xl" />
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-purple-500 rounded-tr-xl" />
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-purple-500 rounded-bl-xl" />
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-purple-500 rounded-br-xl" />
      </div>

      {/* Status panel */}
      <div className="glass-dark rounded-2xl p-6 sm:p-10 pointer-events-auto w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {t('calibration.title')}
          </h3>
          <p className="text-base text-gray-400">
            {t('calibration.checksProgress', { completed: completedChecks })}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedChecks / 3) * 100}%` }}
          />
        </div>

        {/* Status items */}
        <div className="space-y-4 mb-8">
          <StatusItem
            label={t('calibration.checks.bodyVisible')}
            isOk={status.bodyInFrame}
            hint={t('calibration.checks.bodyVisibleHint')}
          />
          <StatusItem
            label={t('calibration.checks.lighting')}
            isOk={status.goodLighting}
            hint={t('calibration.checks.lightingHint')}
          />
          <StatusItem
            label={t('calibration.checks.distance')}
            isOk={status.properDistance}
            hint={t('calibration.checks.distanceHint')}
          />
        </div>

        {/* Countdown or status */}
        {countdown !== null ? (
          <div className="text-center py-4">
            <div className="relative inline-block">
              <div className="text-6xl font-black gradient-text">
                {countdown}
              </div>
              {/* Animated ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * (3 - countdown)) / 3}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="text-gray-400 mt-3 text-sm">{t('calibration.starting')}</p>
          </div>
        ) : (
          <div className="text-center py-2">
            {status.isReady ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{t('calibration.allPassed')}</span>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">{t('calibration.adjustPosition')}</p>
            )}
          </div>
        )}

        {/* Back button */}
        <button
          onClick={onBack}
          className="mt-4 w-full py-3 px-4 btn-secondary rounded-xl text-gray-300 font-medium transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('common:buttons.backToSetup')}
        </button>
      </div>
    </div>
  );
}

function StatusItem({
  label,
  isOk,
  hint,
}: {
  label: string;
  isOk: boolean;
  hint: string;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isOk ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          isOk ? 'bg-emerald-500/20' : 'bg-white/10'
        }`}
      >
        {isOk ? (
          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium ${isOk ? 'text-emerald-400' : 'text-gray-200'}`}>
          {label}
        </p>
        {!isOk && <p className="text-sm text-gray-500 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
