"""
Calibration Dialog - Pre-session position checks.
Simple and clean design.
"""

from typing import Optional
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QFrame, QWidget
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal

from ..core.pose_detector import PoseResult


class CheckItem(QFrame):
    """Single calibration check item."""

    def __init__(self, label: str, parent=None):
        super().__init__(parent)
        self._label_text = label
        self._passed = False
        self.setObjectName("checkItem")
        self._setup_ui()

    def _setup_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 8, 12, 8)
        layout.setSpacing(10)

        # Icon
        self._icon = QLabel("○")
        self._icon.setFixedWidth(20)
        self._icon.setStyleSheet("font-size: 16px; color: #666666; border: none;")
        layout.addWidget(self._icon)

        # Label
        self._label = QLabel(self._label_text)
        self._label.setStyleSheet("font-size: 14px; color: #cccccc; border: none;")
        layout.addWidget(self._label, 1)

        # Status
        self._status = QLabel("Checking...")
        self._status.setStyleSheet("font-size: 12px; color: #666666; border: none;")
        layout.addWidget(self._status)

        self.setStyleSheet("#checkItem { background: #2a2a2a; border: none; border-radius: 6px; }")

    def set_passed(self, passed: bool, status: str = ""):
        self._passed = passed
        self._status.setText(status or ("OK" if passed else "Not ready"))

        if passed:
            self._icon.setText("✓")
            self._icon.setStyleSheet("font-size: 16px; color: #22c55e; border: none;")
            self._label.setStyleSheet("font-size: 14px; color: #22c55e; border: none;")
            self._status.setStyleSheet("font-size: 12px; color: #22c55e; border: none;")
        else:
            self._icon.setText("○")
            self._icon.setStyleSheet("font-size: 16px; color: #666666; border: none;")
            self._label.setStyleSheet("font-size: 14px; color: #cccccc; border: none;")
            self._status.setStyleSheet("font-size: 12px; color: #666666; border: none;")

    @property
    def passed(self):
        return self._passed


