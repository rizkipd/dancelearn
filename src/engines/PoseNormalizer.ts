import { Keypoint, NormalizedPose } from '../types/pose';

// MediaPipe Pose landmark indices
const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Joint angle definitions: [joint, parent, child]
const ANGLE_DEFINITIONS: [number, number, number][] = [
  // Arms
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_ELBOW],
  [LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_WRIST],
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_ELBOW],
  [LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_WRIST],
  // Legs
  [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_KNEE],
  [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_ANKLE],
  [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_KNEE],
  [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_ANKLE],
  // Torso
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_SHOULDER],
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.LEFT_SHOULDER],
];

function calculateAngle(p1: Keypoint, p2: Keypoint, p3: Keypoint): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle);
}

export function calculateAngles(keypoints: Keypoint[]): number[] {
  return ANGLE_DEFINITIONS.map(([joint, parent, child]) => {
    const p1 = keypoints[parent];
    const p2 = keypoints[joint];
    const p3 = keypoints[child];

    if (!p1 || !p2 || !p3) return 0;
    return calculateAngle(p1, p2, p3);
  });
}

export function calculateConfidence(keypoints: Keypoint[]): number[] {
  const relevantIndices = [
    LANDMARKS.LEFT_SHOULDER,
    LANDMARKS.RIGHT_SHOULDER,
    LANDMARKS.LEFT_ELBOW,
    LANDMARKS.RIGHT_ELBOW,
    LANDMARKS.LEFT_WRIST,
    LANDMARKS.RIGHT_WRIST,
    LANDMARKS.LEFT_HIP,
    LANDMARKS.RIGHT_HIP,
    LANDMARKS.LEFT_KNEE,
    LANDMARKS.RIGHT_KNEE,
    LANDMARKS.LEFT_ANKLE,
    LANDMARKS.RIGHT_ANKLE,
  ];

  return relevantIndices.map(idx => keypoints[idx]?.visibility ?? 0);
}

export function normalizePose(keypoints: Keypoint[], mirror = false): NormalizedPose {
  const leftHip = keypoints[LANDMARKS.LEFT_HIP];
  const rightHip = keypoints[LANDMARKS.RIGHT_HIP];
  const leftShoulder = keypoints[LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = keypoints[LANDMARKS.RIGHT_SHOULDER];

  // Center on hips
  const centerX = (leftHip.x + rightHip.x) / 2;
  const centerY = (leftHip.y + rightHip.y) / 2;

  // Calculate torso length for scale normalization
  const shoulderCenter = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
  };
  const torsoLength = Math.sqrt(
    Math.pow(shoulderCenter.x - centerX, 2) +
    Math.pow(shoulderCenter.y - centerY, 2)
  );
  const scale = torsoLength > 0 ? torsoLength : 1;

  // Mirror keypoints if needed
  let processedKeypoints = keypoints;
  if (mirror) {
    processedKeypoints = keypoints.map(kp => ({
      ...kp,
      x: 1 - kp.x,
    }));
  }

  const angles = calculateAngles(processedKeypoints);
  const confidence = calculateConfidence(processedKeypoints);

  return {
    angles,
    confidence,
    centerX,
    centerY,
    scale,
  };
}

export function getBodyPartAngles(angles: number[]): {
  arms: number[];
  legs: number[];
  torso: number[];
} {
  return {
    arms: angles.slice(0, 4),   // First 4 angles are arms
    legs: angles.slice(4, 8),   // Next 4 are legs
    torso: angles.slice(8, 10), // Last 2 are torso
  };
}

export { LANDMARKS, ANGLE_DEFINITIONS };
