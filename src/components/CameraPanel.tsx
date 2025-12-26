import { useEffect, useRef } from 'react';
import { Keypoint } from '../types/pose';
import { LANDMARKS } from '../engines/PoseNormalizer';

interface CameraPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  mirrored?: boolean;
  showSkeleton?: boolean;
  keypoints?: Keypoint[];
  onVideoReady?: () => void;
}

const SKELETON_CONNECTIONS: [number, number][] = [
  // Torso
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
  [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],
  // Left arm
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW],
  [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST],
  // Right arm
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW],
  [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST],
  // Left leg
  [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
  [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
  // Right leg
  [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
  [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
];

export function CameraPanel({
  videoRef,
  isActive,
  mirrored = true,
  showSkeleton = true,
  keypoints,
  onVideoReady,
}: CameraPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSkeleton || !keypoints || !canvasRef.current || !videoRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;
    const container = containerRef.current;

    // Use container dimensions for the canvas to match object-cover behavior
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Calculate the scaling and offset for object-cover
    const videoAspect = video.videoWidth / video.videoHeight;
    const containerAspect = containerWidth / containerHeight;

    let scale: number;
    let offsetX = 0;
    let offsetY = 0;

    if (containerAspect > videoAspect) {
      // Container is wider - video fills width, crop top/bottom
      scale = containerWidth / video.videoWidth;
      offsetY = (containerHeight - video.videoHeight * scale) / 2;
    } else {
      // Container is taller - video fills height, crop left/right
      scale = containerHeight / video.videoHeight;
      offsetX = (containerWidth - video.videoWidth * scale) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw skeleton connections
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = keypoints[startIdx];
      const end = keypoints[endIdx];

      if (!start || !end) continue;
      if ((start.visibility ?? 0) < 0.5 || (end.visibility ?? 0) < 0.5) continue;

      // Convert normalized coords to video coords, then to canvas coords
      let startX = start.x * video.videoWidth * scale + offsetX;
      let startY = start.y * video.videoHeight * scale + offsetY;
      let endX = end.x * video.videoWidth * scale + offsetX;
      let endY = end.y * video.videoHeight * scale + offsetY;

      if (mirrored) {
        startX = canvas.width - startX;
        endX = canvas.width - endX;
      }

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Draw keypoints
    const relevantLandmarks = Object.values(LANDMARKS);
    for (const idx of relevantLandmarks) {
      const kp = keypoints[idx];
      if (!kp || (kp.visibility ?? 0) < 0.5) continue;

      let x = kp.x * video.videoWidth * scale + offsetX;
      let y = kp.y * video.videoHeight * scale + offsetY;

      if (mirrored) {
        x = canvas.width - x;
      }

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#00ff88';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [keypoints, showSkeleton, mirrored, videoRef]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px] bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={onVideoReady}
        className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
      />

      {showSkeleton && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}

      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p>Camera not active</p>
          </div>
        </div>
      )}

      <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-xs text-gray-300">
        You
      </div>
    </div>
  );
}