class CalibrationDialog(QDialog):
    """Calibration dialog for pre-session checks."""

    calibration_complete = pyqtSignal()
    cancelled = pyqtSignal()

    MIN_VISIBLE_KEYPOINTS = 20
    MIN_BODY_RATIO = 0.3
    MAX_BODY_RATIO = 0.9

    def __init__(self, parent=None):
        super().__init__(parent)
        self._countdown = 3
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._setup_ui()

    def _setup_ui(self):
        self.setWindowTitle("Position Check")
        self.setFixedSize(380, 340)
        self.setStyleSheet("QDialog { background: #1a1a1a; }")

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        # Title
        title = QLabel("Position Check")
        title.setStyleSheet("font-size: 22px; font-weight: bold; color: white;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)

        # Subtitle
        sub = QLabel("Stand in front of the camera")
        sub.setStyleSheet("font-size: 13px; color: #888888;")
        sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(sub)

        layout.addSpacing(8)

        # Checks
        self._body_check = CheckItem("Body in frame")
        self._distance_check = CheckItem("Proper distance")
        self._joints_check = CheckItem("Joints visible")

        layout.addWidget(self._body_check)
        layout.addWidget(self._distance_check)
        layout.addWidget(self._joints_check)

        layout.addStretch()

        # Countdown
        self._countdown_label = QLabel("")
        self._countdown_label.setStyleSheet("font-size: 56px; font-weight: bold; color: #22c55e;")
        self._countdown_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._countdown_label.hide()
        layout.addWidget(self._countdown_label)

        # Status
        self._status = QLabel("Waiting for position...")
        self._status.setStyleSheet("font-size: 14px; color: #3b82f6;")
        self._status.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self._status)

        layout.addSpacing(8)

        # Buttons
        btn_layout = QHBoxLayout()

        self._back_btn = QPushButton("Back")
        self._back_btn.setFixedHeight(40)
        self._back_btn.setStyleSheet("""
            QPushButton {
                background: #333333;
                color: #cccccc;
                border: none;
                border-radius: 6px;
                padding: 0 20px;
                font-size: 13px;
            }
            QPushButton:hover { background: #444444; }
        """)
        self._back_btn.clicked.connect(self._cancel)
        btn_layout.addWidget(self._back_btn)

        btn_layout.addStretch()

        self._start_btn = QPushButton("Start Now")
        self._start_btn.setFixedHeight(40)
        self._start_btn.setEnabled(False)
        self._start_btn.setStyleSheet("""
            QPushButton {
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 0 24px;
                font-size: 13px;
                font-weight: bold;
            }
            QPushButton:hover { background: #3b82f6; }
            QPushButton:disabled { background: #333333; color: #666666; }
        """)
        self._start_btn.clicked.connect(self._start)
        btn_layout.addWidget(self._start_btn)

        layout.addLayout(btn_layout)

    def update_pose(self, pose: Optional[PoseResult], frame_width: int, frame_height: int):
        """Update checks based on pose."""
        if not pose or not pose.keypoints:
            self._body_check.set_passed(False, "No body")
            self._distance_check.set_passed(False, "-")
            self._joints_check.set_passed(False, "-")
            self._update_state()
            return

        kps = pose.keypoints

        # Check 1: Body visible
        visible = sum(1 for k in kps if k.visibility > 0.5)
        body_ok = visible >= self.MIN_VISIBLE_KEYPOINTS
        self._body_check.set_passed(body_ok, f"{visible} joints" if body_ok else f"Only {visible}")

        # Check 2: Distance
        if body_ok:
            vis_kps = [k for k in kps if k.visibility > 0.5]
            w = max(k.x for k in vis_kps) - min(k.x for k in vis_kps)
            h = max(k.y for k in vis_kps) - min(k.y for k in vis_kps)
            ratio = max(w, h)

            if ratio < self.MIN_BODY_RATIO:
                self._distance_check.set_passed(False, "Too far")
            elif ratio > self.MAX_BODY_RATIO:
                self._distance_check.set_passed(False, "Too close")
            else:
                self._distance_check.set_passed(True, "Good")
        else:
            self._distance_check.set_passed(False, "-")

        # Check 3: Key joints
        key_idx = [11, 12, 23, 24, 13, 14, 25, 26]
        key_vis = sum(1 for i in key_idx if kps[i].visibility > 0.6)
        joints_ok = key_vis >= 6
        self._joints_check.set_passed(joints_ok, f"{key_vis}/8" if not joints_ok else "All visible")

        self._update_state()

    def _update_state(self):
        all_ok = self._body_check.passed and self._distance_check.passed and self._joints_check.passed
        self._start_btn.setEnabled(all_ok)

        if all_ok:
            if not self._timer.isActive():
                self._countdown = 3
                self._timer.start(1000)
                self._countdown_label.setText(str(self._countdown))
                self._countdown_label.show()
                self._status.setText("Get ready!")
                self._status.setStyleSheet("font-size: 14px; color: #22c55e;")
        else:
            self._timer.stop()
            self._countdown_label.hide()
            self._status.setText("Waiting for position...")
            self._status.setStyleSheet("font-size: 14px; color: #3b82f6;")

    def _tick(self):
        self._countdown -= 1
        if self._countdown <= 0:
            self._timer.stop()
            self._start()
        else:
            self._countdown_label.setText(str(self._countdown))

    def _start(self):
        self._timer.stop()
        self.calibration_complete.emit()
        self.accept()

    def _cancel(self):
        self._timer.stop()
        self.cancelled.emit()
        self.reject()

    def reset(self):
        self._body_check.set_passed(False, "Checking...")
        self._distance_check.set_passed(False, "Checking...")
        self._joints_check.set_passed(False, "Checking...")
        self._start_btn.setEnabled(False)
        self._countdown_label.hide()
        self._status.setText("Waiting for position...")
        self._timer.stop()


