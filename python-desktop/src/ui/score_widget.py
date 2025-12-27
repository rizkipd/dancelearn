"""
Score Widget - Display real-time score and feedback.

Shows overall score, body part breakdown, and hints.
"""

from typing import Optional
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QFrame, QProgressBar
)
from PyQt6.QtCore import Qt, QPropertyAnimation, QEasingCurve
from PyQt6.QtGui import QFont

from ..core.scoring_engine import ScoreResult


def get_score_color(score: int) -> str:
    """Get color based on score."""
    if score >= 80:
        return "#22c55e"  # Green
    elif score >= 60:
        return "#eab308"  # Yellow
    else:
        return "#ef4444"  # Red


def get_score_bg_color(score: int) -> str:
    """Get background color based on score."""
    if score >= 80:
        return "rgba(34, 197, 94, 0.2)"
    elif score >= 60:
        return "rgba(234, 179, 8, 0.2)"
    else:
        return "rgba(239, 68, 68, 0.2)"


class BodyPartIndicator(QFrame):
    """Circular indicator for body part score."""

    def __init__(self, label: str, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.label_text = label
        self._score = 0
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(4)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        # Score label
        self._score_label = QLabel("0")
        self._score_label.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        self._score_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._score_label.setStyleSheet("color: white;")
        layout.addWidget(self._score_label)

        # Part name
        self._name_label = QLabel(self.label_text)
        self._name_label.setFont(QFont("Arial", 10))
        self._name_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._name_label.setStyleSheet("color: #888;")
        layout.addWidget(self._name_label)

        self.setFixedSize(70, 70)
        self._update_style()

    def set_score(self, score: int):
        """Update the score."""
        self._score = score
        self._score_label.setText(str(score))
        self._update_style()

    def _update_style(self):
        color = get_score_color(self._score)
        self.setStyleSheet(f"""
            BodyPartIndicator {{
                background: #2a2a2a;
                border: 3px solid {color};
                border-radius: 35px;
            }}
        """)
        self._score_label.setStyleSheet(f"color: {color};")


class ScoreWidget(QWidget):
    """
    Main score display widget.

    Shows:
    - Overall score (large)
    - Body part breakdown (arms, legs, torso)
    - Hint for improvement
    """

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self._current_score: Optional[ScoreResult] = None
        self._setup_ui()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        # Main container
        self.setStyleSheet("""
            ScoreWidget {
                background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
                border-radius: 12px;
            }
        """)

        # Top row: Overall score + body parts
        top_layout = QHBoxLayout()
        top_layout.setSpacing(20)

        # Overall score
        score_container = QVBoxLayout()
        score_container.setSpacing(0)

        self._overall_score_label = QLabel("--")
        self._overall_score_label.setFont(QFont("Arial", 48, QFont.Weight.Bold))
        self._overall_score_label.setStyleSheet("color: white;")
        score_container.addWidget(self._overall_score_label)

        self._score_subtitle = QLabel("/ 100")
        self._score_subtitle.setFont(QFont("Arial", 14))
        self._score_subtitle.setStyleSheet("color: #888;")
        score_container.addWidget(self._score_subtitle)

        top_layout.addLayout(score_container)
        top_layout.addStretch()

        # Body part indicators
        self._arms_indicator = BodyPartIndicator("Arms")
        self._legs_indicator = BodyPartIndicator("Legs")
        self._torso_indicator = BodyPartIndicator("Torso")

        top_layout.addWidget(self._arms_indicator)
        top_layout.addWidget(self._legs_indicator)
        top_layout.addWidget(self._torso_indicator)

        layout.addLayout(top_layout)

        # Hint section
        self._hint_frame = QFrame()
        self._hint_frame.setStyleSheet("""
            QFrame {
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 8px;
                padding: 8px;
            }
        """)
        hint_layout = QHBoxLayout(self._hint_frame)
        hint_layout.setContentsMargins(12, 8, 12, 8)

        self._hint_icon = QLabel("!")
        self._hint_icon.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        self._hint_icon.setStyleSheet("color: #ef4444;")
        self._hint_icon.setFixedWidth(24)
        hint_layout.addWidget(self._hint_icon)

        self._hint_label = QLabel("")
        self._hint_label.setFont(QFont("Arial", 12))
        self._hint_label.setStyleSheet("color: #fca5a5;")
        self._hint_label.setWordWrap(True)
        hint_layout.addWidget(self._hint_label, 1)

        layout.addWidget(self._hint_frame)
        self._hint_frame.hide()

    def update_score(self, result: ScoreResult):
        """Update the display with new score."""
        self._current_score = result

        # Update overall score
        color = get_score_color(result.overall_score)
        self._overall_score_label.setText(str(result.overall_score))
        self._overall_score_label.setStyleSheet(f"color: {color};")

        # Update body parts
        self._arms_indicator.set_score(result.body_parts.arms)
        self._legs_indicator.set_score(result.body_parts.legs)
        self._torso_indicator.set_score(result.body_parts.torso)

        # Update hint
        if result.hint:
            self._hint_label.setText(result.hint)
            self._update_hint_style(result.overall_score)
            self._hint_frame.show()
        else:
            self._hint_frame.hide()

    def _update_hint_style(self, score: int):
        """Update hint frame style based on score."""
        if score >= 80:
            bg = "rgba(34, 197, 94, 0.2)"
            border = "rgba(34, 197, 94, 0.3)"
            icon_color = "#22c55e"
            text_color = "#86efac"
            icon = "✓"
        elif score >= 60:
            bg = "rgba(234, 179, 8, 0.2)"
            border = "rgba(234, 179, 8, 0.3)"
            icon_color = "#eab308"
            text_color = "#fde047"
            icon = "!"
        else:
            bg = "rgba(239, 68, 68, 0.2)"
            border = "rgba(239, 68, 68, 0.3)"
            icon_color = "#ef4444"
            text_color = "#fca5a5"
            icon = "⚠"

        self._hint_frame.setStyleSheet(f"""
            QFrame {{
                background: {bg};
                border: 1px solid {border};
                border-radius: 8px;
            }}
        """)
        self._hint_icon.setText(icon)
        self._hint_icon.setStyleSheet(f"color: {icon_color};")
        self._hint_label.setStyleSheet(f"color: {text_color};")

    def reset(self):
        """Reset to initial state."""
        self._overall_score_label.setText("--")
        self._overall_score_label.setStyleSheet("color: white;")
        self._arms_indicator.set_score(0)
        self._legs_indicator.set_score(0)
        self._torso_indicator.set_score(0)
        self._hint_frame.hide()
        self._current_score = None
