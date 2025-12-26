# AI Dance Training Web Application - Development Plan

## Vision

Build the most intuitive, privacy-focused AI dance training application that runs entirely in the browser, enabling anyone to learn dance moves by comparing their movements with professional instructors in real-time.

---

## Phase 1: Offline MVP (COMPLETED)

### Objective
Deliver a functional prototype with core dance training features.

### Deliverables

| Feature | Status | Description |
|---------|--------|-------------|
| Project Setup | DONE | React + TypeScript + Vite + Tailwind |
| Video Loader | DONE | Drag-drop local MP4/WebM/MOV support |
| Webcam Capture | DONE | Device selection, mirror mode |
| Pose Estimation | DONE | MediaPipe Pose integration |
| Skeleton Overlay | DONE | Green (dancer) / Red (teacher) |
| Calibration Flow | DONE | Body-in-frame, lighting, distance checks |
| Live Scoring | DONE | 0-100 score with body part breakdown |
| Feedback Hints | DONE | Actionable correction suggestions |
| Session Report | DONE | Grade, timeline, weak sections, export |
| Documentation | DONE | CLAUDE.md, CONTEXT.md, PLAN.md |

---

## Phase 2: Accuracy & UX Enhancement

### Objective
Improve scoring accuracy and practice efficiency.

### Features

#### 2.1 Teacher Pose Pre-Extraction
- [ ] Extract poses from teacher video on load
- [ ] Store pose data in memory/IndexedDB
- [ ] Progress indicator during extraction
- [ ] Cache extracted poses for repeat sessions

**Technical Approach:**
```
Video Load → Frame Extraction → Pose Detection → Store PoseFrame[]
```

#### 2.2 Timing Alignment System
- [ ] Detect dancer timing offset (ahead/behind)
- [ ] Display timing indicator (+/-ms)
- [ ] Auto-adjust comparison window
- [ ] Optional: Dynamic Time Warping (DTW) for sequence matching

**Technical Approach:**
```
Compare pose sequences, not just single frames
Use sliding window to find best alignment
Calculate consistent offset for feedback
```

#### 2.3 Segment-Based Scoring
- [ ] Divide video into segments (e.g., 8-beat chunks)
- [ ] Score each segment independently
- [ ] Highlight weak segments in timeline
- [ ] Allow segment replay/loop

#### 2.4 Loop Weak Sections
- [ ] "Practice This Section" button on weak areas
- [ ] Auto-loop selected segment
- [ ] Track improvement over loops
- [ ] Exit loop when score improves

#### 2.5 Enhanced Hints
- [ ] Visual arrow indicators on skeleton
- [ ] Audio cues (optional)
- [ ] Hint prioritization (show most important first)
- [ ] Reduce hint frequency when score is high

#### 2.6 Performance Optimization
- [ ] Move pose detection to Web Worker
- [ ] Adaptive FPS based on device capability
- [ ] WebGPU acceleration (if available)
- [ ] Lazy load MediaPipe models

### Success Metrics
- Scoring accuracy: <10% deviation from expert rating
- Latency: <100ms pose detection
- User can identify and improve weak sections

---

## Phase 3: Cloud & Social Features (Optional)

### Objective
Enable progress tracking, content discovery, and community features.

### Features

#### 3.1 User Accounts
- [ ] Email/Google authentication
- [ ] User profile with avatar
- [ ] Privacy settings

#### 3.2 Progress Tracking
- [ ] Session history storage
- [ ] Progress charts over time
- [ ] Personal records per routine
- [ ] Streak tracking

#### 3.3 Content Catalog
- [ ] Curated dance routines
- [ ] Difficulty ratings
- [ ] Genre/style categories
- [ ] Search and filter

#### 3.4 AI Coaching Insights
- [ ] Personalized practice recommendations
- [ ] Weakness analysis over time
- [ ] Goal setting and tracking
- [ ] "Focus on your arms this week"

#### 3.5 Social Features
- [ ] Share session results
- [ ] Leaderboards (opt-in)
- [ ] Follow instructors
- [ ] Community challenges

