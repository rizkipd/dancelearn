"""
Main Window - Core application window.

Side-by-side view with dancer (webcam) and teacher (video).
OPTIMIZED: Pose detection runs in separate thread for smooth UI.
"""

import os
import time
from typing import Optional
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QSplitter, QFileDialog, QMessageBox, QLabel,
    QPushButton, QCheckBox, QComboBox, QFrame, QStackedWidget
)
from PyQt6.QtCore import Qt, QTimer, pyqtSlot
from PyQt6.QtGui import QFont, QAction

from .video_widget import DancerVideoWidget, TeacherVideoWidget
from .score_widget import ScoreWidget
from .controls_widget import ControlsWidget
from .calibration_dialog import CalibrationDialog
from ..workers.webcam_worker import WebcamWorker
from ..workers.video_worker import VideoWorker
from ..workers.pose_worker import PoseWorker
from ..workers.audio_worker import AudioWorker
from ..core.pose_detector import PoseResult
from ..core.pose_normalizer import PoseNormalizer, NormalizedPose
from ..core.scoring_engine import ScoringEngine, ScoreResult
from ..core.session_tracker import SessionTracker


class SetupPage(QWidget):
    """Setup page for loading video and configuring options."""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self._video_path: Optional[str] = None
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(40, 40, 40, 40)
        layout.setSpacing(24)

        # Title
        title = QLabel("AI Dance Training")
        title.setFont(QFont("Arial", 32, QFont.Weight.Bold))
        title.setStyleSheet("color: white;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)

        subtitle = QLabel("Load a dance video, follow along, and get real-time feedback")
        subtitle.setFont(QFont("Arial", 14))
        subtitle.setStyleSheet("color: #888;")
        subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(subtitle)

        layout.addSpacing(20)

        # Video load section
        video_frame = QFrame()
        video_frame.setStyleSheet("""
            QFrame {
                background: #262626;
                border-radius: 16px;
                padding: 24px;
            }
        """)
        video_layout = QVBoxLayout(video_frame)

        video_title = QLabel("1. Load Teacher Video")
        video_title.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        video_title.setStyleSheet("color: white;")
        video_layout.addWidget(video_title)

        self._video_status = QLabel("No video loaded")
        self._video_status.setFont(QFont("Arial", 12))
        self._video_status.setStyleSheet("color: #888;")
        video_layout.addWidget(self._video_status)

        self._load_btn = QPushButton("Browse Video File...")
        self._load_btn.setFont(QFont("Arial", 12))
        self._load_btn.setFixedHeight(44)
        self._load_btn.setStyleSheet("""
            QPushButton {
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 8px;
            }
            QPushButton:hover {
                background: #2563eb;
            }
        """)
        video_layout.addWidget(self._load_btn)

        layout.addWidget(video_frame)

        # Options section
        options_frame = QFrame()
        options_frame.setStyleSheet("""
            QFrame {
                background: #262626;
                border-radius: 16px;
                padding: 24px;
            }
        """)
        options_layout = QVBoxLayout(options_frame)

        options_title = QLabel("2. Options")
        options_title.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        options_title.setStyleSheet("color: white;")
        options_layout.addWidget(options_title)

        # Camera selection
        camera_layout = QHBoxLayout()
        camera_label = QLabel("Camera:")
        camera_label.setStyleSheet("color: #888;")
        camera_layout.addWidget(camera_label)

        self._camera_combo = QComboBox()
        self._camera_combo.setFixedWidth(300)
        self._camera_combo.setStyleSheet("""
            QComboBox {
                background: #374151;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px;
            }
        """)
        camera_layout.addWidget(self._camera_combo)
        camera_layout.addStretch()
        options_layout.addLayout(camera_layout)

        # Checkboxes
        self._mirror_check = QCheckBox("Mirror mode")
        self._mirror_check.setChecked(True)
        self._mirror_check.setStyleSheet("color: #ccc;")
        options_layout.addWidget(self._mirror_check)

        self._skeleton_check = QCheckBox("Show skeleton overlay")
        self._skeleton_check.setChecked(True)
        self._skeleton_check.setStyleSheet("color: #ccc;")
        options_layout.addWidget(self._skeleton_check)

        layout.addWidget(options_frame)

        layout.addStretch()

        # Start button
        self._start_btn = QPushButton("Start Training Session")
        self._start_btn.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        self._start_btn.setFixedHeight(56)
        self._start_btn.setEnabled(False)
        self._start_btn.setStyleSheet("""
            QPushButton {
                background: #22c55e;
                color: white;
                border: none;
                border-radius: 12px;
            }
            QPushButton:hover {
                background: #16a34a;
            }
            QPushButton:disabled {
                background: #374151;
                color: #666;
            }
        """)
        layout.addWidget(self._start_btn)

    def set_video(self, path: str, name: str):
        """Set loaded video."""
        self._video_path = path
        self._video_status.setText(f"Loaded: {name}")
        self._video_status.setStyleSheet("color: #22c55e;")
        self._start_btn.setEnabled(True)

    def populate_cameras(self, cameras: list):
        """Populate camera dropdown."""
        self._camera_combo.clear()
        for cam in cameras:
            self._camera_combo.addItem(cam['name'], cam['id'])

    @property
    def video_path(self) -> Optional[str]:
        return self._video_path

    @property
    def camera_id(self) -> int:
        return self._camera_combo.currentData() or 0

    @property
    def mirror_enabled(self) -> bool:
        return self._mirror_check.isChecked()

    @property
    def skeleton_enabled(self) -> bool:
        return self._skeleton_check.isChecked()


class MainWindow(QMainWindow):
    """Main application window - OPTIMIZED with threaded pose detection."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("AI Dance Training")
        self.setMinimumSize(1200, 800)

        # Core components (normalizer and scoring run on main thread - they're fast)
        self._dancer_normalizer = PoseNormalizer(smoothing_factor=0.3)
        self._teacher_normalizer = PoseNormalizer(smoothing_factor=0.2)
        self._scoring_engine = ScoringEngine(score_smoothing=0.4)
        self._session_tracker = SessionTracker()

        # Workers (all run in separate threads)
        self._webcam_worker: Optional[WebcamWorker] = None
        self._video_worker: Optional[VideoWorker] = None
        self._pose_worker: Optional[PoseWorker] = None
        self._audio_worker: Optional[AudioWorker] = None

        # State
        self._current_dancer_pose: Optional[PoseResult] = None
        self._current_teacher_pose: Optional[PoseResult] = None
        self._current_dancer_frame = None
        self._current_teacher_frame = None
        self._dancer_normalized: Optional[NormalizedPose] = None
        self._teacher_normalized: Optional[NormalizedPose] = None
        self._is_training = False
        self._frame_width = 1280
        self._frame_height = 720

        # Frame timing for throttling pose requests
        self._last_dancer_pose_request = 0.0
        self._last_teacher_pose_request = 0.0
        self._pose_request_interval = 1.0 / 15  # Request pose 15 times/sec

        # Score update timer
        self._score_timer = QTimer(self)
        self._score_timer.timeout.connect(self._update_score)
        self._score_timer.setInterval(150)  # Update score every 150ms

        self._setup_ui()
        self._setup_menu()

    def _setup_ui(self):
        """Setup the main UI."""
        central = QWidget()
        self.setCentralWidget(central)

        layout = QVBoxLayout(central)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Stacked widget for pages
        self._stack = QStackedWidget()
        layout.addWidget(self._stack)

        # Page 0: Setup
        self._setup_page = SetupPage()
        self._setup_page._load_btn.clicked.connect(self._on_load_video)
        self._setup_page._start_btn.clicked.connect(self._on_start_session)
        self._stack.addWidget(self._setup_page)

        # Page 1: Training
        training_page = QWidget()
        training_layout = QVBoxLayout(training_page)
        training_layout.setContentsMargins(0, 0, 0, 0)
        training_layout.setSpacing(0)

        # Video panels
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setStyleSheet("""
            QSplitter::handle {
                background: #333;
                width: 4px;
            }
        """)

        self._dancer_widget = DancerVideoWidget()
        self._teacher_widget = TeacherVideoWidget()
        splitter.addWidget(self._dancer_widget)
        splitter.addWidget(self._teacher_widget)
        splitter.setSizes([600, 600])

        training_layout.addWidget(splitter, 1)

        # Score widget
        self._score_widget = ScoreWidget()
        self._score_widget.setFixedHeight(140)
        training_layout.addWidget(self._score_widget)

        # Controls
        self._controls = ControlsWidget()
        self._controls.play_clicked.connect(self._on_play_pause)
        self._controls.stop_clicked.connect(self._on_end_session)
        self._controls.restart_clicked.connect(self._on_restart)
        self._controls.speed_changed.connect(self._on_speed_changed)
        self._controls.seek_requested.connect(self._on_seek)
        training_layout.addWidget(self._controls)

        self._stack.addWidget(training_page)

        # Apply dark theme
        self.setStyleSheet("""
            QMainWindow {
                background: #121212;
            }
            QWidget {
                color: white;
            }
        """)

        # Populate cameras
        cameras = WebcamWorker.list_cameras()
        if cameras:
            self._setup_page.populate_cameras(cameras)

    def _setup_menu(self):
        """Setup menu bar."""
        menubar = self.menuBar()
        menubar.setStyleSheet("""
            QMenuBar {
                background: #1f1f1f;
                color: white;
                padding: 4px;
            }
            QMenuBar::item:selected {
                background: #3b82f6;
            }
            QMenu {
                background: #1f1f1f;
                color: white;
            }
            QMenu::item:selected {
                background: #3b82f6;
            }
        """)

        # File menu
        file_menu = menubar.addMenu("File")

        load_action = QAction("Load Video...", self)
        load_action.setShortcut("Ctrl+O")
        load_action.triggered.connect(self._on_load_video)
        file_menu.addAction(load_action)

        file_menu.addSeparator()

        quit_action = QAction("Quit", self)
        quit_action.setShortcut("Ctrl+Q")
        quit_action.triggered.connect(self.close)
        file_menu.addAction(quit_action)

    def _on_load_video(self):
        """Handle video file selection."""
        path, _ = QFileDialog.getOpenFileName(
            self,
            "Select Teacher Video",
            "",
            "Video Files (*.mp4 *.mov *.avi *.webm);;All Files (*)"
        )
        if path:
            name = os.path.basename(path)
            self._setup_page.set_video(path, name)

    def _on_start_session(self):
        """Start training session."""
        video_path = self._setup_page.video_path
        if not video_path:
            return

        # Initialize pose worker (runs in separate thread!)
        self._pose_worker = PoseWorker(model_complexity=0)  # 0 = Lite model
        self._pose_worker.dancer_pose_ready.connect(self._on_dancer_pose_ready)
        self._pose_worker.teacher_pose_ready.connect(self._on_teacher_pose_ready)
        self._pose_worker.start()

        # Initialize video worker
        self._video_worker = VideoWorker()
        if not self._video_worker.load(video_path):
            QMessageBox.critical(self, "Error", "Failed to load video")
            return

        self._video_worker.frame_ready.connect(self._on_teacher_frame)
        self._video_worker.progress.connect(self._on_video_progress)
        self._video_worker.finished.connect(self._on_video_finished)

        # Initialize audio worker for sound playback
        self._audio_worker = AudioWorker(self)
        self._audio_worker.load(video_path)

        # Initialize webcam worker
        self._webcam_worker = WebcamWorker(
            device_id=self._setup_page.camera_id,
            target_fps=30,
            mirror=self._setup_page.mirror_enabled,
        )
        self._webcam_worker.frame_ready.connect(self._on_dancer_frame)
        self._webcam_worker.error.connect(self._on_webcam_error)

        # Update skeleton visibility
        show_skeleton = self._setup_page.skeleton_enabled
        self._dancer_widget.set_show_skeleton(show_skeleton)
        self._teacher_widget.set_show_skeleton(show_skeleton)

        # Reset state
        self._dancer_normalizer.reset_smoothing()
        self._teacher_normalizer.reset_smoothing()
        self._scoring_engine.reset()
        self._session_tracker.reset()
        self._score_widget.reset()
        self._controls.reset()
        self._controls.set_duration(self._video_worker.duration_ms)
        self._dancer_widget.reset()
        self._teacher_widget.reset()
        self._last_dancer_pose_request = 0.0
        self._last_teacher_pose_request = 0.0

        # Start workers
        self._webcam_worker.start()
        self._video_worker.start()

        # Show training page
        self._stack.setCurrentIndex(1)

        # Show calibration dialog
        self._show_calibration()

    def _show_calibration(self):
        """Show calibration dialog."""
        dialog = CalibrationDialog(self)

        # Update calibration with pose data
        def update_calibration():
            if self._current_dancer_pose:
                dialog.update_pose(
                    self._current_dancer_pose,
                    self._frame_width,
                    self._frame_height
                )

        calibration_timer = QTimer(self)
        calibration_timer.timeout.connect(update_calibration)
        calibration_timer.start(100)

        dialog.calibration_complete.connect(lambda: self._start_training())
        dialog.cancelled.connect(lambda: self._cancel_session())

        result = dialog.exec()
        calibration_timer.stop()

    def _start_training(self):
        """Start actual training after calibration."""
        self._is_training = True
        self._video_worker.play()
        if self._audio_worker:
            self._audio_worker.play()  # Start audio with video
        self._controls.set_playing(True)
        self._score_timer.start()

    def _cancel_session(self):
        """Cancel session and return to setup."""
        self._cleanup_session()
        self._stack.setCurrentIndex(0)

    @pyqtSlot(object, float)
    def _on_dancer_frame(self, frame, timestamp_ms: float):
        """Handle webcam frame - display immediately, queue pose detection."""
        self._frame_height, self._frame_width = frame.shape[:2]
        self._current_dancer_frame = frame

        # Always update display immediately (smooth video!)
        self._dancer_widget.update_frame(frame, self._current_dancer_pose)

        # Queue pose detection at limited rate
        current_time = time.perf_counter()
        if (current_time - self._last_dancer_pose_request) >= self._pose_request_interval:
            self._last_dancer_pose_request = current_time
            if self._pose_worker:
                self._pose_worker.process_dancer_frame(frame, timestamp_ms)

    @pyqtSlot(object, float)
    def _on_teacher_frame(self, frame, timestamp_ms: float):
        """Handle teacher video frame - display immediately, queue pose detection."""
        self._current_teacher_frame = frame

        # Always update display immediately
        self._teacher_widget.update_frame(frame, self._current_teacher_pose)

        # Queue pose detection at limited rate
        current_time = time.perf_counter()
        if (current_time - self._last_teacher_pose_request) >= self._pose_request_interval:
            self._last_teacher_pose_request = current_time
            if self._pose_worker:
                self._pose_worker.process_teacher_frame(frame, timestamp_ms)

    @pyqtSlot(object, float)
    def _on_dancer_pose_ready(self, pose: Optional[PoseResult], timestamp: float):
        """Handle pose detection result from worker thread."""
        self._current_dancer_pose = pose

        # Update display with skeleton
        if self._current_dancer_frame is not None:
            self._dancer_widget.update_frame(self._current_dancer_frame, pose)

        # Normalize for scoring
        if pose and self._is_training:
            self._dancer_normalized = self._dancer_normalizer.normalize(
                pose,
                mirror=self._setup_page.mirror_enabled,
            )

    @pyqtSlot(object, float)
    def _on_teacher_pose_ready(self, pose: Optional[PoseResult], timestamp: float):
        """Handle pose detection result from worker thread."""
        self._current_teacher_pose = pose

        # Update display with skeleton
        if self._current_teacher_frame is not None:
            self._teacher_widget.update_frame(self._current_teacher_frame, pose)

        # Normalize for scoring
        if pose and self._is_training:
            self._teacher_normalized = self._teacher_normalizer.normalize(
                pose,
                mirror=False,
                apply_smoothing=True,
            )

    def _update_score(self):
        """Update score display (runs on timer)."""
        if not self._is_training:
            return

        if self._dancer_normalized and self._teacher_normalized:
            result = self._scoring_engine.compare_frames(
                self._dancer_normalized,
                self._teacher_normalized,
            )

            # Update display
            self._score_widget.update_score(result)

            # Track for session report
            if self._video_worker and self._video_worker._cap:
                timestamp = self._video_worker._cap.get(0)  # CAP_PROP_POS_MSEC
                self._session_tracker.add_score(timestamp, result)

    @pyqtSlot(float, float)
    def _on_video_progress(self, current_ms: float, duration_ms: float):
        """Handle video progress update."""
        self._controls.set_progress(current_ms, duration_ms)

    @pyqtSlot()
    def _on_video_finished(self):
        """Handle video playback finished."""
        self._on_end_session()

    @pyqtSlot(str)
    def _on_webcam_error(self, error: str):
        """Handle webcam error."""
        QMessageBox.critical(self, "Camera Error", error)

    def _on_play_pause(self):
        """Toggle play/pause."""
        if self._video_worker:
            self._video_worker.toggle_play()
            is_playing = self._video_worker.is_playing
            self._controls.set_playing(is_playing)

            # Sync audio with video
            if self._audio_worker:
                if is_playing:
                    self._audio_worker.play()
                else:
                    self._audio_worker.pause()

            if is_playing:
                self._score_timer.start()
            else:
                self._score_timer.stop()

    def _on_restart(self):
        """Restart from beginning."""
        if self._video_worker:
            self._video_worker.restart()
            self._session_tracker.reset()
            self._score_widget.reset()
            self._scoring_engine.reset()
            self._dancer_normalizer.reset_smoothing()
            self._teacher_normalizer.reset_smoothing()

            # Sync audio to beginning
            if self._audio_worker:
                self._audio_worker.seek(0)

    def _on_speed_changed(self, speed: float):
        """Change playback speed."""
        if self._video_worker:
            self._video_worker.set_playback_rate(speed)

        # Sync audio playback rate
        if self._audio_worker:
            self._audio_worker.set_playback_rate(speed)

    def _on_seek(self, position_ms: float):
        """Seek to position."""
        if self._video_worker:
            self._video_worker.seek(position_ms)

        # Sync audio position
        if self._audio_worker:
            self._audio_worker.seek(position_ms)

    def _on_end_session(self):
        """End training session and show results."""
        self._is_training = False
        self._score_timer.stop()

        # Get session results
        result = self._session_tracker.get_session_result()

        # Show results dialog
        QMessageBox.information(
            self,
            "Session Complete",
            f"Grade: {result.grade}\n"
            f"Overall Score: {result.overall_score}/100\n\n"
            f"Arms: {result.body_parts.arms}/100\n"
            f"Legs: {result.body_parts.legs}/100\n"
            f"Torso: {result.body_parts.torso}/100\n\n"
            f"Weak sections: {len(result.weak_sections)}"
        )

        self._cleanup_session()
        self._stack.setCurrentIndex(0)

    def _cleanup_session(self):
        """Cleanup workers and state."""
        self._is_training = False
        self._score_timer.stop()

        if self._webcam_worker:
            self._webcam_worker.stop()
            self._webcam_worker = None

        if self._video_worker:
            self._video_worker.stop()
            self._video_worker = None

        if self._pose_worker:
            self._pose_worker.stop()
            self._pose_worker = None

        if self._audio_worker:
            self._audio_worker.cleanup()
            self._audio_worker = None

        self._current_dancer_pose = None
        self._current_teacher_pose = None
        self._current_dancer_frame = None
        self._current_teacher_frame = None
        self._dancer_normalized = None
        self._teacher_normalized = None

    def closeEvent(self, event):
        """Handle window close."""
        self._cleanup_session()
        event.accept()
