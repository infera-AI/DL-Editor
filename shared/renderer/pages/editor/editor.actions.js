import { getProcessingDoneMessage } from "../../features/transfers/transfer-status.js";
import { dlEditor } from "../../services/desktop.js";
import { logRendererEvent } from "../../services/logging.js";
import { formatDateTime, normalizeTimestamp, parseDateTimeFromText } from "../../utils/date.js";
import { getShellActionErrorMessage } from "../../utils/errors.js";
import { canClearFinishedJob, canRemoveJob, getProcessingOutputActionPath } from "./editor.utils.js";

function createEditorActions({
  isRunning,
  setJobs,
  setNotice,
  setOutputDirectory,
  canStart,
  pendingJobs,
  outputDirectory,
  selectedFps,
  selectedResolution,
  processingDevice,
  pauseTransitioning,
  isPaused,
  setPauseTransitioning,
  setBatchState,
  setStartTimeEditor,
  startTimeEditor
}) {
  async function addVideos() {
    if (isRunning) return;

    const selected = await dlEditor.selectVideos();
    if (!selected.length) return;

    setJobs((current) => {
      const known = new Set(current.map((job) => job.path));
      const fresh = selected.filter((job) => !known.has(job.path));
      return [...current, ...fresh];
    });
    logRendererEvent("Processing jobs added", { count: selected.length });
    setNotice(`已加入 ${selected.length} 个视频`);
  }

  async function openProcessingOutput(job, action) {
    const outputPath = getProcessingOutputActionPath(job);
    if (!outputPath) {
      setNotice(getProcessingDoneMessage(job));
      return;
    }

    try {
      const result = action === "reveal" ? await dlEditor.revealPath(outputPath) : await dlEditor.openPath(outputPath);
      const errorMessage = getShellActionErrorMessage(result);
      if (errorMessage) {
        setNotice(errorMessage);
      }
    } catch (error) {
      setNotice(error.message || "打开本地压制视频失败");
    }
  }

  async function chooseOutputDirectory() {
    const directory = await dlEditor.selectOutputDirectory();
    if (directory) {
      setOutputDirectory(directory);
    }
  }

  async function startBatch() {
    if (!canStart) return;

    setNotice("");
    setJobs((current) =>
      current.map((job) => ({
        ...job,
        status: job.status === "done" ? "done" : "queued",
        progress: job.status === "done" ? 100 : 0,
        currentTime: 0,
        elapsedSeconds: 0,
        message: "",
        outputPath: job.status === "done" ? job.outputPath : "",
        autoClearError: job.status === "done" ? job.autoClearError : undefined,
        autoClearOriginalError: job.status === "done" ? job.autoClearOriginalError : undefined,
        autoClearOriginalStatus: job.status === "done" ? job.autoClearOriginalStatus : undefined,
        autoClearStatus: job.status === "done" ? job.autoClearStatus : undefined,
        autoClearedAt: job.status === "done" ? job.autoClearedAt : undefined,
        autoClearedOriginalAt: job.status === "done" ? job.autoClearedOriginalAt : undefined,
        backedUpAt: job.status === "done" ? job.backedUpAt : undefined,
        backupResult: job.status === "done" ? job.backupResult : undefined,
        deletedOriginalPath: job.status === "done" ? job.deletedOriginalPath : undefined,
        deletedOutputPath: job.status === "done" ? job.deletedOutputPath : undefined,
        uploadedAt: job.status === "done" ? job.uploadedAt : undefined,
        uploadResult: job.status === "done" ? job.uploadResult : undefined
      }))
    );

    try {
      await dlEditor.startBatch({
        jobs: pendingJobs,
        outputDirectory,
        options: {
          fps: selectedFps,
          resolutionMode: selectedResolution.mode,
          width: selectedResolution.width,
          height: selectedResolution.height,
          processingDevice
        }
      });
    } catch (error) {
      setNotice(error.message || "无法开始处理");
    }
  }

  async function cancelBatch() {
    await dlEditor.cancelBatch();
  }

  async function togglePause() {
    if (!isRunning || pauseTransitioning) return;

    const shouldResume = isPaused;
    setPauseTransitioning(true);
    setBatchState((current) => ({ ...current, paused: !shouldResume, resumed: shouldResume || undefined }));
    setJobs((current) =>
      current.map((job) => {
        if (shouldResume && job.status === "paused") {
          return { ...job, status: "processing", message: "已继续" };
        }

        if (!shouldResume && job.status === "processing") {
          return { ...job, status: "paused", message: "已暂停" };
        }

        return job;
      })
    );
    setNotice(shouldResume ? "处理已继续" : "处理已暂停");

    try {
      const result = shouldResume ? await dlEditor.resumeBatch() : await dlEditor.pauseBatch();
      if (typeof result?.paused === "boolean") {
        setBatchState((current) => ({ ...current, paused: result.paused, resumed: shouldResume && !result.paused }));
      }
    } catch (error) {
      setBatchState((current) => ({ ...current, paused: shouldResume, resumed: undefined }));
      setJobs((current) =>
        current.map((job) => {
          if (shouldResume && job.status === "processing") {
            return { ...job, status: "paused" };
          }

          if (!shouldResume && job.status === "paused") {
            return { ...job, status: "processing" };
          }

          return job;
        })
      );
      setNotice(error.message || (shouldResume ? "无法继续处理" : "无法暂停处理"));
    } finally {
      setPauseTransitioning(false);
    }
  }

  function clearFinished() {
    setJobs((current) => current.filter((job) => !canClearFinishedJob(job)));
  }

  function removeJob(id) {
    setJobs((current) => current.filter((job) => job.id !== id || !canRemoveJob(job)));
  }

  function openStartTimeEditor(job) {
    const startTimeMs = normalizeTimestamp(job.startTimeMs ?? job.modifiedAtMs);
    setStartTimeEditor({
      jobId: job.id,
      fileName: job.name,
      value: formatDateTime(startTimeMs),
      error: ""
    });
  }

  function saveStartTime() {
    if (!startTimeEditor) return;

    const startTimeMs = parseDateTimeFromText(startTimeEditor.value);
    if (!Number.isFinite(startTimeMs)) {
      setStartTimeEditor((current) => (current ? { ...current, error: "请输入有效的年月日和时分秒" } : current));
      return;
    }

    setJobs((current) =>
      current.map((job) => (job.id === startTimeEditor.jobId ? { ...job, startTimeMs } : job))
    );
    setStartTimeEditor(null);
  }

  function parseStartTimeFromFileName() {
    if (!startTimeEditor) return;

    const startTimeMs = parseDateTimeFromText(startTimeEditor.fileName);
    if (!Number.isFinite(startTimeMs)) {
      setStartTimeEditor((current) => (current ? { ...current, error: "文件名里没有可识别的年月日和时分秒" } : current));
      return;
    }

    setStartTimeEditor((current) => (current ? { ...current, value: formatDateTime(startTimeMs), error: "" } : current));
  }

  return { addVideos, openProcessingOutput, chooseOutputDirectory, startBatch, cancelBatch, togglePause, clearFinished, removeJob, openStartTimeEditor, saveStartTime, parseStartTimeFromFileName };
}

export { createEditorActions };
