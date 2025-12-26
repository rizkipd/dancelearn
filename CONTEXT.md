# Development Context & History

## Project Timeline

### 2025-12-26: Initial Development (Phase 1 MVP)

**Session 1: Project Setup & Core Implementation**

Started from system design document (`ai_dance_training_web_app_system_design.md`) and implemented the complete Phase 1 MVP.

#### What Was Built

1. **Project Scaffolding**
   - Created React + TypeScript + Vite project
   - Configured Tailwind CSS for styling
   - Installed MediaPipe Pose for AI pose estimation

2. **Core Components Created**
   - `FileVideoLoader.tsx` - Drag-drop video upload with validation
   - `CameraPanel.tsx` - Webcam display with skeleton overlay
   - `TeacherVideoPanel.tsx` - Video player with playback controls
   - `FeedbackOverlay.tsx` - Real-time score and hints display
   - `CalibrationView.tsx` - Pre-session position validation
   - `SessionReport.tsx` - Post-session analysis with grades

3. **Custom Hooks**
   - `useWebcam.ts` - Device enumeration, stream management
   - `usePoseEstimation.ts` - MediaPipe integration, pose detection

4. **Engine Logic**
   - `PoseNormalizer.ts` - Pose centering, scaling, angle calculation
   - `ScoringEngine.ts` - Frame comparison, scoring, hint generation

5. **Type Definitions**
   - `pose.ts` - Keypoint, PoseFrame, ScoreResult, SessionResult, etc.

#### Technical Decisions Made

| Decision | Rationale |
|----------|-----------|
| MediaPipe over TensorFlow.js | Better pose accuracy, easier setup |
| Tailwind CSS | Rapid UI development, consistent styling |
| No Web Workers (MVP) | Simpler architecture, sufficient performance |
| Local video only | Privacy-first, no upload latency |
| Joint angles over keypoint distance | More robust to camera angle/distance |

#### Challenges & Solutions

1. **MediaPipe CDN Loading**
   - Challenge: Needed to load model files from CDN
   - Solution: Used `locateFile` option to point to jsDelivr CDN

2. **Skeleton Mirroring**
   - Challenge: Mirror mode needed for both video and skeleton
   - Solution: CSS transform for video, coordinate flip for canvas

3. **TypeScript Strict Mode**
   - Challenge: Unused variable errors blocking build
   - Solution: Used underscore prefix and void operator for intentionally unused params

---

## Design Decisions

### Scoring Algorithm

The scoring system uses **joint angles** rather than raw keypoint positions because:
- Angle-based comparison is scale-invariant
- Works regardless of camera distance
- More intuitive for dance movements

**Body Part Weights:**
- Legs (40%): Most important for dance foundation
- Arms (35%): Expressiveness and coordination
- Torso (25%): Core stability and alignment

### UI/UX Design

**Color Scheme:**
- Background: Dark gray (#0f0f0f, #1f1f1f)
- Dancer skeleton: Green (#00ff88) - "you're doing well"
- Teacher skeleton: Red (#ff6b6b) - target to match
- Score colors: Green (80+), Yellow (60-79), Red (<60)

**Split View:**
- Left: Dancer (webcam) - mirrored by default
- Right: Teacher (video) - normal orientation
- Bottom: Feedback overlay with scores and hints

### Calibration Requirements

Before training starts, the system validates:
1. **Body in Frame**: 6+ of 8 key landmarks visible
2. **Good Lighting**: Average landmark confidence > 0.6
3. **Proper Distance**: Torso height 15-60% of frame

---

## File Structure Rationale

```
src/
├── components/    # UI components (React)
├── hooks/         # Reusable stateful logic
├── engines/       # Pure business logic (no React deps)
├── types/         # TypeScript interfaces
└── workers/       # Web Workers (future)
```

**Separation of Concerns:**
- Components handle rendering and user interaction
- Hooks manage state and side effects
- Engines contain pure functions for calculations
- Types ensure consistency across the codebase

---

## Dependencies

### Production
- `react`, `react-dom` - UI framework
- `@mediapipe/pose` - AI pose estimation
- `@mediapipe/camera_utils` - Camera utilities
- `@mediapipe/drawing_utils` - Skeleton drawing

### Development
- `typescript` - Type safety
- `vite` - Build tool
- `tailwindcss` - Utility-first CSS
- `postcss`, `autoprefixer` - CSS processing

---

## Known Limitations (MVP)

1. **No Teacher Pose Pre-extraction**
   - Currently compares dancer pose to video frame, not extracted poses
   - Phase 2 will add pose extraction for teacher video

2. **No Timing Alignment**
   - Assumes dancer starts synchronized with video
   - Phase 2 will add Dynamic Time Warping

3. **Single Person Only**
   - Detects only one person in frame
   - Multi-person support not planned

4. **No Offline Caching**
   - MediaPipe models loaded from CDN each session
   - Could add service worker for offline support

---

## Testing Notes

### Manual Testing Checklist

- [ ] Video upload (drag-drop and file picker)
- [ ] Video format validation (MP4, WebM, MOV)
- [ ] Camera permission flow
- [ ] Camera device switching
- [ ] Mirror mode toggle
- [ ] Skeleton overlay toggle
- [ ] Calibration detection
- [ ] Session start/pause/end
- [ ] Score display updates
- [ ] Hint generation
- [ ] Session report display
- [ ] JSON export

### Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome 90+ | Fully supported |
| Edge 90+ | Fully supported |
| Firefox 80+ | Fully supported |
| Safari 15+ | Partial (WebGL issues) |

---

## Future Development Notes

### Phase 2 Priorities
1. Pre-extract teacher poses when video loads
2. Add timing offset detection and hints
3. Implement loop-section-for-practice feature
4. Add segment-level scoring in report

### Phase 3 Considerations
- User accounts and progress tracking
- Cloud storage for session history
- AI-generated practice recommendations
- Social features (share routines)

---

## Contributor Notes

### Code Style
- Functional components with hooks
- TypeScript strict mode
- Tailwind for all styling (no CSS files except index.css)
- Descriptive variable names
- JSDoc comments for complex functions

### Git Workflow
- Main branch for stable releases
- Feature branches for development
- Descriptive commit messages

---

*Last Updated: 2025-12-26*
