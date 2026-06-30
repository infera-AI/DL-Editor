# DL Studio Mac

macOS desktop video downsampler built with Electron, React, FFmpeg, FFprobe, and Apple VideoToolbox acceleration.

## Commands

Run these on a Mac, not on Windows:

```bash
npm install
npm run dev
npm run dist
```

The generated macOS installers are written to `release/` as `.dmg` and `.pkg` files. `npm run dist` builds for the current Mac architecture so the bundled FFmpeg binary matches the app.

For a specific architecture:

```bash
rm -rf node_modules
npm_config_arch=arm64 npm install
npm run dist:arm64

rm -rf node_modules
npm_config_arch=x64 npm install
npm run dist:x64
```

## Behavior

- UI and workflow match the Windows version.
- Select one or many local videos.
- Batch videos are processed one by one.
- In GPU mode, each eligible video is split into parallel temporary segments to keep Apple's VideoToolbox encoder busy, then merged back into one MP4.
- Frame-rate presets are `1`, `2`, `5`, and `10` FPS, with custom input still supported.
- Choose preset or custom resolution, or keep source resolution.
- GPU mode prioritizes `h264_videotoolbox`; CPU mode forces `libx264`.
- Each processing job shows current video time, total video time, estimated remaining time, and elapsed wall time with two-digit subsecond precision.
- The app shell is locked to the window height; settings and queue panes scroll independently with thin scrollbars.
- Output files are saved to the selected local output folder, defaulting to the user's Movies directory under `DL Studio Outputs`.

## macOS Notes

- Build the installer on macOS so `ffmpeg-static` downloads the correct Darwin binary for the target architecture.
- Apple Silicon Macs should use `npm run dist:arm64`; Apple Silicon starts at macOS 11 Big Sur.
- Intel Macs should use `npm run dist:x64`; this build targets macOS 10.15 Catalina and newer.
- macOS 10.14 and older are not supported by the current Electron stack.
- Release builds publish both `arm64` and `x64` Mac installers, and the updater picks the matching architecture.
- Unsigned builds may show a Gatekeeper warning. A production build should be signed and notarized with an Apple Developer ID.
- macOS does not expose reliable GPU utilization to ordinary desktop apps without privileged tools such as `powermetrics`; the app still shows GPU identity, encoder status, and CPU utilization live.
