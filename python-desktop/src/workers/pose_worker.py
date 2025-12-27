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
        self._detector: Optional[PoseDetector] = None
        self._mutex = QMutex()

        # Queued frames
        self._dancer_frame: Optional[tuple] = None  # (frame, timestamp)
        self._teacher_frame: Optional[tuple] = None

    def run(self):
        """Main thread loop."""
        try:
            # Initialize detector in this thread
            self._detector = PoseDetector(
                model_complexity=self._model_complexity,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self._running = True

            # Signal that we're ready
            self.ready.emit()

            while self._running:
                dancer_frame = None
                teacher_frame = None

                # Get queued frames
                with QMutexLocker(self._mutex):
                    if self._dancer_frame:
                        dancer_frame = self._dancer_frame
                        self._dancer_frame = None
                    if self._teacher_frame:
                        teacher_frame = self._teacher_frame
                        self._teacher_frame = None

                # Process dancer frame
                if dancer_frame is not None:
                    frame, timestamp = dancer_frame
                    pose = self._detector.detect(frame, timestamp)
                    self.dancer_pose_ready.emit(pose, timestamp)

                # Process teacher frame
                if teacher_frame is not None:
                    frame, timestamp = teacher_frame
                    pose = self._detector.detect(frame, timestamp)
                    self.teacher_pose_ready.emit(pose, timestamp)

                # Small sleep if no work
                if dancer_frame is None and teacher_frame is None:
                    self.msleep(5)

        except Exception as e:
            self.error.emit(str(e))
        finally:
            if self._detector:
                self._detector.close()

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
        """Stop the worker."""
        self._running = False
        self.wait()
