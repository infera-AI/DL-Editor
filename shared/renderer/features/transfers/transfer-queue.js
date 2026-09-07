import { normalizeTimestamp } from "../../utils/date.js";
import { clampPercent } from "../../utils/format.js";
import { getFileNameFromPath } from "../../utils/path.js";
import { getJobUploadPath, getProcessedStyleFileName, getUploadFileName } from "./transfer-job.js";
import { normalizeUploadProgressMessage } from "./transfer-progress.js";
import { isTransferErrorStatus } from "./transfer-status.js";
import { DELPHI_UPLOAD_FILE_NAME_PATTERN, DELPHI_UPLOAD_MAX_BYTES, DELPHI_UPLOAD_VALIDATION_MESSAGES, RAW_DATA_VIDEO_UPLOAD_PATH, WEB_VIDEO_UPLOAD_PATH } from "./transfer.constants.js";

function createTransferTask(job, { auto = false, autoClearLocal = false, kind = "upload" } = {}) {
  const isBackup = kind === "backup";
  const uploadPath = getTransferUploadPath(job, kind);
  if (!uploadPath) {
    return null;
  }

  const createdAt = Date.now();
  const displayName = job.name || job.outputName || getFileNameFromPath(uploadPath);
  const totalBytes = Number(job.sizeBytes || job.size || job.outputSize || 0) || 0;
  return {
    auto,
    autoClearLocal,
    bytesUploaded: 0,
    clearLocalTarget: isBackup ? "source" : "output",
    completedAt: null,
    createdAt,
    destination: isBackup ? "DL Rawdata" : "Delphi Repository",
    duration: job.duration,
    elapsedMs: 0,
    endpoint: isBackup ? RAW_DATA_VIDEO_UPLOAD_PATH : WEB_VIDEO_UPLOAD_PATH,
    id: `${kind}-${job.id || createdAt}-${createdAt}-${Math.random().toString(16).slice(2)}`,
    kind,
    message: "等待上传",
    name: displayName,
    outputPath: isBackup ? "" : uploadPath,
    path: isBackup ? uploadPath : job.path || uploadPath,
    percent: 0,
    sourceJobId: job.id || "",
    sha256: job.sha256 || "",
    speedBytesPerSecond: 0,
    startTimeMs: normalizeTimestamp(job.startTimeMs ?? job.modifiedAtMs),
    status: "queued",
    totalBytes,
    uploadName: isBackup ? getProcessedStyleFileName(job) : getUploadFileName({ ...job, uploadPath }),
    uploadPath
  };
}

function getTransferUploadPath(job, kind = "upload") {
  return kind === "backup" ? job.path : job.uploadPath || getJobUploadPath(job) || job.path;
}

function getManualDelphiUploadValidationError(job) {
  const uploadPath = getTransferUploadPath(job, "upload");
  const fileName = getFileNameFromPath(uploadPath || job?.name);
  const sizeBytes = Number(job?.sizeBytes || job?.size || job?.outputSize || 0);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes >= DELPHI_UPLOAD_MAX_BYTES) {
    return DELPHI_UPLOAD_VALIDATION_MESSAGES.size;
  }

  if (!DELPHI_UPLOAD_FILE_NAME_PATTERN.test(fileName)) {
    return DELPHI_UPLOAD_VALIDATION_MESSAGES.name;
  }

  return "";
}

function getManualDelphiUploadErrorMessage(errors) {
  return errors.includes(DELPHI_UPLOAD_VALIDATION_MESSAGES.size)
    ? DELPHI_UPLOAD_VALIDATION_MESSAGES.size
    : DELPHI_UPLOAD_VALIDATION_MESSAGES.name;
}

function createJobFromTransferTask(task) {
  return {
    duration: task.duration,
    id: task.id,
    modifiedAtMs: task.startTimeMs,
    name: task.name,
    outputPath: task.kind === "backup" ? "" : task.uploadPath,
    path: task.path,
    size: task.totalBytes,
    sizeBytes: task.totalBytes,
    sha256: task.sha256 || "",
    sourceJobId: task.sourceJobId,
    startTimeMs: task.startTimeMs,
    totalBytes: task.totalBytes,
    uploadName: task.uploadName,
    uploadPath: task.uploadPath
  };
}

function getTransferTaskUploadOptions(task, shouldClearLocalOnComplete = null) {
  return {
    autoClearLocal: Boolean(task.autoClearLocal),
    clearLocalTarget: task.clearLocalTarget,
    destination: task.destination,
    endpoint: task.endpoint,
    mode: task.kind === "backup" ? "backup" : "manual",
    shouldClearLocalOnComplete
  };
}

function getPendingAutomationTransferKinds(job) {
  if (job?.status !== "done") {
    return [];
  }

  const kinds = [];
  if (job.autoUploadRequested && !job.uploadedAt && !job.deletedOutputPath) {
    kinds.push("upload");
  }
  if (job.autoBackupRequested && !job.backedUpAt && !job.deletedOriginalPath) {
    kinds.push("backup");
  }
  return kinds;
}

function getNextTransferTask(queue) {
  return sortTransferQueue(queue).find((item) => item.status === "queued") || null;
}

function isTransferStartable(item) {
  return item?.status === "queued" || isTransferRestartable(item);
}

function isTransferRestartable(item) {
  return item?.status === "canceled" || isTransferErrorStatus(item?.status);
}

function sortTransferQueue(queue) {
  const priority = {
    uploading: 0,
    processing: 0,
    paused: 0,
    queued: 1,
    upload_error: 3,
    backup_error: 3,
    canceled: 3,
    done: 4
  };

  return [...queue].sort((a, b) => {
    const aPriority = priority[a.status] ?? 2;
    const bPriority = priority[b.status] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    if (a.status === "queued" && b.status === "queued" && a.kind !== b.kind) {
      return a.kind === "upload" ? -1 : 1;
    }
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function applyTransferProgress(queue, progress) {
  if (!progress?.jobId || !progress?.uploadId) {
    return queue;
  }

  const status = progress.status || "uploading";
  return queue.map((item) => {
    if (item.id !== progress.jobId) {
      return item;
    }
    if (!item.activeUploadId || item.activeUploadId !== progress.uploadId) {
      return item;
    }
    if (item.status !== "uploading" && item.status !== "processing" && item.status !== "paused") {
      return item;
    }

    const bytesUploaded = Number(progress.bytesUploaded) || item.bytesUploaded;
    const totalBytes = Number(progress.totalBytes) || item.totalBytes;
    return {
      ...item,
      bytesUploaded,
      elapsedMs: status === "paused" ? item.elapsedMs : item.startedAt ? Math.max(Number(item.elapsedMs) || 0, Date.now() - item.startedAt) : item.elapsedMs,
      message: normalizeUploadProgressMessage(progress.message, status) || item.message,
      percent: clampPercent(progress.percent),
      sha256: progress.sha256 || item.sha256 || "",
      speedBytesPerSecond: status === "uploading" ? Number(progress.speedBytesPerSecond) || 0 : 0,
      status,
      totalBytes
    };
  });
}

export { createTransferTask, getTransferUploadPath, getManualDelphiUploadValidationError, getManualDelphiUploadErrorMessage, createJobFromTransferTask, getTransferTaskUploadOptions, getPendingAutomationTransferKinds, getNextTransferTask, isTransferStartable, isTransferRestartable, sortTransferQueue, applyTransferProgress };
