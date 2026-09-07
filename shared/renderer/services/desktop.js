import packageJson from "@platform/package";

const dlEditor = window.dlEditor || {
  platform: navigator.platform?.toLowerCase().includes("win") ? "win32" : navigator.platform?.toLowerCase().includes("mac") ? "darwin" : "browser",
  selectVideos: async () => [],
  getVideoMetadata: async () => null,
  selectOutputDirectory: async () => null,
  getCapabilities: async () => ({
    cpuModel: "CPU",
    logicalCores: navigator.hardwareConcurrency || 1,
    totalMemoryGb: 0,
    selectedEncoder: "libx264",
    selectedGpuEncoder: "libx264",
    cpuEncoder: "libx264",
    hardwareEncoders: [],
    gpuNames: [],
    outputDirectory: "Videos/DL Studio Outputs"
  }),
  getUsage: async () => ({
    cpu: { status: "ok", usage: 0 },
    gpu: { status: "unavailable", total: null, videoEncode: null, threeD: null, compute: null }
  }),
  startBatch: async () => ({ started: true }),
  pauseBatch: async () => ({ paused: true }),
  resumeBatch: async () => ({ paused: false }),
  cancelBatch: async () => ({ cancelRequested: true }),
  getMainLogPath: async () => "",
  writeLog: async () => ({ logged: false }),
  revealMainLog: async () => ({ opened: false }),
  checkForUpdates: async () => ({ status: "latest", currentVersion: packageJson.version, latestVersion: packageJson.version }),
  getEngineMediaProxyUrl: async () => "",
  streamEngineQa: async () => ({ ok: false }),
  cancelEngineQaStream: async () => ({ cancelled: false }),
  onEngineQaStreamEvent: () => () => undefined,
  getEngineIndexContent: async () => null,
  uploadInferaVideo: async () => ({}),
  cancelInferaUpload: async () => ({ canceled: false }),
  pauseInferaUpload: async () => ({ paused: false }),
  resumeInferaUpload: async () => ({ resumed: false }),
  deleteLocalFile: async () => ({ deleted: false }),
  openPath: async () => undefined,
  openExternal: async () => undefined,
  revealPath: async () => undefined,
  minimizeWindow: async () => undefined,
  toggleFullscreenWindow: async () => false,
  closeWindow: async () => undefined,
  isWindowFullscreen: async () => false,
  setTitleBarTheme: async () => ({ applied: false }),
  onJobUpdate: () => () => undefined,
  onBatchUpdate: () => () => undefined,
  onInferaUploadProgress: () => () => undefined,
  onSystemUsageUpdate: () => () => undefined,
  onWindowFullscreenChange: () => () => undefined
};

export { dlEditor };
