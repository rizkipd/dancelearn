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
  const [playbackRate, setPlaybackRate] = useState(1);

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

  useEffect(() => {
    if (appState !== 'training' || !isPlaying || !isPoseReady) return;

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
  }, [appState, isPlaying, isPoseReady, processFrame, webcamRef]);

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
        const videoTimeMs = teacherVideoRef.current
          ? teacherVideoRef.current.currentTime * 1000
          : performance.now() - sessionStartTimeRef.current;
        sessionScorerRef.current.addScore(videoTimeMs, score);
      }
    }, 150);

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

  useEffect(() => {
    if (appState !== 'calibration' || !isCameraActive || !isPoseReady) return;

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
    <div className="min-h-screen flex flex-col overflow-hidden relative">
      {/* Background Video - only on setup page */}
      {appState === 'setup' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute w-full h-full object-cover opacity-20"
          >
            <source src="/DanceTwin-Video.mp4" type="video/mp4" />
          </video>
          {/* Dark overlay for better readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        </div>
      )}

      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      {/* Header */}
      <header className="relative z-10 glass border-b border-white/10 px-4 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo + App Name */}
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/DanceTwin-Logo-Transparent.png"
              alt="DanceTwin"
              className="h-12 sm:h-14 w-auto drop-shadow-lg"
            />
            <div className="hidden sm:block">
              <h1 className="text-xl sm:text-2xl font-bold gradient-text-static leading-none">
                DanceTwin
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Move like your twin</p>
            </div>
          </div>

          {/* Status Indicator */}
          {appState !== 'setup' && (
            <div className="flex items-center gap-3">
              {isPoseLoading && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
                  <div className="sound-wave">
                    <span></span><span></span><span></span><span></span><span></span>
                  </div>
                  <span className="text-xs sm:text-sm text-cyan-400">Loading...</span>
                </div>
              )}
              {isPoseReady && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass glow-cyan">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
                  <span className="text-xs sm:text-sm text-cyan-400 font-medium">Ready</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={`relative z-10 flex-1 p-4 sm:p-6 ${appState === 'setup' ? 'overflow-auto' : 'overflow-hidden'}`}>
        {appState === 'setup' && (
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-8 sm:mb-12">
              {/* Large centered logo for hero */}
              <div className="mb-2">
                <img
                  src="/DanceTwin-Logo-Transparent.png"
                  alt="DanceTwin"
                  className="h-64 sm:h-80 w-auto mx-auto drop-shadow-2xl"
                />
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3 leading-tight">
                Learn Any Dance,{' '}
                <span className="gradient-text">Perfectly</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto">
                Upload a dance video, practice side-by-side, and get real-time feedback on your moves
              </p>
            </div>

            {/* Steps Container */}
            <div className="space-y-5">
              {/* Step 1: Video Upload */}
              <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 card-hover">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg glow-cyan">
                    1
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">
                      Choose Your Dance
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">Upload any dance video to learn from</p>
                  </div>
                </div>
                {teacherVideoUrl ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <video
                      src={teacherVideoUrl}
                      className="w-full rounded-xl"
                      controls
                    />
                    <button
                      onClick={() => {
                        setTeacherVideoUrl(null);
                        setTeacherVideoFile(null);
                      }}
                      className="absolute top-3 right-3 p-2.5 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded-full text-white transition-all hover:scale-110"
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

              {/* Step 2: Options */}
              <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 card-hover">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg glow-purple">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">
                      Customize Settings
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">Adjust camera and display options</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                  {/* Camera Select */}
                  {devices.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Camera
                      </label>
                      <select
                        value={selectedDevice}
                        onChange={(e) => selectDevice(e.target.value)}
                        className="w-full glass rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all"
                      >
                        {devices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId} className="bg-gray-900">
                            {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Toggles */}
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={options.mirrored}
                        onChange={(e) => setOptions(prev => ({ ...prev, mirrored: e.target.checked }))}
                      />
                      <span className="text-gray-300 group-hover:text-white transition-colors">Mirror mode</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={options.showSkeleton}
                        onChange={(e) => setOptions(prev => ({ ...prev, showSkeleton: e.target.checked }))}
                      />
                      <span className="text-gray-300 group-hover:text-white transition-colors">Show skeleton overlay</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartSession}
                disabled={!teacherVideoUrl}
                className={`
                  w-full py-4 sm:py-5 rounded-2xl font-semibold text-lg sm:text-xl transition-all
                  ${teacherVideoUrl
                    ? 'btn-primary text-white'
                    : 'glass text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {teacherVideoUrl ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Dancing
                  </span>
                ) : (
                  'Upload a video to start'
                )}
              </button>

              {cameraError && (
                <div className="glass rounded-xl p-4 border border-red-500/30">
                  <p className="text-center text-red-400">{cameraError}</p>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              <FeatureCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
                title="Side-by-Side"
                description="Compare your moves with the teacher in real-time"
                color="cyan"
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                title="Live Scoring"
                description="Get instant feedback on arms, legs, and body position"
                color="purple"
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                title="100% Private"
                description="All processing happens locally on your device"
                color="pink"
              />
            </div>
          </div>
        )}

        {(appState === 'calibration' || appState === 'training') && (
          <div className="h-full flex flex-col">
            {/* Split View */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4" style={{ minHeight: 'calc(100vh - 180px)' }}>
              {/* Camera Panel */}
              <div className="relative h-full min-h-[300px] sm:min-h-[400px] lg:min-h-0 rounded-2xl overflow-hidden glass">
                <CameraPanel
                  videoRef={webcamRef}
                  isActive={isCameraActive}
                  mirrored={options.mirrored}
                  showSkeleton={options.showSkeleton}
                  keypoints={dancerPose?.keypoints}
                  score={currentScore}
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

              {/* Teacher Panel */}
              <div className="relative h-full min-h-[300px] sm:min-h-[400px] lg:min-h-0 rounded-2xl overflow-hidden glass">
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
            {appState === 'training' && (
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
                      Pause
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </>
                  )}
                </button>
                <button
                  onClick={handleSessionEnd}
                  className="px-6 sm:px-10 py-3 sm:py-4 btn-secondary rounded-xl sm:rounded-2xl text-white font-semibold text-sm sm:text-base hover:bg-red-500/20 hover:border-red-500/50 transition-all"
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

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: 'cyan' | 'purple' | 'pink' }) {
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 glow-cyan',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 glow-purple',
    pink: 'from-pink-500/20 to-pink-500/5 text-pink-400 glow-pink',
  };

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 card-hover text-center">
      <div className={`w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
        {icon}
      </div>
      <h4 className="text-base sm:text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

export default App;
