# Windows GPU Safe Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Windows GPU mode faster by skipping unnecessary CPU work, muxing audio once, and using encoder-aware global FFmpeg scheduling.

**Architecture:** Keep execution orchestration in `src/main/main.js`, while extracting tested helpers: `videoFilters.cjs` for source-aware filter generation, `ffmpegArgs.cjs` for map/mux args, and `gpuScheduler.cjs` for Windows encoder budgets.

**Tech Stack:** Electron main process, Node.js CommonJS, FFmpeg/FFprobe, Windows GPU encoders NVENC/QSV/AMF/MF, Node assertion tests.

---

### Task 1: Red tests

**Files:**
- Create: `scripts/video-filters.test.cjs`
- Create: `scripts/ffmpeg-args.test.cjs`
- Create: `scripts/gpu-scheduler.test.cjs`

- [ ] Add tests for probe-aware filter skipping, audio copy/AAC mux args, video-only segment args, and Windows encoder budgets.
- [ ] Run each test script and confirm it fails because the helpers do not exist yet.

### Task 2: Helper implementation

**Files:**
- Create: `src/main/videoFilters.cjs`
- Create: `src/main/ffmpegArgs.cjs`
- Create: `src/main/gpuScheduler.cjs`

- [ ] Implement source-aware filter generation.
- [ ] Implement FFmpeg output map and audio mux args.
- [ ] Implement encoder-aware global worker budget, per-video segment concurrency, video concurrency, filter thread count, and segment count.
- [ ] Run helper tests until they pass.

### Task 3: Main process integration

**Files:**
- Modify: `src/main/main.js`
- Modify: `src/renderer/App.jsx`

- [ ] Replace duration-only probing with media-info probing.
- [ ] Pass `mediaInfo`, `filterThreads`, `segmentConcurrency`, and `videoConcurrency` through runtime options.
- [ ] Build FFmpeg args with optional filters, video-only segment outputs, and disabled temp faststart.
- [ ] Concatenate video-only segments to a temporary video, then mux original audio once with copy-first fallback.
- [ ] Replace the serial batch loop with a bounded worker pool.
- [ ] Update renderer batch status copy to show GPU speed mode with video/segment concurrency.

### Task 4: Verification and packaging

**Files:**
- Generated: `release*`

- [ ] Run `node --check src/main/main.js`.
- [ ] Run all helper tests and `npm run smoke`.
- [ ] Run `npm run build`.
- [ ] Attempt `npm run dist`; if cross-building Windows from macOS is blocked by the host environment, report the exact blocker and leave the Vite build verified.
