import { formatTimestampFileName } from "../../utils/date.js";

function createUploadItems(jobs) {
  return jobs.map((job) => ({
    bytesUploaded: 0,
    jobId: job.id,
    message: "等待上传",
    name: job.name,
    path: job.uploadPath || getJobUploadPath(job),
    percent: 0,
    speedBytesPerSecond: 0,
    status: "queued",
    totalBytes: 0
  }));
}

function isJobReadyForUpload(job) {
  return job?.status === "done" && Boolean(job.outputPath);
}

function isLowFrameRateJob(job) {
  const frameRate = Number(job?.frameRate);
  return Number.isFinite(frameRate) && frameRate > 0 && frameRate < 10;
}

function getJobUploadPath(job) {
  if (isJobReadyForUpload(job)) {
    return job.outputPath;
  }

  return isLowFrameRateJob(job) ? job.path : "";
}

function getUploadFileName(job) {
  if (job?.uploadName) {
    return job.uploadName;
  }

  const fileName = String(job.uploadPath || getJobUploadPath(job) || "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop();
  return fileName || job.name || "video.mp4";
}

function getProcessedStyleFileName(job) {
  const timestamp = Number(job?.startTimeMs ?? job?.modifiedAtMs);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return getUploadFileName({ ...job, uploadPath: job?.path });
  }

  return `${formatTimestampFileName(timestamp)}.mp4`;
}

export { createUploadItems, isJobReadyForUpload, isLowFrameRateJob, getJobUploadPath, getUploadFileName, getProcessedStyleFileName };
