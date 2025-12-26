import { useEffect, useState } from 'react';
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
  void _isReady; // Used for future AI model ready indicator
  const [status, setStatus] = useState<CalibrationStatus>({
    bodyInFrame: false,
    goodLighting: false,
    properDistance: false,
    isReady: false,
  });
  const [countdown, setCountdown] = useState<number | null>(null);

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

    // Check if full body is in frame
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

    // Check lighting (based on average confidence)
    const avgConfidence = requiredLandmarks.reduce((sum, idx) => {
      return sum + (keypoints[idx]?.visibility ?? 0);
    }, 0) / requiredLandmarks.length;

    const goodLighting = avgConfidence > 0.6;

    // Check distance (based on body size in frame)
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

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Calibration overlay */}
      <div className="absolute inset-0 border-4 border-dashed border-gray-600 m-8 rounded-xl" />

      {/* Status panel */}
      <div className="bg-black/80 rounded-xl p-6 pointer-events-auto max-w-sm">
        <h3 className="text-xl font-semibold text-white mb-4 text-center">
          Position Check
        </h3>

        <div className="space-y-3 mb-6">
          <StatusItem
            label="Full body in frame"
            isOk={status.bodyInFrame}
            hint="Step back so your full body is visible"
          />
          <StatusItem
            label="Good lighting"
            isOk={status.goodLighting}
            hint="Move to a brighter area"
          />
          <StatusItem
            label="Proper distance"
            isOk={status.properDistance}
            hint="Adjust your distance from camera"
          />
        </div>

        {countdown !== null ? (
          <div className="text-center">
            <div className="text-6xl font-bold text-green-400 mb-2">
              {countdown}
            </div>
            <p className="text-gray-400">Starting session...</p>
          </div>
        ) : (
          <div className="text-center">
            {status.isReady ? (
              <p className="text-green-400">All checks passed!</p>
            ) : (
              <p className="text-gray-400">Adjust your position</p>
            )}
          </div>
        )}

        <button
          onClick={onBack}
          className="mt-6 w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
        >
          Back to Setup
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
    <div className="flex items-start gap-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          isOk ? 'bg-green-500' : 'bg-gray-600'
        }`}
      >
        {isOk ? (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
          </svg>
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${isOk ? 'text-green-400' : 'text-gray-300'}`}>
          {label}
        </p>
        {!isOk && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  );
}
