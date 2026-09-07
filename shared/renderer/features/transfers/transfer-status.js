import { createUploadItems } from "./transfer-job.js";

function createTransferFailureSnapshot({ destination, jobs, message, mode, retryOptions, status }) {
  const retryJobs = Array.isArray(jobs) ? jobs : [];
  const now = Date.now();
  return {
    destination,
    items: createUploadItems(retryJobs).map((item) => ({
      ...item,
      completedAt: now,
      elapsedMs: 0,
      estimatedRemainingMs: null,
      message,
      startedAt: now,
      status
    })),
    message,
    mode,
    retryJobs,
    retryOptions,
    status
  };
}

function getUploadDoneMessage(clearResult, operation = "upload") {
  if (clearResult?.deleted) {
    return clearResult.target === "source" ? "备份完成，本地原视频已清除" : "上传完成，本地降帧文件已清除";
  }

  if (clearResult?.error) {
    return `${operation === "backup" ? "备份" : "上传"}完成，本地文件清除失败：${clearResult.error}`;
  }

  return operation === "backup" ? "备份完成" : "上传完成";
}

function getUploadHistoryDoneMessage(clearResult, operation = "upload") {
  const operationLabel = operation === "backup" ? "备份" : "上传";
  if (clearResult?.deleted) {
    return `检测到历史${operationLabel}记录，本地文件已清除`;
  }
  if (clearResult?.error) {
    return `检测到历史${operationLabel}记录，已标记完成；本地文件清除失败：${clearResult.error}`;
  }
  return `检测到历史${operationLabel}记录，已标记完成`;
}

function getTransferSuccessPatch({ clearTarget, cleared, isBackup, result, timestamp, uploadPath }) {
  const patch = isBackup
    ? {
        backedUpAt: timestamp,
        backupResult: result
      }
    : {
        uploadedAt: timestamp,
        uploadResult: result
      };

  if (cleared?.error) {
    if (clearTarget === "source") {
      patch.autoClearOriginalError = cleared.error;
      patch.autoClearOriginalStatus = "error";
    } else {
      patch.autoClearError = cleared.error;
      patch.autoClearStatus = "error";
    }
    return patch;
  }

  if (!cleared?.deleted) {
    return patch;
  }

  if (clearTarget === "source") {
    return {
      ...patch,
      autoClearOriginalStatus: "done",
      autoClearedOriginalAt: timestamp,
      deletedOriginalPath: uploadPath
    };
  }

  return {
    ...patch,
    autoClearStatus: "done",
    autoClearedAt: timestamp,
    deletedOutputPath: uploadPath,
    outputPath: ""
  };
}

function isUploadActive(state) {
  return state?.status === "uploading" || state?.status === "processing" || state?.status === "paused" || state?.status === "canceling";
}

function isUploadPausable(state) {
  return state?.status === "uploading" || state?.status === "paused";
}

function getTransferErrorStatus(mode) {
  return mode === "backup" ? "backup_error" : "upload_error";
}

function isTransferErrorStatus(status) {
  return status === "error" || status === "upload_error" || status === "backup_error";
}

function markUploadItem(state, jobId, patch) {
  return {
    ...state,
    items: state.items.map((item) => (item.jobId === jobId ? { ...item, ...patch } : item))
  };
}

function getProcessingDoneMessage(job = {}) {
  const outputDeleted = Boolean(job.deletedOutputPath);
  const sourceDeleted = Boolean(job.deletedOriginalPath);
  if (outputDeleted && sourceDeleted) {
    return "处理完成，本地压制视频和原视频已清除";
  }
  if (outputDeleted) {
    return "处理完成，本地压制视频已清除";
  }
  if (sourceDeleted) {
    return "处理完成，原视频已清除";
  }
  return "处理完成";
}

function formatJobTransferStatusLabel(kind, status) {
  if (status === "uploading" || status === "processing") {
    return kind === "backup" ? "备份中" : "上传中";
  }
  const action = kind === "backup" ? "备份" : "上传";
  if (status === "done") return `${action}完成`;
  if (status === "queued") return `${action}排队`;
  if (status === "paused") return `${action}暂停`;
  if (status === "canceling") return `${action}取消中`;
  if (status === "canceled") return `${action}取消`;
  if (status === "error" || status === "upload_error" || status === "backup_error") return `${action}失败`;
  return `${action}${status}`;
}

export { createTransferFailureSnapshot, getUploadDoneMessage, getUploadHistoryDoneMessage, getTransferSuccessPatch, isUploadActive, isUploadPausable, getTransferErrorStatus, isTransferErrorStatus, markUploadItem, getProcessingDoneMessage, formatJobTransferStatusLabel };
