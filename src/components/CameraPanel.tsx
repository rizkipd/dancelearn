import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Keypoint, ScoreResult } from '../types/pose';
import { LANDMARKS } from '../engines/PoseNormalizer';

interface CameraPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  mirrored?: boolean;
  showSkeleton?: boolean;
  keypoints?: Keypoint[];
  onVideoReady?: () => void;
  score?: ScoreResult | null; // For color-coded skeleton
}

// Map landmarks to body parts for color coding
const LANDMARK_BODY_PART: Record<number, 'arms' | 'legs' | 'torso'> = {
  [LANDMARKS.LEFT_SHOULDER]: 'torso',
  [LANDMARKS.RIGHT_SHOULDER]: 'torso',
  [LANDMARKS.LEFT_HIP]: 'torso',
  [LANDMARKS.RIGHT_HIP]: 'torso',
  [LANDMARKS.LEFT_ELBOW]: 'arms',
  [LANDMARKS.LEFT_WRIST]: 'arms',
  [LANDMARKS.RIGHT_ELBOW]: 'arms',
  [LANDMARKS.RIGHT_WRIST]: 'arms',
  [LANDMARKS.LEFT_KNEE]: 'legs',
  [LANDMARKS.LEFT_ANKLE]: 'legs',
  [LANDMARKS.RIGHT_KNEE]: 'legs',
  [LANDMARKS.RIGHT_ANKLE]: 'legs',
};

// Get color based on score: green (good) -> yellow (ok) -> red (needs work)
function getScoreColor(score: number): string {
  if (score >= 80) return '#00ff88'; // Green - good
  if (score >= 60) return '#ffcc00'; // Yellow - ok
  return '#ff4444'; // Red - needs work
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
  score,
}: CameraPanelProps) {
  const { t } = useTranslation('common');
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

    // Helper to transform coordinates
    const transformX = (x: number) => {
      const tx = x * video.videoWidth * scale + offsetX;
      return mirrored ? canvas.width - tx : tx;
    };
    const transformY = (y: number) => y * video.videoHeight * scale + offsetY;

    // Helper to get color for a body part
    const getBodyPartColor = (landmarkIdx: number): string => {
      if (!score) return '#00ff88'; // Default green if no score
      const bodyPart = LANDMARK_BODY_PART[landmarkIdx];
      if (!bodyPart) return '#00ff88';
      return getScoreColor(score.bodyParts[bodyPart]);
    };

    // COLOR-CODED DRAWING: Draw skeleton connections with body part colors
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = keypoints[startIdx];
      const end = keypoints[endIdx];

      if (!start || !end) continue;
      if ((start.visibility ?? 0) < 0.5 || (end.visibility ?? 0) < 0.5) continue;

      // Use color based on the body part of the connection
      ctx.strokeStyle = getBodyPartColor(startIdx);
      ctx.beginPath();
      ctx.moveTo(transformX(start.x), transformY(start.y));
      ctx.lineTo(transformX(end.x), transformY(end.y));
      ctx.stroke();
    }

    // COLOR-CODED DRAWING: Draw keypoint circles with body part colors
    const relevantLandmarks = Object.values(LANDMARKS);

    for (const idx of relevantLandmarks) {
      const kp = keypoints[idx];
      if (!kp || (kp.visibility ?? 0) < 0.5) continue;

      const x = transformX(kp.x);
      const y = transformY(kp.y);
      const color = getBodyPartColor(idx);

      // Fill circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Stroke circle
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [keypoints, showSkeleton, mirrored, videoRef, score]);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
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
            <p>{t('status.cameraNotActive')}</p>
          </div>
        </div>
      )}

      <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-xs text-gray-300">
        {t('labels.you')}
      </div>
    </div>
  );
}
