# Mac GPU Extreme Speed Mode Design

## Goal

Increase macOS GPU-mode throughput by keeping Apple's VideoToolbox encoder busier. The visible GPU percentage may not reach 100% because macOS separates graphics/compute counters from the media encoder, so success is measured by higher batch throughput and more concurrent FFmpeg work.

## Current Constraints

- GPU mode processes videos one at a time.
- A single video can be split into segments, but `h264_videotoolbox` is capped at 5 segment workers.
- Segment size is tuned for modest temporary-file churn, not maximum encoder pressure.
- The UI reports only segment concurrency, while the queue is still video-serial.

## Design

Extreme mode remains attached to GPU processing on macOS. When GPU mode uses `h264_videotoolbox`, the app will:

- Raise per-video segment concurrency to a more aggressive value based on logical CPU cores, capped to avoid runaway process counts.
- Split eligible videos into shorter segments so segment workers stay busy for long videos.
- Run multiple videos at the same time in GPU mode, with a conservative cap to reduce disk saturation while still improving short-video batches.
- Report both video concurrency and segment concurrency in batch status messages.

CPU mode remains unchanged. Non-VideoToolbox encoders keep their existing conservative concurrency.

## Proposed Defaults

- VideoToolbox segment concurrency: `min(12, max(6, logicalCores))`.
- GPU video concurrency: `2` concurrent videos when GPU mode is active and the selected encoder is not `libx264`.
- Segment duration target: 60 seconds for most videos, 90 seconds for hour-plus videos.
- Segment count cap: 240.

These values favor speed over thermals, power draw, and temporary disk usage.

## Error Handling

- Cancel and pause continue to act on all tracked FFmpeg processes.
- A failing GPU job retains the existing CPU fallback path.
- Batch accounting must count each job exactly once even when jobs finish out of order.
- Temporary segment directories are still removed in `finally`.

## Testing

- Add focused tests for the extreme concurrency helper functions.
- Verify existing smoke/build checks.
- Build the macOS app and repackage DMG/PKG after implementation.
