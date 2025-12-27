"""
Calibration Dialog - Pre-session position checks.

Validates:
- Body in frame
- Good lighting
- Proper distance
"""

from typing import Optional, List
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QFrame, QProgressBar
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QFont

from ..core.pose_detector import PoseResult


class CheckItem(QFrame):
    """Single calibration check item."""

    def __init__(self, label: str, parent: Optional[QFrame] = None):
        super().__init__(parent)
        self.label_text = label
        self._passed = False
        self._setup_ui()

    def _setup_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 8, 12, 8)

        # Status icon
        self._icon = QLabel("○")
        self._icon.setFont(QFont("Arial", 16))
        self._icon.setFixedWidth(24)
        layout.addWidget(self._icon)

        # Label
        self._label = QLabel(self.label_text)
        self._label.setFont(QFont("Arial", 12))
        layout.addWidget(self._label, 1)

        # Status text
        self._status = QLabel("Checking...")
        self._status.setFont(QFont("Arial", 11))
        layout.addWidget(self._status)

        self._update_style()

    def set_passed(self, passed: bool, status_text: str = ""):
        """Update check status."""
        self._passed = passed
        if status_text:
            self._status.setText(status_text)
        else:
            self._status.setText("OK" if passed else "Not ready")
        self._update_style()

    def _update_style(self):
        if self._passed:
            self._icon.setText("✓")
            self._icon.setStyleSheet("color: #22c55e;")
            self._status.setStyleSheet("color: #22c55e;")
            self.setStyleSheet("""
                CheckItem {
                    background: rgba(34, 197, 94, 0.1);
                    border-radius: 8px;
                }
            """)
        else:
            self._icon.setText("○")
            self._icon.setStyleSheet("color: #888;")
            self._status.setStyleSheet("color: #888;")
            self.setStyleSheet("""
                CheckItem {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                }
            """)

    @property
    def passed(self) -> bool:
        return self._passed


