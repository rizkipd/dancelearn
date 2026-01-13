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
│ ├─ FeedbackOverlay (live encouragement)         │
│                                                 │
│ AI Processing                                   │
│ ├─ MediaPipe Pose (33 landmarks)                │
│ ├─ PoseNormalizer (angles, scaling)             │
│ ├─ ScoringEngine (internal comparison logic)    │
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
│   ├── FeedbackOverlay.tsx    # Real-time encouragement & celebrations
│   ├── CalibrationView.tsx    # Pre-session position checks
│   └── SessionReport.tsx      # Post-session celebration & highlights
├── hooks/                # Custom React hooks
│   ├── useWebcam.ts           # Webcam device management
│   └── usePoseEstimation.ts   # MediaPipe integration
├── engines/              # Core logic
│   ├── PoseNormalizer.ts      # Pose processing & angle calculation
│   └── ScoringEngine.ts       # Pose comparison (internal use only)
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
- Shows encouraging messages ("You're on fire!", "Nice moves!")
- Warmth bar (visual gradient, no numbers)
- Celebration effects (confetti, badges) for great moments
- Gentle tips when needed ("Try flowing your arms more freely")

### CalibrationView
- Validates user position before training
- Checks: body in frame, lighting, distance
- Auto-starts session when all checks pass

### SessionReport
- Celebration header based on session mood (🎉 Great Session!, 🌟 Awesome Session!)
- Highlights of what went well ("Your arms were really flowing!")
- Friendly suggestions for next time ("Try matching the arm movements")
- Visual dance journey timeline (colorful bars, no numbers)
- Session duration display
- JSON export functionality

## Feedback System (Confidence-First Design)

### Philosophy
- **No numeric scores shown to users** - dancing should be fun, not judged
- **Encouragement over evaluation** - focus on positive reinforcement
- **Internal scoring** is used only to determine which encouragement to show

### Real-time Feedback
- Dynamic encouragement messages rotate to avoid repetition
- Warmth bar provides visual feedback without numbers
- Celebration effects (confetti, badges) trigger for high-confidence moments
- Gentle tips appear only when helpful, framed positively

### Post-Session Experience
- Highlights what went well (best body parts)
- Friendly suggestions for improvement (framed as "next time try...")
- Visual journey timeline shows energy and flow
- Session duration and overall mood celebration

### Internal Scoring (Not Shown to Users)
The app internally tracks:
- **Arms**: Shoulder angles, elbow angles (weight: 35%)
- **Legs**: Hip angles, knee angles (weight: 40%)
- **Torso**: Shoulder-hip alignment (weight: 25%)

These scores determine which encouragement messages and tips to show, but are never displayed as numbers or grades.

## User Flow

1. **Setup**: Upload teacher video, select camera, configure options
2. **Calibration**: Position check (body in frame, lighting, distance)
3. **Training**: Side-by-side view with real-time encouragement & celebrations
4. **Celebration**: Session highlights, friendly tips, and dance journey visualization

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
- [ ] Replay highlights or challenging moments for focused practice
- [ ] WebGPU acceleration for better performance
- [ ] IndexedDB caching for teacher poses
- [ ] Progress journey tracking (opt-in, privacy-first)
- [ ] Custom encouragement message themes
- [ ] Multi-language support expansion
