# Dance Scoring System Improvement Plan

> **⚠️ ARCHIVED**: This document has been superseded by the confidence-first feedback system implemented in January 2025. See `IMPROVEMENT.md` for the new design philosophy. The app no longer shows numeric scores or grades to users - it uses encouragement-based feedback instead.

## Overview

Improve the DanceTwin dance scoring system to provide more accurate pose comparison, better timing synchronization, internationalized feedback, and enhanced user experience. The current system has solid fundamentals but lacks timing alignment, has performance bottlenecks, and provides limited feedback quality.

## Current State Analysis

**What's Working:**
- ✅ Real pose comparison using 10 joint angles (4 arms, 4 legs, 2 torso)
- ✅ Non-linear scoring with tolerance windows and confidence weighting
- ✅ Velocity-based smoothing for dancer poses
- ✅ Weak section detection and session analytics
- ✅ Real-time hints based on weakest body part

**Critical Issues:**
- ❌ No timing synchronization or offset detection (`timingOffsetMs` always 0)
- ❌ Comparison happens at 6.67 FPS (150ms interval) despite 60 FPS processing
- ❌ Teacher poses re-processed every session with O(n) linear search
- ❌ No pose frame buffering (only last frame kept)
- ❌ Hints hardcoded in English instead of using i18n translations
- ❌ Single hint limitation (only weakest body part shown)
- ❌ No session-to-session progress tracking

## Implementation Plan

### Phase 1: Core Fixes (High Priority)

#### 1.1 Improve Comparison Interval (150ms → 50ms)

**Objective:** Increase comparison rate from 6.67 FPS to 20 FPS for better responsiveness.

**Changes:**
- **File:** `src/pages/TrainingPage.tsx`
- **Location:** Line 145
- **Change:** `setInterval(..., 150)` → `setInterval(..., 50)`

**Impact:** 3x more responsive feedback, +2% CPU usage

---

#### 1.2 Teacher Pose Pre-Extraction & Caching

**Objective:** Pre-extract all teacher poses once, cache in memory, use binary search O(log n) instead of linear O(n).

**Changes:**

1. **Update Data Structure** - `src/engines/ScoringEngine.ts` (line 155):
   ```typescript
   // Replace Map with sorted array
   private teacherPoses: Array<{ timestamp: number; pose: NormalizedPose }> = [];
   ```

2. **Add Pre-Extraction Method** - `src/engines/ScoringEngine.ts` (after line 163):
   ```typescript
   async extractTeacherPoses(
     video: HTMLVideoElement,
     processFrame: (v: HTMLVideoElement, s: 'teacher') => Promise<void>
   ): Promise<PoseFrame[]>
   ```
   - Seeks through video every 33ms (30 FPS)
   - Waits for `onseeked` event
   - Calls processFrame and captures pose
   - Returns array of all poses

3. **Update setTeacherPoses** - `src/engines/ScoringEngine.ts` (lines 157-163):
   ```typescript
   setTeacherPoses(poses: PoseFrame[]) {
     this.teacherPoses = poses
       .map(pose => ({ timestamp: Math.round(pose.timestamp), pose: normalizePose(pose.keypoints) }))
       .sort((a, b) => a.timestamp - b.timestamp);
   }
   ```

4. **Replace with Binary Search** - `src/engines/ScoringEngine.ts` (lines 173-197):
   ```typescript
   findTeacherPose(timestamp: number): NormalizedPose | null {
     // Binary search implementation with 100ms tolerance
     // Returns closest pose within tolerance
   }
   ```

5. **Trigger Pre-Extraction** - `src/pages/TrainingPage.tsx` (after line 170):
   ```typescript
   useEffect(() => {
     // Extract all teacher poses during calibration
     // Show progress indicator
     // Cache in sessionScorer
   }, [trainingState]);
   ```

**Impact:**
- One-time cost: 5-10 seconds for 3-minute video
- Runtime: 100x faster searches, -50% CPU on lookups
- Memory: +5MB for 5400 cached poses

---

#### 1.3 Basic Timing Offset Detection