### Technical Requirements
- Backend: Node.js/Python + PostgreSQL
- Auth: Auth0 or Firebase Auth
- Storage: S3 for videos, PostgreSQL for data
- API: REST or GraphQL

---

## Phase 4: Advanced Features

### Objective
Cutting-edge features for power users and professionals.

### Features

#### 4.1 Multi-Angle Comparison
- [ ] Support for multiple camera views
- [ ] 3D pose reconstruction
- [ ] View switching during playback

#### 4.2 Choreography Builder
- [ ] Create custom routines
- [ ] Combine segments from different videos
- [ ] Add markers and notes
- [ ] Export choreography

#### 4.3 Group Training
- [ ] Multi-person pose detection
- [ ] Formation tracking
- [ ] Sync scoring for groups

#### 4.4 AR/VR Support
- [ ] AR skeleton overlay on physical space
- [ ] VR training environment
- [ ] Spatial audio for immersion

#### 4.5 Instructor Tools
- [ ] Upload and monetize routines
- [ ] Student analytics dashboard
- [ ] Live feedback sessions
- [ ] Certification badges

---

## Technical Roadmap

### Infrastructure

| Phase | Frontend | Backend | AI/ML |
|-------|----------|---------|-------|
| 1 | React + Vite | None | MediaPipe (browser) |
| 2 | + Web Workers | None | + IndexedDB caching |
| 3 | + PWA | Node.js + PostgreSQL | + Cloud analytics |
| 4 | + WebXR | + Redis + CDN | + Custom models |

### Performance Targets

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| Pose Detection | <150ms | <100ms | <50ms |
| Score Update | 30 FPS | 30 FPS | 60 FPS |
| Video Load | <3s | <2s | <1s |
| Bundle Size | <500KB | <400KB | <600KB |

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| MediaPipe accuracy issues | High | Medium | Fallback to TensorFlow.js |
| Browser compatibility | Medium | Low | Progressive enhancement |
| Performance on low-end devices | High | Medium | Adaptive quality settings |
| User privacy concerns | High | Low | Clear privacy policy, local-first |
| CDN dependency | Medium | Low | Service worker caching |

---

## Resource Requirements

### Phase 1 (Completed)
- 1 Developer
- No backend infrastructure
- No ongoing costs

### Phase 2
- 1-2 Developers
- No backend infrastructure
- CDN costs (~$10/month for assets)

### Phase 3
- 2-3 Developers
- Backend infrastructure (~$100-500/month)
- Video storage (~$50-200/month)
- Auth service (free tier possible)

---

## Success Criteria

### Phase 1
- [x] User can upload video and start training
- [x] Real-time pose comparison works
- [x] Score updates live
- [x] Session report generated

### Phase 2
- [ ] Teacher poses pre-extracted
- [ ] Timing offset detected
- [ ] Weak sections identifiable
- [ ] Loop practice functional

### Phase 3
- [ ] Users can create accounts
- [ ] Progress persists across sessions
- [ ] Content catalog available
- [ ] Basic social features work

---

## Next Steps

### Immediate (This Week)
1. Test Phase 1 MVP with real dance videos
2. Gather feedback on scoring accuracy
3. Identify UX friction points
4. Plan Phase 2.1 (Teacher Pose Pre-Extraction)

### Short-term (Next 2 Weeks)
1. Implement teacher pose pre-extraction
2. Add timing offset detection
3. Improve hint generation accuracy
4. Add segment-based scoring

### Medium-term (Next Month)
1. Web Worker optimization
2. Loop practice feature
3. Enhanced visual feedback
4. Performance testing on various devices

---

## Appendix: Feature Priority Matrix

| Feature | User Value | Dev Effort | Priority |
|---------|-----------|------------|----------|
| Pose pre-extraction | High | Medium | P1 |
| Timing alignment | High | High | P1 |
| Loop weak sections | High | Low | P1 |
| Segment scoring | Medium | Medium | P2 |
| Web Worker optimization | Medium | Medium | P2 |
| User accounts | Medium | High | P3 |
| Content catalog | High | High | P3 |
| Social features | Low | High | P4 |
| AR/VR support | Low | Very High | P4 |

---

*Last Updated: 2025-12-26*
*Version: 1.0*
