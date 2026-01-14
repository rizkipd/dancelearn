import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CameraPanel } from '../components/CameraPanel';
import { TeacherVideoPanel } from '../components/TeacherVideoPanel';
import { FeedbackOverlay } from '../components/FeedbackOverlay';
import { CalibrationView } from '../components/CalibrationView';
import { SessionReport } from '../components/SessionReport';
import { Header } from '../components/layout/Header';
import { useWebcam } from '../hooks/useWebcam';
import { usePoseEstimation } from '../hooks/usePoseEstimation';
import { normalizePose } from '../engines/PoseNormalizer';
import { compareFrames, SessionScorer } from '../engines/ScoringEngine';
import { ScoreResult, SessionResult, PoseFrame } from '../types/pose';
import { PoseBuffer } from '../utils/PoseBuffer';
import { SEO } from '../components/SEO';

type TrainingState = 'calibration' | 'training' | 'report';

export function TrainingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['training', 'common']);
  const { teacherVideoUrl, options: initialOptions } = location.state || {};

  // Redirect if no video
  useEffect(() => {
    if (!teacherVideoUrl) {
      navigate('/');
    }
  }, [teacherVideoUrl, navigate]);

  const [trainingState, setTrainingState] = useState<TrainingState>('calibration');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScore, setCurrentScore] = useState<ScoreResult | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [teacherPose, setTeacherPose] = useState<PoseFrame | null>(null);
  const [dancerPose, setDancerPose] = useState<PoseFrame | null>(null);
  const [options] = useState(initialOptions || { mirrored: true, showSkeleton: false });
  const [playbackRate, setPlaybackRate] = useState(1);

  const sessionScorerRef = useRef(new SessionScorer());
  const teacherVideoRef = useRef<HTMLVideoElement>(null);
  const dancerPoseBuffer = useRef(new PoseBuffer(60)); // Store last 2 seconds of poses
  const sessionStartTimeRef = useRef<number>(0);
  const lastTeacherPoseRef = useRef<PoseFrame | null>(null);

  const {
    videoRef: webcamRef,
    isActive: isCameraActive,
    start: startCamera,
    stop: stopCamera,
  } = useWebcam({ mirrored: options.mirrored });

  const {
    isLoading: isPoseLoading,
    isReady: isPoseReady,
    error: poseError,
    stopProcessing: stopDancerProcessing,
    processFrame,
  } = usePoseEstimation({
    onPoseDetected: (pose, source) => {
      if (source === 'dancer') {
        dancerPoseBuffer.current.push(pose);
        setDancerPose(pose);
      } else {
        lastTeacherPoseRef.current = pose;
        setTeacherPose(pose);
      }
    },
  });

  // Debug logging
  useEffect(() => {
    console.log('[TrainingPage] Pose status:', {
      isLoading: isPoseLoading,
      isReady: isPoseReady,
      error: poseError,
      isCameraActive,
      trainingState,
      dancerPose: dancerPose ? 'detected' : 'null',
    });
  }, [isPoseLoading, isPoseReady, poseError, isCameraActive, trainingState, dancerPose]);

  // Start camera on mount
  useEffect(() => {
    if (teacherVideoUrl) {
      startCamera().catch(console.error);
    }
    return () => {
      stopCamera();
      stopDancerProcessing();
    };
  }, [teacherVideoUrl, startCamera, stopCamera, stopDancerProcessing]);

  // Training pose processing
  useEffect(() => {
    if (trainingState !== 'training' || !isPlaying || !isPoseReady) return;

    let animationId: number;
    let lastDancerTime = 0;
    let lastTeacherTime = 0;
    const dancerInterval = 1000 / 60;
    const teacherInterval = 1000 / 30;

    const processLoop = async (timestamp: number) => {
      if (timestamp - lastDancerTime >= dancerInterval && webcamRef.current) {
        if (webcamRef.current.readyState >= 2 && webcamRef.current.videoWidth > 0) {
          await processFrame(webcamRef.current, 'dancer');
        }
        lastDancerTime = timestamp;
      }

      if (timestamp - lastTeacherTime >= teacherInterval && teacherVideoRef.current) {
        if (teacherVideoRef.current.readyState >= 2 &&
            teacherVideoRef.current.videoWidth > 0 &&
            !teacherVideoRef.current.paused) {
          await processFrame(teacherVideoRef.current, 'teacher');
        }
        lastTeacherTime = timestamp;
      }

      animationId = requestAnimationFrame(processLoop);
    };

    animationId = requestAnimationFrame(processLoop);
    return () => cancelAnimationFrame(animationId);
  }, [trainingState, isPlaying, isPoseReady, processFrame, webcamRef]);

  // Score comparison - 50ms interval for 20 FPS feedback
  useEffect(() => {
    if (trainingState !== 'training' || !isPlaying) return;

    const compareInterval = setInterval(() => {
      const latestDancerPose = dancerPoseBuffer.current.getLatest();
      const tPose = lastTeacherPoseRef.current;
      if (latestDancerPose && tPose) {
        const dancerNormalized = normalizePose(latestDancerPose.keypoints, options.mirrored);
        const teacherNormalized = normalizePose(tPose.keypoints);

        // Get video timestamp
        const videoTimeMs = teacherVideoRef.current
          ? teacherVideoRef.current.currentTime * 1000
          : performance.now() - sessionStartTimeRef.current;

        // Compare dancer pose with current teacher pose (real-time comparison)
        const score = compareFrames(dancerNormalized, teacherNormalized);
        setCurrentScore(score);
        sessionScorerRef.current.addScore(videoTimeMs, score);
      }
    }, 50); // Changed from 150ms to 50ms for 3x more responsive feedback

    return () => clearInterval(compareInterval);
  }, [trainingState, isPlaying, options.mirrored]);

  // Calibration pose processing
  useEffect(() => {
    if (trainingState !== 'calibration' || !isCameraActive || !isPoseReady) return;

    let animationId: number;
    let lastProcessTime = 0;
    const targetInterval = 1000 / 60;

    const processLoop = async (timestamp: number) => {
      if (timestamp - lastProcessTime >= targetInterval && webcamRef.current) {
        if (webcamRef.current.readyState >= 2 && webcamRef.current.videoWidth > 0) {
          await processFrame(webcamRef.current, 'dancer');
        }
        lastProcessTime = timestamp;
      }
      animationId = requestAnimationFrame(processLoop);
    };

    animationId = requestAnimationFrame(processLoop);
    return () => cancelAnimationFrame(animationId);
  }, [trainingState, isCameraActive, isPoseReady, processFrame, webcamRef]);

  const handleCalibrationComplete = useCallback(() => {
    setTrainingState('training');
    setIsPlaying(true);
    sessionScorerRef.current.reset();
    sessionStartTimeRef.current = performance.now();
    if (teacherVideoRef.current) {
      teacherVideoRef.current.currentTime = 0;
    }
  }, []);

  const handleBackToSetup = useCallback(() => {
    stopDancerProcessing();
    stopCamera();
    navigate('/');
  }, [stopDancerProcessing, stopCamera, navigate]);

  const handleSessionEnd = useCallback(() => {
    setIsPlaying(false);
    stopDancerProcessing();
    const result = sessionScorerRef.current.getSessionResult();
    setSessionResult(result);
    setTrainingState('report');
  }, [stopDancerProcessing]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleRestart = useCallback(() => {
    sessionScorerRef.current.reset();
    dancerPoseBuffer.current.clear();
    setCurrentScore(null);
    setTrainingState('calibration');
  }, []);

  const handleNewSession = useCallback(() => {
    stopCamera();
    navigate('/');
  }, [stopCamera, navigate]);

  if (!teacherVideoUrl) {
    return null;
  }

  if (trainingState === 'report' && sessionResult) {
    return (
      <SessionReport
        result={sessionResult}
        onRestart={handleRestart}
        onNewSession={handleNewSession}
      />
    );
  }

  return (
    <>
      <SEO
        title="Training Session"
        description="Dance training in progress"
        canonical="https://www.dancetwin.com/training"
        noindex={true}
      />
      <div className="min-h-screen flex flex-col overflow-hidden relative">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <Header showStatus={true} isPoseLoading={isPoseLoading} isPoseReady={isPoseReady} />

      <main className="relative z-10 flex-1 p-4 sm:p-6 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Split View */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {/* Camera Panel */}
            <div className="relative h-full rounded-2xl overflow-hidden glass">
              <CameraPanel
                videoRef={webcamRef}
                isActive={isCameraActive}
                mirrored={options.mirrored}
                showSkeleton={options.showSkeleton}
                keypoints={dancerPose?.keypoints}
                score={currentScore}
              />

              {trainingState === 'calibration' && (
                <CalibrationView
                  keypoints={dancerPose?.keypoints ?? null}
                  isReady={isPoseReady}
                  onCalibrationComplete={handleCalibrationComplete}
                  onBack={handleBackToSetup}
                />
              )}

              {trainingState === 'training' && (
                <FeedbackOverlay
                  score={currentScore}
                  isActive={isPlaying}
                  isMoving={dancerPose?.isMoving ?? false}
                />
              )}
            </div>

            {/* Teacher Panel */}
            <div className="relative h-full rounded-2xl overflow-hidden glass">
              <TeacherVideoPanel
                videoUrl={teacherVideoUrl}
                isPlaying={isPlaying}
                showSkeleton={options.showSkeleton}
                onEnded={handleSessionEnd}
                videoRef={teacherVideoRef}
                currentPose={teacherPose}
                playbackRate={playbackRate}
                onPlaybackRateChange={setPlaybackRate}
              />
            </div>
          </div>

          {/* Controls */}
          {trainingState === 'training' && (
            <div className="flex justify-center gap-3 sm:gap-4">
              <button
                onClick={handlePlayPause}
                className="px-6 sm:px-10 py-3 sm:py-4 btn-primary rounded-xl sm:rounded-2xl text-white font-semibold flex items-center gap-2 text-sm sm:text-base"
              >
                {isPlaying ? (
                  <>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                    {t('common:buttons.pause')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {t('common:buttons.play')}
                  </>
                )}
              </button>
              <button
                onClick={handleSessionEnd}
                className="px-6 sm:px-10 py-3 sm:py-4 btn-secondary rounded-xl sm:rounded-2xl text-white font-semibold text-sm sm:text-base hover:bg-red-500/20 hover:border-red-500/50 transition-all"
              >
                {t('common:buttons.endSession')}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
    </>
  );
}
