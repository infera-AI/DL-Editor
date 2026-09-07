import { dlEditor } from "../../services/desktop.js";
import { logRendererEvent } from "../../services/logging.js";
import { createJobFromTransferTask, createTransferTask, getManualDelphiUploadErrorMessage, getManualDelphiUploadValidationError, getNextTransferTask, getTransferTaskUploadOptions, isTransferRestartable } from "./transfer-queue.js";
import { isTransferErrorStatus, isUploadActive } from "./transfer-status.js";

function createTransferQueueActions({
  canAddTransfer,
  setNotice,
  transferQueueRef,
  setTransferQueue,
  setTransferDockExpanded,
  transferRunningRef,
  uploadStateRef,
  authStateRef,
  autoLoginPromptedRef,
  setShowLogin,
  setTransferRunning,
  setUploadState,
  automationOptionsRef,
  uploadJobsToRepository
}) {
  async function addTransferFiles(kind) {
    if (!canAddTransfer) return;

    const selected = await dlEditor.selectVideos();
    if (!selected.length) return;

    const selection = selected.map((job) => ({
      error: kind === "upload" ? getManualDelphiUploadValidationError(job) : "",
      job
    }));
    const rejectedErrors = selection.map((entry) => entry.error).filter(Boolean);
    const validSelection = selection
      .filter((entry) => !entry.error)
      .map((entry) => entry.job);
    const rejectedCount = rejectedErrors.length;
    const tasks = validSelection
      .map((job) =>
        createTransferTask(job, {
          auto: false,
          kind
        })
      )
      .filter(Boolean);
    if (!tasks.length) {
      setNotice(kind === "upload" ? getManualDelphiUploadErrorMessage(rejectedErrors) : "没有可添加的备份视频");
      return;
    }
    const nextQueue = [...transferQueueRef.current, ...tasks];
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
    setTransferDockExpanded(true);
    logRendererEvent("Manual transfer tasks added", {
      kind,
      queueLength: nextQueue.length,
      rejectedCount,
      taskCount: tasks.length
    });
    const rejectedText =
      rejectedCount > 0
        ? `，${rejectedCount} 个文件未加入：${getManualDelphiUploadErrorMessage(rejectedErrors)}`
        : "";
    setNotice(`已加入 ${tasks.length} 个${kind === "backup" ? "备份" : "上传"}任务${rejectedText}`);
  }

  function clearFinishedTransfers() {
    const nextQueue = transferQueueRef.current.filter((item) => item.status !== "done");
    const clearedCount = transferQueueRef.current.length - nextQueue.length;
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
    logRendererEvent("Finished transfer tasks cleared", { clearedCount, queueLength: nextQueue.length });
  }

  function removeTransferTask(taskId) {
    const before = transferQueueRef.current;
    const nextQueue = transferQueueRef.current.filter(
      (item) => item.id !== taskId || (item.status !== "queued" && !isTransferErrorStatus(item.status))
    );
    const removedTask = before.find((item) => item.id === taskId && !nextQueue.some((nextItem) => nextItem.id === item.id));
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
    if (removedTask) {
      logRendererEvent("Transfer task removed", {
        kind: removedTask.kind,
        name: removedTask.name,
        previousStatus: removedTask.status,
        queueLength: nextQueue.length,
        taskId
      });
    }
  }

  function retryTransferTask(taskId) {
    const retryTask = transferQueueRef.current.find((item) => item.id === taskId);
    const nextQueue = transferQueueRef.current.map((item) =>
        item.id === taskId && isTransferErrorStatus(item.status)
          ? {
              ...item,
              completedAt: null,
              activeUploadId: "",
              elapsedMs: 0,
              message: "等待上传",
              percent: 0,
              speedBytesPerSecond: 0,
              status: "queued"
            }
          : item
    );
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
    if (retryTask) {
      logRendererEvent("Transfer task retry requested", {
        kind: retryTask.kind,
        name: retryTask.name,
        previousStatus: retryTask.status,
        taskId
      });
    }
    if (!transferRunningRef.current && !isUploadActive(uploadStateRef.current)) {
      scheduleTransferQueueStart({ restartFailed: false });
    }
  }

  function scheduleTransferQueueStart(options = {}) {
    if (transferRunningRef.current || isUploadActive(uploadStateRef.current)) {
      return;
    }

    window.setTimeout(() => {
      startTransferQueue(options);
    }, 0);
  }

  async function startTransferQueue({ restartFailed = true } = {}) {
    if (transferRunningRef.current || isUploadActive(uploadStateRef.current)) return;

    const startableQueue = restartFailed
      ? transferQueueRef.current.map((item) =>
          isTransferRestartable(item)
            ? {
                ...item,
                completedAt: null,
                activeUploadId: "",
                elapsedMs: 0,
                message: "等待上传",
                percent: 0,
                speedBytesPerSecond: 0,
                status: "queued"
              }
            : item
        )
      : transferQueueRef.current;
    if (!startableQueue.some((item) => item.status === "queued")) {
      return;
    }

    const auth = authStateRef.current;
    if (!auth?.token) {
      if (!autoLoginPromptedRef.current) {
        autoLoginPromptedRef.current = true;
        setShowLogin(true);
      }
      setNotice("上传/备份需要先登录");
      logRendererEvent("Transfer queue start blocked", { reason: "missing_auth" }, "warn");
      return;
    }

    transferQueueRef.current = startableQueue;
    setTransferQueue(startableQueue);

    transferRunningRef.current = true;
    setTransferRunning(true);
    setTransferDockExpanded(true);
    logRendererEvent("Transfer queue started", {
      backupQueued: startableQueue.filter((item) => item.kind === "backup" && item.status === "queued").length,
      uploadQueued: startableQueue.filter((item) => item.kind === "upload" && item.status === "queued").length
    });
    try {
      while (true) {
        const nextTask = getNextTransferTask(transferQueueRef.current);
        if (!nextTask) {
          break;
        }
        await runTransferTask(nextTask, auth.token);
      }
    } finally {
      transferRunningRef.current = false;
      setTransferRunning(false);
      setUploadState((current) =>
        isUploadActive(current)
          ? current
          : {
              ...current,
              status: current.status === "idle" ? "idle" : "ready",
              uploadId: "",
              retryJobs: [],
              retryOptions: null
            }
      );
    }
  }

  async function runTransferTask(task, token) {
    const taskJob = createJobFromTransferTask(task);
    const taskUploadId = `${task.kind}-${task.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const options = getTransferTaskUploadOptions(task, () => Boolean(automationOptionsRef.current.autoClearLocal));
    logRendererEvent("Transfer task started", { kind: task.kind, name: task.name, taskId: task.id });

    updateTransferTask(task.id, {
      activeUploadId: taskUploadId,
      completedAt: null,
      message: "正在上传",
      startedAt: Date.now(),
      status: "uploading"
    });

    try {
      const result = await uploadJobsToRepository([taskJob], { ...options, uploadId: taskUploadId });
      const failed = Boolean(result?.failureSnapshot || result?.failed);
      if (failed) {
        updateTransferTask(task.id, {
          activeUploadId: "",
          completedAt: Date.now(),
          message: result?.failureSnapshot?.message || (task.kind === "backup" ? "备份失败" : "上传失败"),
          speedBytesPerSecond: 0,
          status: task.kind === "backup" ? "backup_error" : "upload_error"
        });
        logRendererEvent("Transfer task failed", {
          kind: task.kind,
          message: result?.failureSnapshot?.message || (task.kind === "backup" ? "备份失败" : "上传失败"),
          name: task.name,
          taskId: task.id
        }, "warn");
        setNotice(`${task.kind === "backup" ? "备份" : "上传"}失败：${task.name}`);
        return;
      }

      updateTransferTask(task.id, {
        activeUploadId: "",
        completedAt: Date.now(),
        message: task.kind === "backup" ? "备份完成" : "上传完成",
        percent: 100,
        speedBytesPerSecond: 0,
        status: "done"
      });
      logRendererEvent("Transfer task completed", { kind: task.kind, name: task.name, taskId: task.id });
      setNotice(`${task.kind === "backup" ? "备份" : "上传"}完成：${task.name}`);
    } catch (error) {
      const message = error.message || "上传失败";
      if (message.includes("取消")) {
        updateTransferTask(task.id, {
          activeUploadId: "",
          completedAt: Date.now(),
          message: "上传已取消",
          speedBytesPerSecond: 0,
          status: "canceled"
        });
        logRendererEvent("Transfer task canceled", { kind: task.kind, name: task.name, taskId: task.id }, "warn");
        return;
      }

      updateTransferTask(task.id, {
        activeUploadId: "",
        completedAt: Date.now(),
        message,
        speedBytesPerSecond: 0,
        status: task.kind === "backup" ? "backup_error" : "upload_error"
      });
      logRendererEvent("Transfer task failed", { kind: task.kind, message, name: task.name, taskId: task.id }, "warn");
      setNotice(`${task.kind === "backup" ? "备份" : "上传"}失败：${task.name}`);
    }
  }

  function updateTransferTask(taskId, patch) {
    const nextQueue = transferQueueRef.current.map((item) => (item.id === taskId ? { ...item, ...patch } : item));
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
  }

  return { addTransferFiles, clearFinishedTransfers, removeTransferTask, retryTransferTask, scheduleTransferQueueStart, startTransferQueue, runTransferTask, updateTransferTask };
}

export { createTransferQueueActions };
