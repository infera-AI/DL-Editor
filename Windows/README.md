# DL Studio Windows

Windows desktop video downsampler built with Electron, React, FFmpeg, and an NSIS installer.

## Commands

```powershell
npm install
npm run dev
npm run dist
```

The generated installer is written to `release/DL-Studio-Windows-Setup-0.1.0.exe`.

## Behavior

- Select one or many local videos.
- Choose preset or custom frame rate.
- Choose preset or custom resolution, or keep source resolution.
- Frame-rate presets are `1`, `2`, `5`, and `10` FPS, with custom input still supported.
- Choose GPU or CPU processing. GPU mode uses detected hardware encoders when available; CPU mode forces `libx264`.
- Batch videos are processed one by one. In GPU mode, each eligible video is split into parallel temporary segments to keep the GPU encoder busy, then merged back into one MP4.
- Hardware encoders are detected from FFmpeg and prioritized in this order: NVIDIA NVENC, Intel Quick Sync, AMD AMF, Windows Media Foundation, then CPU `libx264`.
- CPU/GPU utilization is sampled live while the app is open.
- Each processing job shows current video time, total video time, estimated remaining time, and elapsed wall time with two-digit subsecond precision.
- The app shell is locked to the window height; settings and queue panes scroll independently with thin scrollbars.
- Output files are saved to the selected local output folder, defaulting to the user's Videos directory under `DL Studio Outputs`.