**Objective:** Detect if dancer is ahead/behind teacher using simplified cross-correlation.

**Changes:**

1. **Add Timing Offset Calculator** - `src/engines/ScoringEngine.ts` (after line 101):
   ```typescript
   export function calculateTimingOffset(
     dancerPose: NormalizedPose,
     teacherPoses: Array<{ timestamp: number; pose: NormalizedPose }>,
     currentTimestamp: number,
     windowMs: number = 500
   ): number
   ```
   - Searches ±500ms window around current timestamp
   - Finds teacher pose with best match (highest score)
   - Returns offset in ms (negative = behind, positive = ahead)
   - Only returns if confidence > 70

2. **Update compareFrames Signature** - `src/engines/ScoringEngine.ts` (lines 71-101):
   ```typescript
   export function compareFrames(
     dancerPose: NormalizedPose,
     teacherPose: NormalizedPose,
     timingOffset: number = 0  // NEW parameter
   ): ScoreResult
   ```

3. **Add Method to SessionScorer** - `src/engines/ScoringEngine.ts` (after line 197):
   ```typescript
   getTimingOffset(dancerPose: NormalizedPose, currentTimestamp: number): number {
     return calculateTimingOffset(dancerPose, this.teacherPoses, currentTimestamp, 500);
   }
   ```

4. **Use in TrainingPage** - `src/pages/TrainingPage.tsx` (lines 132-148):
   ```typescript
   const timingOffset = sessionScorerRef.current.getTimingOffset(dancerNormalized, videoTimeMs);
   const score = compareFrames(dancerNormalized, teacherNormalized, timingOffset);
   ```

**Impact:** Accurate sync detection, +10% CPU per comparison

---

#### 1.4 Pose Frame Buffering

**Objective:** Store last 2 seconds of poses (60 frames) for timing analysis and smoothing.

**Changes:**

1. **Create PoseBuffer Class** - `src/utils/PoseBuffer.ts` (NEW FILE):
   ```typescript
   export class PoseBuffer {
     private buffer: PoseFrame[] = [];
     private maxSize: number = 60;

     push(pose: PoseFrame): void
     getLatest(): PoseFrame | null
     getAtTime(timestamp: number, toleranceMs: number = 100): PoseFrame | null
     getRange(startMs: number, endMs: number): PoseFrame[]
     clear(): void
   }
   ```

2. **Replace Refs with Buffers** - `src/pages/TrainingPage.tsx` (lines 40-44):
   ```typescript
   const dancerPoseBuffer = useRef(new PoseBuffer(60));
   const teacherPoseBuffer = useRef(new PoseBuffer(60));
   ```

3. **Update Callbacks** - `src/pages/TrainingPage.tsx` (lines 60-69):
   ```typescript
   onPoseDetected: (pose, source) => {
     if (source === 'dancer') {
       dancerPoseBuffer.current.push(pose);
     } else {
       teacherPoseBuffer.current.push(pose);
     }
   }
   ```

**Impact:** +1MB memory, enables future features

---

### Phase 2: Better Feedback (Medium Priority)

#### 2.1 Internationalize Hint Generation

**Objective:** Use i18n keys instead of hardcoded English strings.

**Changes:**

1. **Update ScoreResult Type** - `src/types/pose.ts` (lines 24-33):
   ```typescript
   export interface ScoreResult {
     // ... existing fields ...
     hintKey?: string;           // NEW: i18n key like 'hints.extendLeftElbow'
     hintParams?: Record<string, string | number>;  // NEW: interpolation params
   }
   ```

2. **Rewrite generateHint** - `src/engines/ScoringEngine.ts` (lines 103-151):
   ```typescript
   function generateHint(...): { key: string; params?: Record<string, string | number> } {
     // Return keys like 'hints.extendLeftElbow' instead of English strings
     return { key: 'hints.extendLeftElbow' };
   }
   ```

3. **Update FeedbackOverlay** - `src/components/FeedbackOverlay.tsx` (lines 152-160):
   ```typescript
   {score.hintKey && !isCelebrating && (
     <p>{t(score.hintKey, score.hintParams || {})}</p>
   )}
   ```

