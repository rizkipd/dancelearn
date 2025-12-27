"""
Video Widget - Display video frames with skeleton overlay.

Uses QLabel + QPixmap for efficient rendering.
"""

import cv2
import numpy as np
from typing import Optional
from PyQt6.QtWidgets import QWidget, QLabel, QVBoxLayout, QSizePolicy
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QImage, QPixmap

from ..core.pose_detector import PoseResult
from ..utils.skeleton_drawer import SkeletonDrawer


class VideoWidget(QWidget):
    """
    Displays video frames with optional skeleton overlay.
    Maintains aspect ratio and supports mirroring.
    """

    def __init__(
        self,
        title: str = "",
        is_dancer: bool = True,
        parent: Optional[QWidget] = None,
    ):
        super().__init__(parent)
        self.is_dancer = is_dancer
        self._current_pose: Optional[PoseResult] = None
        self._show_skeleton = True
        self._skeleton_drawer = SkeletonDrawer()

        # Setup UI
        self._setup_ui(title)

    def _setup_ui(self, title: str):
        """Setup the widget layout."""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Title label
        if title:
            self._title_label = QLabel(title)
            self._title_label.setStyleSheet("""
                QLabel {
                    color: white;
                    font-size: 14px;
                    font-weight: bold;
                    padding: 8px;
                    background: rgba(0, 0, 0, 0.5);
                }
            """)
            self._title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            layout.addWidget(self._title_label)

        # Video display label
        self._video_label = QLabel()
        self._video_label.setStyleSheet("background: #1a1a1a;")
        self._video_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._video_label.setSizePolicy(
            QSizePolicy.Policy.Expanding,
            QSizePolicy.Policy.Expanding
        )
        self._video_label.setMinimumSize(320, 240)
        layout.addWidget(self._video_label)

        # Placeholder text
        self._video_label.setText("No video")
        self._video_label.setStyleSheet("""
            QLabel {
                color: #666;
                font-size: 18px;
                background: #1a1a1a;
            }
        """)

    def update_frame(self, frame: np.ndarray, pose: Optional[PoseResult] = None):
        """
        Update displayed frame with optional skeleton overlay.

        Args:
            frame: BGR image from OpenCV
            pose: Optional pose for skeleton overlay
        """
        self._current_pose = pose

        # Draw skeleton if enabled
        if self._show_skeleton and pose:
            frame = self._skeleton_drawer.draw(
                frame.copy(),
                pose,
                is_dancer=self.is_dancer,
            )

        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb_frame.shape

        # Create QImage
        bytes_per_line = ch * w
        q_image = QImage(
            rgb_frame.data,
            w,
            h,
            bytes_per_line,
            QImage.Format.Format_RGB888
        )

        # Scale to fit widget while maintaining aspect ratio
        pixmap = QPixmap.fromImage(q_image)
        scaled_pixmap = pixmap.scaled(
            self._video_label.size(),
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation
        )

        self._video_label.setPixmap(scaled_pixmap)

    def set_show_skeleton(self, show: bool):
        """Enable/disable skeleton overlay."""
        self._show_skeleton = show

    def set_placeholder(self, text: str):
        """Set placeholder text when no video."""
        self._video_label.clear()
        self._video_label.setText(text)
        self._video_label.setStyleSheet("""
            QLabel {
                color: #666;
                font-size: 18px;
                background: #1a1a1a;
            }
        """)

    def clear(self):
        """Clear the display."""
        self._video_label.clear()
        self._current_pose = None

    def reset(self):
        """Reset widget state including skeleton smoother."""
        self.clear()
        self._skeleton_drawer.reset()

    def sizeHint(self) -> QSize:
        """Preferred size."""
        return QSize(640, 480)


class DancerVideoWidget(VideoWidget):
    """Video widget configured for dancer (webcam)."""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(title="You", is_dancer=True, parent=parent)
        self.set_placeholder("Camera not started")


class TeacherVideoWidget(VideoWidget):
    """Video widget configured for teacher (video file)."""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(title="Teacher", is_dancer=False, parent=parent)
        self.set_placeholder("Load a video")
