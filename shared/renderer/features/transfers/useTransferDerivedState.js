import { isTransferStartable, sortTransferQueue } from "./transfer-queue.js";
import { isUploadActive } from "./transfer-status.js";
import { useMemo } from "react";

function useTransferDerivedState({
  transferQueue,
  uploadState,
  transferRunning
}) {
  const transferQueueSorted = useMemo(() => sortTransferQueue(transferQueue), [transferQueue]);

  const canAddTransfer = !isUploadActive(uploadState) && !transferRunning;

  const canStartTransfers = !isUploadActive(uploadState) && !transferRunning && transferQueue.some(isTransferStartable);

  const canClearFinishedTransfers = transferQueue.some((item) => item.status === "done");

  return { transferQueueSorted, canAddTransfer, canStartTransfers, canClearFinishedTransfers };
}

export { useTransferDerivedState };