**Impact:** Hints now work in all 5 languages (en, ja, id, ko, zh)

---

#### 2.2 Add Magnitude Indicators

**Objective:** Indicate if error is small (5°) or large (30°).

**Changes:**

1. **Update Translations** - `src/i18n/locales/*/feedback.json`:
   ```json
   {
     "hints": {
       "extendLeftElbow": "Extend your left elbow {{magnitude}} more"
     }
   }
   ```

2. **Add Magnitude Calculator** - `src/engines/ScoringEngine.ts`:
   ```typescript
   function getMagnitude(angleDiff: number): string {
     const degrees = angleDiff * (180 / Math.PI);
     if (degrees < 10) return 'slightly';
     if (degrees < 20) return 'significantly';
     return 'much';
   }
   ```

3. **Pass in Hint Generation**:
   ```typescript
   return {
     key: 'hints.extendLeftElbow',
     params: { magnitude: getMagnitude(leftElbowDiff) }
   };
   ```

**Impact:** More actionable feedback

---

#### 2.3 Improve Weak Section Diagnostics

**Objective:** Show WHY each weak section is weak (which body part).

**Changes:**

1. **Update SessionResult Type** - `src/types/pose.ts` (lines 35-45):
   ```typescript
   weakSections: {
     start: number;
     end: number;
     score: number;
     bodyParts?: { arms: number; legs: number; torso: number };  // NEW
     primaryIssue?: 'arms' | 'legs' | 'torso';  // NEW
   }[];
   ```

2. **Update findWeakSections** - `src/engines/ScoringEngine.ts` (lines 235-296):
   ```typescript
   // Track arms/legs/torso scores for each section
   // Calculate average and determine weakest part
   // Include in returned weak section data
   ```

3. **Update SessionReport Display** - `src/components/SessionReport.tsx` (lines 129-153):
   ```typescript
   {section.primaryIssue && (
     <span>Issue: {t(`common:labels.${section.primaryIssue}`)} ({section.bodyParts[section.primaryIssue]}%)</span>
   )}
   ```

**Impact:** Better diagnostics for practice focus

---

#### 2.4 Multi-Level Hints

**Objective:** Show primary + secondary hints if multiple issues exist.

**Changes:**

1. **Update ScoreResult Type** - `src/types/pose.ts`:
   ```typescript
   export interface ScoreResult {
     // ... existing ...
     secondaryHintKey?: string;
     secondaryHintParams?: Record<string, string | number>;
   }
   ```

2. **Generate Multiple Hints** - `src/engines/ScoringEngine.ts`:
   ```typescript
   function generateHint(...): {
     primary?: { key: string; params?: ... };
     secondary?: { key: string; params?: ... };
   }
   ```
   - Sort body parts by score
   - Generate hint for each part < 80
   - Return top 2 if second part < 70

3. **Display Both Hints** - `src/components/FeedbackOverlay.tsx`:
   ```typescript
   {/* Primary hint (prominent) */}
   {score.hintKey && <div className="primary-hint">...</div>}

   {/* Secondary hint (less prominent) */}
   {score.secondaryHintKey && <div className="secondary-hint">...</div>}
   ```

**Impact:** More comprehensive feedback

---

### Phase 3: User Experience (Enhancement)

#### 3.1 Session-to-Session Comparison

**Objective:** Track improvement across sessions with same video.

**Changes:**

1. **Create SessionStorage Utility** - `src/utils/SessionStorage.ts` (NEW FILE):
   ```typescript
   export class SessionStorage {
     static save(videoName: string, result: SessionResult): string
     static getAll(): SessionHistory[]
     static getByVideo(videoName: string): SessionHistory[]
     static delete(id: string): void
   }
   ```
   - Stores in localStorage with key 'dancetwin_session_history'
   - Keeps last 50 sessions
   - Auto-cleanup old sessions

