"""
MediaPipe Pose Detection Wrapper

Extracts 33 pose landmarks from video frames with confidence scores.
Supports both legacy (mp.solutions) and new MediaPipe APIs.
"""

import numpy as np
from dataclasses import dataclass
from typing import Optional, List, Tuple


@dataclass
class Keypoint:
    """Single pose keypoint with position and confidence."""
    x: float  # Normalized 0-1
    y: float  # Normalized 0-1
    z: float  # Depth (relative)
    visibility: float  # Confidence 0-1

    def to_pixel(self, width: int, height: int) -> Tuple[int, int]:
        """Convert normalized coords to pixel coords."""
        return int(self.x * width), int(self.y * height)


@dataclass
class PoseResult:
    """Complete pose detection result."""
    keypoints: List[Keypoint]
    timestamp_ms: float

    @property
    def is_valid(self) -> bool:
        """Check if pose has enough visible keypoints."""
        visible_count = sum(1 for kp in self.keypoints if kp.visibility > 0.5)
        return visible_count >= 15  # At least half of major joints


class PoseDetector:
    """
    MediaPipe Pose detector wrapper.

    Landmarks (33 total):
    0: nose, 1-4: eyes, 5-10: ears/mouth
    11-12: shoulders, 13-14: elbows, 15-16: wrists
    17-22: hands
    23-24: hips, 25-26: knees, 27-28: ankles
    29-32: feet
    """

    # Key landmark indices
    NOSE = 0
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

    # Skeleton connections for drawing
    POSE_CONNECTIONS = [
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
    ]

    def __init__(
        self,
        model_complexity: int = 1,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        """
        Initialize pose detector.

        Args:
            model_complexity: 0=Lite, 1=Full, 2=Heavy (accuracy vs speed)
            min_detection_confidence: Minimum confidence for detection
            min_tracking_confidence: Minimum confidence for tracking
        """
        self._use_legacy = False
        self._pose = None
        self._landmarker = None

        # Try new API first (mediapipe >= 0.10.8)
        try:
            import mediapipe as mp
            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision
            from mediapipe import solutions

            # Check if solutions.pose exists (legacy API)
            if hasattr(solutions, 'pose'):
                self._use_legacy = True
                self._pose = solutions.pose.Pose(
                    model_complexity=model_complexity,
                    min_detection_confidence=min_detection_confidence,
                    min_tracking_confidence=min_tracking_confidence,
                    enable_segmentation=False,
                )
            else:
                raise AttributeError("No legacy API")

        except (ImportError, AttributeError):
            # Try legacy API
            try:
                import mediapipe as mp
                self._use_legacy = True
                self._pose = mp.solutions.pose.Pose(
                    model_complexity=model_complexity,
                    min_detection_confidence=min_detection_confidence,
                    min_tracking_confidence=min_tracking_confidence,
                    enable_segmentation=False,
                )
            except AttributeError:
                # Neither API works - try tasks API
                try:
                    import mediapipe as mp
                    from mediapipe.tasks import python
                    from mediapipe.tasks.python import vision
                    import urllib.request
                    import os

                    # Download model if needed
                    model_path = os.path.join(os.path.dirname(__file__), "pose_landmarker.task")
                    if not os.path.exists(model_path):
                        url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
                        urllib.request.urlretrieve(url, model_path)

                    base_options = python.BaseOptions(model_asset_path=model_path)
                    options = vision.PoseLandmarkerOptions(
                        base_options=base_options,
                        running_mode=vision.RunningMode.IMAGE,
                        min_pose_detection_confidence=min_detection_confidence,
                        min_tracking_confidence=min_tracking_confidence,
                    )
                    self._landmarker = vision.PoseLandmarker.create_from_options(options)
                    self._use_legacy = False
                except Exception as e:
                    raise RuntimeError(
                        f"Failed to initialize MediaPipe. "
                        f"Try: pip install mediapipe==0.10.9\n"
                        f"Error: {e}"
                    )

    def detect(self, frame: np.ndarray, timestamp_ms: float = 0) -> Optional[PoseResult]:
        """
        Detect pose in a BGR frame.

        Args:
            frame: BGR image from OpenCV
            timestamp_ms: Frame timestamp in milliseconds

        Returns:
            PoseResult if pose detected, None otherwise
        """
        # Convert BGR to RGB for MediaPipe
        rgb_frame = frame[:, :, ::-1].copy()

        if self._use_legacy and self._pose:
            # Legacy API (mp.solutions.pose)
            results = self._pose.process(rgb_frame)

            if not results.pose_landmarks:
                return None

            keypoints = []
            for landmark in results.pose_landmarks.landmark:
                keypoints.append(Keypoint(
                    x=landmark.x,
                    y=landmark.y,
                    z=landmark.z,
                    visibility=landmark.visibility,
                ))

            return PoseResult(keypoints=keypoints, timestamp_ms=timestamp_ms)

        elif self._landmarker:
            # Tasks API (mediapipe.tasks)
            import mediapipe as mp

            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            results = self._landmarker.detect(mp_image)

            if not results.pose_landmarks or len(results.pose_landmarks) == 0:
                return None

            keypoints = []
            for landmark in results.pose_landmarks[0]:
                keypoints.append(Keypoint(
                    x=landmark.x,
                    y=landmark.y,
                    z=landmark.z,
                    visibility=landmark.visibility if hasattr(landmark, 'visibility') else 1.0,
                ))

            return PoseResult(keypoints=keypoints, timestamp_ms=timestamp_ms)

        return None

    def close(self):
        """Release resources."""
        if self._pose:
            self._pose.close()
        if self._landmarker:
            self._landmarker.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
