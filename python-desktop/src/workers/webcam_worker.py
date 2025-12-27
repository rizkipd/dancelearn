"""
Webcam Worker - Capture webcam frames in a separate thread.

Non-blocking for smooth UI.
"""

import cv2
import time
import numpy as np
from typing import Optional
from PyQt6.QtCore import QThread, pyqtSignal, QMutex, QMutexLocker


class WebcamWorker(QThread):
    """
    Captures webcam frames in a separate thread.
    Emits frames via Qt signals.
    """

    # Signals
    frame_ready = pyqtSignal(np.ndarray, float)  # frame, timestamp_ms
    error = pyqtSignal(str)
    started_signal = pyqtSignal()
    stopped_signal = pyqtSignal()

    def __init__(
        self,
        device_id: int = 0,
        target_fps: int = 30,
        width: int = 1280,
        height: int = 720,
        mirror: bool = True,
    ):
        super().__init__()
        self.device_id = device_id
        self.target_fps = target_fps
        self.width = width
        self.height = height
        self.mirror = mirror

        self._running = False
        self._paused = False
        self._cap: Optional[cv2.VideoCapture] = None
        self._mutex = QMutex()
        self._start_time = 0.0

    def run(self):
        """Main thread loop - capture frames."""
        try:
            # Open camera
            self._cap = cv2.VideoCapture(self.device_id)
            if not self._cap.isOpened():
                self.error.emit(f"Failed to open camera {self.device_id}")
                return

            # Configure camera
            self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            self._cap.set(cv2.CAP_PROP_FPS, self.target_fps)
            self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize latency

            self._running = True
            self._start_time = time.perf_counter() * 1000
            self.started_signal.emit()

            frame_interval = 1.0 / self.target_fps
            last_frame_time = 0.0

            while self._running:
                with QMutexLocker(self._mutex):
                    if self._paused:
                        time.sleep(0.01)
                        continue

                # Timing control
                current_time = time.perf_counter()
                if current_time - last_frame_time < frame_interval:
                    time.sleep(0.001)
                    continue

                # Capture frame
                ret, frame = self._cap.read()
                if not ret:
                    continue

                last_frame_time = current_time
                timestamp_ms = current_time * 1000 - self._start_time

                # Mirror if needed
                if self.mirror:
                    frame = cv2.flip(frame, 1)

                # Emit frame
                self.frame_ready.emit(frame, timestamp_ms)

        except Exception as e:
            self.error.emit(str(e))
        finally:
            if self._cap:
                self._cap.release()
            self.stopped_signal.emit()

    def stop(self):
        """Stop capturing."""
        self._running = False
        self.wait()

    def pause(self):
        """Pause capturing."""
        with QMutexLocker(self._mutex):
            self._paused = True

    def resume(self):
        """Resume capturing."""
        with QMutexLocker(self._mutex):
            self._paused = False

    def set_mirror(self, mirror: bool):
        """Set mirror mode."""
        self.mirror = mirror

    @staticmethod
    def list_cameras() -> list:
        """List available camera devices."""
        import subprocess
        import platform

        cameras = []

        # On macOS, try to get camera names using system_profiler
        if platform.system() == "Darwin":
            try:
                result = subprocess.run(
                    ["system_profiler", "SPCameraDataType", "-json"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    import json
                    data = json.loads(result.stdout)
                    cam_data = data.get("SPCameraDataType", [])

                    # Separate internal cameras from iPhone/external
                    internal_cams = []
                    external_cams = []

                    for idx, cam in enumerate(cam_data):
                        name = cam.get("_name", f"Camera {idx}").strip()
                        model_id = cam.get("spcamera_model-id", "")

                        cam_info = {
                            'id': idx,
                            'name': name,
                            'width': 1280,
                            'height': 720,
                        }

                        # Prioritize internal cameras (FaceTime, iSight)
                        if "iPhone" in model_id or "iPad" in model_id:
                            external_cams.append(cam_info)
                        elif "FaceTime" in name or "iSight" in name:
                            internal_cams.insert(0, cam_info)  # Put at front
                        else:
                            internal_cams.append(cam_info)

                    # Internal cameras first, then external
                    cameras = internal_cams + external_cams
            except Exception:
                pass

        # Fallback: probe first 2 devices only
        if not cameras:
            for i in range(2):
                try:
                    cap = cv2.VideoCapture(i)
                    if cap.isOpened():
                        ret, _ = cap.read()
                        if ret:
                            cameras.append({
                                'id': i,
                                'name': f"Camera {i}",
                                'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                                'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
                            })
                        cap.release()
                except Exception:
                    pass

        # Always provide at least one option
        if not cameras:
            cameras.append({
                'id': 0,
                'name': "Default Camera",
                'width': 1280,
                'height': 720,
            })

        return cameras
