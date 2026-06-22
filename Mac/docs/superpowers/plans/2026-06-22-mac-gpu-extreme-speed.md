# Mac GPU Extreme Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase macOS GPU-mode throughput by running more VideoToolbox segment work and multiple videos concurrently.

**Architecture:** Extract scheduling calculations into a small CommonJS helper so tests can cover the aggressive defaults. Keep FFmpeg execution in `src/main/main.js`, but replace the serial batch loop with a bounded worker pool when GPU mode is active.

**Tech Stack:** Electron main process, Node.js CommonJS, FFmpeg/VideoToolbox, shell-based Node assertion tests.

---

### Task 1: Extreme scheduling helper

**Files:**
- Create: `src/main/gpuScheduler.cjs`
- Create: `scripts/gpu-scheduler.test.cjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing scheduler test**

Create `scripts/gpu-scheduler.test.cjs`:

```js
const assert = require("assert");
const {
  getSegmentedJobConcurrency,
  getSegmentCount,
  getVideoConcurrency,
  isExtremeGpuMode
} = require("../src/main/gpuScheduler.cjs");

assert.equal(isExtremeGpuMode({ processingDevice: "gpu" }, "h264_videotoolbox"), true);
assert.equal(isExtremeGpuMode({ processingDevice: "cpu" }, "h264_videotoolbox"), false);
assert.equal(isExtremeGpuMode({ processingDevice: "gpu" }, "libx264"), false);

assert.equal(getSegmentedJobConcurrency("h264_videotoolbox", { logicalCores: 10 }), 10);
assert.equal(getSegmentedJobConcurrency("h264_videotoolbox", { logicalCores: 4 }), 6);
assert.equal(getSegmentedJobConcurrency("h264_videotoolbox", { logicalCores: 16 }), 12);
assert.equal(getSegmentedJobConcurrency("libx264", { logicalCores: 16 }), 1);

assert.equal(getVideoConcurrency({ processingDevice: "gpu" }, "h264_videotoolbox", 5), 2);
assert.equal(getVideoConcurrency({ processingDevice: "cpu" }, "libx264", 5), 1);
assert.equal(getVideoConcurrency({ processingDevice: "gpu" }, "h264_videotoolbox", 1), 1);

assert.equal(getSegmentCount(59, 10, "h264_videotoolbox"), 1);
assert.equal(getSegmentCount(600, 10, "h264_videotoolbox"), 10);
assert.equal(getSegmentCount(7200, 12, "h264_videotoolbox"), 80);

console.log("GPU scheduler tests passed.");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/gpu-scheduler.test.cjs`

Expected: FAIL with `Cannot find module '../src/main/gpuScheduler.cjs'`.

- [ ] **Step 3: Implement scheduler helper**

Create `src/main/gpuScheduler.cjs`:

```js
function isExtremeGpuMode(options, encoder) {
  return options?.processingDevice === "gpu" && encoder === "h264_videotoolbox";
}

function getSegmentedJobConcurrency(encoder, capabilities = {}) {
  if (encoder === "libx264") return 1;
  const cores = capabilities.logicalCores || 1;
  if (encoder === "h264_videotoolbox") return Math.max(6, Math.min(12, cores));
  if (encoder === "h264_nvenc") return 3;
  return Math.max(2, Math.min(3, Math.floor(cores / 4) || 2));
}

function getVideoConcurrency(options, encoder, jobCount) {
  if (!isExtremeGpuMode(options, encoder)) return 1;
  return Math.max(1, Math.min(2, Number(jobCount) || 1));
}

function getSegmentCount(duration, concurrency, encoder) {
  if (!Number.isFinite(duration) || duration < 60 || concurrency <= 1) return 1;
  const targetSegmentSeconds = encoder === "h264_videotoolbox" ? (duration >= 3600 ? 90 : 60) : duration >= 3600 ? 240 : 180;
  const minimumSegments = Math.max(2, concurrency);
  const maximumSegments = encoder === "h264_videotoolbox" ? 240 : 96;
  return Math.max(minimumSegments, Math.min(maximumSegments, Math.ceil(duration / targetSegmentSeconds)));
}

