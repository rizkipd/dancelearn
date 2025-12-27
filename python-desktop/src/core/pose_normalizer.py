"""
Pose Normalizer - Matches web version logic

Extracts joint angles and normalizes poses for comparison.
Handles mirroring for dancer view.
"""

import math
import numpy as np
from dataclasses import dataclass, field
from typing import List, Optional
from .pose_detector import PoseResult, Keypoint


# MediaPipe Pose landmark indices
class LANDMARKS:
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28


# Joint angle definitions: [joint, parent, child]
# Matches web version exactly
ANGLE_DEFINITIONS = [
    # Arms (indices 0-3)
    (LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_ELBOW),
    (LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_WRIST),
    (LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_ELBOW),
    (LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_WRIST),
    # Legs (indices 4-7)
    (LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_KNEE),
    (LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_ANKLE),
    (LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_KNEE),
    (LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_ANKLE),
    # Torso (indices 8-9)
    (LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_SHOULDER),
    (LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP, LANDMARKS.LEFT_SHOULDER),
]

# Relevant keypoint indices for confidence calculation
RELEVANT_INDICES = [
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
]


@dataclass
class NormalizedPose:
    """Normalized pose with angles and confidence - matches web version."""
    angles: List[float]  # 10 angles in radians
    confidence: List[float]  # 12 confidence values
    center_x: float
    center_y: float
    scale: float


@dataclass
class BodyPartAngles:
    """Body part angles grouped."""
    arms: List[float]  # indices 0-3
    legs: List[float]  # indices 4-7
    torso: List[float]  # indices 8-9


class PoseNormalizer:
    """
    Normalizes poses for comparison by extracting joint angles.
    Matches web version logic exactly.
    """

    def __init__(self, smoothing_factor: float = 0.3):
        """
        Args:
            smoothing_factor: 0-1, higher = more smoothing (desktop enhancement)
        """
        self.smoothing_factor = smoothing_factor
        self._prev_angles: Optional[List[float]] = None

    def _calculate_angle(self, p1: Keypoint, p2: Keypoint, p3: Keypoint) -> float:
        """
        Calculate angle at p2 formed by p1-p2-p3.
        Returns angle in radians (matches web version).
        """
        v1_x = p1.x - p2.x
        v1_y = p1.y - p2.y
        v2_x = p3.x - p2.x
        v2_y = p3.y - p2.y

        dot = v1_x * v2_x + v1_y * v2_y
        mag1 = math.sqrt(v1_x * v1_x + v1_y * v1_y)
        mag2 = math.sqrt(v2_x * v2_x + v2_y * v2_y)

        if mag1 == 0 or mag2 == 0:
            return 0.0

        cos_angle = max(-1.0, min(1.0, dot / (mag1 * mag2)))
        return math.acos(cos_angle)

    def calculate_angles(self, keypoints: List[Keypoint]) -> List[float]:
        """Calculate all 10 joint angles."""
        angles = []
        for joint, parent, child in ANGLE_DEFINITIONS:
            p1 = keypoints[parent]
            p2 = keypoints[joint]
            p3 = keypoints[child]
            angle = self._calculate_angle(p1, p2, p3)
            angles.append(angle)
        return angles

    def calculate_confidence(self, keypoints: List[Keypoint]) -> List[float]:
        """Get confidence for relevant keypoints."""
        return [keypoints[idx].visibility for idx in RELEVANT_INDICES]

    def _smooth_angles(self, angles: List[float]) -> List[float]:
        """Apply exponential smoothing for smoother skeleton (desktop enhancement)."""
        if self._prev_angles is None:
            self._prev_angles = angles.copy()
            return angles

        smoothed = []
        for i, angle in enumerate(angles):
            smoothed_angle = (
                self.smoothing_factor * self._prev_angles[i] +
                (1 - self.smoothing_factor) * angle
            )
            smoothed.append(smoothed_angle)

        self._prev_angles = smoothed.copy()
        return smoothed

    def normalize(
        self,
        pose: PoseResult,
        mirror: bool = False,
        apply_smoothing: bool = True,
    ) -> Optional[NormalizedPose]:
        """
        Extract normalized joint angles from pose.

        Args:
            pose: Raw pose detection result
            mirror: If True, flip X coordinates (for dancer webcam)
            apply_smoothing: If True, apply smoothing for desktop (default True)

        Returns:
            NormalizedPose or None if pose invalid
        """
        if not pose.is_valid:
            return None

        keypoints = pose.keypoints

        # Mirror keypoints if needed (matches web version)
        if mirror:
            keypoints = [
                Keypoint(x=1 - kp.x, y=kp.y, z=kp.z, visibility=kp.visibility)
                for kp in keypoints
            ]

        # Calculate center (hip midpoint)
        left_hip = keypoints[LANDMARKS.LEFT_HIP]
        right_hip = keypoints[LANDMARKS.RIGHT_HIP]
        center_x = (left_hip.x + right_hip.x) / 2
        center_y = (left_hip.y + right_hip.y) / 2

        # Calculate torso length for scale
        left_shoulder = keypoints[LANDMARKS.LEFT_SHOULDER]
        right_shoulder = keypoints[LANDMARKS.RIGHT_SHOULDER]
        shoulder_center_x = (left_shoulder.x + right_shoulder.x) / 2
        shoulder_center_y = (left_shoulder.y + right_shoulder.y) / 2

        torso_length = math.sqrt(
            (shoulder_center_x - center_x) ** 2 +
            (shoulder_center_y - center_y) ** 2
        )
        scale = torso_length if torso_length > 0 else 1.0

        # Calculate angles
        angles = self.calculate_angles(keypoints)

        # Apply smoothing for desktop (makes skeleton movement smoother)
        if apply_smoothing:
            angles = self._smooth_angles(angles)

        confidence = self.calculate_confidence(keypoints)

        return NormalizedPose(
            angles=angles,
            confidence=confidence,
            center_x=center_x,
            center_y=center_y,
            scale=scale,
        )

    def reset_smoothing(self):
        """Reset smoothing state (call when starting new session)."""
        self._prev_angles = None


def get_body_part_angles(angles: List[float]) -> BodyPartAngles:
    """Split angles into body parts - matches web version."""
    return BodyPartAngles(
        arms=angles[0:4],   # First 4 angles are arms
        legs=angles[4:8],   # Next 4 are legs
        torso=angles[8:10], # Last 2 are torso
    )


def get_body_part_confidence(confidence: List[float]) -> BodyPartAngles:
    """Split confidence into body parts."""
    return BodyPartAngles(
        arms=confidence[0:4],
        legs=confidence[4:8],
        torso=confidence[8:10] if len(confidence) >= 10 else confidence[8:12],
    )
