# Mac GPU V3 Safe Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make macOS GPU mode faster by reducing wasted CPU filtering and replacing runaway per-video concurrency with a global FFmpeg worker budget.

**Architecture:** Keep FFmpeg execution in `src/main/main.js`, but move decision logic into small CommonJS helpers: `gpuScheduler.cjs` for worker/thread budgets, `videoFilters.cjs` for probe-aware filter generation, and `ffmpegArgs.cjs` for final mux audio modes.

**Tech Stack:** Electron main process, Node.js CommonJS, FFmpeg/FFprobe, VideoToolbox, Node assertion tests.

---

### Task 1: Red tests

**Files:**
- Modify: `scripts/gpu-scheduler.test.cjs`
- Modify: `scripts/ffmpeg-args.test.cjs`
- Create: `scripts/video-filters.test.cjs`

- [ ] Write tests for total FFmpeg concurrency, per-video segment concurrency, filter-thread reduction, audio copy mux args, AAC fallback args, and probe-aware filter skipping.
- [ ] Run the three test scripts and confirm the new assertions fail against the current implementation.

### Task 2: Helper implementation

**Files:**
- Modify: `src/main/gpuScheduler.cjs`
- Modify: `src/main/ffmpegArgs.cjs`
- Create: `src/main/videoFilters.cjs`

- [ ] Implement `getTotalFfmpegConcurrency`, updated `getSegmentedJobConcurrency`, and `getFilterThreadCount`.
- [ ] Add audio mux mode selection with `copy` as the default and `aac` as fallback mode.
- [ ] Implement source-aware `fps` and `scale` filter generation.
- [ ] Run the helper tests and confirm they pass.

### Task 3: Main process integration

**Files:**
- Modify: `src/main/main.js`

- [ ] Replace duration-only probing with media-info probing.
- [ ] Pass media info and runtime `filterThreads` into normal and segmented FFmpeg jobs.
- [ ] Skip empty `-vf`, disable faststart for temporary segment files, remove faststart from concat temp output, and add `-prio_speed 1` for VideoToolbox.
- [ ] Mux original audio with copy first and AAC fallback.
- [ ] Compute video concurrency, segment concurrency, and filter threads from one global FFmpeg budget.

### Task 4: Verification and packaging

**Files:**
- Generated: `release-extreme/*`

- [ ] Run all helper tests, GPU usage test, syntax check, smoke check, and Vite build.
- [ ] Rebuild the macOS arm64 DMG/PKG into `release-extreme`.
- [ ] Apply ad-hoc signing, rebuild the DMG/PKG from the signed app, and verify codesign, DMG, and PKG payload.
