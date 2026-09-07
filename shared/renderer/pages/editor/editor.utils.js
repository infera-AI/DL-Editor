import { getProcessingDoneMessage } from "../../features/transfers/transfer-status.js";

function getActiveEncodingJob(jobs) {
  return (
    jobs.find((job) => job.status === "processing" && job.hardwareEncoding) ||
    jobs.find((job) => job.status === "processing" && (job.encoder || job.encodingFps || job.encodingSpeed)) ||
    null
  );
}

function formatEncodingSpeed(job) {
  const parts = [];
  const fps = Number(job?.encodingFps);
  const speed = Number(job?.encodingSpeed);

  if (Number.isFinite(fps) && fps > 0) {
    parts.push(`${fps.toFixed(fps >= 10 ? 0 : 1)} fps`);
  }

  if (Number.isFinite(speed) && speed > 0) {
    parts.push(`${speed.toFixed(speed >= 10 ? 1 : 2)}x`);
  }

  return parts.length ? parts.join(" · ") : job?.hardwareEncoding ? "硬件编码中" : job?.encoder || "-";
}

function canClearFinishedJob(job) {
  return job?.status === "done";
}

function canRemoveJob(job) {
  return job?.status !== "processing" && job?.status !== "paused";
}

function getProcessingOutputActionPath(job) {
  if (job?.status !== "done" || job?.deletedOutputPath) {
    return "";
  }
  return job.outputPath || "";
}

function getQueueItemFooterMessage(job) {
  if (job?.status === "done") {
    return job.message || getProcessingDoneMessage(job);
  }
  return job.message || (job.outputPath ? job.outputPath : job.path);
}

function getElapsedMs(job, now) {
  if (job.status === "processing" && Number.isFinite(Number(job.startedAt))) {
    return Math.max(Number(job.elapsedMs) || 0, now - Number(job.startedAt) - (Number(job.pausedMs) || 0));
  }

  if (Number.isFinite(Number(job.elapsedMs))) {
    return Number(job.elapsedMs);
  }

  return Math.max(0, Math.round((Number(job.elapsedSeconds) || 0) * 1000));
}

function getEstimatedRemainingMs(job, elapsedMs) {
  if (job.status === "done") {
    return 0;
  }

  if (Number.isFinite(Number(job.currentTime)) && Number.isFinite(Number(job.duration))) {
    const currentTime = Number(job.currentTime);
    const duration = Number(job.duration);
    if (currentTime > 0 && duration > currentTime) {
      return Math.max(0, Math.round(elapsedMs * ((duration - currentTime) / currentTime)));
    }

    if (duration > 0 && currentTime >= duration) {
      return 0;
    }
  }

  if (Number.isFinite(Number(job.estimatedRemainingMs))) {
    return Number(job.estimatedRemainingMs);
  }

  if (Number(job.progress) > 0) {
    return Math.max(0, Math.round(elapsedMs * ((100 - Number(job.progress)) / Number(job.progress))));
  }

  return null;
}

export { getActiveEncodingJob, formatEncodingSpeed, canClearFinishedJob, canRemoveJob, getProcessingOutputActionPath, getQueueItemFooterMessage, getElapsedMs, getEstimatedRemainingMs };
