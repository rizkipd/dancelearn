"""
Score Widget - Display real-time score and feedback.
Simple and clean design.
"""

from typing import Optional
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame
)
from PyQt6.QtCore import Qt

from ..core.scoring_engine import ScoreResult


def get_score_color(score: int) -> str:
    """Get color based on score."""
    if score >= 80:
        return "#22c55e"  # green
    elif score >= 60:
        return "#eab308"  # yellow
    else:
        return "#ef4444"  # red


class BodyPartScore(QFrame):
    """Simple body part score display."""

    def __init__(self, name: str, parent=None):
        super().__init__(parent)
        self._name = name
        self._score = 0
        self._setup_ui()

    def _setup_ui(self):
        self.setFixedWidth(80)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(4)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        # Score number
        self._score_label = QLabel("0")
        self._score_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._score_label.setStyleSheet("""
            QLabel {
                font-size: 20px;
                font-weight: bold;
                color: #888888;
            }
        """)
        layout.addWidget(self._score_label)

        # Name
        self._name_label = QLabel(self._name)
        self._name_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._name_label.setStyleSheet("""
            QLabel {
                font-size: 11px;
                color: #888888;
            }
        """)
        layout.addWidget(self._name_label)

        self.setStyleSheet("""
            QFrame {
                background: #2a2a2a;
                border-radius: 8px;
            }
        """)

    def set_score(self, score: int):
        self._score = score
        self._score_label.setText(str(score))
        color = get_score_color(score)
        self._score_label.setStyleSheet(f"""
            QLabel {{
                font-size: 20px;
                font-weight: bold;
                color: {color};
            }}
        """)


class ScoreWidget(QWidget):
    """Main score display widget - simple design."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()

    def _setup_ui(self):
        self.setStyleSheet("background: #1a1a1a;")

        layout = QHBoxLayout(self)
        layout.setContentsMargins(20, 12, 20, 12)
        layout.setSpacing(20)

        # Left side - main score
        score_layout = QVBoxLayout()
        score_layout.setSpacing(0)

        self._score_label = QLabel("--")
        self._score_label.setStyleSheet("""
            QLabel {
                font-size: 48px;
                font-weight: bold;
                color: white;
            }
        """)
        score_layout.addWidget(self._score_label)

        score_sub = QLabel("/ 100 Score")
        score_sub.setStyleSheet("font-size: 12px; color: #666666;")
        score_layout.addWidget(score_sub)

        layout.addLayout(score_layout)

        # Hint label (stretches)
        self._hint_label = QLabel("")
        self._hint_label.setWordWrap(True)
        self._hint_label.setStyleSheet("""
            QLabel {
                font-size: 13px;
                color: #999999;
                padding: 8px 16px;
            }
        """)
        layout.addWidget(self._hint_label, 1)

        # Right side - body parts
        parts_layout = QHBoxLayout()
        parts_layout.setSpacing(8)

        self._arms = BodyPartScore("Arms")
        self._legs = BodyPartScore("Legs")
        self._torso = BodyPartScore("Torso")

        parts_layout.addWidget(self._arms)
        parts_layout.addWidget(self._legs)
        parts_layout.addWidget(self._torso)

        layout.addLayout(parts_layout)

    def update_score(self, result: ScoreResult):
        """Update the display with new score."""
        score = result.overall_score
        color = get_score_color(score)

        self._score_label.setText(str(score))
        self._score_label.setStyleSheet(f"""
            QLabel {{
                font-size: 48px;
                font-weight: bold;
                color: {color};
            }}
        """)

        self._arms.set_score(result.body_parts.arms)
        self._legs.set_score(result.body_parts.legs)
        self._torso.set_score(result.body_parts.torso)

        if result.hint:
            self._hint_label.setText(result.hint)
            self._hint_label.setStyleSheet(f"""
                QLabel {{
                    font-size: 13px;
                    color: {color};
                    padding: 8px 16px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 6px;
                }}
            """)
        else:
            self._hint_label.setText("")
            self._hint_label.setStyleSheet("font-size: 13px; color: #999999;")

    def reset(self):
        """Reset to initial state."""
        self._score_label.setText("--")
        self._score_label.setStyleSheet("""
            QLabel {
                font-size: 48px;
                font-weight: bold;
                color: white;
            }
        """)
        self._arms.set_score(0)
        self._legs.set_score(0)
        self._torso.set_score(0)
        self._hint_label.setText("")
