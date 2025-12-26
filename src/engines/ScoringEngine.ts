import { NormalizedPose, ScoreResult, SessionResult, PoseFrame } from '../types/pose';
import { normalizePose, getBodyPartAngles } from './PoseNormalizer';

const ANGLE_WEIGHTS = {
  arms: 0.35,
  legs: 0.40,
  torso: 0.25,
};

// Increased confidence threshold for more accurate scoring
const MIN_CONFIDENCE_THRESHOLD = 0.65;

// Tolerance windows in radians (converted from degrees)
// Small errors within tolerance get minimal penalty
const TOLERANCE_WINDOWS = {
  arms: 25 * (Math.PI / 180),   // 25 degrees tolerance for arms
  legs: 30 * (Math.PI / 180),   // 30 degrees tolerance for legs
  torso: 15 * (Math.PI / 180),  // 15 degrees tolerance for torso
};

function angleDifference(a1: number, a2: number): number {
  let diff = Math.abs(a1 - a2);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff;
}

// Non-linear scoring: small errors = minimal penalty, large errors = heavy penalty
function calculateAngleScore(diff: number, tolerance: number): number {
  if (diff <= tolerance) {
    // Within tolerance: score 85-100 (small linear penalty)
    return 100 - (diff / tolerance) * 15;
  }

  // Outside tolerance: exponential penalty
  const excessDiff = diff - tolerance;
  const maxExcess = Math.PI - tolerance;
  const ratio = Math.min(excessDiff / maxExcess, 1);

  // Exponential curve: starts at 85, drops faster as error increases
  return Math.max(0, 85 * Math.pow(1 - ratio, 1.5));
}

function calculateBodyPartScore(
  dancerAngles: number[],
  teacherAngles: number[],
  confidence: number[],
  bodyPart: 'arms' | 'legs' | 'torso'
): number {
  if (dancerAngles.length === 0 || teacherAngles.length === 0) return 0;

  const tolerance = TOLERANCE_WINDOWS[bodyPart];
  let totalScore = 0;
  let validCount = 0;

  for (let i = 0; i < dancerAngles.length; i++) {
    const conf = confidence[i] ?? 1;
    if (conf < MIN_CONFIDENCE_THRESHOLD) continue;

    const diff = angleDifference(dancerAngles[i], teacherAngles[i]);
    const score = calculateAngleScore(diff, tolerance);

    // Weight by confidence squared (low confidence = much less impact)
    const confWeight = conf * conf;
    totalScore += score * confWeight;
    validCount += confWeight;
  }

  return validCount > 0 ? totalScore / validCount : 0;
}

export function compareFrames(
  dancerPose: NormalizedPose,
  teacherPose: NormalizedPose
): ScoreResult {
  const dancerParts = getBodyPartAngles(dancerPose.angles);
  const teacherParts = getBodyPartAngles(teacherPose.angles);
  const confParts = getBodyPartAngles(dancerPose.confidence);

  const armsScore = calculateBodyPartScore(dancerParts.arms, teacherParts.arms, confParts.arms, 'arms');
  const legsScore = calculateBodyPartScore(dancerParts.legs, teacherParts.legs, confParts.legs, 'legs');
  const torsoScore = calculateBodyPartScore(dancerParts.torso, teacherParts.torso, confParts.torso, 'torso');

  const overallScore = Math.round(
    armsScore * ANGLE_WEIGHTS.arms +
    legsScore * ANGLE_WEIGHTS.legs +
    torsoScore * ANGLE_WEIGHTS.torso
  );

  const hint = generateHint(armsScore, legsScore, torsoScore, dancerParts, teacherParts);

  return {
    overallScore,
    timingOffsetMs: 0,
    bodyParts: {
      arms: Math.round(armsScore),
      legs: Math.round(legsScore),
      torso: Math.round(torsoScore),
    },
    hint,
  };
}

function generateHint(
  armsScore: number,
  legsScore: number,
  torsoScore: number,
  dancerParts: ReturnType<typeof getBodyPartAngles>,
  teacherParts: ReturnType<typeof getBodyPartAngles>
): string | undefined {
  const scores = [
    { part: 'arms', score: armsScore },
    { part: 'legs', score: legsScore },
    { part: 'torso', score: torsoScore },
  ];

  const weakest = scores.reduce((min, s) => s.score < min.score ? s : min);

  if (weakest.score >= 80) return undefined;

  if (weakest.part === 'arms') {
    const leftElbowDiff = angleDifference(dancerParts.arms[1], teacherParts.arms[1]);
    const rightElbowDiff = angleDifference(dancerParts.arms[3], teacherParts.arms[3]);

    if (leftElbowDiff > rightElbowDiff) {
      return dancerParts.arms[1] < teacherParts.arms[1]
        ? 'Extend your left elbow more'
        : 'Bend your left elbow more';
    } else {
      return dancerParts.arms[3] < teacherParts.arms[3]
        ? 'Extend your right elbow more'
        : 'Bend your right elbow more';
    }
  }

  if (weakest.part === 'legs') {
    const leftKneeDiff = angleDifference(dancerParts.legs[1], teacherParts.legs[1]);
    const rightKneeDiff = angleDifference(dancerParts.legs[3], teacherParts.legs[3]);

    if (leftKneeDiff > rightKneeDiff) {
      return dancerParts.legs[1] < teacherParts.legs[1]
        ? 'Straighten your left leg more'
        : 'Bend your left knee more';
    } else {
      return dancerParts.legs[3] < teacherParts.legs[3]
        ? 'Straighten your right leg more'
        : 'Bend your right knee more';
    }
  }

  return 'Keep your torso aligned with the teacher';
}