module.exports = {
  getSegmentedJobConcurrency,
  getSegmentCount,
  getVideoConcurrency,
  isExtremeGpuMode
};
```

- [ ] **Step 4: Run scheduler test to verify it passes**

Run: `node scripts/gpu-scheduler.test.cjs`

Expected: PASS with `GPU scheduler tests passed.`

### Task 2: Wire extreme scheduling into batch execution

**Files:**
- Modify: `src/main/main.js`

- [ ] **Step 1: Import helper and remove local duplicate functions**

In `src/main/main.js`, import scheduler helpers:

```js
const {
  getSegmentCount,
  getSegmentedJobConcurrency,
  getVideoConcurrency
} = require("./gpuScheduler.cjs");
```

Delete the existing local `getSegmentedJobConcurrency` and `getSegmentCount` functions.

- [ ] **Step 2: Replace serial job loop with bounded worker pool**

In `processBatch`, set:

```js
const videoConcurrency = getVideoConcurrency(runtimeOptions, activeEncoder, jobs.length);
```

Replace the `for (const job of jobs)` loop with workers that claim the next job index, call `transcodeJob`, update `completed/failed`, and emit the same batch progress payload. Use `Promise.all` across `videoConcurrency` workers. Keep `settledJobs` so each job is counted once.

- [ ] **Step 3: Preserve cancellation and final batch event**

Ensure workers stop claiming new jobs when `cancelRequested` is true, and preserve the existing final `emitBatchUpdate` shape with `completed`, `failed`, `encoder`, `processingDevice`, `concurrency`, and `videoConcurrency`.

- [ ] **Step 4: Run existing checks**

Run:

```bash
node scripts/gpu-scheduler.test.cjs
node scripts/gpu-usage.test.cjs
npm run smoke
npm run build
```

Expected: all commands exit 0.

### Task 3: Renderer status copy

**Files:**
- Modify: `src/renderer/App.jsx`

- [ ] **Step 1: Update batch message copy**

Change the batch start status text so GPU mode reports:

```js
`开始处理 ${update.total} 个视频，模式：GPU 极速，编码器：${update.encoder}，视频并发：${update.videoConcurrency || 1}，分段并发：${update.concurrency || 1}`
```

CPU mode should keep the existing CPU wording.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: Vite build exits 0.

### Task 4: Rebuild macOS app

**Files:**
- Generated: `release/DL-Editor-Mac-1.0.0-arm64.dmg`
- Generated: `release/DL-Editor-Mac-1.0.0-arm64.pkg`

- [ ] **Step 1: Build app**

Run: `npm run dist`

Expected: electron-builder exits 0 and writes DMG/PKG.

- [ ] **Step 2: Apply ad-hoc app signature**

Run:

```bash
codesign --force --deep --sign - "release/mac-arm64/DL Editor.app"
```

Expected: command exits 0.

- [ ] **Step 3: Rebuild signed DMG and PKG**

Run:

```bash
npx electron-builder --mac dmg --arm64 --prepackaged release/mac-arm64
productbuild --component "release/mac-arm64/DL Editor.app" /Applications release/DL-Editor-Mac-1.0.0-arm64.pkg
```

Expected: both commands exit 0.

- [ ] **Step 4: Verify artifacts**

Run:

```bash
codesign --verify --deep --strict --verbose=2 "release/mac-arm64/DL Editor.app"
hdiutil verify release/DL-Editor-Mac-1.0.0-arm64.dmg
pkgutil --payload-files release/DL-Editor-Mac-1.0.0-arm64.pkg | sed -n '1,40p'
```

Expected: app signature valid, DMG checksum valid, PKG payload lists `DL Editor.app`.
