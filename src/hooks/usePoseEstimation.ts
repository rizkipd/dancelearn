import { useState, useCallback, useRef, useEffect } from 'react';
import { Keypoint, PoseFrame } from '../types/pose';
import { calculateAngles, calculateConfidence } from '../engines/PoseNormalizer';

// MediaPipe types (loaded from CDN)
interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface Results {
  poseLandmarks?: Landmark[];
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
}

interface PoseConfig {
  locateFile: (file: string) => string;
}

interface Pose {
  setOptions: (options: {
    modelComplexity?: 0 | 1 | 2;
    smoothLandmarks?: boolean;
    enableSegmentation?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }) => void;
  onResults: (callback: (results: Results) => void) => void;
  initialize: () => Promise<void>;
  send: (input: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }) => Promise<void>;
  close: () => void;
}

declare global {
  interface Window {
    Pose: new (config: PoseConfig) => Pose;
  }
}

// Singleton to manage MediaPipe Pose instance
let globalPoseInstance: Pose | null = null;
let globalPosePromise: Promise<Pose> | null = null;
let globalResultsCallback: ((results: Results, source: 'dancer' | 'teacher') => void) | null = null;
let currentProcessingSource: 'dancer' | 'teacher' = 'dancer';

// Velocity-based smoothing for dancer keypoints
// Fast movements = responsive (minimal smoothing), slow movements = stable (more smoothing)
let previousKeypoints: Keypoint[] | null = null;
let keypointVelocities: number[] = [];

const JITTER_THRESHOLD = 0.004; // Ignore movements smaller than 0.4% of screen
const FAST_MOVEMENT_THRESHOLD = 0.03; // Movement > 3% = fast movement
const MIN_SMOOTHING = 0.85; // Fast movements: 85% current frame (very responsive)
const MAX_SMOOTHING = 0.55; // Slow movements: 55% current frame (more stable)

function smoothKeypoints(current: Keypoint[]): Keypoint[] {
  if (!previousKeypoints) {
    previousKeypoints = current;
    keypointVelocities = new Array(current.length).fill(0);
    return current;
  }

  const smoothed = current.map((kp, idx) => {
    const prev = previousKeypoints![idx];
    if (!prev) return kp;

    const currentVis = kp.visibility ?? 0;
    const prevVis = prev.visibility ?? 0;

    // If visibility is low, don't smooth
    if (currentVis < 0.5 || prevVis < 0.5) {
      return kp;
    }

    // Calculate movement velocity
    const dx = kp.x - prev.x;
    const dy = kp.y - prev.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Update velocity with exponential moving average
    const prevVelocity = keypointVelocities[idx] || 0;
    keypointVelocities[idx] = distance * 0.7 + prevVelocity * 0.3;
    const velocity = keypointVelocities[idx];

    // If movement is tiny (jitter), keep previous position
    if (distance < JITTER_THRESHOLD && velocity < JITTER_THRESHOLD) {
      return { ...kp, x: prev.x, y: prev.y, z: prev.z };
    }

    // Velocity-based smoothing factor
    // Fast movement = high smoothing factor (more responsive)
    // Slow movement = low smoothing factor (more stable)
    const velocityRatio = Math.min(velocity / FAST_MOVEMENT_THRESHOLD, 1);
    const smoothingFactor = MIN_SMOOTHING * velocityRatio + MAX_SMOOTHING * (1 - velocityRatio);

    // Apply smoothing: blend current with previous
    return {
      ...kp,
      x: kp.x * smoothingFactor + prev.x * (1 - smoothingFactor),
      y: kp.y * smoothingFactor + prev.y * (1 - smoothingFactor),
      z: kp.z !== undefined && prev.z !== undefined
        ? kp.z * smoothingFactor + prev.z * (1 - smoothingFactor)
        : kp.z,
    };
  });

  previousKeypoints = smoothed;
  return smoothed;
}

// Export for external reset if needed
export function resetSmoothing() {
  previousKeypoints = null;
  keypointVelocities = [];
}

