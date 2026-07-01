const { contextBridge, ipcRenderer } = require("electron");

const on = (channel, listener) => {
  const wrapped = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
};

contextBridge.exposeInMainWorld("dlEditor", {
  platform: process.platform,
  selectVideos: () => ipcRenderer.invoke("videos:select"),
  selectOutputDirectory: () => ipcRenderer.invoke("output:select-directory"),
  getCapabilities: () => ipcRenderer.invoke("system:get-capabilities"),
  getUsage: () => ipcRenderer.invoke("system:get-usage"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  requestInfera: (payload) => ipcRenderer.invoke("infera:request", payload),
  requestEngine: (payload) => ipcRenderer.invoke("engine:request", payload),
  streamEngineQa: (payload) => ipcRenderer.invoke("engine:qa-stream", payload),
  cancelEngineQaStream: (streamId) => ipcRenderer.invoke("engine:qa-stream:cancel", streamId),
  onEngineQaStreamEvent: (streamId, listener) => on(`engine:qa-stream:event:${streamId}`, listener),
  getEngineMediaProxyUrl: () => ipcRenderer.invoke("engine:get-media-proxy-url"),
  uploadInferaVideo: (payload) => ipcRenderer.invoke("infera:upload-video", payload),
  cancelInferaUpload: (uploadId) => ipcRenderer.invoke("infera:cancel-upload", uploadId),
  pauseInferaUpload: (uploadId) => ipcRenderer.invoke("infera:pause-upload", uploadId),
  resumeInferaUpload: (uploadId) => ipcRenderer.invoke("infera:resume-upload", uploadId),
  deleteLocalFile: (targetPath) => ipcRenderer.invoke("files:delete-local-file", targetPath),
  startBatch: (payload) => ipcRenderer.invoke("transcode:start-batch", payload),
  pauseBatch: () => ipcRenderer.invoke("transcode:pause-batch"),
  resumeBatch: () => ipcRenderer.invoke("transcode:resume-batch"),
  cancelBatch: () => ipcRenderer.invoke("transcode:cancel-batch"),
  revealPath: (targetPath) => ipcRenderer.invoke("shell:reveal-path", targetPath),
  openPath: (targetPath) => ipcRenderer.invoke("shell:open-path", targetPath),
  openExternal: (targetUrl) => ipcRenderer.invoke("shell:open-external", targetUrl),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleFullscreenWindow: () => ipcRenderer.invoke("window:toggle-fullscreen"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  isWindowFullscreen: () => ipcRenderer.invoke("window:is-fullscreen"),
  setTitleBarTheme: (theme) => ipcRenderer.invoke("window:set-title-bar-theme", theme),
  onJobUpdate: (listener) => on("transcode:job-update", listener),
  onBatchUpdate: (listener) => on("transcode:batch-update", listener),
  onInferaUploadProgress: (listener) => on("infera:upload-progress", listener),
  onSystemUsageUpdate: (listener) => on("system:usage-update", listener),
  onWindowFullscreenChange: (listener) => on("window:fullscreen-change", listener)
});
