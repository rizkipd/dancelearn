"""
Pose Worker - Run pose detection in a separate thread.

This prevents pose detection from blocking the UI.
"""

import numpy as np
from typing import Optional
from PyQt6.QtCore import QThread, pyqtSignal, QMutex, QMutexLocker
from ..core.pose_detector import PoseDetector, PoseResult


class PoseWorker(QThread):
    """
    Runs pose detection in a separate thread for smooth UI.

    Receives frames, processes them, emits results.
    Uses SEPARATE detectors for dancer and teacher to avoid tracking interference.
    """

    # Signals
    dancer_pose_ready = pyqtSignal(object, float)  # PoseResult, timestamp
    teacher_pose_ready = pyqtSignal(object, float)  # PoseResult, timestamp
    ready = pyqtSignal()  # Emitted when MediaPipe is initialized
    error = pyqtSignal(str)

    def __init__(self, model_complexity: int = 0):
        super().__init__()
        self._model_complexity = model_complexity
        self._running = False
        # Separate detectors to avoid tracking state interference
        self._dancer_detector: Optional[PoseDetector] = None
        self._teacher_detector: Optional[PoseDetector] = None
        self._mutex = QMutex()

        # Queued frames
        self._dancer_frame: Optional[tuple] = None  # (frame, timestamp)
        self._teacher_frame: Optional[tuple] = None

    def run(self):
        """Main thread loop."""
        try:
            # Initialize SEPARATE detectors for dancer and teacher
            # This prevents MediaPipe's internal tracking from getting confused
            self._dancer_detector = PoseDetector(
                model_complexity=self._model_complexity,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self._teacher_detector = PoseDetector(
                model_complexity=self._model_complexity,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self._running = True

            # Signal that we're ready
            self.ready.emit()

            while self._running:
                if not self._running:
                    break

                dancer_frame = None
                teacher_frame = None

                # Get queued frames
                with QMutexLocker(self._mutex):
                    if not self._running:
                        break
                    if self._dancer_frame:
                        dancer_frame = self._dancer_frame
                        self._dancer_frame = None
                    if self._teacher_frame:
                        teacher_frame = self._teacher_frame
                        self._teacher_frame = None

                if not self._running:
                    break

                # Process dancer frame with dancer detector
                if dancer_frame is not None and self._running:
                    frame, timestamp = dancer_frame
                    try:
                        pose = self._dancer_detector.detect(frame, timestamp)
                        # Double-check running before emit
                        if self._running:
                            self.dancer_pose_ready.emit(pose, timestamp)
                    except:
                        pass

                if not self._running:
                    break

                # Process teacher frame with teacher detector
                if teacher_frame is not None and self._running:
                    frame, timestamp = teacher_frame
                    try:
                        pose = self._teacher_detector.detect(frame, timestamp)
                        # Double-check running before emit
                        if self._running:
                            self.teacher_pose_ready.emit(pose, timestamp)
                    except:
                        pass

                # Small sleep if no work
                if dancer_frame is None and teacher_frame is None:
                    self.msleep(5)

        except Exception as e:
            self.error.emit(str(e))
        finally:
            if self._dancer_detector:
                self._dancer_detector.close()
            if self._teacher_detector:
                self._teacher_detector.close()

    def process_dancer_frame(self, frame: np.ndarray, timestamp: float):
        """Queue dancer frame for processing."""
        with QMutexLocker(self._mutex):
            # Only keep latest frame (drop old ones)
            self._dancer_frame = (frame.copy(), timestamp)

    def process_teacher_frame(self, frame: np.ndarray, timestamp: float):
        """Queue teacher frame for processing."""
        with QMutexLocker(self._mutex):
            self._teacher_frame = (frame.copy(), timestamp)

    def stop(self):
        """Stop the worker (non-blocking)."""
        self._running = False
