import { applyUploadProgress } from "../features/transfers/transfer-progress.js";
import { applyTransferProgress } from "../features/transfers/transfer-queue.js";
import { dlEditor } from "../services/desktop.js";
import { useEffect } from "react";

function useDesktopEvents({
  setCapabilities,
  setOutputDirectory,
  setSystemUsage,
  setJobs,
  automationOptionsRef,
  setBatchState,
  setNotice,
  setIsFullscreen,
  setUploadState,
  setTransferQueue,
  transferQueueRef
}) {
  useEffect(() => {
    dlEditor.getCapabilities().then((data) => {
      setCapabilities(data);
      setOutputDirectory(data.outputDirectory);
    });

    dlEditor.getUsage().then(setSystemUsage).catch(() => undefined);

    const offJob = dlEditor.onJobUpdate((update) => {
      setJobs((current) =>
        current.map((job) => {
          if (job.id !== update.id) {
            return job;
          }

          const completedNow = update.status === "done" && job.status !== "done";
          return {
            ...job,
            ...update,
            ...(completedNow
              ? {
                  autoBackupRequested: Boolean(automationOptionsRef.current.autoBackup),
                  autoUploadRequested: Boolean(automationOptionsRef.current.autoUpload)
                }
              : {})
          };
        })
      );
    });

    const offBatch = dlEditor.onBatchUpdate((update) => {
      setBatchState((current) => ({ ...current, ...update }));
      if (update.status === "finished") {
        const failedCount = Number(update.failed) || 0;
        const failedText = failedCount > 0 ? `，失败 ${failedCount} 个` : "";
        setNotice(`已完成 ${update.completed} 个视频${failedText}，输出到 ${update.outputDirectory}`);
      } else if (update.status === "canceled") {
        setNotice("批量处理已取消");
      } else if (update.status === "error") {
        setNotice(update.message || "批量处理失败");
      } else if (update.status === "started" && update.paused) {
        setJobs((current) =>
          current.map((job) => (job.status === "processing" ? { ...job, status: "paused", message: job.message || "已暂停" } : job))
        );
        setNotice("处理已暂停");
      } else if (update.status === "started" && update.resumed) {
        setJobs((current) =>
          current.map((job) => (job.status === "paused" ? { ...job, status: "processing", message: job.message || "已继续" } : job))
        );
        setNotice("处理已继续");
      } else if (update.status === "started") {
        const modeText =
          update.processingDevice === "cpu"
            ? "CPU"
            : `GPU 极速，视频并发：${update.videoConcurrency || 1}，分段并发：${update.concurrency || 1}`;
        setNotice(`开始处理 ${update.total} 个视频，模式：${modeText}，编码器：${update.encoder}`);
      }
    });

    const offUsage = dlEditor.onSystemUsageUpdate(setSystemUsage);
    const offFullscreen = dlEditor.onWindowFullscreenChange(setIsFullscreen);
    const offUpload = dlEditor.onInferaUploadProgress((progress) => {
      setUploadState((current) => applyUploadProgress(current, progress));
      setTransferQueue((current) => {
        const next = applyTransferProgress(current, progress);
        transferQueueRef.current = next;
        return next;
      });
    });
    dlEditor.isWindowFullscreen().then(setIsFullscreen).catch(() => undefined);

    return () => {
      offJob();
      offBatch();
      offUsage();
      offFullscreen();
      offUpload();
    };
  }, []);
}

export { useDesktopEvents };
