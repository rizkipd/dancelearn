import { useState, useCallback, useRef, useEffect } from 'react';
import { Pose, Results } from '@mediapipe/pose';
import { Keypoint, PoseFrame } from '../types/pose';
import { calculateAngles, calculateConfidence } from '../engines/PoseNormalizer';

// Singleton to manage MediaPipe Pose instance
let globalPoseInstance: Pose | null = null;
let globalPosePromise: Promise<Pose> | null = null;
let globalResultsCallback: ((results: Results, source: 'dancer' | 'teacher') => void) | null = null;
let currentProcessingSource: 'dancer' | 'teacher' = 'dancer';

async function getOrCreatePose(): Promise<Pose> {
  if (globalPoseInstance) {
    return globalPoseInstance;
  }

  if (globalPosePromise) {
    return globalPosePromise;
  }

  globalPosePromise = (async () => {
    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results: Results) => {
      globalResultsCallback?.(results, currentProcessingSource);
    });

    await pose.initialize();
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
        const keypoints: Keypoint[] = results.poseLandmarks.map((lm, idx) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility,
          name: POSE_LANDMARK_NAMES[idx],
        }));

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
        const pose = await getOrCreatePose();

        if (!isMountedRef.current) return;

        poseRef.current = pose;
        setIsReady(true);
        setIsLoading(false);
      } catch (err) {
        if (!isMountedRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to initialize pose model';
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
