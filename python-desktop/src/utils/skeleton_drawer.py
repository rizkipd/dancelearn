"""
Skeleton Drawer - Draw pose skeleton on video frames.

Enhanced with SMOOTH interpolation between poses.
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional
from ..core.pose_detector import PoseResult, Keypoint


class SmoothKeypoint:
    """Keypoint with smoothing/interpolation."""

    def __init__(self, smoothing: float = 0.5):
        self.x = 0.0
        self.y = 0.0
        self.visibility = 0.0
        self.smoothing = smoothing
        self._initialized = False

    def update(self, kp: Keypoint):
        """Update with new keypoint, applying smoothing."""
        if not self._initialized:
            self.x = kp.x
            self.y = kp.y
            self.visibility = kp.visibility
            self._initialized = True
        else:
            # Exponential smoothing for smooth movement
            s = self.smoothing
            self.x = s * self.x + (1 - s) * kp.x
            self.y = s * self.y + (1 - s) * kp.y
            self.visibility = s * self.visibility + (1 - s) * kp.visibility

    def to_pixel(self, width: int, height: int) -> Tuple[int, int]:
        return int(self.x * width), int(self.y * height)

    def reset(self):
        self._initialized = False


class SkeletonSmoother:
    """Maintains smooth skeleton positions across frames."""

    def __init__(self, num_keypoints: int = 33, smoothing: float = 0.4):
        """
        Args:
            num_keypoints: Number of keypoints (33 for MediaPipe)
            smoothing: 0-1, higher = smoother but more lag
        """
        self.keypoints = [SmoothKeypoint(smoothing) for _ in range(num_keypoints)]
        self.smoothing = smoothing

    def update(self, pose: Optional[PoseResult]) -> List[SmoothKeypoint]:
        """Update with new pose, return smoothed keypoints."""
        if pose and pose.keypoints:
            for i, kp in enumerate(pose.keypoints):
                if i < len(self.keypoints):
                    self.keypoints[i].update(kp)
        return self.keypoints

    def reset(self):
        """Reset all keypoints."""
        for kp in self.keypoints:
            kp.reset()


class SkeletonDrawer:
    """
    Draws skeleton overlay on video frames.
    Supports different colors for dancer vs teacher.
    NOW WITH SMOOTH INTERPOLATION!
    """

    # Colors (BGR format for OpenCV)
    DANCER_COLOR = (136, 255, 0)      # Green #00ff88
    TEACHER_COLOR = (107, 107, 255)   # Red #ff6b6b
    JOINT_COLOR_HIGH = (0, 255, 0)    # Green for high confidence
    JOINT_COLOR_LOW = (0, 165, 255)   # Orange for low confidence

    # Skeleton connections
    CONNECTIONS = [
        # Torso
        (11, 12), (11, 23), (12, 24), (23, 24),
        # Left arm
        (11, 13), (13, 15),
        # Right arm
        (12, 14), (14, 16),
        # Left leg
        (23, 25), (25, 27),
        # Right leg
        (24, 26), (26, 28),
        # Face (optional)
        (0, 11), (0, 12),  # Nose to shoulders
    ]

    def __init__(
        self,
        line_thickness: int = 3,
        joint_radius: int = 6,
        min_confidence: float = 0.5,
        antialiased: bool = True,
        smoothing: float = 0.6,  # Skeleton smoothing factor (higher = smoother)
    ):
        """
        Args:
            line_thickness: Thickness of skeleton lines
            joint_radius: Radius of joint circles
            min_confidence: Minimum confidence to draw a joint
            antialiased: Use antialiased lines for smoother look
            smoothing: 0-1, higher = smoother skeleton movement (0.6 for 60fps-like feel)
        """
        self.line_thickness = line_thickness
        self.joint_radius = joint_radius
        self.min_confidence = min_confidence
        self.antialiased = antialiased

        # Single smoother per drawer (each VideoWidget has its own SkeletonDrawer)
        self._smoother = SkeletonSmoother(smoothing=smoothing)

    def draw(
        self,
        frame: np.ndarray,
        pose: Optional[PoseResult],
        color: Tuple[int, int, int] = None,
        is_dancer: bool = True,
        alpha: float = 1.0,
    ) -> np.ndarray:
        """
        Draw skeleton overlay on frame with SMOOTH interpolation.

        Args:
            frame: BGR image
            pose: Pose detection result
            color: Override color (BGR)
            is_dancer: True for dancer (green), False for teacher (red)
            alpha: Transparency 0-1

        Returns:
            Frame with skeleton overlay
        """
        # Update smoother with new pose (even if None, keeps last position)
        smooth_keypoints = self._smoother.update(pose)

        # Check if we have valid data
        if not any(kp._initialized for kp in smooth_keypoints):
            return frame

        # Choose color
        if color is None:
            color = self.DANCER_COLOR if is_dancer else self.TEACHER_COLOR

        height, width = frame.shape[:2]

        # Create overlay for alpha blending
        if alpha < 1.0:
            overlay = frame.copy()
        else:
            overlay = frame

        # Draw connections (lines)
        for start_idx, end_idx in self.CONNECTIONS:
            if start_idx >= len(smooth_keypoints) or end_idx >= len(smooth_keypoints):
                continue

            start_kp = smooth_keypoints[start_idx]
            end_kp = smooth_keypoints[end_idx]

            # Check confidence
            if start_kp.visibility < self.min_confidence or end_kp.visibility < self.min_confidence:
                continue

            # Get pixel coordinates
            start_pt = start_kp.to_pixel(width, height)
            end_pt = end_kp.to_pixel(width, height)

            # Draw line
            line_type = cv2.LINE_AA if self.antialiased else cv2.LINE_8
            cv2.line(
                overlay,
                start_pt,
                end_pt,
                color,
                self.line_thickness,
                lineType=line_type,
            )

        # Draw joints (circles)
        for i, kp in enumerate(smooth_keypoints):
            if kp.visibility < self.min_confidence:
                continue

            pt = kp.to_pixel(width, height)

            # Color based on confidence
            if kp.visibility > 0.8:
                joint_color = self.JOINT_COLOR_HIGH
            else:
                joint_color = self.JOINT_COLOR_LOW

            # Draw outer ring (color) and inner circle (white)
            cv2.circle(overlay, pt, self.joint_radius, color, -1, cv2.LINE_AA)
            cv2.circle(overlay, pt, self.joint_radius - 2, (255, 255, 255), -1, cv2.LINE_AA)

        # Apply alpha blending
        if alpha < 1.0:
            cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)
            return frame
        else:
            return overlay

    def draw_comparison(
        self,
        frame: np.ndarray,
        dancer_pose: Optional[PoseResult],
        teacher_pose: Optional[PoseResult],
        dancer_alpha: float = 1.0,
        teacher_alpha: float = 0.5,
    ) -> np.ndarray:
        """
        Draw both dancer and teacher skeletons for comparison.
        """
        # Draw teacher first (behind)
        if teacher_pose:
            frame = self.draw(frame, teacher_pose, is_dancer=False, alpha=teacher_alpha)

        # Draw dancer on top
        if dancer_pose:
            frame = self.draw(frame, dancer_pose, is_dancer=True, alpha=dancer_alpha)

        return frame

    def reset(self):
        """Reset smoother (call when starting new session)."""
        self._smoother.reset()


def draw_score_on_frame(
    frame: np.ndarray,
    score: int,
    position: Tuple[int, int] = (20, 50),
) -> np.ndarray:
    """Draw score text on frame."""
    # Choose color based on score
    if score >= 80:
        color = (0, 255, 0)  # Green
    elif score >= 60:
        color = (0, 255, 255)  # Yellow
    else:
        color = (0, 0, 255)  # Red

    # Draw shadow for better visibility
    cv2.putText(
        frame,
        f"Score: {score}",
        (position[0] + 2, position[1] + 2),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.5,
        (0, 0, 0),
        4,
        cv2.LINE_AA,
    )

    # Draw score text
    cv2.putText(
        frame,
        f"Score: {score}",
        position,
        cv2.FONT_HERSHEY_SIMPLEX,
        1.5,
        color,
        3,
        cv2.LINE_AA,
    )

    return frame