2. **Save Sessions** - `src/pages/TrainingPage.tsx` (lines 188-194):
   ```typescript
   const handleSessionEnd = () => {
     const result = sessionScorerRef.current.getSessionResult();
     SessionStorage.save(videoName, result);
     // ...
   };
   ```

3. **Add Progress View** - `src/components/SessionReport.tsx` (after line 154):
   ```typescript
   {/* Show last 3 sessions for same video */}
   {/* Display current vs previous scores */}
   {/* Show improvement (+3, -2, etc.) */}
   ```

**Impact:** Motivational progress tracking

---

#### 3.2 Basic DTW for Timing Alignment

**Objective:** Handle varying tempo and timing drift using Dynamic Time Warping.

**Changes:**

1. **Create DTW Algorithm** - `src/engines/DTW.ts` (NEW FILE):
   ```typescript
   export function alignSequences(
     dancerPoses: NormalizedPose[],
     teacherPoses: NormalizedPose[],
     windowSize: number = 10
   ): number[]
   ```
   - Simplified DTW with windowed constraint (±10 frames)
   - Uses pose angle distance as similarity metric
   - Returns alignment path (dancer frame → teacher frame mapping)

2. **Add to SessionScorer** - `src/engines/ScoringEngine.ts`:
   ```typescript
   private dtwAlignment: number[] = [];
   private lastDtwUpdate: number = 0;

   updateAlignment(dancerPoses: PoseFrame[]): void {
     // Re-run DTW every 5 seconds
     this.dtwAlignment = alignSequences(dancerNormalized, teacherNormalized);
   }

   getTimingOffsetDTW(dancerIdx: number, teacherIdx: number): number {
     return getTimingOffsetFromPath(this.dtwAlignment, dancerIdx, teacherIdx, 33);
   }
   ```

3. **Use in TrainingPage** - `src/pages/TrainingPage.tsx`:
   ```typescript
   const allDancerPoses = dancerPoseBuffer.current.getRange(0, Infinity);
   sessionScorerRef.current.updateAlignment(allDancerPoses);
   const timingOffset = sessionScorerRef.current.getTimingOffsetDTW(dancerIdx, teacherIdx);
   ```

**Impact:** Handles tempo changes, +20% CPU every 5s

---

#### 3.3 Interactive Weak Section Replay

**Objective:** Allow practicing weak sections with video looping.

**Changes:**

1. **Add Loop State** - `src/pages/TrainingPage.tsx`:
   ```typescript
   const [loopSection, setLoopSection] = useState<{ start: number; end: number } | null>(null);
   ```

2. **Add Loop Detection**:
   ```typescript
   useEffect(() => {
     if (!loopSection || !teacherVideoRef.current) return;
     const checkLoop = () => {
       if (video.currentTime * 1000 >= loopSection.end) {
         video.currentTime = loopSection.start / 1000;
       }
     };
     const intervalId = setInterval(checkLoop, 100);
     return () => clearInterval(intervalId);
   }, [loopSection]);
   ```

3. **Add Practice Button** - `src/components/SessionReport.tsx`:
   ```typescript
   <button onClick={() => onPracticeSection(section.start, section.end)}>
     Practice This Section
   </button>
   ```

4. **Add UI Indicator**:
   ```typescript
   {loopSection && (
     <div>Looping: {formatTime(loopSection.start)} - {formatTime(loopSection.end)}</div>
   )}
   ```

**Impact:** Focused practice on weak areas

---

#### 3.4 Movement Quality Metrics

**Objective:** Add smoothness feedback for movement quality.

**Changes:**

1. **Create MovementQuality Module** - `src/engines/MovementQuality.ts` (NEW FILE):
   ```typescript
   export function calculateSmoothness(poses: PoseFrame[], windowSize: number = 10): number
   ```
   - Calculates velocity variance for each keypoint
   - Low variance = smooth movement = high score (80-100)
   - High variance = jerky movement = low score (<60)

2. **Update ScoreResult Type** - `src/types/pose.ts`:
   ```typescript
   export interface ScoreResult {
     // ... existing ...
     smoothness?: number;  // 0-100
     smoothnessHint?: string;  // e.g., 'hints.moveMoreSmoothly'
   }
   ```

