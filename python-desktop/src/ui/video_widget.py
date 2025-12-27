"""
Video Widget - Display video frames with skeleton overlay.
Simple and clean design.
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
    """Displays video frames with optional skeleton overlay."""

    def __init__(self, title: str = "", is_dancer: bool = True, parent=None):
        super().__init__(parent)
        self.is_dancer = is_dancer
        self._title = title
        self._show_skeleton = True
        self._skeleton_drawer = SkeletonDrawer(smoothing=0.5)  # Higher smoothing for smoother skeleton
        self._last_pose: Optional[PoseResult] = None  # Store last pose for continuous drawing
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Video display
        self._video_label = QLabel()
        self._video_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._video_label.setSizePolicy(
            QSizePolicy.Policy.Expanding,
            QSizePolicy.Policy.Expanding
        )
        self._video_label.setMinimumSize(320, 240)
        self._video_label.setStyleSheet("""
            QLabel {
                background: #0a0a0a;
                border-radius: 8px;
            }
        """)
        layout.addWidget(self._video_label)

        # Title overlay
        self._title_label = QLabel(self._title, self._video_label)
        self._title_label.setStyleSheet("""
            QLabel {
                color: white;
                background: rgba(0, 0, 0, 0.7);
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
            }
        """)
        self._title_label.adjustSize()
        self._title_label.move(8, 8)

        # Placeholder
        self._placeholder = QLabel("", self._video_label)
        self._placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._placeholder.setStyleSheet("""
            QLabel {
                color: #555555;
                font-size: 14px;
                background: transparent;
            }
        """)

    def update_frame(self, frame: np.ndarray, pose: Optional[PoseResult] = None):
        """Update displayed frame."""
        self._placeholder.hide()

        # Update last pose if new pose available
        if pose:
            self._last_pose = pose

        # Draw skeleton if enabled (use last pose for continuous smooth drawing)
        if self._show_skeleton and self._last_pose:
            frame = self._skeleton_drawer.draw(
                frame.copy(),
                pose,  # Pass current pose (can be None, smoother will interpolate)
                is_dancer=self.is_dancer,
            )

        # Convert BGR to RGB
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb.shape

        # Create QImage and scale
        img = QImage(rgb.data, w, h, ch * w, QImage.Format.Format_RGB888)
        pixmap = QPixmap.fromImage(img)

        # Scale to fit
        scaled = pixmap.scaled(
            self._video_label.size(),
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation
        )
        self._video_label.setPixmap(scaled)

    def set_show_skeleton(self, show: bool):
        self._show_skeleton = show

    def set_placeholder(self, text: str):
        self._video_label.clear()
        self._placeholder.setText(text)
        self._placeholder.adjustSize()
        self._center_placeholder()
        self._placeholder.show()

    def _center_placeholder(self):
        if self._placeholder.text():
            x = (self._video_label.width() - self._placeholder.width()) // 2
            y = (self._video_label.height() - self._placeholder.height()) // 2
            self._placeholder.move(max(0, x), max(0, y))

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self._center_placeholder()

    def clear(self):
        self._video_label.clear()

    def reset(self):
        self.clear()
        self._skeleton_drawer.reset()
        self._last_pose = None

    def sizeHint(self):
        return QSize(640, 480)


class DancerVideoWidget(VideoWidget):
    """Webcam view - green skeleton."""

    def __init__(self, parent=None):
        super().__init__(title="You", is_dancer=True, parent=parent)
        self.set_placeholder("Camera not started")


class TeacherVideoWidget(VideoWidget):
    """Teacher video - red skeleton."""

    def __init__(self, parent=None):
        super().__init__(title="Teacher", is_dancer=False, parent=parent)
        self.set_placeholder("Load a video")
