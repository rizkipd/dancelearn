import { useRef, useEffect, useState, useCallback, RefObject } from 'react';
import { PoseFrame } from '../types/pose';
import { LANDMARKS } from '../engines/PoseNormalizer';

interface TeacherVideoPanelProps {
  videoUrl: string | null;
  isPlaying: boolean;
  showSkeleton?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onPosesExtracted?: (poses: PoseFrame[]) => void;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  currentPose?: PoseFrame | null;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

const SKELETON_CONNECTIONS: [number, number][] = [
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
  [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW],
  [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST],
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW],
  [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],
  [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
  [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
  [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
  [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
];

export function TeacherVideoPanel({
  videoUrl,
  isPlaying,
  showSkeleton = true,
  onTimeUpdate,
  onEnded,
  playbackRate = 1,
  onPlaybackRateChange,
  currentPose,
  videoRef: externalVideoRef,
}: TeacherVideoPanelProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = (externalVideoRef || internalVideoRef) as RefObject<HTMLVideoElement>;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.play().catch(console.error);
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime * 1000; // Convert to ms
    setCurrentTime(videoRef.current.currentTime);
    onTimeUpdate?.(time);
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = parseFloat(e.target.value);
  }, []);

  // Draw skeleton overlay - canvas matches video dimensions directly
  // BATCHED DRAWING for better performance
  useEffect(() => {
    if (!showSkeleton || !currentPose || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;

    // Match canvas to actual video display size
    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const keypoints = currentPose.keypoints;

    // BATCHED: Draw all connections in a single path
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = keypoints[startIdx];
      const end = keypoints[endIdx];

      if (!start || !end) continue;
      if ((start.visibility ?? 0) < 0.5 || (end.visibility ?? 0) < 0.5) continue;

      ctx.moveTo(start.x * videoWidth, start.y * videoHeight);
      ctx.lineTo(end.x * videoWidth, end.y * videoHeight);
    }
    ctx.stroke();

    // BATCHED: Draw all keypoint circles
    const relevantLandmarks = Object.values(LANDMARKS);

    // First pass: fill all circles
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    for (const idx of relevantLandmarks) {
      const kp = keypoints[idx];
      if (!kp || (kp.visibility ?? 0) < 0.5) continue;

      const x = kp.x * videoWidth;
      const y = kp.y * videoHeight;
      ctx.moveTo(x + 6, y);
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
    }
    ctx.fill();

    // Second pass: stroke all circles
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const idx of relevantLandmarks) {
      const kp = keypoints[idx];
      if (!kp || (kp.visibility ?? 0) < 0.5) continue;

      const x = kp.x * videoWidth;
      const y = kp.y * videoHeight;
      ctx.moveTo(x + 6, y);
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
    }
    ctx.stroke();
  }, [currentPose, showSkeleton, videoRef]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoUrl) {
    return (
      <div className="relative w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>No video loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gray-900 rounded-lg overflow-hidden flex flex-col">
      <div className="relative flex-1 flex items-center justify-center bg-black">
        <div className="relative max-w-full max-h-full">
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={onEnded}
            className="max-w-full max-h-full object-contain"
          />

          {showSkeleton && (
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
          )}
        </div>

        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-xs text-gray-300">
          Teacher
        </div>
      </div>

      {/* Video controls */}
      <div className="bg-gray-800/90 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-12">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-gray-400 w-12 text-right">
            {formatTime(duration)}
          </span>

          {/* Playback speed control */}
          {onPlaybackRateChange && (
            <div className="flex items-center gap-1 ml-2 border-l border-gray-600 pl-3">
              {PLAYBACK_SPEEDS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => onPlaybackRateChange(speed)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    playbackRate === speed
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
