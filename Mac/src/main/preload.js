const { contextBridge, ipcRenderer } = require("electron");

const on = (channel, listener) => {
  const wrapped = (_event, payload) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
};

contextBridge.exposeInMainWorld("dlEditor", {
  selectVideos: () => ipcRenderer.invoke("videos:select"),
  selectOutputDirectory: () => ipcRenderer.invoke("output:select-directory"),
  getCapabilities: () => ipcRenderer.invoke("system:get-capabilities"),
  getUsage: () => ipcRenderer.invoke("system:get-usage"),
  startBatch: (payload) => ipcRenderer.invoke("transcode:start-batch", payload),
  pauseBatch: () => ipcRenderer.invoke("transcode:pause-batch"),
  resumeBatch: () => ipcRenderer.invoke("transcode:resume-batch"),
  cancelBatch: () => ipcRenderer.invoke("transcode:cancel-batch"),
  revealPath: (targetPath) => ipcRenderer.invoke("shell:reveal-path", targetPath),
  openPath: (targetPath) => ipcRenderer.invoke("shell:open-path", targetPath),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  isWindowMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  onJobUpdate: (listener) => on("transcode:job-update", listener),
  onBatchUpdate: (listener) => on("transcode:batch-update", listener),
  onSystemUsageUpdate: (listener) => on("system:usage-update", listener),
  onWindowMaximizedChange: (listener) => on("window:maximized-change", listener)
});
