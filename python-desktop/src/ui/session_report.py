"""
Session Report Dialog - Show detailed results after training.
Matches web version design.
"""

from typing import Optional, Callable
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QFrame, QWidget, QScrollArea, QProgressBar
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QPainter, QColor, QPen

from ..core.session_tracker import SessionResult, WeakSection


def get_grade_color(grade: str) -> str:
    """Get color for grade."""
    if grade.startswith('A'):
        return "#22c55e"  # green
    elif grade.startswith('B'):
        return "#3b82f6"  # blue
    elif grade.startswith('C'):
        return "#eab308"  # yellow
    elif grade.startswith('D'):
        return "#f97316"  # orange
    else:
        return "#ef4444"  # red


def get_score_color(score: int) -> str:
    """Get color based on score."""
    if score >= 80:
        return "#22c55e"  # green
    elif score >= 60:
        return "#eab308"  # yellow
    else:
        return "#ef4444"  # red


def format_time(ms: float) -> str:
    """Format milliseconds to mm:ss."""
    seconds = int(ms / 1000)
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"


class ScoreTimeline(QWidget):
    """Visual timeline of scores."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._scores = []
        self.setMinimumHeight(100)
        self.setStyleSheet("background: transparent;")

    def set_scores(self, scores: list):
        """Set score data."""
        self._scores = [s.score for s in scores]
        self.update()

    def paintEvent(self, event):
        if not self._scores:
            return

        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        width = self.width()
        height = self.height()
        bar_width = max(2, (width - 20) / len(self._scores))
        x = 10

        for score in self._scores:
            # Calculate bar height (score 0-100 mapped to height)
            bar_height = int((score / 100) * (height - 20))

            # Get color based on score
            if score >= 80:
                color = QColor("#3b82f6")  # blue
            elif score >= 60:
                color = QColor("#eab308")  # yellow
            else:
                color = QColor("#ef4444")  # red

            painter.fillRect(
                int(x), height - bar_height - 10,
                int(bar_width - 1), bar_height,
                color
            )
            x += bar_width

        painter.end()


class BodyPartBar(QFrame):
    """Progress bar for body part score."""

    def __init__(self, name: str, emoji: str, parent=None):
        super().__init__(parent)
        self._name = name
        self._emoji = emoji
        self._score = 0
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(4)

        # Label row
        label_layout = QHBoxLayout()
        label_layout.setSpacing(6)

        emoji_label = QLabel(self._emoji)
        emoji_label.setStyleSheet("font-size: 16px;")
        label_layout.addWidget(emoji_label)

        name_label = QLabel(self._name)
        name_label.setStyleSheet("font-size: 14px; color: white;")
        label_layout.addWidget(name_label)

        label_layout.addStretch()
        layout.addLayout(label_layout)

        # Progress bar
        self._progress = QProgressBar()
        self._progress.setRange(0, 100)
        self._progress.setTextVisible(False)
        self._progress.setFixedHeight(8)
        self._progress.setStyleSheet("""
            QProgressBar {
                background: #374151;
                border: none;
                border-radius: 4px;
            }
            QProgressBar::chunk {
                background: #eab308;
                border-radius: 4px;
            }
        """)
        layout.addWidget(self._progress)

        # Score label
        self._score_label = QLabel("0%")
        self._score_label.setAlignment(Qt.AlignmentFlag.AlignRight)
        self._score_label.setStyleSheet("font-size: 12px; color: #888;")
        layout.addWidget(self._score_label)

    def set_score(self, score: int):
        self._score = score
        self._progress.setValue(score)
        self._score_label.setText(f"{score}%")

        color = get_score_color(score)
        self._progress.setStyleSheet(f"""
            QProgressBar {{
                background: #374151;
                border: none;
                border-radius: 4px;
            }}
            QProgressBar::chunk {{
                background: {color};
                border-radius: 4px;
            }}
        """)


class WeakSectionItem(QFrame):
    """Display a weak section."""

    def __init__(self, section: WeakSection, parent=None):
        super().__init__(parent)
        self._section = section
        self._setup_ui()

    def _setup_ui(self):
        self.setStyleSheet("""
            WeakSectionItem {
                background: #1f2937;
                border: 1px solid #374151;
                border-radius: 8px;
            }
        """)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 12, 16, 12)

        # Time range
        time_label = QLabel(f"{format_time(self._section.start_ms)} - {format_time(self._section.end_ms)}")
        time_label.setStyleSheet("font-size: 14px; color: white;")
        layout.addWidget(time_label)

        layout.addStretch()

        # Score
        score_label = QLabel(f"Score: {self._section.score}")
        color = get_score_color(self._section.score)
        score_label.setStyleSheet(f"font-size: 14px; color: {color}; font-weight: bold;")
        layout.addWidget(score_label)


class SessionReportDialog(QDialog):
    """Session report dialog matching web design."""

    try_again = pyqtSignal()
    new_video = pyqtSignal()

    def __init__(self, result: SessionResult, parent=None):
        super().__init__(parent)
        self._result = result
        self._setup_ui()

    def _setup_ui(self):
        self.setWindowTitle("Session Complete")
        self.setFixedSize(500, 700)
        self.setStyleSheet("background: #111827;")

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        # Grade and Score header
        header_frame = QFrame()
        header_frame.setStyleSheet("""
            QFrame {
                background: #1f2937;
                border-radius: 12px;
            }
        """)
        header_layout = QHBoxLayout(header_frame)
        header_layout.setContentsMargins(32, 24, 32, 24)
        header_layout.setSpacing(24)

        # Grade
        grade_layout = QVBoxLayout()
        grade_label = QLabel(self._result.grade)
        grade_color = get_grade_color(self._result.grade)
        grade_label.setStyleSheet(f"""
            font-size: 64px;
            font-weight: bold;
            color: {grade_color};
        """)
        grade_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        grade_layout.addWidget(grade_label)

        grade_sub = QLabel("Grade")
        grade_sub.setStyleSheet("font-size: 14px; color: #6b7280;")
        grade_sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        grade_layout.addWidget(grade_sub)

        header_layout.addLayout(grade_layout)

        # Divider
        divider = QFrame()
        divider.setFixedWidth(2)
        divider.setStyleSheet("background: #374151;")
        header_layout.addWidget(divider)

        # Score
        score_layout = QVBoxLayout()
        score_label = QLabel(str(self._result.overall_score))
        score_label.setStyleSheet("""
            font-size: 64px;
            font-weight: bold;
            color: white;
        """)
        score_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        score_layout.addWidget(score_label)

        score_sub = QLabel("Overall Score")
        score_sub.setStyleSheet("font-size: 14px; color: #6b7280;")
        score_sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        score_layout.addWidget(score_sub)

        header_layout.addLayout(score_layout)

        layout.addWidget(header_frame)

        # Scroll area for content
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("""
            QScrollArea {
                border: none;
                background: transparent;
            }
            QScrollBar:vertical {
                background: #1f2937;
                width: 8px;
                border-radius: 4px;
            }
            QScrollBar::handle:vertical {
                background: #374151;
                border-radius: 4px;
            }
        """)

        content = QWidget()
        content_layout = QVBoxLayout(content)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(16)

        # Performance Breakdown
        breakdown_frame = QFrame()
        breakdown_frame.setStyleSheet("""
            QFrame {
                background: #1f2937;
                border-radius: 12px;
            }
        """)
        breakdown_layout = QVBoxLayout(breakdown_frame)
        breakdown_layout.setContentsMargins(20, 20, 20, 20)
        breakdown_layout.setSpacing(16)

        breakdown_title = QLabel("Performance Breakdown")
        breakdown_title.setStyleSheet("font-size: 16px; font-weight: bold; color: white;")
        breakdown_layout.addWidget(breakdown_title)

        # Body parts
        parts_layout = QHBoxLayout()
        parts_layout.setSpacing(16)

        arms_bar = BodyPartBar("Arms", "\U0001F4AA")
        arms_bar.set_score(self._result.body_parts.arms)
        parts_layout.addWidget(arms_bar)

        legs_bar = BodyPartBar("Legs", "\U0001F9B5")
        legs_bar.set_score(self._result.body_parts.legs)
        parts_layout.addWidget(legs_bar)

        torso_bar = BodyPartBar("Torso", "\U0001F9CD")
        torso_bar.set_score(self._result.body_parts.torso)
        parts_layout.addWidget(torso_bar)

        breakdown_layout.addLayout(parts_layout)
        content_layout.addWidget(breakdown_frame)

        # Areas to Practice
        if self._result.weak_sections:
            practice_frame = QFrame()
            practice_frame.setStyleSheet("""
                QFrame {
                    background: #1f2937;
                    border-radius: 12px;
                }
            """)
            practice_layout = QVBoxLayout(practice_frame)
            practice_layout.setContentsMargins(20, 20, 20, 20)
            practice_layout.setSpacing(12)

            practice_title = QLabel("Areas to Practice")
            practice_title.setStyleSheet("font-size: 16px; font-weight: bold; color: white;")
            practice_layout.addWidget(practice_title)

            for section in self._result.weak_sections[:5]:
                item = WeakSectionItem(section)
                practice_layout.addWidget(item)

            content_layout.addWidget(practice_frame)

        # Score Timeline
        if self._result.score_timeline:
            timeline_frame = QFrame()
            timeline_frame.setStyleSheet("""
                QFrame {
                    background: #1f2937;
                    border-radius: 12px;
                }
            """)
            timeline_layout = QVBoxLayout(timeline_frame)
            timeline_layout.setContentsMargins(20, 20, 20, 20)
            timeline_layout.setSpacing(12)

            timeline_title = QLabel("Score Timeline")
            timeline_title.setStyleSheet("font-size: 16px; font-weight: bold; color: white;")
            timeline_layout.addWidget(timeline_title)

            timeline = ScoreTimeline()
            timeline.set_scores(self._result.score_timeline)
            timeline.setFixedHeight(120)
            timeline_layout.addWidget(timeline)

            # Start/End labels
            time_labels = QHBoxLayout()
            start_label = QLabel("Start")
            start_label.setStyleSheet("font-size: 12px; color: #6b7280;")
            time_labels.addWidget(start_label)
            time_labels.addStretch()
            end_label = QLabel("End")
            end_label.setStyleSheet("font-size: 12px; color: #6b7280;")
            time_labels.addWidget(end_label)
            timeline_layout.addLayout(time_labels)

            content_layout.addWidget(timeline_frame)

        content_layout.addStretch()
        scroll.setWidget(content)
        layout.addWidget(scroll, 1)

        # Buttons
        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(12)

        self._try_again_btn = QPushButton("Try Again")
        self._try_again_btn.setFixedHeight(48)
        self._try_again_btn.setStyleSheet("""
            QPushButton {
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: bold;
                padding: 0 24px;
            }
            QPushButton:hover {
                background: #3b82f6;
            }
        """)
        self._try_again_btn.clicked.connect(self._on_try_again)
        btn_layout.addWidget(self._try_again_btn, 2)

        self._new_video_btn = QPushButton("New Video")
        self._new_video_btn.setFixedHeight(48)
        self._new_video_btn.setStyleSheet("""
            QPushButton {
                background: transparent;
                color: white;
                border: 1px solid #374151;
                border-radius: 8px;
                font-size: 15px;
                padding: 0 24px;
            }
            QPushButton:hover {
                background: #1f2937;
            }
        """)
        self._new_video_btn.clicked.connect(self._on_new_video)
        btn_layout.addWidget(self._new_video_btn, 2)

        self._export_btn = QPushButton("Export")
        self._export_btn.setFixedHeight(48)
        self._export_btn.setStyleSheet("""
            QPushButton {
                background: #374151;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                padding: 0 16px;
            }
            QPushButton:hover {
                background: #4b5563;
            }
        """)
        self._export_btn.clicked.connect(self._on_export)
        btn_layout.addWidget(self._export_btn, 1)

        layout.addLayout(btn_layout)

    def _on_try_again(self):
        self.try_again.emit()
        self.accept()

    def _on_new_video(self):
        self.new_video.emit()
        self.accept()

    def _on_export(self):
        """Export session data as JSON."""
        from PyQt6.QtWidgets import QFileDialog
        import json

        path, _ = QFileDialog.getSaveFileName(
            self,
            "Export Session",
            "session_report.json",
            "JSON Files (*.json)"
        )

        if path:
            data = {
                "overall_score": self._result.overall_score,
                "grade": self._result.grade,
                "body_parts": {
                    "arms": self._result.body_parts.arms,
                    "legs": self._result.body_parts.legs,
                    "torso": self._result.body_parts.torso,
                },
                "weak_sections": [
                    {
                        "start_ms": s.start_ms,
                        "end_ms": s.end_ms,
                        "score": s.score,
                    }
                    for s in self._result.weak_sections
                ],
                "duration_ms": self._result.duration_ms,
            }

            with open(path, 'w') as f:
                json.dump(data, f, indent=2)
