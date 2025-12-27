# AI Dance Training - Desktop App

A Python desktop application for learning dance moves by comparing your movements with a teacher video in real-time using AI pose estimation.

## Features

- **Real-time pose comparison** - Compare your moves with the teacher video
- **Live scoring** - Get instant feedback (0-100 score)
- **Body part breakdown** - See scores for arms, legs, and torso
- **Actionable hints** - Tips like "Raise your left arm higher"
- **Calibration** - Pre-session position checks
- **Session reports** - Summary with grades (A+ to F)
- **Privacy-first** - All AI processing runs locally

## Requirements

- Python 3.10+
- Webcam
- macOS / Windows / Linux

## Installation

```bash
# Navigate to the python-desktop folder
cd python-desktop

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

```bash
# Run the app
python main.py
```

## How It Works

1. **Load Video** - Select a teacher dance video (MP4, MOV, AVI, WebM)
2. **Configure** - Choose camera, enable/disable mirror mode
3. **Calibrate** - Stand in front of camera until checks pass
4. **Dance!** - Follow along and get real-time feedback
5. **Review** - See your session report with grade

## Tech Stack

- **GUI**: PyQt6
- **AI/ML**: MediaPipe Pose (33 body landmarks)
- **Video**: OpenCV
- **Threading**: QThread for smooth performance

## Project Structure

```
python-desktop/
├── main.py                 # Entry point
├── requirements.txt        # Dependencies
├── src/
│   ├── app.py              # PyQt6 app setup + dark theme
│   ├── core/
│   │   ├── pose_detector.py    # MediaPipe wrapper
│   │   ├── pose_normalizer.py  # Joint angle extraction
│   │   ├── scoring_engine.py   # Pose comparison & scoring
│   │   └── session_tracker.py  # Track scores over time
│   ├── ui/
│   │   ├── main_window.py      # Main application window
│   │   ├── video_widget.py     # Video display with skeleton
│   │   ├── score_widget.py     # Real-time score display
│   │   ├── controls_widget.py  # Playback controls
│   │   └── calibration_dialog.py # Pre-session checks
│   ├── workers/
│   │   ├── webcam_worker.py    # Webcam capture thread
│   │   └── video_worker.py     # Video playback thread
│   └── utils/
│       └── skeleton_drawer.py  # Draw skeleton on frames
```

## Scoring System

| Body Part | Weight |
|-----------|--------|
| Arms      | 35%    |
| Legs      | 40%    |
| Torso     | 25%    |

### Grades

| Score   | Grade |
|---------|-------|
| 95-100  | A+    |
| 90-94   | A     |
| 85-89   | A-    |
| 80-84   | B+    |
| 75-79   | B     |
| 70-74   | B-    |
| 65-69   | C+    |
| 60-64   | C     |
| 55-59   | C-    |
| 50-54   | D     |
| 0-49    | F     |

## Controls

| Key/Button     | Action           |
|----------------|------------------|
| Play/Pause     | Toggle playback  |
| Restart        | Start from beginning |
| Speed dropdown | Change playback speed (0.5x - 1.5x) |
| End Session    | Stop and show report |

## Troubleshooting

### Camera not detected
- Check camera permissions in system settings
- Try a different camera ID in the dropdown

### Slow performance
- Close other applications
- Use a lower resolution camera
- Reduce model complexity in `pose_detector.py`

### MediaPipe errors
- Ensure you have the latest version: `pip install --upgrade mediapipe`
- On Mac M1/M2, you may need: `pip install mediapipe-silicon`

## License

MIT
