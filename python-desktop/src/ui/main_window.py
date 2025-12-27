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
    QFileDialog, QMessageBox, QLabel,
    QPushButton, QCheckBox, QComboBox, QFrame, QStackedWidget
)
from PyQt6.QtCore import Qt, QTimer, pyqtSlot, QUrl, QMetaObject, Q_ARG
from PyQt6.QtGui import QFont, QAction
from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput
from PyQt6.QtMultimediaWidgets import QVideoWidget

from .video_widget import DancerVideoWidget, TeacherVideoWidget
from .score_widget import ScoreWidget
from .controls_widget import ControlsWidget
from .calibration_dialog import CalibrationDialog, CalibrationOverlay
from .session_report import SessionReportDialog
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
        self._media_player: Optional[QMediaPlayer] = None
        self._audio_output: Optional[QAudioOutput] = None
        self._is_previewing = False
        self._setup_ui()

    def _setup_ui(self):
        # Main background
        self.setStyleSheet("background: #1f2937;")  # gray-800

        layout = QHBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        layout.setSpacing(24)

        # Left side - Video preview (using stacked layout for overlay)
        from PyQt6.QtWidgets import QStackedLayout, QSizePolicy

        preview_frame = QFrame()
        preview_frame.setStyleSheet("background: #0a0a0a; border-radius: 12px;")
        preview_frame.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        preview_layout = QVBoxLayout(preview_frame)
        preview_layout.setContentsMargins(0, 0, 0, 0)
        preview_layout.setSpacing(8)

        # Video widget - fills the space
        self._video_widget = QVideoWidget()
        self._video_widget.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self._video_widget.setAspectRatioMode(Qt.AspectRatioMode.KeepAspectRatio)
        self._video_widget.setStyleSheet("background: #0a0a0a;")
        self._video_widget.hide()
        preview_layout.addWidget(self._video_widget, 1)

        # Placeholder for when no video
        self._preview_placeholder = QLabel("Select a video to preview")
        self._preview_placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._preview_placeholder.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self._preview_placeholder.setStyleSheet("""
            font-size: 18px;
            color: #666666;
            background: #0a0a0a;
        """)
        preview_layout.addWidget(self._preview_placeholder, 1)

        # Play button below video
        self._play_preview_btn = QPushButton("▶ Play Preview")
        self._play_preview_btn.setFixedHeight(44)
        self._play_preview_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self._play_preview_btn.setStyleSheet("""
            QPushButton {
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: bold;
                padding: 0 24px;
            }
            QPushButton:hover {
                background: #3b82f6;
            }
        """)
        self._play_preview_btn.clicked.connect(self._toggle_preview)
        self._play_preview_btn.hide()
        preview_layout.addWidget(self._play_preview_btn, 0, Qt.AlignmentFlag.AlignCenter)

        layout.addWidget(preview_frame, 2)  # Give preview more space

        # Right side - Controls
        right_panel = QWidget()
        right_panel.setFixedWidth(360)  # Fixed width for controls
        right_panel.setStyleSheet("background: transparent;")
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(24)

        # Title section
        title = QLabel("AI Dance Training")
        title.setFont(QFont("Arial", 28, QFont.Weight.Bold))
        title.setStyleSheet("color: white; background: transparent;")
        right_layout.addWidget(title)

        subtitle = QLabel("Load a dance video, follow along,\nand get real-time feedback")
        subtitle.setFont(QFont("Arial", 13))
        subtitle.setStyleSheet("color: #9ca3af; background: transparent;")
        right_layout.addWidget(subtitle)

        right_layout.addSpacing(16)

        # Video load section
        video_frame = QFrame()
        video_frame.setStyleSheet("""
            QFrame {
                background: #1e293b;
                border-radius: 12px;
            }
        """)
        video_layout = QVBoxLayout(video_frame)
        video_layout.setContentsMargins(20, 20, 20, 20)
        video_layout.setSpacing(12)

        video_title = QLabel("1. Load Teacher Video")
        video_title.setFont(QFont("Arial", 15, QFont.Weight.Bold))
        video_title.setStyleSheet("color: white; background: transparent;")
        video_layout.addWidget(video_title)

        self._video_status = QLabel("No video loaded")
        self._video_status.setFont(QFont("Arial", 12))
        self._video_status.setStyleSheet("color: #9ca3af; background: transparent;")
        video_layout.addWidget(self._video_status)

        self._load_btn = QPushButton("Browse Video File...")
        self._load_btn.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        self._load_btn.setFixedHeight(44)
        self._load_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self._load_btn.setStyleSheet("""
            QPushButton {
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 10px;
            }
            QPushButton:hover {
                background: #3b82f6;
            }
            QPushButton:pressed {
                background: #1d4ed8;
            }
        """)
        video_layout.addWidget(self._load_btn)

        right_layout.addWidget(video_frame)

        # Options section
        options_frame = QFrame()
        options_frame.setStyleSheet("""
            QFrame {
                background: #1e293b;
                border-radius: 12px;
            }
        """)
        options_layout = QVBoxLayout(options_frame)
        options_layout.setContentsMargins(20, 20, 20, 20)
        options_layout.setSpacing(12)

        options_title = QLabel("2. Options")
        options_title.setFont(QFont("Arial", 15, QFont.Weight.Bold))
        options_title.setStyleSheet("color: white; background: transparent;")
        options_layout.addWidget(options_title)

        # Camera selection
        camera_label = QLabel("Camera:")
        camera_label.setFont(QFont("Arial", 12))
        camera_label.setStyleSheet("color: #9ca3af; background: transparent;")
        options_layout.addWidget(camera_label)

        self._camera_combo = QComboBox()
        self._camera_combo.setFixedHeight(36)
        self._camera_combo.setStyleSheet("""
            QComboBox {
                background: #374151;
                color: white;
                border: 1px solid #4b5563;
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 12px;
            }
            QComboBox::drop-down {
                border: none;
                width: 20px;
            }
            QComboBox QAbstractItemView {
                background: #374151;
                color: white;
                selection-background-color: #2563eb;
                border: 1px solid #4b5563;
            }
        """)
        options_layout.addWidget(self._camera_combo)

        # Checkboxes
        self._mirror_check = QCheckBox("Mirror mode (recommended)")
        self._mirror_check.setChecked(True)
        self._mirror_check.setFont(QFont("Arial", 12))
        self._mirror_check.setStyleSheet("""
            QCheckBox {
                color: #d1d5db;
                background: transparent;
                spacing: 6px;
            }
            QCheckBox::indicator {
                width: 18px;
                height: 18px;
                border-radius: 4px;
                background: #374151;
                border: 1px solid #4b5563;
            }
            QCheckBox::indicator:checked {
                background: #2563eb;
                border: 1px solid #2563eb;
            }
        """)
        options_layout.addWidget(self._mirror_check)

        self._skeleton_check = QCheckBox("Show skeleton overlay")
        self._skeleton_check.setChecked(True)
        self._skeleton_check.setFont(QFont("Arial", 12))
        self._skeleton_check.setStyleSheet("""
            QCheckBox {
                color: #d1d5db;
                background: transparent;
                spacing: 6px;
            }
            QCheckBox::indicator {
                width: 18px;
                height: 18px;
                border-radius: 4px;
                background: #374151;
                border: 1px solid #4b5563;
            }
            QCheckBox::indicator:checked {
                background: #2563eb;
                border: 1px solid #2563eb;
            }
        """)
        options_layout.addWidget(self._skeleton_check)

        right_layout.addWidget(options_frame)

        right_layout.addStretch()

        # Start button
        self._start_btn = QPushButton("Start Training Session")
        self._start_btn.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        self._start_btn.setFixedHeight(50)
        self._start_btn.setEnabled(False)
        self._start_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self._start_btn.setStyleSheet("""
            QPushButton {
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 10px;
            }
            QPushButton:hover {
                background: #3b82f6;
            }
            QPushButton:disabled {
                background: #374151;
                color: #6b7280;
            }
        """)
        right_layout.addWidget(self._start_btn)

        layout.addWidget(right_panel)

    def set_video(self, path: str, name: str):
        """Set loaded video (no auto-play)."""
        # Stop any existing preview first
        self._stop_preview()

        self._video_path = path
        self._video_status.setText(f"Loaded: {name}")
        self._video_status.setStyleSheet("color: #22c55e; background: transparent;")
        self._start_btn.setEnabled(True)

        # Update placeholder to show video name
        self._preview_placeholder.setText(f"📹 {name}\n\nClick Play Preview to watch")
        self._preview_placeholder.show()
        self._video_widget.hide()

        # Show play button
        self._play_preview_btn.setText("▶ Play Preview")
        self._play_preview_btn.show()

    def _toggle_preview(self):
        """Toggle video preview play/stop."""
        if self._media_player:
            # Stop preview
            self._stop_preview()
            self._preview_placeholder.setText(f"Video loaded\n\nClick Play to preview")
            self._preview_placeholder.show()
            self._video_widget.hide()
            self._play_preview_btn.setText("▶ Play Preview")
        else:
            # Start preview
            self._start_preview()

    def _start_preview(self):
        """Start video preview playback."""
        if not self._video_path:
            return

        self._audio_output = QAudioOutput()
        self._audio_output.setVolume(0.5)

        self._media_player = QMediaPlayer()
        self._media_player.setAudioOutput(self._audio_output)
        self._media_player.setVideoOutput(self._video_widget)
        self._media_player.setSource(QUrl.fromLocalFile(self._video_path))
        self._media_player.mediaStatusChanged.connect(self._on_media_status)

        # Show video widget, hide placeholder
        self._preview_placeholder.hide()
        self._video_widget.show()
        self._play_preview_btn.setText("⏹ Stop")

        self._media_player.play()

    def _on_media_status(self, status):
        """Handle media status changes for looping."""
        if self._media_player and status == QMediaPlayer.MediaStatus.EndOfMedia:
            self._media_player.setPosition(0)
            self._media_player.play()

    def _stop_preview(self):
        """Stop video preview and cleanup."""
        if self._media_player:
            self._media_player.stop()
            try:
                self._media_player.mediaStatusChanged.disconnect()
            except:
                pass
            self._media_player.setSource(QUrl())
            self._media_player.deleteLater()
            self._media_player = None
        if self._audio_output:
            self._audio_output.deleteLater()
            self._audio_output = None

    def stop_preview(self):
        """Public method to stop preview (called when starting training)."""
        self._stop_preview()
        self._video_widget.hide()
        self._preview_placeholder.setText("Select a video to preview")
        self._preview_placeholder.show()
        self._play_preview_btn.hide()

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
        self._is_cleaning_up = False  # Flag to prevent processing during cleanup
        self._frame_width = 1280
        self._frame_height = 720
        self._pending_video_path: Optional[str] = None

        # Frame timing for throttling pose requests
        self._last_dancer_pose_request = 0.0
        self._last_teacher_pose_request = 0.0
        self._pose_request_interval = 1.0 / 30  # Request pose 30 times/sec for smoother skeleton

        # Score update timer
        self._score_timer = QTimer(self)
        self._score_timer.timeout.connect(self._update_score)
        self._score_timer.setInterval(150)  # Update score every 150ms

        # Audio position update timer (for video sync)
        self._audio_sync_timer = QTimer(self)
        self._audio_sync_timer.timeout.connect(self._update_audio_position)
        self._audio_sync_timer.setInterval(16)  # ~60fps for smooth sync

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
        training_page.setStyleSheet("background: #0f0f0f;")
        training_layout = QVBoxLayout(training_page)
        training_layout.setContentsMargins(8, 8, 8, 0)
        training_layout.setSpacing(8)

        # Video panels - side by side
        video_layout = QHBoxLayout()
        video_layout.setSpacing(8)

        self._dancer_widget = DancerVideoWidget()
        self._teacher_widget = TeacherVideoWidget()
        video_layout.addWidget(self._dancer_widget, 1)
        video_layout.addWidget(self._teacher_widget, 1)

        training_layout.addLayout(video_layout, 1)

        # Score widget at bottom
        self._score_widget = ScoreWidget()
        self._score_widget.setFixedHeight(90)
        training_layout.addWidget(self._score_widget)

        # Controls (bg-gray-800)
        self._controls = ControlsWidget()
        self._controls.setFixedHeight(64)
        self._controls.play_clicked.connect(self._on_play_pause)
        self._controls.stop_clicked.connect(self._on_end_session)
        self._controls.restart_clicked.connect(self._on_restart)
        self._controls.speed_changed.connect(self._on_speed_changed)
        self._controls.seek_requested.connect(self._on_seek)
        training_layout.addWidget(self._controls)

        self._stack.addWidget(training_page)

        # Dark theme
        self.setStyleSheet("""
            QMainWindow { background: #0f0f0f; }
            QWidget { color: white; }
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

        # Stop the preview video first and let Qt process events
        self._setup_page.stop_preview()

        # Store path for deferred initialization
        self._pending_video_path = video_path

        # Show training page first (provides visual feedback)
        self._stack.setCurrentIndex(1)
        self._dancer_widget.set_placeholder("Initializing camera...")
        self._teacher_widget.set_placeholder("Loading video...")

        # Process events to update UI before heavy initialization
        from PyQt6.QtWidgets import QApplication
        QApplication.processEvents()

        # Defer heavy initialization to next event loop iteration
        QTimer.singleShot(100, self._initialize_session)

    def _initialize_session(self):
        """Initialize session workers (called after UI updates)."""
        video_path = self._pending_video_path

        # Reset cleanup flag
        self._is_cleaning_up = False

        # Initialize pose worker (runs in separate thread!)
        # Use QueuedConnection for ALL cross-thread signals to prevent blocking
        self._pose_worker = PoseWorker(model_complexity=0)  # 0 = Lite model
        self._pose_worker.dancer_pose_ready.connect(
            self._on_dancer_pose_ready, Qt.ConnectionType.QueuedConnection
        )
        self._pose_worker.teacher_pose_ready.connect(
            self._on_teacher_pose_ready, Qt.ConnectionType.QueuedConnection
        )
        self._pose_worker.ready.connect(
            self._on_pose_worker_ready, Qt.ConnectionType.QueuedConnection
        )
        self._pose_worker.start()

        # Initialize video worker
        self._video_worker = VideoWorker()
        if not self._video_worker.load(video_path):
            QMessageBox.critical(self, "Error", "Failed to load video")
            self._stack.setCurrentIndex(0)
            return

        # Use QueuedConnection for cross-thread signals
        self._video_worker.frame_ready.connect(
            self._on_teacher_frame, Qt.ConnectionType.QueuedConnection
        )
        self._video_worker.progress.connect(
            self._on_video_progress, Qt.ConnectionType.QueuedConnection
        )
        # Don't connect finished signal - we poll for video end in _update_score instead

        # Initialize audio worker for sound playback
        self._audio_worker = AudioWorker(self)
        self._audio_worker.load(video_path)

        # Connect video worker to audio for sync (uses thread-safe cached position)
        self._video_worker.set_audio_sync(self._audio_worker.get_position_for_sync)

        # Initialize webcam worker
        self._webcam_worker = WebcamWorker(
            device_id=self._setup_page.camera_id,
            target_fps=30,
            mirror=self._setup_page.mirror_enabled,
        )
        # Use QueuedConnection for cross-thread signals
        self._webcam_worker.frame_ready.connect(
            self._on_dancer_frame, Qt.ConnectionType.QueuedConnection
        )
        self._webcam_worker.error.connect(
            self._on_webcam_error, Qt.ConnectionType.QueuedConnection
        )

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

    def _on_pose_worker_ready(self):
        """Called when pose worker has finished initializing MediaPipe."""
        # Now show calibration dialog
        self._show_calibration()

    def _show_calibration(self):
        """Show calibration as overlay instead of modal dialog."""
        # Create calibration widget as overlay on the training page
        self._calibration_widget = CalibrationOverlay(self.centralWidget())
        self._calibration_widget.calibration_complete.connect(self._on_calibration_complete)
        self._calibration_widget.cancelled.connect(self._cancel_session)

        # Position it centered on screen
        self._calibration_widget.move(
            (self.width() - self._calibration_widget.width()) // 2,
            (self.height() - self._calibration_widget.height()) // 2
        )
        self._calibration_widget.show()
        self._calibration_widget.raise_()

        # Update calibration with pose data
        self._calibration_timer = QTimer(self)
        self._calibration_timer.timeout.connect(self._update_calibration)
        self._calibration_timer.start(100)

    def _update_calibration(self):
        """Update calibration overlay with pose data."""
        if hasattr(self, '_calibration_widget') and self._calibration_widget:
            if self._current_dancer_pose:
                self._calibration_widget.update_pose(
                    self._current_dancer_pose,
                    self._frame_width,
                    self._frame_height
                )

    def _on_calibration_complete(self):
        """Handle calibration complete."""
        if hasattr(self, '_calibration_timer'):
            self._calibration_timer.stop()
        if hasattr(self, '_calibration_widget') and self._calibration_widget:
            self._calibration_widget.hide()
            self._calibration_widget.deleteLater()
            self._calibration_widget = None
        self._start_training()

    def _start_training(self):
        """Start actual training after calibration."""
        self._is_training = True

        # Enable controls now that calibration is complete
        self._controls.set_controls_enabled(True)

        # Auto-start video and audio playback
        self._video_worker.play()
        if self._audio_worker:
            self._audio_worker.play()  # Start audio with video
        self._controls.set_playing(True)
        self._score_timer.start()
        self._audio_sync_timer.start()  # Start audio position sync

    def _cancel_session(self):
        """Cancel session and return to setup."""
        # Prevent multiple calls
        if self._is_cleaning_up:
            return

        # Stop calibration timer first
        if hasattr(self, '_calibration_timer') and self._calibration_timer:
            self._calibration_timer.stop()
            self._calibration_timer = None

        # Hide calibration widget
        if hasattr(self, '_calibration_widget') and self._calibration_widget:
            self._calibration_widget.hide()
            self._calibration_widget.deleteLater()
            self._calibration_widget = None

        # Stop timers
        self._is_training = False
        self._score_timer.stop()
        self._audio_sync_timer.stop()

        # Stop all workers immediately (non-blocking)
        self._stop_all_workers()

        # Return to setup page immediately
        self._stack.setCurrentIndex(0)

        # Finalize cleanup after delay
        QTimer.singleShot(300, self._finalize_cleanup)

    @pyqtSlot(object, float)
    def _on_dancer_frame(self, frame, timestamp_ms: float):
        """Handle webcam frame - display immediately, queue pose detection."""
        # Guard: skip if cleaning up
        if self._is_cleaning_up:
            return

        self._frame_height, self._frame_width = frame.shape[:2]
        self._current_dancer_frame = frame

        # Always update display immediately (smooth video!)
        self._dancer_widget.update_frame(frame, self._current_dancer_pose)

        # Queue pose detection at limited rate
        current_time = time.perf_counter()
        if (current_time - self._last_dancer_pose_request) >= self._pose_request_interval:
            self._last_dancer_pose_request = current_time
            if self._pose_worker and self._pose_worker._running:
                self._pose_worker.process_dancer_frame(frame, timestamp_ms)

    @pyqtSlot(object, float)
    def _on_teacher_frame(self, frame, timestamp_ms: float):
        """Handle teacher video frame - display immediately, queue pose detection."""
        # Guard: skip if cleaning up
        if self._is_cleaning_up:
            return

        self._current_teacher_frame = frame

        # Always update display immediately
        self._teacher_widget.update_frame(frame, self._current_teacher_pose)

        # Queue pose detection at limited rate
        current_time = time.perf_counter()
        if (current_time - self._last_teacher_pose_request) >= self._pose_request_interval:
            self._last_teacher_pose_request = current_time
            if self._pose_worker and self._pose_worker._running:
                self._pose_worker.process_teacher_frame(frame, timestamp_ms)

    @pyqtSlot(object, float)
    def _on_dancer_pose_ready(self, pose: Optional[PoseResult], timestamp: float):
        """Handle pose detection result from worker thread."""
        # Guard: skip if cleaning up
        if self._is_cleaning_up:
            return

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
        # Guard: skip if cleaning up
        if self._is_cleaning_up:
            return

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

    def _update_audio_position(self):
        """Update cached audio position for thread-safe video sync."""
        if self._audio_worker:
            self._audio_worker.update_cached_position()

    def _update_score(self):
        """Update score display (runs on timer)."""
        if not self._is_training:
            return

        # Check if video has ended
        if self._video_worker and self._video_worker.has_ended:
            QTimer.singleShot(0, self._on_end_session)
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
        if self._is_cleaning_up:
            return
        self._controls.set_progress(current_ms, duration_ms)

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
                self._audio_sync_timer.start()
            else:
                self._score_timer.stop()
                self._audio_sync_timer.stop()

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
        # Prevent multiple calls
        if self._is_cleaning_up:
            return

        self._is_training = False
        self._score_timer.stop()
        self._audio_sync_timer.stop()

        # Get session results before cleanup
        result = self._session_tracker.get_session_result()
        video_path = self._setup_page.video_path

        # Stop all workers immediately (non-blocking)
        self._stop_all_workers()

        # Deferred: show dialog after cleanup starts
        QTimer.singleShot(300, lambda: self._show_session_report(result, video_path))

    def _show_session_report(self, result, video_path):
        """Show session report after cleanup."""
        # Finalize cleanup first
        self._finalize_cleanup()

        # Return to setup page
        self._stack.setCurrentIndex(0)

        # Show session report dialog
        dialog = SessionReportDialog(result, self)
        dialog.try_again.connect(lambda: self._on_try_again(video_path))
        dialog.new_video.connect(self._on_new_video)
        dialog.exec()

    def _on_try_again(self, video_path: str):
        """Restart training with the same video."""
        if video_path:
            QTimer.singleShot(100, self._on_start_session)

    def _on_new_video(self):
        """Return to setup to select new video."""
        pass

    def _stop_all_workers(self):
        """Signal all workers to stop immediately (non-blocking)."""
        # Set cleanup flag FIRST - all slots check this and return immediately
        self._is_cleaning_up = True
        self._is_training = False

        # Stop timers immediately
        self._score_timer.stop()
        self._audio_sync_timer.stop()

        # Signal threads to stop - DON'T disconnect signals (can cause deadlock)
        # Set all flags atomically
        if self._video_worker:
            self._video_worker._running = False
            self._video_worker._playing = False
            self._video_worker._use_audio_sync = False

        if self._webcam_worker:
            self._webcam_worker._running = False

        if self._pose_worker:
            self._pose_worker._running = False

        # Stop audio BEFORE waiting for threads (it's not threaded)
        if self._audio_worker:
            try:
                self._audio_worker.stop()
            except:
                pass

        # Process pending events to flush signal queue
        from PyQt6.QtWidgets import QApplication
        QApplication.processEvents()

    def _finalize_cleanup(self):
        """Finalize cleanup of worker threads (called after delay)."""
        # Wait briefly for threads to finish naturally, then terminate if needed
        wait_ms = 100  # Short wait time

        if self._video_worker:
            if self._video_worker.isRunning():
                if not self._video_worker.wait(wait_ms):
                    self._video_worker.terminate()
                    self._video_worker.wait(50)
            self._video_worker = None

        if self._webcam_worker:
            if self._webcam_worker.isRunning():
                if not self._webcam_worker.wait(wait_ms):
                    self._webcam_worker.terminate()
                    self._webcam_worker.wait(50)
            self._webcam_worker = None

        if self._pose_worker:
            if self._pose_worker.isRunning():
                if not self._pose_worker.wait(wait_ms):
                    self._pose_worker.terminate()
                    self._pose_worker.wait(50)
            self._pose_worker = None

        # Cleanup audio
        if self._audio_worker:
            try:
                self._audio_worker.cleanup()
            except:
                pass
            self._audio_worker = None

        # Reset state
        self._current_dancer_pose = None
        self._current_teacher_pose = None
        self._current_dancer_frame = None
        self._current_teacher_frame = None
        self._dancer_normalized = None
        self._teacher_normalized = None

        # Reset cleanup flag
        self._is_cleaning_up = False

    def _cleanup_session(self):
        """Cleanup workers and state."""
        self._is_training = False
        self._score_timer.stop()
        self._audio_sync_timer.stop()
        self._stop_all_workers()
        QTimer.singleShot(100, self._finalize_cleanup)

    def closeEvent(self, event):
        """Handle window close."""
        self._cleanup_session()
        event.accept()
