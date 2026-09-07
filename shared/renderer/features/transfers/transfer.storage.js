import { clampPercent } from "../../utils/format.js";
import { AUTOMATION_STORAGE_KEY, DEFAULT_AUTOMATION_OPTIONS, TRANSFER_QUEUE_STORAGE_KEY } from "./transfer.constants.js";

function readStoredAutomationOptions() {
  try {
    const stored = window.localStorage?.getItem(AUTOMATION_STORAGE_KEY);
    return { ...DEFAULT_AUTOMATION_OPTIONS, ...(stored ? JSON.parse(stored) : {}) };
  } catch {
    return DEFAULT_AUTOMATION_OPTIONS;
  }
}

function readStoredTransferQueue() {
  try {
    const stored = window.localStorage?.getItem(TRANSFER_QUEUE_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStoredTransferTask).filter(Boolean);
  } catch {
    return [];
  }
}

function writeStoredTransferQueue(queue) {
  try {
    const tasks = Array.isArray(queue) ? queue.map(normalizeStoredTransferTask).filter(Boolean) : [];
    window.localStorage?.setItem(TRANSFER_QUEUE_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // localStorage can be unavailable or full; the live queue should keep working.
  }
}

function normalizeStoredTransferTask(task) {
  if (!task || typeof task !== "object") return null;
  if (task.kind !== "upload" && task.kind !== "backup") return null;
  if (!task.id || !task.uploadPath) return null;
  if (task.status === "done") return null;
  if (task.status === "canceling") return null;
  if (task.status === "canceled") return null;

  const activeStatuses = new Set(["uploading", "processing", "paused"]);
  const failedStatuses = new Set(["upload_error", "backup_error", "error"]);
  const status = activeStatuses.has(task.status)
    ? "queued"
    : task.status === "queued" || failedStatuses.has(task.status)
      ? task.status
      : "queued";
  const isQueuedFromActive = activeStatuses.has(task.status);

  return {
    ...task,
    activeUploadId: "",
    bytesUploaded: status === "queued" ? 0 : Number(task.bytesUploaded) || 0,
    completedAt: status === "queued" ? null : task.completedAt || null,
    elapsedMs: status === "queued" ? 0 : Number(task.elapsedMs) || 0,
    message: isQueuedFromActive ? "等待上传" : task.message || (status === "queued" ? "等待上传" : ""),
    percent: status === "queued" ? 0 : clampPercent(task.percent),
    speedBytesPerSecond: 0,
    status,
    totalBytes: Number(task.totalBytes) || 0
  };
}

export { readStoredAutomationOptions, readStoredTransferQueue, writeStoredTransferQueue, normalizeStoredTransferTask };