3. **Calculate in TrainingPage** - `src/pages/TrainingPage.tsx`:
   ```typescript
   const allDancerPoses = dancerPoseBuffer.current.getRange(pose.timestamp - 500, pose.timestamp);
   const smoothness = calculateSmoothness(allDancerPoses, 10);
   const score = { ...compareFrames(...), smoothness, smoothnessHint: getSmoothnessHint(smoothness) };
   ```

4. **Display in FeedbackOverlay** - `src/components/FeedbackOverlay.tsx`:
   ```typescript
   {score.smoothness !== undefined && score.smoothness < 80 && (
     <div>{score.smoothness}% Smoothness</div>
   )}
   ```

**Impact:** Movement quality awareness

---

## Files to Create/Modify

### New Files (4):
1. `src/utils/PoseBuffer.ts` - Circular buffer for pose history
2. `src/utils/SessionStorage.ts` - Session history management
3. `src/engines/DTW.ts` - Dynamic Time Warping algorithm
4. `src/engines/MovementQuality.ts` - Smoothness calculation

### Modified Files (9):
1. `src/engines/ScoringEngine.ts` - Binary search, timing offset, multi-hints, diagnostics
2. `src/engines/PoseNormalizer.ts` - Minor updates for DTW integration
3. `src/types/pose.ts` - Type updates for new fields
4. `src/pages/TrainingPage.tsx` - Buffers, timing offset, DTW, loop mode, extraction
5. `src/hooks/usePoseEstimation.ts` - Minor integration updates
6. `src/components/FeedbackOverlay.tsx` - i18n hints, magnitude, smoothness display
7. `src/components/SessionReport.tsx` - Diagnostics, progress tracking, practice button
8. `src/i18n/locales/*/feedback.json` - Magnitude placeholders, smoothness hints
9. `src/i18n/locales/*/common.json` - Add 'smoothness' label

---

## Testing Strategy

### Unit Tests:
- PoseBuffer: circular buffer behavior, getAtTime, getRange
- Binary search: correctness, edge cases
- Timing offset: synthetic pose sequences
- DTW: known alignment sequences
- Smoothness: synthetic velocity data

### Integration Tests:
- Pose extraction: full video processing
- Session storage: localStorage operations
- Loop mode: video playback control
- Multi-language hints: all 5 languages

### Performance Tests:
- Comparison rate: stable 20 FPS at 50ms interval
- Binary search: O(log n) vs O(n) benchmark
- DTW: <50ms alignment time
- Memory: <50MB for 5-minute session

---

## Performance Impact Summary

| Phase | CPU Impact | Memory Impact | Benefit |
|-------|-----------|---------------|---------|
| **Phase 1** | +12% | +6MB | 3x faster feedback, accurate sync, 100x faster searches |
| **Phase 2** | 0% | 0 | Better feedback quality, multi-language support |
| **Phase 3** | +25% (amortized) | +1.5MB | Progress tracking, tempo handling, quality metrics |
| **TOTAL** | +35-40% | +7.5MB | Significantly better accuracy and UX |

Target: <50% CPU on modern laptops (well within limits)

---

## Estimated Implementation Time

- **Phase 1**: 1-2 weeks (core fixes, highest priority)
- **Phase 2**: 1 week (feedback improvements)
- **Phase 3**: 1-2 weeks (UX enhancements)

**Total**: 4-5 weeks for complete implementation

---

## Success Criteria

✅ Comparison runs at 20 FPS (50ms interval)
✅ Teacher pose lookup in <1ms (binary search)
✅ Timing offset detection works (±200ms accuracy)
✅ Hints display in all 5 languages
✅ Magnitude indicators show (slightly/significantly/much)
✅ Weak sections show primary issue
✅ Session history tracks last 3 sessions
✅ DTW handles tempo changes
✅ Loop mode works smoothly
✅ Smoothness metric detects jerky movements
✅ CPU usage stays under 50%
✅ No regression in existing functionality
