export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  name?: string;
}

export interface PoseFrame {
  timestamp: number;
  keypoints: Keypoint[];
  angles: number[];
  confidence: number[];
  isMoving?: boolean;
}

export interface NormalizedPose {
  angles: number[];
  confidence: number[];
  centerX: number;
  centerY: number;
  scale: number;
}

export interface ScoreResult {
  overallScore: number;
  timingOffsetMs: number;
  bodyParts: {
    arms: number;
    legs: number;
    torso: number;
  };
  hint?: string;
  hintKey?: string;
  hintParams?: Record<string, string | number>;
}

export interface SessionResult {
  overallScore: number;
  avgTimingMs: number;
  bodyParts: {
    arms: number;
    legs: number;
    torso: number;
  };
  scoreTimeline: { timestamp: number; score: number }[];
  weakSections: { start: number; end: number; score: number }[];
}

export interface CalibrationStatus {
  bodyInFrame: boolean;
  goodLighting: boolean;
  properDistance: boolean;
  isReady: boolean;
}

export type AppState = 'setup' | 'calibration' | 'training' | 'report';
