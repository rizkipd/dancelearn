# AI Dance Training Web Application

## Project Overview

A browser-based AI dance training application that enables users to learn dance moves by comparing their movements with a teacher video in real-time using pose estimation.
You are great Webdeveloper, great planner, designer, create a dance training web with great layout

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **AI/ML**: MediaPipe Pose (browser-based pose estimation)
- **State Management**: React hooks (useState, useRef, useCallback)

## Architecture

```
┌──────────────── Desktop Browser ────────────────┐
│ UI Layer (React Components)                     │
│ ├─ CameraPanel (webcam + skeleton overlay)      │
│ ├─ TeacherVideoPanel (local MP4 playback)       │
│ ├─ FeedbackOverlay (live score + hints)         │
│                                                 │
│ AI Processing                                   │
│ ├─ MediaPipe Pose (33 landmarks)                │
│ ├─ PoseNormalizer (angles, scaling)             │
│ ├─ ScoringEngine (comparison + hints)           │
│                                                 │
│ Privacy-First Design                            │
│ ├─ All processing runs locally in browser       │
│ ├─ No video upload to servers                   │
│ └─ No external API calls for AI                 │
└─────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── components/           # React UI components
│   ├── FileVideoLoader.tsx    # Drag-drop video upload
│   ├── CameraPanel.tsx        # Webcam with skeleton overlay
│   ├── TeacherVideoPanel.tsx  # Teacher video player with controls
│   ├── FeedbackOverlay.tsx    # Real-time score display
│   ├── CalibrationView.tsx    # Pre-session position checks
│   └── SessionReport.tsx      # Post-session analysis
├── hooks/                # Custom React hooks
│   ├── useWebcam.ts           # Webcam device management
│   └── usePoseEstimation.ts   # MediaPipe integration
├── engines/              # Core logic
│   ├── PoseNormalizer.ts      # Pose processing & angle calculation
│   └── ScoringEngine.ts       # Pose comparison & scoring
├── types/                # TypeScript definitions
│   └── pose.ts                # Pose, Score, Session interfaces
├── App.tsx               # Main application component
├── main.tsx              # React entry point
└── index.css             # Tailwind CSS imports
```

## Key Components

### CameraPanel
- Displays webcam feed with optional mirror mode
- Draws skeleton overlay on detected poses
- Uses green color (#00ff88) for dancer skeleton

### TeacherVideoPanel
- Plays local MP4/WebM/MOV files
- Includes playback controls and scrubber
- Draws skeleton overlay (red #ff6b6b) on teacher poses

### FeedbackOverlay
- Shows real-time score (0-100)
- Body part breakdown (arms, legs, torso)
- Actionable hints for improvement

### CalibrationView
- Validates user position before training
- Checks: body in frame, lighting, distance
- Auto-starts session when all checks pass

### SessionReport
- Letter grade (A+ to F)
- Performance breakdown by body part
- Score timeline visualization
- Weak section identification
- JSON export functionality

## Scoring System

### Joint Angles Tracked
- **Arms**: Shoulder angles, elbow angles (left/right)
- **Legs**: Hip angles, knee angles (left/right)
- **Torso**: Shoulder-hip alignment

### Weights
- Arms: 35%
- Legs: 40%
- Torso: 25%

### Score Calculation
1. Extract joint angles from both dancer and teacher
2. Calculate angle differences for each joint
3. Weight by confidence and body part importance
4. Generate 0-100 score with hints for lowest-scoring area

## User Flow

1. **Setup**: Upload teacher video, select camera, configure options
2. **Calibration**: Position check (body in frame, lighting, distance)
3. **Training**: Side-by-side view with real-time scoring
4. **Report**: Session analysis with grades and weak sections

## Development Commands

```bash
npm install      # Install dependencies
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
```

## Browser Requirements

- Modern browser with WebAssembly support
- Webcam access
- Recommended: Chrome, Edge, or Firefox (latest versions)

## Privacy Features

- All AI processing runs locally in browser
- No video data leaves the device
- No external API calls for pose estimation
- Optional export of session results (user-initiated)

## Future Enhancements (Phase 2+)

- [ ] Teacher pose pre-extraction for faster comparison
- [ ] Dynamic Time Warping for timing alignment
- [ ] Loop weak sections for focused practice
- [ ] WebGPU acceleration for better performance
- [ ] IndexedDB caching for teacher poses
- [ ] Cloud sync for progress tracking (opt-in)
