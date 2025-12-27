"""
Scoring Engine - Matches web version logic exactly

Compares dancer pose vs teacher pose and calculates scores.
"""

import math
from dataclasses import dataclass
from typing import List, Optional
from .pose_normalizer import NormalizedPose, BodyPartAngles, get_body_part_angles


# Weights for each body part - matches web version
ANGLE_WEIGHTS = {
    'arms': 0.35,
    'legs': 0.40,
    'torso': 0.25,
}

# Minimum confidence threshold for scoring
MIN_CONFIDENCE_THRESHOLD = 0.65

# Tolerance windows in radians (converted from degrees)
TOLERANCE_WINDOWS = {
    'arms': 25 * (math.pi / 180),   # 25 degrees
    'legs': 30 * (math.pi / 180),   # 30 degrees
    'torso': 15 * (math.pi / 180),  # 15 degrees
}


@dataclass
class BodyPartScores:
    """Scores for each body part."""
    arms: int
    legs: int
    torso: int


@dataclass
class ScoreResult:
    """Complete score result for a frame."""
    overall_score: int
    timing_offset_ms: float
    body_parts: BodyPartScores
    hint: Optional[str]


def angle_difference(a1: float, a2: float) -> float:
    """Calculate difference between two angles, handling wraparound."""
    diff = abs(a1 - a2)
    if diff > math.pi:
        diff = 2 * math.pi - diff
    return diff


def calculate_angle_score(diff: float, tolerance: float) -> float:
    """
    Non-linear scoring: small errors = minimal penalty, large errors = heavy penalty.
    Matches web version exactly.
    """
    if diff <= tolerance:
        # Within tolerance: score 85-100 (small linear penalty)
        return 100 - (diff / tolerance) * 15

    # Outside tolerance: exponential penalty
    excess_diff = diff - tolerance
    max_excess = math.pi - tolerance
    ratio = min(excess_diff / max_excess, 1)

    # Exponential curve: starts at 85, drops faster as error increases
    return max(0, 85 * pow(1 - ratio, 1.5))


def calculate_body_part_score(
    dancer_angles: List[float],
    teacher_angles: List[float],
    confidence: List[float],
    body_part: str,
) -> float:
    """Calculate score for a body part."""
    if not dancer_angles or not teacher_angles:
        return 0.0

    tolerance = TOLERANCE_WINDOWS[body_part]
    total_score = 0.0
    valid_count = 0.0

    for i in range(len(dancer_angles)):
        conf = confidence[i] if i < len(confidence) else 1.0
        if conf < MIN_CONFIDENCE_THRESHOLD:
            continue

        diff = angle_difference(dancer_angles[i], teacher_angles[i])
        score = calculate_angle_score(diff, tolerance)

        # Weight by confidence squared (low confidence = much less impact)
        conf_weight = conf * conf
        total_score += score * conf_weight
        valid_count += conf_weight

    return total_score / valid_count if valid_count > 0 else 0.0


def generate_hint(
    arms_score: float,
    legs_score: float,
    torso_score: float,
    dancer_parts: BodyPartAngles,
    teacher_parts: BodyPartAngles,
) -> Optional[str]:
    """Generate actionable hint for the weakest body part."""
    scores = [
        ('arms', arms_score),
        ('legs', legs_score),
        ('torso', torso_score),
    ]

    weakest_part, weakest_score = min(scores, key=lambda x: x[1])

    if weakest_score >= 80:
        return None

    if weakest_part == 'arms':
        left_elbow_diff = angle_difference(dancer_parts.arms[1], teacher_parts.arms[1])
        right_elbow_diff = angle_difference(dancer_parts.arms[3], teacher_parts.arms[3])

        if left_elbow_diff > right_elbow_diff:
            if dancer_parts.arms[1] < teacher_parts.arms[1]:
                return "Extend your left elbow more"
            else:
                return "Bend your left elbow more"
        else:
            if dancer_parts.arms[3] < teacher_parts.arms[3]:
                return "Extend your right elbow more"
            else:
                return "Bend your right elbow more"

    if weakest_part == 'legs':
        left_knee_diff = angle_difference(dancer_parts.legs[1], teacher_parts.legs[1])
        right_knee_diff = angle_difference(dancer_parts.legs[3], teacher_parts.legs[3])

        if left_knee_diff > right_knee_diff:
            if dancer_parts.legs[1] < teacher_parts.legs[1]:
                return "Straighten your left leg more"
            else:
                return "Bend your left knee more"
        else:
            if dancer_parts.legs[3] < teacher_parts.legs[3]:
                return "Straighten your right leg more"
            else:
                return "Bend your right knee more"

    return "Keep your torso aligned with the teacher"


class ScoringEngine:
    """
    Compares dancer pose to teacher pose and calculates scores.
    Includes smoothing for more stable score display.
    """

    def __init__(self, score_smoothing: float = 0.4):
        """
        Args:
            score_smoothing: 0-1, higher = more stable scores (less jitter)
        """
        self.score_smoothing = score_smoothing
        self._prev_score: Optional[ScoreResult] = None

    def compare_frames(
        self,
        dancer_pose: NormalizedPose,
        teacher_pose: NormalizedPose,
    ) -> ScoreResult:
        """
        Compare dancer and teacher poses, return score result.
        Matches web version logic.
        """
        dancer_parts = get_body_part_angles(dancer_pose.angles)
        teacher_parts = get_body_part_angles(teacher_pose.angles)
        conf_parts = get_body_part_angles(dancer_pose.confidence)

        arms_score = calculate_body_part_score(
            dancer_parts.arms, teacher_parts.arms, conf_parts.arms, 'arms'
        )
        legs_score = calculate_body_part_score(
            dancer_parts.legs, teacher_parts.legs, conf_parts.legs, 'legs'
        )
        torso_score = calculate_body_part_score(
            dancer_parts.torso, teacher_parts.torso, conf_parts.torso, 'torso'
        )

        overall_score = round(
            arms_score * ANGLE_WEIGHTS['arms'] +
            legs_score * ANGLE_WEIGHTS['legs'] +
            torso_score * ANGLE_WEIGHTS['torso']
        )

        hint = generate_hint(
            arms_score, legs_score, torso_score,
            dancer_parts, teacher_parts
        )

        result = ScoreResult(
            overall_score=overall_score,
            timing_offset_ms=0,
            body_parts=BodyPartScores(
                arms=round(arms_score),
                legs=round(legs_score),
                torso=round(torso_score),
            ),
            hint=hint,
        )

        # Apply smoothing for more stable display
        if self._prev_score is not None:
            result = self._smooth_score(result)

        self._prev_score = result
        return result

    def _smooth_score(self, result: ScoreResult) -> ScoreResult:
        """Apply smoothing to reduce score jitter."""
        if self._prev_score is None:
            return result

        s = self.score_smoothing
        return ScoreResult(
            overall_score=round(s * self._prev_score.overall_score + (1 - s) * result.overall_score),
            timing_offset_ms=result.timing_offset_ms,
            body_parts=BodyPartScores(
                arms=round(s * self._prev_score.body_parts.arms + (1 - s) * result.body_parts.arms),
                legs=round(s * self._prev_score.body_parts.legs + (1 - s) * result.body_parts.legs),
                torso=round(s * self._prev_score.body_parts.torso + (1 - s) * result.body_parts.torso),
            ),
            hint=result.hint,
        )

    def reset(self):
        """Reset smoothing state."""
        self._prev_score = None
