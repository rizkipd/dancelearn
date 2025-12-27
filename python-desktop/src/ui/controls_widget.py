"""
Controls Widget - Playback controls for the training session.

Includes play/pause, speed control, restart, and progress bar.
"""

from typing import Optional
from PyQt6.QtWidgets import (
    QWidget, QHBoxLayout, QPushButton, QSlider,
    QLabel, QComboBox, QFrame
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont


class ControlsWidget(QWidget):
    """
    Playback control bar.

    Signals:
        play_clicked: Emitted when play/pause clicked
        stop_clicked: Emitted when stop clicked
        restart_clicked: Emitted when restart clicked
        speed_changed: Emitted when playback speed changed (float)
        seek_requested: Emitted when user seeks (float ms)
    """

    play_clicked = pyqtSignal()
    stop_clicked = pyqtSignal()
    restart_clicked = pyqtSignal()
    speed_changed = pyqtSignal(float)
    seek_requested = pyqtSignal(float)

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self._is_playing = False
        self._duration_ms = 0
        self._setup_ui()

    def _setup_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 12, 16, 12)
        layout.setSpacing(12)

        self.setStyleSheet("""
            ControlsWidget {
                background: #1f1f1f;
                border-top: 1px solid #333;
            }
        """)

        # Play/Pause button
        self._play_btn = QPushButton("▶ Play")
        self._play_btn.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        self._play_btn.setFixedSize(100, 40)
        self._play_btn.setStyleSheet("""
            QPushButton {
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 8px;
            }
            QPushButton:hover {
                background: #2563eb;
            }
            QPushButton:pressed {
                background: #1d4ed8;
            }
        """)
        self._play_btn.clicked.connect(self._on_play_clicked)
        layout.addWidget(self._play_btn)

        # Restart button
        self._restart_btn = QPushButton("↺")
        self._restart_btn.setFont(QFont("Arial", 16))
        self._restart_btn.setFixedSize(40, 40)
        self._restart_btn.setToolTip("Restart")
        self._restart_btn.setStyleSheet("""
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
        self._restart_btn.clicked.connect(self.restart_clicked.emit)
        layout.addWidget(self._restart_btn)

        # Progress slider
        self._progress_slider = QSlider(Qt.Orientation.Horizontal)
        self._progress_slider.setRange(0, 1000)
        self._progress_slider.setValue(0)
        self._progress_slider.setStyleSheet("""
            QSlider::groove:horizontal {
                background: #374151;
                height: 6px;
                border-radius: 3px;
            }
            QSlider::handle:horizontal {
                background: #3b82f6;
                width: 16px;
                height: 16px;
                margin: -5px 0;
                border-radius: 8px;
            }
            QSlider::sub-page:horizontal {
                background: #3b82f6;
                border-radius: 3px;
            }
        """)
        self._progress_slider.sliderMoved.connect(self._on_seek)
        layout.addWidget(self._progress_slider, 1)

        # Time label
        self._time_label = QLabel("0:00 / 0:00")
        self._time_label.setFont(QFont("Arial", 11))
        self._time_label.setStyleSheet("color: #888;")
        self._time_label.setFixedWidth(100)
        layout.addWidget(self._time_label)

        # Speed control
        speed_label = QLabel("Speed:")
        speed_label.setStyleSheet("color: #888;")
        layout.addWidget(speed_label)

        self._speed_combo = QComboBox()
        self._speed_combo.addItems(["0.5x", "0.75x", "1x", "1.25x", "1.5x"])
        self._speed_combo.setCurrentText("1x")
        self._speed_combo.setFixedWidth(80)
        self._speed_combo.setStyleSheet("""
            QComboBox {
                background: #374151;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 6px 12px;
            }
            QComboBox::drop-down {
                border: none;
            }
            QComboBox QAbstractItemView {
                background: #374151;
                color: white;
                selection-background-color: #3b82f6;
            }
        """)
        self._speed_combo.currentTextChanged.connect(self._on_speed_changed)
        layout.addWidget(self._speed_combo)

        # End session button
        self._stop_btn = QPushButton("End Session")
        self._stop_btn.setFont(QFont("Arial", 11))
        self._stop_btn.setFixedSize(110, 40)
        self._stop_btn.setStyleSheet("""
            QPushButton {
                background: #dc2626;
                color: white;
                border: none;
                border-radius: 8px;
            }
            QPushButton:hover {
                background: #b91c1c;
            }
        """)
        self._stop_btn.clicked.connect(self.stop_clicked.emit)
        layout.addWidget(self._stop_btn)

    def _on_play_clicked(self):
        """Handle play button click."""
        self.play_clicked.emit()

    def _on_seek(self, value: int):
        """Handle seek slider movement."""
        if self._duration_ms > 0:
            position_ms = (value / 1000) * self._duration_ms
            self.seek_requested.emit(position_ms)

    def _on_speed_changed(self, text: str):
        """Handle speed combo change."""
        speed = float(text.replace("x", ""))
        self.speed_changed.emit(speed)

    def set_playing(self, is_playing: bool):
        """Update play/pause button state."""
        self._is_playing = is_playing
        if is_playing:
            self._play_btn.setText("⏸ Pause")
        else:
            self._play_btn.setText("▶ Play")

    def set_duration(self, duration_ms: float):
        """Set video duration."""
        self._duration_ms = duration_ms
        self._update_time_label(0)

    def set_progress(self, current_ms: float, duration_ms: float = None):
        """Update progress bar and time label."""
        if duration_ms is not None:
            self._duration_ms = duration_ms

        if self._duration_ms > 0:
            progress = int((current_ms / self._duration_ms) * 1000)
            self._progress_slider.blockSignals(True)
            self._progress_slider.setValue(progress)
            self._progress_slider.blockSignals(False)

        self._update_time_label(current_ms)

    def _update_time_label(self, current_ms: float):
        """Update time display."""
        current_sec = int(current_ms / 1000)
        duration_sec = int(self._duration_ms / 1000)

        current_str = f"{current_sec // 60}:{current_sec % 60:02d}"
        duration_str = f"{duration_sec // 60}:{duration_sec % 60:02d}"

        self._time_label.setText(f"{current_str} / {duration_str}")

    def reset(self):
        """Reset to initial state."""
        self._is_playing = False
        self._duration_ms = 0
        self._play_btn.setText("▶ Play")
        self._progress_slider.setValue(0)
        self._time_label.setText("0:00 / 0:00")
        self._speed_combo.setCurrentText("1x")
