import { RESOLUTION_PRESETS } from "./editor.constants.js";
import { canClearFinishedJob, getActiveEncodingJob } from "./editor.utils.js";
import { useMemo } from "react";

function useEditorDerivedState({
  batchState,
  jobs,
  useSourceResolution,
  resolutionPreset,
  customWidth,
  customHeight,
  fpsPreset,
  customFps,
  processingDevice,
  capabilities
}) {
  const isRunning = batchState.status === "started";

  const isPaused = isRunning && Boolean(batchState.paused);

  const pendingJobs = jobs.filter((job) => job.status === "queued" || job.status === "error" || job.status === "canceled");

  const hasProcessingJobs = jobs.some((job) => job.status === "processing" || job.status === "paused");

  const activeEncodingJob = getActiveEncodingJob(jobs);

  const canClearFinished = jobs.some((job) => canClearFinishedJob(job));

  const selectedResolution = useMemo(() => {
    if (useSourceResolution) {
      return { mode: "source", label: "原分辨率" };
    }

    if (resolutionPreset === "custom") {
      return {
        mode: "target",
        label: `${customWidth || "-"} x ${customHeight || "-"}`,
        width: Number(customWidth),
        height: Number(customHeight)
      };
    }

    const preset = RESOLUTION_PRESETS.find((item) => item.label === resolutionPreset) || RESOLUTION_PRESETS[1];
    return { mode: "target", label: preset.label, width: preset.width, height: preset.height };
  }, [customHeight, customWidth, resolutionPreset, useSourceResolution]);

  const selectedFps = fpsPreset === "custom" ? Number(customFps) : fpsPreset;

  const activeEncoder = processingDevice === "cpu" ? "libx264" : capabilities?.selectedGpuEncoder || "检测中";

  const isGpuModeAvailable = processingDevice === "gpu" && activeEncoder !== "libx264" && activeEncoder !== "检测中";

  const canStart =
    jobs.length > 0 &&
    pendingJobs.length > 0 &&
    !isRunning &&
    Number.isFinite(selectedFps) &&
    selectedFps > 0 &&
    selectedFps <= 240 &&
    (selectedResolution.mode === "source" ||
      (Number.isFinite(selectedResolution.width) &&
        selectedResolution.width > 0 &&
        Number.isFinite(selectedResolution.height) &&
        selectedResolution.height > 0));

  const totals = useMemo(() => {
    const done = jobs.filter((job) => job.status === "done").length;
    const active = jobs.filter((job) => job.status === "processing" || job.status === "paused").length;
    const errors = jobs.filter((job) => job.status === "error").length;
    return { done, active, errors, total: jobs.length };
  }, [jobs]);

  return { isRunning, isPaused, pendingJobs, hasProcessingJobs, activeEncodingJob, canClearFinished, selectedResolution, selectedFps, activeEncoder, isGpuModeAvailable, canStart, totals };
}

export { useEditorDerivedState };