class CalibrationOverlay(QWidget):
    """Non-modal calibration overlay widget."""

    calibration_complete = pyqtSignal()
    cancelled = pyqtSignal()

    MIN_VISIBLE_KEYPOINTS = 20
    MIN_BODY_RATIO = 0.3
    MAX_BODY_RATIO = 0.9

    def __init__(self, parent=None):
        super().__init__(parent)
        self._countdown = 3
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._setup_ui()

    def _setup_ui(self):
        self.setFixedSize(380, 320)

        # Container frame with styled background - use object name for specific styling
        container = QFrame(self)
        container.setObjectName("calibrationContainer")
        container.setGeometry(0, 0, 380, 320)
        container.setStyleSheet("""
            #calibrationContainer {
                background: #1a1a1a;
                border: 2px solid #3b82f6;
                border-radius: 12px;
            }
        """)

        layout = QVBoxLayout(container)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(12)

        # Title
        title = QLabel("Position Check")
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: white;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)

        subtitle = QLabel("Stand back so your full body is visible")
        subtitle.setStyleSheet("font-size: 12px; color: #888;")
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(subtitle)

        layout.addSpacing(8)

        # Checks
        self._body_check = CheckItem("Body in frame")
        self._distance_check = CheckItem("Proper distance")
        self._joints_check = CheckItem("Joints visible")

        layout.addWidget(self._body_check)
        layout.addWidget(self._distance_check)
        layout.addWidget(self._joints_check)

        # Countdown
        self._countdown_label = QLabel("")
        self._countdown_label.setStyleSheet("font-size: 42px; font-weight: bold; color: #22c55e;")
        self._countdown_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._countdown_label.hide()
        layout.addWidget(self._countdown_label)

        # Status
        self._status = QLabel("Waiting for position...")
        self._status.setStyleSheet("font-size: 14px; color: #3b82f6;")
        self._status.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self._status)

        layout.addStretch()

        # Buttons
        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(12)

        self._back_btn = QPushButton("Cancel")
        self._back_btn.setFixedHeight(40)
        self._back_btn.setStyleSheet("""
            QPushButton {
                background: #374151;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 0 20px;
                font-size: 14px;
            }
            QPushButton:hover { background: #4b5563; }
        """)
        self._back_btn.clicked.connect(self._cancel)
        btn_layout.addWidget(self._back_btn)

        btn_layout.addStretch()

        self._start_btn = QPushButton("Start Now")
        self._start_btn.setFixedHeight(40)
        self._start_btn.setEnabled(False)
        self._start_btn.setStyleSheet("""
            QPushButton {
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 0 24px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover { background: #3b82f6; }
            QPushButton:disabled { background: #374151; color: #666666; }
        """)
        self._start_btn.clicked.connect(self._start)
        btn_layout.addWidget(self._start_btn)

        layout.addLayout(btn_layout)

    def update_pose(self, pose: Optional[PoseResult], frame_width: int, frame_height: int):
        """Update checks based on pose."""
        if not pose or not pose.keypoints:
            self._body_check.set_passed(False, "No body")
            self._distance_check.set_passed(False, "-")
            self._joints_check.set_passed(False, "-")
            self._update_state()
            return

        kps = pose.keypoints

        # Check 1: Body visible
        visible = sum(1 for k in kps if k.visibility > 0.5)
        body_ok = visible >= self.MIN_VISIBLE_KEYPOINTS
        self._body_check.set_passed(body_ok, f"{visible} joints" if body_ok else f"Only {visible}")

        # Check 2: Distance
        if body_ok:
            vis_kps = [k for k in kps if k.visibility > 0.5]
            w = max(k.x for k in vis_kps) - min(k.x for k in vis_kps)
            h = max(k.y for k in vis_kps) - min(k.y for k in vis_kps)
            ratio = max(w, h)

            if ratio < self.MIN_BODY_RATIO:
                self._distance_check.set_passed(False, "Too far")
            elif ratio > self.MAX_BODY_RATIO:
                self._distance_check.set_passed(False, "Too close")
            else:
                self._distance_check.set_passed(True, "Good")
        else:
            self._distance_check.set_passed(False, "-")

        # Check 3: Key joints
        key_idx = [11, 12, 23, 24, 13, 14, 25, 26]
        key_vis = sum(1 for i in key_idx if kps[i].visibility > 0.6)
        joints_ok = key_vis >= 6
        self._joints_check.set_passed(joints_ok, f"{key_vis}/8" if not joints_ok else "All visible")

        self._update_state()

    def _update_state(self):
        all_ok = self._body_check.passed and self._distance_check.passed and self._joints_check.passed
        self._start_btn.setEnabled(all_ok)

        if all_ok:
            if not self._timer.isActive():
                self._countdown = 3
                self._timer.start(1000)
                self._countdown_label.setText(str(self._countdown))
                self._countdown_label.show()
                self._status.setText("Get ready!")
                self._status.setStyleSheet("font-size: 13px; color: #22c55e; background: transparent;")
        else:
            self._timer.stop()
            self._countdown_label.hide()
            self._status.setText("Waiting for position...")
            self._status.setStyleSheet("font-size: 13px; color: #3b82f6; background: transparent;")

    def _tick(self):
        self._countdown -= 1
        if self._countdown <= 0:
            self._timer.stop()
            self._start()
        else:
            self._countdown_label.setText(str(self._countdown))

    def _start(self):
        self._timer.stop()
        self.calibration_complete.emit()

    def _cancel(self):
        self._timer.stop()
        self.cancelled.emit()
