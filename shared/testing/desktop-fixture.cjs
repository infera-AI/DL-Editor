// Only loaded by renderer-smoke.cjs. It never invokes the production main process.
const { contextBridge } = require("electron");
const listeners = new Map();
const calls = [];
const pendingUploads = new Map();
let expireRepositoryRequest = false;
const platform = process.argv.find(value => value.startsWith("--fixture-platform="))?.split("=")[1] || process.platform;
const token = "renderer-fixture-token";
const user = { id: "fixture-user", accountName: "fixture", permissions: [{ permissionKey: "research.access", enabled: true }] };
const job = {
  id: "fixture-job", path: "C:/fixture/2026_09_07_10_00_00.mp4", name: "2026_09_07_10_00_00.mp4",
  size: 1024 * 1024, duration: 60, fps: 30, width: 1920, height: 1080,
  status: "queued", modifiedAtMs: 1788746400000, startTimeMs: 1788746400000
};
const on = (channel, callback) => {
  const group = listeners.get(channel) || new Set();
  group.add(callback);
  listeners.set(channel, group);
  return () => group.delete(callback);
};
const emit = (channel, payload) => { for (const callback of listeners.get(channel) || []) callback(payload); };
const record = (method, payload) => calls.push({ method, payload });

localStorage.clear();
localStorage.setItem("dl-studio-theme", "light");
localStorage.setItem("dl-studio-auth", JSON.stringify({ token, refreshToken: "fixture-refresh", userId: user.id, accountName: "fixture" }));

contextBridge.exposeInMainWorld("dlEditor", {
  platform,
  getCapabilities: async () => ({ cpuModel: "Fixture CPU", logicalCores: 8, totalMemoryGb: 16, selectedGpuEncoder: "h264_nvenc", hardwareEncoders: ["h264_nvenc"], gpuNames: ["Fixture GPU"], outputDirectory: "C:/fixture/output" }),
  getUsage: async () => ({ cpu: { status: "ok", usage: 0 }, gpu: { status: "ok", total: 0 } }),
  selectVideos: async () => [job],
  getVideoMetadata: async filePath => ({ ...job, path: filePath, name: filePath.split("/").pop(), fps: filePath.includes("output") ? 2 : 30 }),
  selectOutputDirectory: async () => "C:/fixture/output",
  getMainLogPath: async () => "C:/fixture/main.log",
  writeLog: async () => ({ logged: true }),
  revealMainLog: async () => ({ opened: true }),
  checkForUpdates: async () => ({ status: "latest", currentVersion: "1.3.1", latestVersion: "1.3.1" }),
  requestInfera: async payload => {
    record("requestInfera", payload);
    const endpoint = payload.path;
    if (expireRepositoryRequest && endpoint.startsWith("/device/files")) {
      expireRepositoryRequest = false;
      throw new Error("请求失败 (401): fixture token expired");
    }
    if (endpoint === "/auth/refresh") return { token: "fixture-refreshed", refreshToken: "fixture-refresh", user };
    if (endpoint.startsWith("/auth/login")) return { token, refreshToken: "fixture-refresh", user };
    if (endpoint === "/users/me") return user;
    if (endpoint.includes("query-modes")) return { default_mode: "plain", modes: ["plain", "agent", "codex"].map(mode => ({ mode, label: mode, enabled: true, capabilities: { stream: true } })) };
    if (endpoint.includes("registry")) return { entries: [] };
    if (endpoint.includes("upload-duration-stats")) return { users: [], days: [], total_duration_seconds: 0 };
    return { items: [], sessions: [], total: 0, has_more: false };
  },
  requestEngine: async payload => { record("requestEngine", payload); return { status: "ok", hits: [] }; },
  getEngineMediaProxyUrl: async () => "",
  getEngineIndexContent: async () => ({ hits: [] }),
  streamConversation: async payload => {
    record("streamConversation", payload);
    emit(payload.streamId, { event: "delta", data: { text: "Fixture answer" } });
    emit(payload.streamId, { event: "final", data: { answer: "Fixture answer", evidences: [] } });
    emit(payload.streamId, { event: "done", data: {} });
  },
  onConversationStreamEvent: on,
  cancelConversationStream: async () => ({ cancelled: true }),
  streamResearchSimulation: async () => ({ ok: true }),
  onResearchSimulationStreamEvent: on,
  cancelResearchSimulationStream: async () => ({ cancelled: true }),
  streamEngineQa: async () => ({ ok: true }),
  onEngineQaStreamEvent: on,
  cancelEngineQaStream: async () => ({ cancelled: true }),
  startBatch: async payload => { record("startBatch", payload); emit("batch", { status: "started", total: 1 }); return { started: true }; },
  pauseBatch: async () => { emit("batch", { status: "started", paused: true }); return { paused: true }; },
  resumeBatch: async () => { emit("batch", { status: "started", paused: false, resumed: true }); return { resumed: true }; },
  cancelBatch: async () => { emit("batch", { status: "canceled" }); return { cancelRequested: true }; },
  uploadInferaVideo: payload => {
    record("uploadInferaVideo", payload);
    return new Promise(resolve => pendingUploads.set(payload.uploadId, resolve));
  },
  pauseInferaUpload: async () => ({ paused: true }),
  resumeInferaUpload: async () => ({ resumed: true }),
  cancelInferaUpload: async uploadId => {
    pendingUploads.get(uploadId)?.({ canceled: true });
    pendingUploads.delete(uploadId);
    return { canceled: true };
  },
  deleteLocalFile: async target => { record("deleteLocalFile", target); return { deleted: true }; },
  openPath: async () => ({ opened: true }), revealPath: async () => ({ opened: true }), openExternal: async () => ({ opened: true }),
  minimizeWindow: async () => {}, closeWindow: async () => {},
  toggleFullscreenWindow: async () => false, isWindowFullscreen: async () => false,
  setTitleBarTheme: async () => ({ applied: true }),
  onJobUpdate: callback => on("job", callback), onBatchUpdate: callback => on("batch", callback),
  onInferaUploadProgress: callback => on("upload", callback), onSystemUsageUpdate: callback => on("usage", callback),
  onWindowFullscreenChange: callback => on("fullscreen", callback)
});
contextBridge.exposeInMainWorld("rendererFixture", {
  calls: () => calls,
  emit,
  subscriptions: () => Object.fromEntries([...listeners].map(([channel, group]) => [channel, group.size])),
  expireNextRepositoryRequest: () => { expireRepositoryRequest = true; },
  finishUpload: () => {
    const first = pendingUploads.entries().next().value;
    if (!first) return false;
    pendingUploads.delete(first[0]);
    first[1]({ asset_id: "fixture-asset" });
    return true;
  }
});
