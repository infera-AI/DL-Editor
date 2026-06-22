# Windows GPU Safe Speed Design

## Goal

Increase Windows GPU-mode throughput with the same safe strategy used on macOS V3: reduce wasted CPU filtering, avoid runaway FFmpeg process/thread counts, and keep hardware encoders fed more consistently.

## Root Cause

Windows currently probes only duration, then always runs `fps` and `scale` filters. It also transcodes audio to AAC in every output, applies `+faststart` to temporary segment outputs, and runs videos serially. Those choices can make CPU filtering, audio encoding, and process scheduling the bottleneck even when NVENC, QSV, AMF, or Media Foundation still has headroom.

## Design

- Add source-aware media probing for duration, width, height, and frame rate.
- Skip `fps` when source FPS is already at or below the target.
- Skip `scale` when source dimensions are already at or below the target.
- Use `flags=fast_bilinear` for CPU scaling when scaling is still required.
- Split FFmpeg args into a helper so tests cover video-only segment output and final audio mux modes.
- Run segmented outputs as video-only files, concatenate them into a temporary video, then mux original audio once.
- Mux audio with stream copy first and fall back to AAC when copy fails.
- Remove `+faststart` from temporary segment/merge files; keep it only for the final output.
- Replace per-video independent segment pools with a global FFmpeg worker budget.
- Tune global budgets by Windows encoder family:
  - `h264_nvenc`: higher process budget because NVENC is usually the strongest path.
  - `h264_qsv` and `h264_amf`: moderate budget.
  - `h264_mf`: conservative budget because Media Foundation varies widely by driver.
  - `libx264`: unchanged conservative CPU mode.

## Non-Goal

Do not enable CUDA/QSV GPU scaling in this pass. That requires detecting filter support on the actual Windows machine and choosing fallback graphs carefully.

## Testing

Add Node assertion tests for scheduler math, FFmpeg args, and filter decisions. Verify syntax, smoke checks, Vite build, and attempt Windows packaging from the current host.
