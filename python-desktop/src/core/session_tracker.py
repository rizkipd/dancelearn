"""
Session Tracker - Track scores over time and generate session reports.

Matches web version SessionScorer logic.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from .scoring_engine import ScoreResult, BodyPartScores
from .pose_normalizer import NormalizedPose


@dataclass
class WeakSection:
    """A section where the dancer struggled."""
    start_ms: float
    end_ms: float
    score: int


@dataclass
class ScoreEntry:
    """Single score entry with timestamp."""
    timestamp_ms: float
    score: int
    body_parts: BodyPartScores


@dataclass
class SessionResult:
    """Complete session analysis."""
    overall_score: int
    avg_timing_ms: float
    body_parts: BodyPartScores
    score_timeline: List[ScoreEntry]
    weak_sections: List[WeakSection]
    duration_ms: float
    grade: str

    @staticmethod
    def calculate_grade(score: int) -> str:
        """Convert score to letter grade."""
        if score >= 95:
            return 'A+'
        elif score >= 90:
            return 'A'
        elif score >= 85:
            return 'A-'
        elif score >= 80:
            return 'B+'
        elif score >= 75:
            return 'B'
        elif score >= 70:
            return 'B-'
        elif score >= 65:
            return 'C+'
        elif score >= 60:
            return 'C'
        elif score >= 55:
            return 'C-'
        elif score >= 50:
            return 'D'
        else:
            return 'F'


class SessionTracker:
    """
    Tracks scores throughout a session and generates reports.
    Matches web version SessionScorer logic.
    """

    def __init__(self):
        self.scores: List[ScoreEntry] = []
        self.teacher_poses: Dict[int, NormalizedPose] = {}
        self.start_time_ms: float = 0

    def set_teacher_poses(self, poses: Dict[float, NormalizedPose]):
        """Pre-load teacher poses for timestamp lookup."""
        self.teacher_poses.clear()
        for timestamp, pose in poses.items():
            self.teacher_poses[round(timestamp)] = pose

    def add_score(self, timestamp_ms: float, result: ScoreResult):
        """Record a score at a given timestamp."""
        self.scores.append(ScoreEntry(
            timestamp_ms=timestamp_ms,
            score=result.overall_score,
            body_parts=result.body_parts,
        ))

    def find_teacher_pose(self, timestamp_ms: float) -> Optional[NormalizedPose]:
        """Find teacher pose closest to timestamp."""
        rounded = round(timestamp_ms)

        if rounded in self.teacher_poses:
            return self.teacher_poses[rounded]

        # Find closest timestamp within 100ms
        closest_time = -1
        min_diff = float('inf')

        for t in self.teacher_poses.keys():
            diff = abs(t - rounded)
            if diff < min_diff:
                min_diff = diff
                closest_time = t

        if closest_time >= 0 and min_diff < 100:
            return self.teacher_poses[closest_time]

        return None

    def get_session_result(self) -> SessionResult:
        """Generate complete session analysis."""
        if not self.scores:
            return SessionResult(
                overall_score=0,
                avg_timing_ms=0,
                body_parts=BodyPartScores(arms=0, legs=0, torso=0),
                score_timeline=[],
                weak_sections=[],
                duration_ms=0,
                grade='F',
            )

        # Calculate averages
        avg_score = sum(s.score for s in self.scores) / len(self.scores)
        avg_arms = sum(s.body_parts.arms for s in self.scores) / len(self.scores)
        avg_legs = sum(s.body_parts.legs for s in self.scores) / len(self.scores)
        avg_torso = sum(s.body_parts.torso for s in self.scores) / len(self.scores)

        # Calculate duration
        duration_ms = 0
        if len(self.scores) >= 2:
            duration_ms = self.scores[-1].timestamp_ms - self.scores[0].timestamp_ms

        weak_sections = self._find_weak_sections()
        overall_score = round(avg_score)

        return SessionResult(
            overall_score=overall_score,
            avg_timing_ms=0,
            body_parts=BodyPartScores(
                arms=round(avg_arms),
                legs=round(avg_legs),
                torso=round(avg_torso),
            ),
            score_timeline=self.scores.copy(),
            weak_sections=weak_sections,
            duration_ms=duration_ms,
            grade=SessionResult.calculate_grade(overall_score),
        )

    def _find_weak_sections(self) -> List[WeakSection]:
        """
        Find sections where dancer struggled.
        Matches web version logic.
        """
        threshold = 60
        min_section_duration = 500  # Minimum 500ms to count
        merge_tolerance = 1000  # Merge sections within 1 second

        sections: List[WeakSection] = []
        current_section: Optional[Dict] = None

        for entry in self.scores:
            if entry.score < threshold:
                if current_section:
                    # Check if close enough to merge
                    if entry.timestamp_ms - current_section['end'] < merge_tolerance:
                        current_section['end'] = entry.timestamp_ms
                        current_section['scores'].append(entry.score)
                    else:
                        # Save current section if long enough
                        if current_section['end'] - current_section['start'] >= min_section_duration:
                            avg = sum(current_section['scores']) / len(current_section['scores'])
                            sections.append(WeakSection(
                                start_ms=current_section['start'],
                                end_ms=current_section['end'],
                                score=round(avg),
                            ))
                        # Start new section
                        current_section = {
                            'start': entry.timestamp_ms,
                            'end': entry.timestamp_ms,
                            'scores': [entry.score],
                        }
                else:
                    current_section = {
                        'start': entry.timestamp_ms,
                        'end': entry.timestamp_ms,
                        'scores': [entry.score],
                    }
            elif current_section:
                # Save current section if long enough
                if current_section['end'] - current_section['start'] >= min_section_duration:
                    avg = sum(current_section['scores']) / len(current_section['scores'])
                    sections.append(WeakSection(
                        start_ms=current_section['start'],
                        end_ms=current_section['end'],
                        score=round(avg),
                    ))
                current_section = None

        # Don't forget last section
        if current_section and current_section['end'] - current_section['start'] >= min_section_duration:
            avg = sum(current_section['scores']) / len(current_section['scores'])
            sections.append(WeakSection(
                start_ms=current_section['start'],
                end_ms=current_section['end'],
                score=round(avg),
            ))

        # Sort by score (worst first) and limit to 5
        sections.sort(key=lambda s: s.score)
        return sections[:5]

    def reset(self):
        """Reset for new session."""
        self.scores.clear()
        self.start_time_ms = 0
