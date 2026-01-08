"""
Video Worker - Play video files in a separate thread.

Supports playback control and speed adjustment.
SYNCED with audio using audio position as master clock.
"""

import cv2
import time
import numpy as np
from typing import Optional, Callable
from PyQt6.QtCore import QThread, pyqtSignal, QMutex, QMutexLocker


class VideoWorker(QThread):
    """
    Plays video files in a separate thread.
    Supports pause, seek, and speed adjustment.
    Uses external audio position for sync.
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

        # Audio sync - callback to get audio position
        self._audio_position_getter: Optional[Callable[[], float]] = None
        self._use_audio_sync = False

        # Video ended flag
        self._video_ended = False

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

    def set_audio_sync(self, position_getter: Callable[[], float]):
        """Set callback to get audio position for sync.

        Args:
            position_getter: Callable that returns current audio position in ms
        """
        self._audio_position_getter = position_getter
        self._use_audio_sync = True

    def run(self):
        """Main thread loop - play video synced to audio."""
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
            last_video_ms = 0.0

            while self._running:
                # Handle seek and get state
                with QMutexLocker(self._mutex):
                    if not self._running:
                        break
                    if self._seek_to_ms is not None:
                        frame_num = int((self._seek_to_ms / 1000) * self.fps)
                        self._cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
                        self._seek_to_ms = None
                        last_frame_time = time.perf_counter()

                    is_playing = self._playing
                    playback_rate = self._playback_rate
                    use_audio_sync = self._use_audio_sync
                    audio_getter = self._audio_position_getter

                if not self._running:
                    break

                # Sleep outside of mutex if paused
                if not is_playing:
                    time.sleep(0.01)
                    continue

                # Audio sync mode
                if use_audio_sync and audio_getter:
                    if not self._running:
                        break
                    try:
                        audio_ms = audio_getter()
                        video_ms = self._cap.get(cv2.CAP_PROP_POS_MSEC)
                        drift = audio_ms - video_ms

                        if drift > 100:
                            target_frame = int((audio_ms / 1000) * self.fps)
                            self._cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
                        elif drift < -50:
                            time.sleep(0.005)
                            continue

                        ret, frame = self._cap.read()
                        if not ret:
                            # Video ended - just stop, don't emit (main thread detects via progress)
                            self._playing = False
                            self._video_ended = True
                            break

                        if not self._running:
                            break

                        current_ms = self._cap.get(cv2.CAP_PROP_POS_MSEC)
                        # Check running before emit to minimize queued signals
                        if self._running:
                            self.frame_ready.emit(frame, current_ms)
                            self.progress.emit(current_ms, self.duration_ms)
                        time.sleep(frame_interval_base / 2)

                    except:
                        time.sleep(0.01)
                        continue
                else:
                    # Normal timing mode
                    frame_interval = frame_interval_base / playback_rate
                    current_time = time.perf_counter()
                    elapsed = current_time - last_frame_time

                    if elapsed < frame_interval:
                        time.sleep(0.001)
                        continue

                    ret, frame = self._cap.read()
                    if not ret:
                        # Video ended - just stop, don't emit (main thread detects via progress)
                        self._playing = False
                        self._video_ended = True
                        break

                    if not self._running:
                        break

                    last_frame_time = current_time
                    current_ms = self._cap.get(cv2.CAP_PROP_POS_MSEC)
                    # Check running before emit to minimize queued signals
                    if self._running:
                        self.frame_ready.emit(frame, current_ms)
                        self.progress.emit(current_ms, self.duration_ms)

        except Exception as e:
            pass  # Don't emit errors from thread
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
        """Stop playback and thread (non-blocking)."""
        self._running = False
        self._playing = False
        # Disable audio sync to prevent blocking
        self._use_audio_sync = False

    def seek(self, position_ms: float):
        """Seek to position in milliseconds."""
        with QMutexLocker(self._mutex):
            self._seek_to_ms = max(0, min(position_ms, self.duration_ms))
            self._video_ended = False  # Reset ended flag when seeking

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
        self.seek(0)  # seek() resets _video_ended

    @property
    def is_playing(self) -> bool:
        """Check if video is playing."""
        return self._playing

    @property
    def has_ended(self) -> bool:
        """Check if video has ended."""
        return self._video_ended
