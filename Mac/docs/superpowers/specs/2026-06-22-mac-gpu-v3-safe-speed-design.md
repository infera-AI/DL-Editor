# Mac GPU V3 Safe Speed Design

## Goal

Increase macOS GPU-mode throughput without overloading the CPU filter stage. Success is measured by faster completed output, not by forcing macOS Activity Monitor to show 100% GPU usage.

## Root Cause

The current extreme mode can start too many FFmpeg processes at once: video concurrency multiplies segment concurrency, and each process also owns several filter threads. At the same time, every output runs `fps` and `scale` even when the source is already at or below the requested frame rate/resolution. That makes CPU-side filtering and process scheduling the bottleneck before VideoToolbox can be fed efficiently.

## Design

- Add a global FFmpeg worker budget for VideoToolbox instead of giving every video an independent large segment pool.
- Derive per-video segment concurrency from that global budget and current video concurrency.
- Reduce filter threads per FFmpeg process when many workers are active.
- Probe source width, height, and frame rate once per job.
- Skip `fps` when the source frame rate is already at or below the requested frame rate.
- Skip `scale` when the source dimensions are already at or below the requested target.
- Use `fast_bilinear` for CPU scale when scaling is still necessary.
- Avoid `+faststart` on temporary segment and merged-video files; keep it only on final output.
- Mux original audio with stream copy first, then fall back to AAC only when copy fails.

## Safety

CPU mode stays conservative. GPU fallback to CPU remains in place. Pause and cancel still apply to every tracked FFmpeg process. Segment temp directories continue to be removed in `finally`.

## Testing

Add focused Node assertion tests for scheduler budget math, filter decision logic, and FFmpeg argument construction. Verify syntax, smoke checks, Vite build, macOS packaging, code signing, DMG verification, and PKG payload.
