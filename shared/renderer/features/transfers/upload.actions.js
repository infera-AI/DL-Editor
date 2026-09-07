import { dlEditor } from "../../services/desktop.js";
import { expireInferaAuth, isInferaUnauthorizedError, refreshInferaAuth } from "../../services/infera.js";
import { normalizeTimestamp } from "../../utils/date.js";
import { isSamePath } from "../../utils/path.js";
import { createUploadItems, getJobUploadPath, getUploadFileName } from "./transfer-job.js";
import { getUploadItemElapsedMs } from "./transfer-progress.js";
import { createTransferFailureSnapshot, getProcessingDoneMessage, getTransferErrorStatus, getTransferSuccessPatch, getUploadDoneMessage, getUploadHistoryDoneMessage, isUploadActive, isUploadPausable, markUploadItem } from "./transfer-status.js";
import { WEB_VIDEO_UPLOAD_PATH } from "./transfer.constants.js";

function createUploadActions({
  authStateRef,
  uploadPauseWaitersRef,
  uploadPauseRequestedRef,
  uploadCancelRequestedRef,
  setShowLogin,
  setNotice,
  setUploadState,
  setJobs,
  uploadState
}) {
  async function uploadInferaVideoWithAuthRefresh(payload) {
    const currentAuth = authStateRef.current;
    if (!currentAuth?.token) {
      throw expireInferaAuth();
    }

    try {
      return await dlEditor.uploadInferaVideo({ ...payload, token: currentAuth.token });
    } catch (error) {
      if (!isInferaUnauthorizedError(error)) {
        throw error;
      }
      const nextAuth = await refreshInferaAuth();
      try {
        return await dlEditor.uploadInferaVideo({ ...payload, token: nextAuth.token });
      } catch (retryError) {
        if (isInferaUnauthorizedError(retryError)) {
          throw expireInferaAuth();
        }
        throw retryError;
      }
    }
  }

  function wakeUploadPauseWaiters() {
    const waiters = uploadPauseWaitersRef.current.splice(0);
    for (const waiter of waiters) {
      waiter();
    }
  }

  async function waitWhileUploadPaused() {
    while (uploadPauseRequestedRef.current && !uploadCancelRequestedRef.current) {
      await new Promise((resolve) => uploadPauseWaitersRef.current.push(resolve));
    }
  }

  async function uploadJobsToRepository(
    rawJobs,
    {
      autoClearLocal = false,
      clearLocalTarget = "",
      destination = "Delphi Repository",
      endpoint = WEB_VIDEO_UPLOAD_PATH,
      mode = "manual",
      uploadId: providedUploadId = "",
      shouldClearLocalOnComplete = null
    } = {}
  ) {
    const auth = authStateRef.current;
    const isBackup = mode === "backup";
    const actionLabel = isBackup ? "备份" : "上传";
    const transferErrorStatus = getTransferErrorStatus(mode);

    if (!auth?.token) {
      setShowLogin(true);
      setNotice(`请先登录后上传到 ${destination}`);
      throw new Error(`请先登录后上传到 ${destination}`);
    }

    const jobsToUpload = rawJobs
      .map((job) => {
        const uploadPath = job.uploadPath || getJobUploadPath(job);
        return {
          ...job,
          uploadName: getUploadFileName({ ...job, uploadPath }),
          uploadPath
        };
      })
      .filter((job) => Boolean(job.uploadPath));

    if (!jobsToUpload.length) {
      setNotice("没有可上传的视频");
      return { completed: 0 };
    }

    const uploadKind = isBackup ? "backup" : "upload";
    const uploadId = providedUploadId || `${uploadKind}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const retryOptions = { autoClearLocal, clearLocalTarget, destination, endpoint, mode };
    uploadCancelRequestedRef.current = false;
    uploadPauseRequestedRef.current = false;
    wakeUploadPauseWaiters();

    setUploadState({
      status: "uploading",
      visible: true,
      expanded: false,
      uploadId,
      destination,
      mode,
      items: createUploadItems(jobsToUpload),
      retryJobs: jobsToUpload,
      retryOptions,
      message: `准备${actionLabel} ${jobsToUpload.length} 个视频`
    });
    setNotice(`正在${actionLabel} ${jobsToUpload.length} 个视频到 ${destination}`);
    let completed = 0;
    const failedJobs = [];
    try {
      for (const job of jobsToUpload) {
        if (uploadCancelRequestedRef.current) {
          throw new Error("上传已取消");
        }
        await waitWhileUploadPaused();
        if (uploadCancelRequestedRef.current) {
          throw new Error("上传已取消");
        }

        setUploadState((current) =>
          markUploadItem(current, job.id, {
            elapsedMs: 0,
            estimatedRemainingMs: null,
            message: "正在上传",
            percent: 0,
            startedAt: Date.now(),
            status: "uploading"
          })
        );
        let result = null;
        try {
          result = await uploadInferaVideoWithAuthRefresh({
            durationSeconds: job.duration,
            durationMs: Math.max(0, Math.round((Number(job.duration) || 0) * 1000)) || undefined,
            historyUserKey:
              authStateRef.current?.userId ||
              authStateRef.current?.accountName ||
              authStateRef.current?.email ||
              "",
            jobId: job.id,
            path: job.uploadPath,
            fileName: job.uploadName,
            sha256: job.sha256,
            sizeBytes: job.sizeBytes || job.size || job.totalBytes,
            startTimestampMs: normalizeTimestamp(job.startTimeMs ?? job.modifiedAtMs),
            uploadId,
            uploadPath: endpoint
          });
        } catch (error) {
          const message = error.message || "上传失败";
          const canceled = message.includes("取消");
          if (canceled) {
            throw error;
          }
          failedJobs.push(job);
          setUploadState((current) => {
            const now = Date.now();
            const currentItem = current.items.find((item) => item.jobId === job.id);
            return markUploadItem(current, job.id, {
              completedAt: currentItem?.startedAt ? now : currentItem?.completedAt,
              elapsedMs: currentItem?.startedAt ? getUploadItemElapsedMs(currentItem, now) : currentItem?.elapsedMs,
              estimatedRemainingMs: null,
              message,
              speedBytesPerSecond: 0,
              status: transferErrorStatus
            });
          });
          continue;
        }
        const duplicateFromHistory = Boolean(result?.upload_history_duplicate);
        const shouldClearLocal =
          typeof shouldClearLocalOnComplete === "function" ? Boolean(shouldClearLocalOnComplete(job)) : Boolean(autoClearLocal);
        const cleared = shouldClearLocal ? await clearUploadedLocalFile(job, clearLocalTarget || (isBackup ? "source" : "output")) : { deleted: false };
        completed += 1;
        const uploadedAt = new Date().toISOString();
        const doneMessage = duplicateFromHistory
          ? getUploadHistoryDoneMessage(cleared, isBackup ? "backup" : "upload")
          : getUploadDoneMessage(cleared, isBackup ? "backup" : "upload");
        setUploadState((current) => {
          const now = Date.now();
          const currentItem = current.items.find((item) => item.jobId === job.id);
          return markUploadItem(current, job.id, {
            bytesUploaded: currentItem?.totalBytes || 0,
            completedAt: now,
            elapsedMs: getUploadItemElapsedMs(currentItem, now),
            estimatedRemainingMs: 0,
            message: doneMessage,
            percent: 100,
            speedBytesPerSecond: 0,
            status: "done"
          });
        });
        setJobs((current) =>
          current.map((item) => {
            const isUploadJob = item.id === job.id;
            const isSourceJob = job.sourceJobId && item.id === job.sourceJobId;
            if (!isUploadJob && !isSourceJob) {
              return item;
            }

            const patch = getTransferSuccessPatch({
              clearTarget: clearLocalTarget || (isBackup ? "source" : "output"),
              cleared,
              isBackup,
              result,
              timestamp: uploadedAt,
              uploadPath: job.uploadPath
            });
            return {
              ...item,
              ...patch,
              message: isSourceJob ? getProcessingDoneMessage({ ...item, ...patch }) : doneMessage
            };
          })
        );
      }

      if (failedJobs.length > 0) {
        const message = `${actionLabel}失败 ${failedJobs.length} 个，已完成 ${completed} 个`;
        const failureSnapshot = createTransferFailureSnapshot({
          destination,
          jobs: failedJobs,
          message,
          mode,
          retryOptions,
          status: transferErrorStatus
        });
        setUploadState((current) => ({
          ...current,
          status: transferErrorStatus,
          visible: current.visible,
          retryJobs: failedJobs,
          retryOptions,
          message
        }));
        setNotice(message);
        return { completed, failed: failedJobs.length, failureSnapshot };
      }

      setUploadState((current) => ({
        ...current,
        status: "ready",
        visible: current.visible,
        retryJobs: [],
        retryOptions: null,
        message: `已${actionLabel} ${completed} 个视频`
      }));
      setNotice(`已${actionLabel} ${completed} 个视频到 ${destination}`);
      return { completed };
    } catch (error) {
      const message = error.message || "上传失败";
      const canceled = message.includes("取消");
      const retryJobs = canceled ? [] : jobsToUpload.slice(completed);
      const retryOptionsForError = canceled ? null : retryOptions;
      setUploadState((current) => {
        const now = Date.now();
        return {
          ...current,
          status: canceled ? "canceled" : transferErrorStatus,
          visible: current.visible,
          retryJobs,
          retryOptions: retryOptionsForError,
          message,
          items: current.items.map((item) =>
            item.status === "done"
              ? item
              : {
                  ...item,
                  completedAt: item.startedAt ? now : item.completedAt,
                  elapsedMs: item.startedAt ? getUploadItemElapsedMs(item, now) : item.elapsedMs,
                  estimatedRemainingMs: null,
                  message: item.status === "uploading" || item.status === "processing" ? message : item.message,
                  speedBytesPerSecond: 0,
                  status: canceled ? "canceled" : item.status === "queued" ? "queued" : transferErrorStatus
                }
          )
        };
      });
      if (!canceled && retryJobs.length > 0 && error && typeof error === "object") {
        error.transferFailureSnapshot = createTransferFailureSnapshot({
          destination,
          jobs: retryJobs,
          message,
          mode,
          retryOptions,
          status: transferErrorStatus
        });
      }
      setNotice(message);
      throw error;
    }
  }

  async function clearUploadedLocalFile(job, target) {
    const isSourceTarget = target === "source";
    const expectedPath = isSourceTarget ? job.path : job.outputPath;
    if (!expectedPath || !job.uploadPath || !isSamePath(expectedPath, job.uploadPath)) {
      return { deleted: false };
    }

    try {
      return { ...(await dlEditor.deleteLocalFile(job.uploadPath)), target };
    } catch (error) {
      return { deleted: false, error: error.message || "本地文件清除失败", target };
    }
  }

  async function toggleCurrentUploadPaused() {
    if (!isUploadPausable(uploadState) || !uploadState.uploadId) return;
    const uploadId = uploadState.uploadId;
    const shouldResume = uploadState.status === "paused";
    uploadPauseRequestedRef.current = !shouldResume;
    if (shouldResume) {
      wakeUploadPauseWaiters();
    }
    setUploadState((current) => ({
      ...current,
      status: shouldResume ? "uploading" : "paused",
      visible: true,
      message: shouldResume ? "正在上传" : "上传已暂停",
      items: current.items.map((item) =>
        item.status === "uploading" || item.status === "processing" || item.status === "paused"
          ? {
              ...item,
              message: shouldResume ? "正在上传" : "上传已暂停",
              speedBytesPerSecond: 0,
              status: shouldResume ? "uploading" : "paused"
            }
          : item
      )
    }));

    try {
      if (shouldResume) {
        await dlEditor.resumeInferaUpload(uploadId);
      } else {
        await dlEditor.pauseInferaUpload(uploadId);
      }
    } catch (error) {
      uploadPauseRequestedRef.current = shouldResume;
      if (!uploadPauseRequestedRef.current) {
        wakeUploadPauseWaiters();
      }
      setUploadState((current) => ({
        ...current,
        status: shouldResume ? "paused" : "uploading",
        message: shouldResume ? "上传已暂停" : "正在上传",
        items: current.items.map((item) =>
          item.status === "uploading" || item.status === "paused"
            ? {
                ...item,
                message: shouldResume ? "上传已暂停" : "正在上传",
                speedBytesPerSecond: 0,
                status: shouldResume ? "paused" : "uploading"
              }
            : item
        )
      }));
      setNotice(error.message || (shouldResume ? "继续上传失败" : "暂停上传失败"));
    }
  }

  async function cancelCurrentUpload({ hide = false } = {}) {
    if (!isUploadActive(uploadState) || !uploadState.uploadId) return;
    const uploadId = uploadState.uploadId;
    uploadCancelRequestedRef.current = true;
    uploadPauseRequestedRef.current = false;
    wakeUploadPauseWaiters();
    setUploadState((current) => ({
      ...current,
      status: "canceling",
      visible: !hide,
      message: "正在取消上传",
      items: current.items.map((item) =>
        item.status === "uploading" || item.status === "processing" || item.status === "paused"
          ? { ...item, status: "canceling", message: "正在取消", speedBytesPerSecond: 0 }
          : item
      )
    }));
    try {
      await dlEditor.cancelInferaUpload(uploadId);
    } catch (error) {
      setNotice(error.message || "取消上传失败");
    }
  }

  return { uploadInferaVideoWithAuthRefresh, wakeUploadPauseWaiters, waitWhileUploadPaused, uploadJobsToRepository, clearUploadedLocalFile, toggleCurrentUploadPaused, cancelCurrentUpload };
}

export { createUploadActions };
