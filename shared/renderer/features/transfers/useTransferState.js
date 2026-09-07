import { readStoredAutomationOptions, readStoredTransferQueue } from "./transfer.storage.js";
import { useRef, useState } from "react";

function useTransferState() {
  const [automationOptions, setAutomationOptions] = useState(readStoredAutomationOptions);

  const [uploadState, setUploadState] = useState({
    status: "idle",
    visible: false,
    expanded: false,
    uploadId: "",
    items: [],
    message: "",
    retryJobs: [],
    retryOptions: null
  });

  const [transferQueue, setTransferQueue] = useState(readStoredTransferQueue);

  const [transferDockExpanded, setTransferDockExpanded] = useState(false);

  const [transferRunning, setTransferRunning] = useState(false);

  const uploadCancelRequestedRef = useRef(false);

  const uploadPauseRequestedRef = useRef(false);

  const uploadPauseWaitersRef = useRef([]);

  const uploadStateRef = useRef(uploadState);

  const transferQueueRef = useRef(transferQueue);

  const transferRunningRef = useRef(false);

  const automationOptionsRef = useRef(automationOptions);

  const automationEnqueueRunningRef = useRef(false);

  return { automationOptions, setAutomationOptions, uploadState, setUploadState, transferQueue, setTransferQueue, transferDockExpanded, setTransferDockExpanded, transferRunning, setTransferRunning, uploadCancelRequestedRef, uploadPauseRequestedRef, uploadPauseWaitersRef, uploadStateRef, transferQueueRef, transferRunningRef, automationOptionsRef, automationEnqueueRunningRef };
}

export { useTransferState };
