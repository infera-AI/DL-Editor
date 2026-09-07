import { isUploadActive } from "../features/transfers/transfer-status.js";
import { useEffect } from "react";

function useTaskClock({
  hasProcessingJobs,
  uploadState,
  transferQueue,
  setClockNow
}) {
  useEffect(() => {
    if (!hasProcessingJobs && !isUploadActive(uploadState) && !transferQueue.some((item) => item.status === "uploading")) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 80);

    return () => window.clearInterval(timer);
  }, [hasProcessingJobs, transferQueue, uploadState.status]);
}

export { useTaskClock };