export class SessionScorer {
  private scores: { timestamp: number; score: number; bodyParts: ScoreResult['bodyParts'] }[] = [];
  private teacherPoses: Map<number, NormalizedPose> = new Map();

  setTeacherPoses(poses: PoseFrame[]) {
    this.teacherPoses.clear();
    poses.forEach(pose => {
      const normalized = normalizePose(pose.keypoints);
      this.teacherPoses.set(Math.round(pose.timestamp), normalized);
    });
  }

  addScore(timestamp: number, result: ScoreResult) {
    this.scores.push({
      timestamp,
      score: result.overallScore,
      bodyParts: result.bodyParts,
    });
  }

  findTeacherPose(timestamp: number): NormalizedPose | null {
    const roundedTimestamp = Math.round(timestamp);

    if (this.teacherPoses.has(roundedTimestamp)) {
      return this.teacherPoses.get(roundedTimestamp)!;
    }

    // Find closest timestamp
    let closestTime = -1;
    let minDiff = Infinity;

    for (const t of this.teacherPoses.keys()) {
      const diff = Math.abs(t - roundedTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestTime = t;
      }
    }

    if (closestTime >= 0 && minDiff < 100) { // Within 100ms
      return this.teacherPoses.get(closestTime)!;
    }

    return null;
  }

  getSessionResult(): SessionResult {
    if (this.scores.length === 0) {
      return {
        overallScore: 0,
        avgTimingMs: 0,
        bodyParts: { arms: 0, legs: 0, torso: 0 },
        scoreTimeline: [],
        weakSections: [],
      };
    }

    const avgScore = this.scores.reduce((sum, s) => sum + s.score, 0) / this.scores.length;
    const avgArms = this.scores.reduce((sum, s) => sum + s.bodyParts.arms, 0) / this.scores.length;
    const avgLegs = this.scores.reduce((sum, s) => sum + s.bodyParts.legs, 0) / this.scores.length;
    const avgTorso = this.scores.reduce((sum, s) => sum + s.bodyParts.torso, 0) / this.scores.length;

    const scoreTimeline = this.scores.map(s => ({
      timestamp: s.timestamp,
      score: s.score,
    }));

    const weakSections = this.findWeakSections();

    return {
      overallScore: Math.round(avgScore),
      avgTimingMs: 0,
      bodyParts: {
        arms: Math.round(avgArms),
        legs: Math.round(avgLegs),
        torso: Math.round(avgTorso),
      },
      scoreTimeline,
      weakSections,
    };
  }

  private findWeakSections(): SessionResult['weakSections'] {
    const threshold = 60;
    const minSectionDuration = 500; // Minimum 500ms to count as a section
    const mergeTolerance = 1000; // Merge sections within 1 second of each other
    const sections: SessionResult['weakSections'] = [];
    let currentSection: { start: number; end: number; scores: number[] } | null = null;

    for (const s of this.scores) {
      if (s.score < threshold) {
        if (currentSection) {
          // Check if this score is close enough to merge
          if (s.timestamp - currentSection.end < mergeTolerance) {
            currentSection.end = s.timestamp;
            currentSection.scores.push(s.score);
          } else {
            // Save current section if it's long enough
            if (currentSection.end - currentSection.start >= minSectionDuration) {
              sections.push({
                start: currentSection.start,
                end: currentSection.end,
                score: Math.round(currentSection.scores.reduce((a, b) => a + b, 0) / currentSection.scores.length),
              });
            }
            // Start new section
            currentSection = {
              start: s.timestamp,
              end: s.timestamp,
              scores: [s.score],
            };
          }
        } else {
          currentSection = {
            start: s.timestamp,
            end: s.timestamp,
            scores: [s.score],
          };
        }
      } else if (currentSection) {
        // Save current section if it's long enough
        if (currentSection.end - currentSection.start >= minSectionDuration) {
          sections.push({
            start: currentSection.start,
            end: currentSection.end,
            score: Math.round(currentSection.scores.reduce((a, b) => a + b, 0) / currentSection.scores.length),
          });
        }
        currentSection = null;
      }
    }

    // Don't forget the last section
    if (currentSection && currentSection.end - currentSection.start >= minSectionDuration) {
      sections.push({
        start: currentSection.start,
        end: currentSection.end,
        score: Math.round(currentSection.scores.reduce((a, b) => a + b, 0) / currentSection.scores.length),
      });
    }

    // Sort by score (worst first) and limit to top 5
    return sections.sort((a, b) => a.score - b.score).slice(0, 5);
  }

  reset() {
    this.scores = [];
  }
}