async function getOrCreatePose(): Promise<Pose> {
  if (globalPoseInstance) {
    return globalPoseInstance;
  }

  if (globalPosePromise) {
    return globalPosePromise;
  }

  globalPosePromise = (async () => {
    console.log('[MediaPipe] Starting initialization...');
    console.log('[MediaPipe] crossOriginIsolated:', self.crossOriginIsolated);
    console.log('[MediaPipe] SharedArrayBuffer available:', typeof SharedArrayBuffer !== 'undefined');

    // Wait for MediaPipe to be loaded from CDN
    if (typeof window.Pose === 'undefined') {
      console.log('[MediaPipe] Waiting for Pose class to load from CDN...');
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (typeof window.Pose !== 'undefined') {
            clearInterval(checkInterval);
            console.log('[MediaPipe] Pose class loaded from CDN');
            resolve();
          }
        }, 100);
      });
    } else {
      console.log('[MediaPipe] Pose class already available');
    }

    const pose = new window.Pose({
      locateFile: (file) => {
        const url = `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        console.log('[MediaPipe] Loading file:', file, 'from', url);
        return url;
      },
    });

    console.log('[MediaPipe] Pose instance created');

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: false, // Disabled - using custom velocity-based smoothing instead
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    console.log('[MediaPipe] Options set');

    pose.onResults((results: Results) => {
      globalResultsCallback?.(results, currentProcessingSource);
    });

    console.log('[MediaPipe] Initializing model...');
    await pose.initialize();
    console.log('[MediaPipe] ✅ Model initialized successfully!');
    globalPoseInstance = pose;
    return pose;
  })();

  return globalPosePromise;
}

interface UsePoseEstimationOptions {
  onPoseDetected?: (pose: PoseFrame, source: 'dancer' | 'teacher') => void;
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

interface UsePoseEstimationReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  currentPose: PoseFrame | null;
  processFrame: (video: HTMLVideoElement, source?: 'dancer' | 'teacher') => Promise<void>;
  startProcessing: (video: HTMLVideoElement, fps?: number) => void;
  stopProcessing: () => void;
}

export function usePoseEstimation(options: UsePoseEstimationOptions = {}): UsePoseEstimationReturn {
  // Use ref for callback to avoid re-initializing MediaPipe
  const onPoseDetectedRef = useRef(options.onPoseDetected);
  onPoseDetectedRef.current = options.onPoseDetected;

  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPose, setCurrentPose] = useState<PoseFrame | null>(null);

  const poseRef = useRef<Pose | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Set up results callback
    globalResultsCallback = (results: Results, source: 'dancer' | 'teacher') => {
      if (!isMountedRef.current) return;

      if (results.poseLandmarks) {
        let keypoints: Keypoint[] = results.poseLandmarks.map((lm, idx) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility,
          name: POSE_LANDMARK_NAMES[idx],
        }));

        // Apply smoothing only to dancer to reduce trembling
        if (source === 'dancer') {
          keypoints = smoothKeypoints(keypoints);
        }

        const angles = calculateAngles(keypoints);
        const confidence = calculateConfidence(keypoints);

        const poseFrame: PoseFrame = {
          timestamp: performance.now(),
          keypoints,
          angles,
          confidence,
        };

        if (source === 'dancer') {
          setCurrentPose(poseFrame);
        }
        onPoseDetectedRef.current?.(poseFrame, source);
      }
    };

    const initPose = async () => {
      try {
        console.log('[usePoseEstimation] Starting pose initialization...');
        const pose = await getOrCreatePose();

        if (!isMountedRef.current) return;

        poseRef.current = pose;
        setIsReady(true);
        setIsLoading(false);
        console.log('[usePoseEstimation] ✅ Pose ready, isReady set to true');
      } catch (err) {
        if (!isMountedRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to initialize pose model';
        console.error('[usePoseEstimation] ❌ Initialization failed:', err);
        console.error('[usePoseEstimation] Error details:', {
          message,
          stack: err instanceof Error ? err.stack : undefined,
          error: err,
        });
        setError(message);
        setIsLoading(false);
      }
    };

    initPose();

    return () => {
      isMountedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  const processFrame = useCallback(async (video: HTMLVideoElement, source: 'dancer' | 'teacher' = 'dancer') => {
    if (!poseRef.current || !isReady) return;

    // Check if video is ready and has valid dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    try {
      currentProcessingSource = source;
      await poseRef.current.send({ image: video });
    } catch (err) {
      // Ignore transient errors during video startup
      if (err instanceof Error && err.message.includes('memory access')) {
        return;
      }
      console.error('Pose processing error:', err);
    }
  }, [isReady]);

  const startProcessing = useCallback((video: HTMLVideoElement, fps = 30) => {
    // Stop any existing processing
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const targetInterval = 1000 / fps;

    const loop = async (timestamp: number) => {
      if (timestamp - lastProcessTimeRef.current >= targetInterval) {
        await processFrame(video);
        lastProcessTimeRef.current = timestamp;
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [processFrame]);

  const stopProcessing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  return {
    isLoading,
    isReady,
    error,
    currentPose,
    processFrame,
    startProcessing,
    stopProcessing,
  };
}

const POSE_LANDMARK_NAMES = [
  'nose',
  'left_eye_inner',
  'left_eye',
  'left_eye_outer',
  'right_eye_inner',
  'right_eye',
  'right_eye_outer',
  'left_ear',
  'right_ear',
  'mouth_left',
  'mouth_right',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_pinky',
  'right_pinky',
  'left_index',
  'right_index',
  'left_thumb',
  'right_thumb',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
  'left_heel',
  'right_heel',
  'left_foot_index',
  'right_foot_index',
];
