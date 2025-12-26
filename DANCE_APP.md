# 🎵 AI Dance Training Web Application
## Complete System Design & End-to-End Flow (Desktop Browser)

---

## 1. Objective

Build a **desktop-browser-based AI dance training application** that allows a user to:

- Load a **teacher dance video** (local MP4 / media file or remote)
- Use a **webcam** to capture the dancer
- Display **split-screen view**
  - Left: dancer live camera
  - Right: teacher dance video
- **Compare dancer vs teacher** in real time using AI pose estimation
- Provide **live feedback, scoring, and post-session analysis**
- Work **offline by default** (privacy-first)

---

## 2. Core User Flow (End-to-End)

### 2.1 Application Start
1. User opens the web app in a desktop browser
2. App checks:
   - Webcam permission
   - Browser capability (WebAssembly / WebGPU)
3. User lands on **Session Setup Page**

---

### 2.2 Session Setup
User selects:
- 🎥 Teacher video (local MP4 / WebM / MOV)
- 📷 Webcam device
- ⚙️ Options:
  - Mirror mode (ON/OFF)
  - Skeleton overlay (ON/OFF)
  - Target FPS (Auto)

---

### 2.3 Calibration
- User stands in front of camera
- System checks:
  - Full body in frame
  - Lighting
  - Distance from camera
- Visual guides help user adjust position
- Once valid → **Start Session**

---

### 2.4 Training Session (Live)

```
+--------------------------------------------------+
| Teacher Video (local MP4) | Dancer Webcam        |
| speed / loop / scrub     | skeleton overlay     |
+--------------------------------------------------+
| Score: 82 | Timing: -120ms (behind)              |
| Hint: Raise right elbow higher                   |
+--------------------------------------------------+
```

During session:
- Teacher video plays
- Dancer follows
- AI compares pose & timing continuously
- Live feedback shown (minimal & actionable)

---

### 2.5 Session End
- Teacher video ends or user stops session
- App generates **Session Report**
- User can:
  - Replay side-by-side
  - Review weak sections
  - Export results (JSON / CSV)
  - Save progress (optional backend)

---

## 3. System Architecture (Browser-First)

```
┌──────────────── Desktop Browser ────────────────┐
│ UI Layer (React / HTML / CSS)                   │
│ ├─ Camera Panel                                 │
│ ├─ Teacher Video Panel (local MP4)              │
│ ├─ Feedback Overlay                             │
│                                                 │
│ AI Processing (Web Workers)                     │
│ ├─ Pose Estimation                              │
│ ├─ Normalization                                │
│ ├─ Alignment Engine                             │
│ ├─ Scoring Engine                               │
│                                                 │
│ Local Storage                                   │
│ ├─ In-memory pose tracks                        │
│ ├─ IndexedDB cache                              │
└─────────────────────────────────────────────────┘

(Optional Cloud Backend)
- Auth
- Session history
- Content catalog
```

---

## 4. Media Handling Design (Teacher Video)

### Supported Inputs
- Local MP4 / WebM / MOV
- Drag & drop
- File picker

### Implementation
- Load via `URL.createObjectURL(file)`
- Use `<video>` element
- Frame extraction:
  - `requestVideoFrameCallback()` (preferred)
  - `requestAnimationFrame()` fallback

### Advantages
- No upload
- No privacy risk
- Works offline

---

## 5. Pose Estimation Pipeline

### 5.1 Teacher Pose (Local Extraction)

```
Teacher Video → Frames → Pose Model → Pose Track
```

Stored locally per frame:
- timestamp
- joint keypoints
- joint angles
- confidence values

Optional caching via IndexedDB.

---

### 5.2 Dancer Pose (Live Camera)

```
Webcam → Frames → Pose Model → Live Pose Stream
```

- Adaptive FPS
- Skeleton overlay optional
- Runs in Web Worker

---

## 6. Pose Normalization

To fairly compare dancer and teacher:

- Center pose on hips
- Normalize scale using torso length
- Apply mirror mode (optional)
- Convert keypoints → joint angles

```
Raw Pose → Normalize → Angle Vector
```

---

## 7. Timing Alignment Flow

### MVP
- 3-2-1 countdown
- Teacher & dancer start together
- Frame-to-frame comparison

### Advanced (v2)
- Detect lag (ahead / behind)
- Auto-adjust comparison window
- Optional Dynamic Time Warping (DTW)

---

## 8. Scoring Engine Design

### Per-Frame Evaluation
- Compare angle vectors
- Weight joints:
  - Arms
  - Legs
  - Torso
- Ignore low-confidence joints

### Real-Time Output
- Overall score (0–100)
- Timing offset (ms)
- 1–2 correction hints

### Post-Session Output
- Score timeline
- Body-part averages
- Weak segment detection

---

## 9. UI Component Design

- FileVideoLoader
- CameraPanel
- TeacherVideoPanel
- PoseEstimatorWorker
- PoseNormalizer
- AlignmentEngine
- ScoringEngine
- FeedbackOverlay
- SessionReport

---

## 10. Data Structures

### Pose Frame
```json
{
  "t": 1240,
  "angles": [0.52, 1.01, 0.88],
  "confidence": [0.92, 0.85, 0.74]
}
```

### Session Result
```json
{
  "overallScore": 86,
  "avgTimingMs": -120,
  "bodyParts": {
    "arms": 80,
    "legs": 88,
    "torso": 92
  }
}
```

---

## 11. Performance Strategy

- Pose inference in Web Workers
- Adaptive FPS
- Pause scoring when video paused
- WebGPU acceleration if supported
- IndexedDB caching

---

## 12. Privacy & Security

Default:
- No camera video upload
- No teacher video upload
- All AI runs locally

Optional (opt-in):
- Upload metrics only
- Export reports
- Cloud session history

---

## 13. Delivery Plan

### Phase 1 — Offline MVP (2–3 weeks)
- Local MP4 teacher video
- Webcam capture
- Pose overlay
- Basic scoring
- Session report

### Phase 2 — Accuracy & UX (3–4 weeks)
- Auto timing alignment
- Segment scoring
- Loop weak sections
- Better hints

### Phase 3 — Cloud & Scale (Optional)
- User accounts
- Progress tracking
- AI coaching explanations
- Social features

---

## 14. Developer Checklist

- Desktop browser UI
- Local MP4 loader
- Webcam capture
- Pose estimation (worker-based)
- Teacher pose extraction
- Normalization + mirror mode
- Alignment engine
- Scoring engine
- Session report
- Privacy controls

---

## 15. Final Summary

This document describes a **desktop-first, browser-based AI dance training system** that:

- Supports **local teacher media files**
- Runs **pose comparison fully in-browser**
- Provides **real-time feedback & scoring**
- Preserves **user privacy by default**
- Scales cleanly to cloud features later

