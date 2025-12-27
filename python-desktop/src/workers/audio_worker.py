"""
Audio Worker - Play audio from video files using PyQt6 multimedia.

Syncs with video playback.
"""

from typing import Optional
from PyQt6.QtCore import QObject, QUrl, pyqtSignal, pyqtSlot
from PyQt6.QtMultimedia import QMediaPlayer, QAudioOutput


class AudioWorker(QObject):
    """
    Plays audio from video files.
    Uses Qt Multimedia for proper audio playback.
    """

    error = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._player: Optional[QMediaPlayer] = None
        self._audio_output: Optional[QAudioOutput] = None
        self._video_path: Optional[str] = None
        self._playback_rate = 1.0

    def load(self, video_path: str) -> bool:
        """Load audio from video file."""
        try:
            self._video_path = video_path

            # Create audio output
            self._audio_output = QAudioOutput()
            self._audio_output.setVolume(1.0)

            # Create media player
            self._player = QMediaPlayer()
            self._player.setAudioOutput(self._audio_output)
            self._player.setSource(QUrl.fromLocalFile(video_path))

            return True
        except Exception as e:
            self.error.emit(str(e))
            return False

    def play(self):
        """Start audio playback."""
        if self._player:
            self._player.play()

    def pause(self):
        """Pause audio playback."""
        if self._player:
            self._player.pause()

    def stop(self):
        """Stop audio playback."""
        if self._player:
            self._player.stop()

    def seek(self, position_ms: float):
        """Seek to position in milliseconds."""
        if self._player:
            self._player.setPosition(int(position_ms))

    def set_playback_rate(self, rate: float):
        """Set playback speed."""
        self._playback_rate = rate
        if self._player:
            self._player.setPlaybackRate(rate)

    def set_volume(self, volume: float):
        """Set volume (0.0 - 1.0)."""
        if self._audio_output:
            self._audio_output.setVolume(volume)

    def toggle_mute(self):
        """Toggle mute."""
        if self._audio_output:
            self._audio_output.setMuted(not self._audio_output.isMuted())

    @property
    def is_playing(self) -> bool:
        """Check if audio is playing."""
        if self._player:
            return self._player.playbackState() == QMediaPlayer.PlaybackState.PlayingState
        return False

    @property
    def position(self) -> float:
        """Get current position in ms."""
        if self._player:
            return float(self._player.position())
        return 0.0

    def cleanup(self):
        """Clean up resources."""
        if self._player:
            self._player.stop()
            self._player = None
        if self._audio_output:
            self._audio_output = None
