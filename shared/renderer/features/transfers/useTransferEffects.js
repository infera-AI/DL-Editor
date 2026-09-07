import { getPendingAutomationTransferKinds } from "./transfer-queue.js";
import { AUTOMATION_STORAGE_KEY } from "./transfer.constants.js";
import { writeStoredTransferQueue } from "./transfer.storage.js";
import { useEffect } from "react";

function useTransferEffects({
  automationOptionsRef,
  automationOptions,
  uploadStateRef,
  uploadState,
  transferQueueRef,
  transferQueue,
  jobs,
  enqueueAutomationTransfers
}) {
  useEffect(() => {
    automationOptionsRef.current = automationOptions;
    window.localStorage?.setItem(AUTOMATION_STORAGE_KEY, JSON.stringify(automationOptions));
  }, [automationOptions]);

  useEffect(() => {
    uploadStateRef.current = uploadState;
  }, [uploadState]);

  useEffect(() => {
    transferQueueRef.current = transferQueue;
    writeStoredTransferQueue(transferQueue);
  }, [transferQueue]);

  useEffect(() => {
  }, [jobs]);

  useEffect(() => {
    const readyJobs = jobs.filter((job) => getPendingAutomationTransferKinds(job).length > 0);
    if (!readyJobs.length) {
      return;
    }

    void enqueueAutomationTransfers(readyJobs);
  }, [jobs]);
}

export { useTransferEffects };
