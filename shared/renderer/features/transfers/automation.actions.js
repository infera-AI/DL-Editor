import { dlEditor } from "../../services/desktop.js";
import { logRendererEvent } from "../../services/logging.js";
import { createTransferTask, getPendingAutomationTransferKinds, getTransferUploadPath } from "./transfer-queue.js";

function createAutomationActions({
  setAutomationOptions,
  setNotice,
  automationEnqueueRunningRef,
  transferQueueRef,
  setTransferQueue,
  setJobs,
  setTransferDockExpanded,
  scheduleTransferQueueStart
}) {
  function updateAutomationOption(key, value) {
    setAutomationOptions((current) => ({ ...current, [key]: Boolean(value) }));
    if (key === "autoBackup" && value) {
      setNotice("自动备份已开启，处理完成后会备份原视频");
    }
  }

  async function enqueueAutomationTransfers(nextJobs) {
    if (automationEnqueueRunningRef.current) {
      return;
    }

    automationEnqueueRunningRef.current = true;
    const tasks = [];
    const consumed = new Map();
    try {
      for (const job of nextJobs) {
        for (const kind of getPendingAutomationTransferKinds(job)) {
          if (hasExistingAutomationTransferTask(job, kind)) {
            const entry = consumed.get(job.id) || { backup: false, upload: false };
            entry[kind] = true;
            consumed.set(job.id, entry);
            continue;
          }
          const task = createTransferTask(await materializeAutomationTransferJob(job, kind), {
            auto: true,
            kind
          });
          if (task) {
            tasks.push(task);
            const entry = consumed.get(job.id) || { backup: false, upload: false };
            entry[kind] = true;
            consumed.set(job.id, entry);
          }
        }
      }
    } finally {
      automationEnqueueRunningRef.current = false;
    }

    if (!tasks.length) {
      return;
    }

    const nextQueue = [...transferQueueRef.current, ...tasks];
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
    logRendererEvent("Automation transfer tasks enqueued", {
      backupCount: tasks.filter((task) => task.kind === "backup").length,
      queueLength: nextQueue.length,
      uploadCount: tasks.filter((task) => task.kind === "upload").length
    });
    setJobs((current) =>
      current.map((job) => {
        const entry = consumed.get(job.id);
        if (!entry) {
          return job;
        }
        return {
          ...job,
          ...(entry.upload ? { autoUploadRequested: false } : {}),
          ...(entry.backup ? { autoBackupRequested: false } : {})
        };
      })
    );
    setTransferDockExpanded(true);
    setNotice(`已加入 ${tasks.length} 个上传/备份任务`);
    scheduleTransferQueueStart({ restartFailed: false });
  }

  function hasExistingAutomationTransferTask(job, kind) {
    const sourceJobId = String(job?.id || "");
    if (!sourceJobId) {
      return false;
    }

    return transferQueueRef.current.some((item) => item.kind === kind && String(item.sourceJobId || "") === sourceJobId);
  }

  async function materializeAutomationTransferJob(job, kind) {
    const uploadPath = getTransferUploadPath(job, kind);
    if (!uploadPath || typeof dlEditor.getVideoMetadata !== "function") {
      return { ...job, uploadPath };
    }

    try {
      const metadata = await dlEditor.getVideoMetadata(uploadPath);
      if (!metadata) {
        return { ...job, uploadPath };
      }

      return {
        ...job,
        name: metadata.name || job.name,
        outputPath: kind === "backup" ? job.outputPath : metadata.path || uploadPath,
        path: kind === "backup" ? metadata.path || uploadPath : job.path,
        size: metadata.size,
        sizeLabel: metadata.sizeLabel,
        uploadPath: metadata.path || uploadPath
      };
    } catch {
      return { ...job, uploadPath };
    }
  }

  return { updateAutomationOption, enqueueAutomationTransfers, hasExistingAutomationTransferTask, materializeAutomationTransferJob };
}

export { createAutomationActions };
