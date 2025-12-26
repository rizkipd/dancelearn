import { useState, useCallback, useRef, useEffect } from 'react';
import { FileVideoLoader } from './components/FileVideoLoader';
import { CameraPanel } from './components/CameraPanel';
import { TeacherVideoPanel } from './components/TeacherVideoPanel';
import { FeedbackOverlay } from './components/FeedbackOverlay';
import { CalibrationView } from './components/CalibrationView';
import { SessionReport } from './components/SessionReport';
import { useWebcam } from './hooks/useWebcam';
import { usePoseEstimation } from './hooks/usePoseEstimation';
import { normalizePose } from './engines/PoseNormalizer';
import { compareFrames, SessionScorer } from './engines/ScoringEngine';
import { AppState, ScoreResult, SessionResult, PoseFrame } from './types/pose';

function App() {
  const [appState, setAppState] = useState<AppState>('setup');
  const [teacherVideoUrl, setTeacherVideoUrl] = useState<string | null>(null);
  const [, setTeacherVideoFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScore, setCurrentScore] = useState<ScoreResult | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [teacherPose, setTeacherPose] = useState<PoseFrame | null>(null);
  const [dancerPose, setDancerPose] = useState<PoseFrame | null>(null);
  const [options, setOptions] = useState({
    mirrored: true,
    showSkeleton: true,
  });

  const sessionScorerRef = useRef(new SessionScorer());
  const teacherVideoRef = useRef<HTMLVideoElement>(null);
  const dancerPoseRef = useRef<PoseFrame | null>(null);
  const sessionStartTimeRef = useRef<number>(0);

  const {
    videoRef: webcamRef,
    isActive: isCameraActive,
    start: startCamera,
    stop: stopCamera,
    devices,
    selectedDevice,
    selectDevice,
    error: cameraError,
  } = useWebcam({ mirrored: options.mirrored });

  // Pose estimation with source tracking
  const {
    isLoading: isPoseLoading,
    isReady: isPoseReady,
    stopProcessing: stopDancerProcessing,
    processFrame,
  } = usePoseEstimation({
    onPoseDetected: (pose, source) => {
      if (source === 'dancer') {
        dancerPoseRef.current = pose;
        setDancerPose(pose);
      } else {
        lastTeacherPoseRef.current = pose;
        setTeacherPose(pose);
      }
    },
  });

  const lastTeacherPoseRef = useRef<PoseFrame | null>(null);

  // Process both dancer and teacher frames alternately
  useEffect(() => {
    if (appState !== 'training' || !isPlaying || !isPoseReady) return;

    let animationId: number;
    let lastDancerTime = 0;
    let lastTeacherTime = 0;
    const dancerInterval = 1000 / 15; // 15 FPS for dancer
    const teacherInterval = 1000 / 10; // 10 FPS for teacher

    const processLoop = async (timestamp: number) => {
      // Process dancer frame
      if (timestamp - lastDancerTime >= dancerInterval && webcamRef.current) {
        if (webcamRef.current.readyState >= 2 && webcamRef.current.videoWidth > 0) {
          await processFrame(webcamRef.current, 'dancer');
        }
        lastDancerTime = timestamp;
      }

      // Process teacher frame (slightly offset to avoid collision)
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
  }, [appState, isPlaying, isPoseReady, processFrame, webcamRef]);

  // Compare poses and calculate score when we have both
  useEffect(() => {
    if (appState !== 'training' || !isPlaying) return;

    const compareInterval = setInterval(() => {
      const dancerPose = dancerPoseRef.current;
      const tPose = lastTeacherPoseRef.current;
      if (dancerPose && tPose) {
        const dancerNormalized = normalizePose(dancerPose.keypoints, options.mirrored);
        const teacherNormalized = normalizePose(tPose.keypoints);
        const score = compareFrames(dancerNormalized, teacherNormalized);
        setCurrentScore(score);
        // Use video time instead of performance.now() time
        const videoTimeMs = teacherVideoRef.current
          ? teacherVideoRef.current.currentTime * 1000
          : performance.now() - sessionStartTimeRef.current;
        sessionScorerRef.current.addScore(videoTimeMs, score);
      }
    }, 150); // Compare every 150ms

    return () => clearInterval(compareInterval);
  }, [appState, isPlaying, options.mirrored]);

  const handleVideoLoaded = useCallback((file: File, url: string) => {
    setTeacherVideoFile(file);
    setTeacherVideoUrl(url);
  }, []);

  const handleStartSession = useCallback(async () => {
    if (!teacherVideoUrl) return;

    try {
      await startCamera();
      setAppState('calibration');
    } catch (err) {
      console.error('Failed to start camera:', err);
    }
  }, [teacherVideoUrl, startCamera]);

  const handleCalibrationComplete = useCallback(() => {
    setAppState('training');
    setIsPlaying(true);
    sessionScorerRef.current.reset();
    sessionStartTimeRef.current = performance.now();
    // Reset teacher video to start
    if (teacherVideoRef.current) {
      teacherVideoRef.current.currentTime = 0;
    }
  }, []);

  const handleBackToSetup = useCallback(() => {
    setAppState('setup');
    setIsPlaying(false);
    stopDancerProcessing();
    stopCamera();
  }, [stopDancerProcessing, stopCamera]);

  const handleSessionEnd = useCallback(() => {
    setIsPlaying(false);
    stopDancerProcessing();

    const result = sessionScorerRef.current.getSessionResult();
    setSessionResult(result);
    setAppState('report');
  }, [stopDancerProcessing]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleRestart = useCallback(() => {
    sessionScorerRef.current.reset();
    setCurrentScore(null);
    setAppState('calibration');
  }, []);

  const handleNewSession = useCallback(() => {
    stopCamera();
    setTeacherVideoUrl(null);
    setTeacherVideoFile(null);
    setCurrentScore(null);
    setSessionResult(null);
    setAppState('setup');
  }, [stopCamera]);

  // Process dancer frames during calibration
  useEffect(() => {
    if (appState !== 'calibration' || !isCameraActive || !isPoseReady) return;

    let animationId: number;
    let lastProcessTime = 0;
    const targetInterval = 1000 / 15; // 15 FPS for calibration

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
  }, [appState, isCameraActive, isPoseReady, processFrame, webcamRef]);

  if (appState === 'report' && sessionResult) {
    return (
      <SessionReport
        result={sessionResult}
        onRestart={handleRestart}
        onNewSession={handleNewSession}
      />
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            AI Dance Training
          </h1>
          {appState !== 'setup' && (
            <div className="flex items-center gap-4">
              {isPoseLoading && (
                <span className="text-sm text-yellow-400">Loading AI model...</span>
              )}
              {isPoseReady && (
                <span className="text-sm text-green-400">AI Ready</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 p-6 min-h-0 ${appState === 'setup' ? 'overflow-auto' : 'overflow-hidden'}`}>
        {appState === 'setup' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">
                Welcome to AI Dance Training
              </h2>
              <p className="text-gray-400">
                Load a dance video, follow along, and get real-time feedback on your moves
              </p>
            </div>

            {/* Video Upload */}
            <div className="bg-gray-800 rounded-2xl p-8 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                1. Load Teacher Video
              </h3>
              {teacherVideoUrl ? (
                <div className="relative">
                  <video
                    src={teacherVideoUrl}
                    className="w-full rounded-lg"
                    controls
                  />
                  <button
                    onClick={() => {
                      setTeacherVideoUrl(null);
                      setTeacherVideoFile(null);
                    }}
                    className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <FileVideoLoader onVideoLoaded={handleVideoLoaded} />
              )}
            </div>

            {/* Options */}
            <div className="bg-gray-800 rounded-2xl p-8 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                2. Options
              </h3>

              <div className="grid grid-cols-2 gap-6">
                {/* Camera Select */}
                {devices.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Camera
                    </label>
                    <select
                      value={selectedDevice}
                      onChange={(e) => selectDevice(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    >
                      {devices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Toggles */}
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.mirrored}
                      onChange={(e) => setOptions(prev => ({ ...prev, mirrored: e.target.checked }))}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                    />
                    <span className="text-gray-300">Mirror mode</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.showSkeleton}
                      onChange={(e) => setOptions(prev => ({ ...prev, showSkeleton: e.target.checked }))}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                    />
                    <span className="text-gray-300">Show skeleton overlay</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartSession}
              disabled={!teacherVideoUrl}
              className={`
                w-full py-4 rounded-xl font-semibold text-lg transition-all
                ${teacherVideoUrl
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Start Training Session
            </button>

            {cameraError && (
              <p className="mt-4 text-center text-red-400">{cameraError}</p>
            )}
          </div>
        )}

        {(appState === 'calibration' || appState === 'training') && (
          <div className="h-full flex flex-col min-h-0">
            {/* Split View */}
            <div className="flex-1 grid grid-cols-2 gap-4 mb-4 min-h-0">
              {/* Camera Panel (Left) */}
              <div className="relative min-h-[400px]">
                <CameraPanel
                  videoRef={webcamRef}
                  isActive={isCameraActive}
                  mirrored={options.mirrored}
                  showSkeleton={options.showSkeleton}
                  keypoints={dancerPose?.keypoints}
                />

                {appState === 'calibration' && (
                  <CalibrationView
                    keypoints={dancerPose?.keypoints ?? null}
                    isReady={isPoseReady}
                    onCalibrationComplete={handleCalibrationComplete}
                    onBack={handleBackToSetup}
                  />
                )}

                {appState === 'training' && (
                  <FeedbackOverlay score={currentScore} isActive={isPlaying} />
                )}
              </div>

              {/* Teacher Panel (Right) */}
              <TeacherVideoPanel
                videoUrl={teacherVideoUrl}
                isPlaying={isPlaying}
                showSkeleton={options.showSkeleton}
                onEnded={handleSessionEnd}
                videoRef={teacherVideoRef}
                currentPose={teacherPose}
              />
            </div>

            {/* Controls */}
            {appState === 'training' && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </>
                  )}
                </button>
                <button
                  onClick={handleSessionEnd}
                  className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-medium"
                >
                  End Session
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
