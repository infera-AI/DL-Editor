import { clampPercent, formatBytes } from "../../utils/format.js";
import { isTransferErrorStatus, isUploadActive } from "./transfer-status.js";
import { UPLOAD_STATUS_LABELS } from "./transfer.constants.js";

function applyUploadProgress(state, progress) {
  if (!progress?.uploadId || progress.uploadId !== state.uploadId) {
    return state;
  }
  if (!isUploadActive(state)) {
    return state;
  }

  const incomingStatus = progress.status || "uploading";
  const status = state.status === "paused" && incomingStatus === "uploading" ? "paused" : incomingStatus;
  const message =
    normalizeUploadProgressMessage(progress.message, status) ||
    (status === "processing" ? "文件已发送，等待服务器处理" : UPLOAD_STATUS_LABELS[status]);
  const now = Date.now();
  const nextItems = state.items.map((item) => {
    const matches = progress.jobId ? item.jobId === progress.jobId : item.path === progress.filePath;
    if (!matches) {
      return item;
    }
    if (item.status !== "queued" && item.status !== "uploading" && item.status !== "processing" && item.status !== "paused") {
      return item;
    }

    const startedAt = item.startedAt || now;
    const bytesUploaded = Number(progress.bytesUploaded) || item.bytesUploaded;
    const totalBytes = Number(progress.totalBytes) || item.totalBytes;
    const speedBytesPerSecond = status === "uploading" ? Number(progress.speedBytesPerSecond) || 0 : 0;
    const elapsedMs = status === "paused" ? getUploadItemElapsedMs(item, now) : Math.max(getUploadItemElapsedMs(item, now), now - startedAt);

    return {
      ...item,
      bytesUploaded,
      elapsedMs,
      estimatedRemainingMs: getUploadEstimatedRemainingMs({
        bytesUploaded,
        elapsedMs,
        percent: progress.percent,
        speedBytesPerSecond,
        status,
        totalBytes
      }),
      message,
      percent: clampPercent(progress.percent),
      speedBytesPerSecond,
      startedAt,
      status,
      totalBytes
    };
  });

  return {
    ...state,
    message,
    status: getNextUploadStatus(state.status, status),
    visible: state.visible,
    items: nextItems
  };
}

function getNextUploadStatus(currentStatus, progressStatus) {
  if (progressStatus === "canceled") {
    return "canceling";
  }

  if (currentStatus === "paused" && progressStatus === "uploading") {
    return "paused";
  }

  if (progressStatus === "paused" || progressStatus === "uploading" || progressStatus === "processing") {
    return progressStatus;
  }

  return currentStatus;
}

function normalizeUploadProgressMessage(message, status) {
  if (status === "paused") {
    return "上传已暂停";
  }

  if (status === "uploading" && message === "继续上传") {
    return "正在上传";
  }

  return message;
}

function getUploadOverallPercent(state) {
  if (!state.items.length) {
    return 0;
  }

  const total = state.items.reduce((sum, item) => sum + (item.status === "done" ? 100 : clampPercent(item.percent)), 0);
  return clampPercent(total / state.items.length);
}

function formatUploadBytes(item) {
  const uploaded = formatBytes(item.bytesUploaded, { precision: 2 }) || "0.00 B";
  const total = formatBytes(item.totalBytes, { precision: 2 });
  return total ? `${uploaded} / ${total}` : uploaded;
}

function getUploadItemElapsedMs(item, now = Date.now()) {
  if (!item) {
    return 0;
  }

  if (item.status === "queued" || !Number.isFinite(Number(item.startedAt))) {
    return Number(item.elapsedMs) || 0;
  }

  if (item.status === "done" || item.status === "canceled" || isTransferErrorStatus(item.status)) {
    return Number(item.elapsedMs) || Math.max(0, Number(item.completedAt || now) - Number(item.startedAt));
  }

  if (item.status === "paused") {
    return Number(item.elapsedMs) || Math.max(0, now - Number(item.startedAt));
  }

  return Math.max(Number(item.elapsedMs) || 0, now - Number(item.startedAt));
}

function getUploadEstimatedRemainingMs({ bytesUploaded, elapsedMs, percent, speedBytesPerSecond, status, totalBytes }) {
  if (status === "done") {
    return 0;
  }
  if (status === "canceled" || isTransferErrorStatus(status)) {
    return null;
  }

  const uploaded = Number(bytesUploaded);
  const total = Number(totalBytes);
  const speed = Number(speedBytesPerSecond);

  if (Number.isFinite(uploaded) && Number.isFinite(total) && total > uploaded && speed > 0) {
    return Math.max(0, Math.round(((total - uploaded) / speed) * 1000));
  }

  if (status === "processing" && Number.isFinite(uploaded) && Number.isFinite(total) && total > 0 && uploaded >= total) {
    return null;
  }

  const progress = Number(percent);
  if (Number.isFinite(progress) && progress > 0 && progress < 100 && Number.isFinite(Number(elapsedMs))) {
    return Math.max(0, Math.round(Number(elapsedMs) * ((100 - progress) / progress)));
  }

  return null;
}

function getUploadItemRemainingMs(item, now = Date.now()) {
  if (!item) {
    return null;
  }

  if (item.status === "done") {
    return 0;
  }

  const liveElapsedMs = getUploadItemElapsedMs(item, now);
  return getUploadEstimatedRemainingMs({
    bytesUploaded: item.bytesUploaded,
    elapsedMs: liveElapsedMs,
    percent: item.percent,
    speedBytesPerSecond: item.speedBytesPerSecond,
    status: item.status,
    totalBytes: item.totalBytes
  });
}

function getUploadCurrentSpeed(state) {
  if (state.status === "paused" || state.status === "canceled" || state.status === "ready" || isTransferErrorStatus(state.status)) {
    return 0;
  }

  const activeItem = state.items.find((item) => item.status === "uploading" && item.speedBytesPerSecond > 0);
  return activeItem?.speedBytesPerSecond || 0;
}

function formatUploadSpeed(value) {
  return `${formatBytes(value) || "0 B"}/s`;
}

export { applyUploadProgress, getNextUploadStatus, normalizeUploadProgressMessage, getUploadOverallPercent, formatUploadBytes, getUploadItemElapsedMs, getUploadEstimatedRemainingMs, getUploadItemRemainingMs, getUploadCurrentSpeed, formatUploadSpeed };
