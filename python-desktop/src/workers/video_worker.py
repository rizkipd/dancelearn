"""
Video Worker - Play video files in a separate thread.

Supports playback control and speed adjustment.
"""

import cv2
import time
import numpy as np
from typing import Optional
from PyQt6.QtCore import QThread, pyqtSignal, QMutex, QMutexLocker


class VideoWorker(QThread):
    """
    Plays video files in a separate thread.
    Supports pause, seek, and speed adjustment.
    """

    # Signals
    frame_ready = pyqtSignal(np.ndarray, float)  # frame, timestamp_ms
    progress = pyqtSignal(float, float)  # current_ms, duration_ms
    finished = pyqtSignal()
    error = pyqtSignal(str)
    loaded = pyqtSignal(float, int, int)  # duration_ms, width, height

    def __init__(self):
        super().__init__()
        self._video_path: Optional[str] = None
        self._cap: Optional[cv2.VideoCapture] = None
        self._running = False
        self._playing = False
        self._playback_rate = 1.0
        self._seek_to_ms: Optional[float] = None
        self._mutex = QMutex()

        # Video info
        self.duration_ms = 0.0
        self.fps = 30.0
        self.width = 0
        self.height = 0
        self.frame_count = 0

    def load(self, video_path: str):
        """Load a video file."""
        self._video_path = video_path

        # Get video info
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            self.error.emit(f"Failed to open video: {video_path}")
            return False

        self.fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.duration_ms = (self.frame_count / self.fps) * 1000
        cap.release()

        self.loaded.emit(self.duration_ms, self.width, self.height)
        return True

    def run(self):
        """Main thread loop - play video."""
        if not self._video_path:
            return

        try:
            self._cap = cv2.VideoCapture(self._video_path)
            if not self._cap.isOpened():
                self.error.emit("Failed to open video for playback")
                return

            self._running = True
            frame_interval_base = 1.0 / self.fps
            last_frame_time = time.perf_counter()

            while self._running:
                # Handle seek
                with QMutexLocker(self._mutex):
                    if self._seek_to_ms is not None:
                        frame_num = int((self._seek_to_ms / 1000) * self.fps)
                        self._cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
                        self._seek_to_ms = None
                        last_frame_time = time.perf_counter()

                    if not self._playing:
                        time.sleep(0.01)
                        continue

                    playback_rate = self._playback_rate

                # Timing control
                frame_interval = frame_interval_base / playback_rate
                current_time = time.perf_counter()
                elapsed = current_time - last_frame_time

                if elapsed < frame_interval:
                    time.sleep(0.001)
                    continue

                # Read frame
                ret, frame = self._cap.read()
                if not ret:
                    # Video ended
                    self.finished.emit()
                    self._playing = False
                    continue

                last_frame_time = current_time

                # Get current position
                current_ms = self._cap.get(cv2.CAP_PROP_POS_MSEC)

                # Emit frame and progress
                self.frame_ready.emit(frame, current_ms)
                self.progress.emit(current_ms, self.duration_ms)

        except Exception as e:
            self.error.emit(str(e))
        finally:
            if self._cap:
                self._cap.release()

    def play(self):
        """Start playback."""
        with QMutexLocker(self._mutex):
            self._playing = True

    def pause(self):
        """Pause playback."""
        with QMutexLocker(self._mutex):
            self._playing = False

    def toggle_play(self):
        """Toggle play/pause."""
        with QMutexLocker(self._mutex):
            self._playing = not self._playing

    def stop(self):
        """Stop playback and thread."""
        self._running = False
        self._playing = False
        self.wait()

    def seek(self, position_ms: float):
        """Seek to position in milliseconds."""
        with QMutexLocker(self._mutex):
            self._seek_to_ms = max(0, min(position_ms, self.duration_ms))

    def seek_relative(self, offset_ms: float):
        """Seek relative to current position."""
        current = self._cap.get(cv2.CAP_PROP_POS_MSEC) if self._cap else 0
        self.seek(current + offset_ms)

    def set_playback_rate(self, rate: float):
        """Set playback speed (0.25 - 2.0)."""
        with QMutexLocker(self._mutex):
            self._playback_rate = max(0.25, min(2.0, rate))

    def get_playback_rate(self) -> float:
        """Get current playback rate."""
        return self._playback_rate

    def restart(self):
        """Restart from beginning."""
        self.seek(0)

    @property
    def is_playing(self) -> bool:
        """Check if video is playing."""
        return self._playing