class CalibrationDialog(QDialog):
    """
    Calibration dialog for pre-session checks.

    Signals:
        calibration_complete: Emitted when all checks pass
        cancelled: Emitted when user cancels
    """

    calibration_complete = pyqtSignal()
    cancelled = pyqtSignal()

    # Thresholds
    MIN_VISIBLE_KEYPOINTS = 20
    MIN_BODY_RATIO = 0.3  # Body should be at least 30% of frame
    MAX_BODY_RATIO = 0.9  # Body should be at most 90% of frame

    def __init__(self, parent: Optional[QDialog] = None):
        super().__init__(parent)
        self._setup_ui()
        self._checks_passed_count = 0
        self._auto_proceed_timer = QTimer(self)
        self._auto_proceed_timer.timeout.connect(self._on_auto_proceed)
        self._countdown = 3

    def _setup_ui(self):
        self.setWindowTitle("Calibration")
        self.setFixedSize(400, 350)
        self.setStyleSheet("""
            QDialog {
                background: #1a1a1a;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        # Title
        title = QLabel("Position Check")
        title.setFont(QFont("Arial", 20, QFont.Weight.Bold))
        title.setStyleSheet("color: white;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)

        # Subtitle
        subtitle = QLabel("Stand in front of the camera")
        subtitle.setFont(QFont("Arial", 12))
        subtitle.setStyleSheet("color: #888;")
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(subtitle)

        layout.addSpacing(12)

        # Check items
        self._body_check = CheckItem("Body in frame")
        layout.addWidget(self._body_check)

        self._distance_check = CheckItem("Proper distance")
        layout.addWidget(self._distance_check)

        self._visibility_check = CheckItem("Joints visible")
        layout.addWidget(self._visibility_check)

        layout.addStretch()

        # Status / countdown
        self._status_label = QLabel("Waiting for position...")
        self._status_label.setFont(QFont("Arial", 14))
        self._status_label.setStyleSheet("color: #3b82f6;")
        self._status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self._status_label)

        layout.addSpacing(12)

        # Buttons
        btn_layout = QHBoxLayout()

        self._cancel_btn = QPushButton("Cancel")
        self._cancel_btn.setFont(QFont("Arial", 12))
        self._cancel_btn.setFixedSize(120, 40)
        self._cancel_btn.setStyleSheet("""
            QPushButton {
                background: #374151;
                color: white;
                border: none;
                border-radius: 8px;
            }
            QPushButton:hover {
                background: #4b5563;
            }
        """)
        self._cancel_btn.clicked.connect(self._on_cancel)
        btn_layout.addWidget(self._cancel_btn)

        btn_layout.addStretch()

        self._start_btn = QPushButton("Start Now")
        self._start_btn.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        self._start_btn.setFixedSize(120, 40)
        self._start_btn.setEnabled(False)
        self._start_btn.setStyleSheet("""
            QPushButton {
                background: #22c55e;
                color: white;
                border: none;
                border-radius: 8px;
            }
            QPushButton:hover {
                background: #16a34a;
            }
            QPushButton:disabled {
                background: #374151;
                color: #666;
            }
        """)
        self._start_btn.clicked.connect(self._on_start)
        btn_layout.addWidget(self._start_btn)

        layout.addLayout(btn_layout)

    def update_pose(self, pose: Optional[PoseResult], frame_width: int, frame_height: int):
        """
        Update calibration checks based on current pose.

        Args:
            pose: Current pose detection result
            frame_width: Video frame width
            frame_height: Video frame height
        """
        if pose is None or not pose.keypoints:
            self._body_check.set_passed(False, "No body detected")
            self._distance_check.set_passed(False, "—")
            self._visibility_check.set_passed(False, "—")
            self._on_checks_updated()
            return

        keypoints = pose.keypoints

        # Check 1: Body in frame (major joints visible)
        visible_count = sum(1 for kp in keypoints if kp.visibility > 0.5)
        body_in_frame = visible_count >= self.MIN_VISIBLE_KEYPOINTS
        self._body_check.set_passed(
            body_in_frame,
            f"{visible_count} joints" if body_in_frame else f"Only {visible_count} joints"
        )

        # Check 2: Proper distance (body size relative to frame)
        if body_in_frame:
            # Calculate bounding box
            visible_kps = [kp for kp in keypoints if kp.visibility > 0.5]
            min_x = min(kp.x for kp in visible_kps)
            max_x = max(kp.x for kp in visible_kps)
            min_y = min(kp.y for kp in visible_kps)
            max_y = max(kp.y for kp in visible_kps)

            body_width = max_x - min_x
            body_height = max_y - min_y
            body_ratio = max(body_width, body_height)

            if body_ratio < self.MIN_BODY_RATIO:
                self._distance_check.set_passed(False, "Too far away")
            elif body_ratio > self.MAX_BODY_RATIO:
                self._distance_check.set_passed(False, "Too close")
            else:
                self._distance_check.set_passed(True, "Good distance")
        else:
            self._distance_check.set_passed(False, "—")

        # Check 3: Key joints visible with good confidence
        key_indices = [11, 12, 23, 24, 13, 14, 25, 26]  # Shoulders, hips, elbows, knees
        key_visible = sum(1 for i in key_indices if keypoints[i].visibility > 0.6)
        joints_ok = key_visible >= 6
        self._visibility_check.set_passed(
            joints_ok,
            f"{key_visible}/8 key joints" if not joints_ok else "All visible"
        )

        self._on_checks_updated()

    def _on_checks_updated(self):
        """Handle check status changes."""
        all_passed = (
            self._body_check.passed and
            self._distance_check.passed and
            self._visibility_check.passed
        )

        self._start_btn.setEnabled(all_passed)

        if all_passed:
            if not self._auto_proceed_timer.isActive():
                self._countdown = 3
                self._auto_proceed_timer.start(1000)
                self._status_label.setText(f"Starting in {self._countdown}...")
                self._status_label.setStyleSheet("color: #22c55e;")
        else:
            self._auto_proceed_timer.stop()
            self._status_label.setText("Waiting for position...")
            self._status_label.setStyleSheet("color: #3b82f6;")

    def _on_auto_proceed(self):
        """Auto-proceed countdown tick."""
        self._countdown -= 1
        if self._countdown <= 0:
            self._auto_proceed_timer.stop()
            self._on_start()
        else:
            self._status_label.setText(f"Starting in {self._countdown}...")

    def _on_start(self):
        """Start button clicked."""
        self._auto_proceed_timer.stop()
        self.calibration_complete.emit()
        self.accept()

    def _on_cancel(self):
        """Cancel button clicked."""
        self._auto_proceed_timer.stop()
        self.cancelled.emit()
        self.reject()

    def reset(self):
        """Reset dialog state."""
        self._body_check.set_passed(False, "Checking...")
        self._distance_check.set_passed(False, "Checking...")
        self._visibility_check.set_passed(False, "Checking...")
        self._start_btn.setEnabled(False)
        self._status_label.setText("Waiting for position...")
        self._status_label.setStyleSheet("color: #3b82f6;")
        self._auto_proceed_timer.stop()
