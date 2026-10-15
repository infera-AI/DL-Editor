// Only loaded by renderer-smoke.cjs. It never invokes the production main process.
const { contextBridge } = require("electron");
const listeners = new Map();
const calls = [];
const pendingUploads = new Map();
let expireRepositoryRequest = false;
const platform = process.argv.find(value => value.startsWith("--fixture-platform="))?.split("=")[1] || process.platform;
const token = "renderer-fixture-token";
const researchAgentsFixture = process.argv.includes("--fixture-research-agents");
const researchSimulationFixture = process.argv.includes("--fixture-research-simulation");
const simulationEnvironments = [];
const simulationSessions = [];
let simulationSequence = 0;
let simulationCancel = false;
const simulationContext = environment => ({ ...environment, tasks: { summary: { total: environment.taskRows.length }, tasks: environment.taskRows }, personal_context: { profile: [{ summary: "偏好从小步骤开始" }], activeTaskTitles: environment.taskRows.map(task => task.title) }, changes: environment.changes || [], context_read_at: "2026-10-15T12:00:00+08:00" });
function simulationRequest(payload) {
  const url = new URL(payload.path, "https://fixture.invalid");
  if (url.pathname === "/admin/research/users") return { items: [{ user_id: 20, nickname: "受试用户 20" }] };
  const path = url.pathname.match(/^\/admin\/research\/simulations\/users\/20\/(.*)$/)?.[1];
  if (!path) return undefined;
  const body = typeof payload.body === "string" ? JSON.parse(payload.body) : payload.body || {};
  if (path === "environments" && payload.method === "POST") {
    const environment = { environment_id: `environment-${++simulationSequence}`, title: `模拟环境 ${simulationSequence}`, version: 1, taskRows: [{ taskId: "original", title: "准备发布说明", currentStep: "打开发布文档", status: "PENDING" }], changes: [] };
    simulationEnvironments.unshift(environment); return environment;
  }
  if (path === "environments") return { items: simulationEnvironments };
  if (path.startsWith("environments/")) return simulationContext(simulationEnvironments.find(item => item.environment_id === path.split("/")[1]));
  if (path === "sessions" && payload.method === "POST") {
    const sessionCode = `simulation-${++simulationSequence}`;
    const candidateMessageId = `${sessionCode}-candidate-message`;
    const session = { session_code: sessionCode, assistant_kind: body.assistant_kind, environment_id: body.environment_id, messages: [{ id: candidateMessageId, role: "system", content: "TaskCandidateCard", content_kind: "CARD" }], cards: [{ card_id: `${sessionCode}-candidate-card`, message_id: candidateMessageId, card_type: "TaskCandidateCard", snapshot: { title: "候选任务：检查发布清单" }, state: "ACTIVE", available_actions: ["ACCEPT", "REJECT"] }], tool_invocations: [], reserved: JSON.stringify({ simulation_environment_id: body.environment_id }), update_time: "2026-10-15T12:00:00+08:00" };
    simulationSessions.unshift(session); return session;
  }
  if (path === "sessions") return { items: simulationSessions.filter(item => item.environment_id === url.searchParams.get("environment_id") && item.assistant_kind === url.searchParams.get("assistant_kind")) };
  const session = simulationSessions.find(item => item.session_code === path.split("/")[1]);
  if (path.endsWith("/cancel")) { simulationCancel = true; return { accepted: true }; }
  if (path.includes("/cards/") && path.endsWith("/actions")) {
    const card = session.cards.find(item => item.card_id === path.split("/")[3]);
    card.available_actions = []; card.state = "RESOLVED"; card.version += 1;
    card.action_outcome = { action: body.action };
    const environment = simulationEnvironments.find(item => item.environment_id === session.environment_id);
    if (body.action === "ACCEPT") {
      environment.taskRows.push({ taskId: `created-${simulationSequence}`, title: "Dario 创建的沙盒任务", status: "PENDING" });
      session.messages.push({ id: ++simulationSequence, role: "assistant", answered_by: "dario", content: "已在沙盒里创建任务，可以说撤销。" });
    } else if (body.action === "CONFIRM") {
      environment.taskRows = environment.taskRows.filter(item => item.taskId !== "original");
      session.messages.push({ id: ++simulationSequence, role: "assistant", content: "沙盒任务已删除。" });
    } else session.messages.push({ id: ++simulationSequence, role: "assistant", content: "已取消这次操作。" });
    return session;
  }
  return session;
}
const researchChats = [
  { id: 1, session_code: "laura-session", assistant_kind: "laura", title: "找回上次讨论的发布计划", user_id: 10, session_kind: "HISTORY", query_mode: "plain", status: "ACTIVE", source_type: "app", update_time: "2026-10-15T09:30:00+08:00", message_count: 3,
    messages: [{ id: 1, role: "user", content: "让 Jane 查一下，上次我们怎么安排发布的？", create_time: "2026-10-15T09:30:00+08:00" }, { id: 2, public_message_id: "handoff-message", role: "system", content: "交给 Jane 查找这段记忆", create_time: "2026-10-15T09:30:01+08:00" }, { id: 3, role: "assistant", answered_by: "jane", content: "上次讨论确定先完成回归，再准备发布说明。", create_time: "2026-10-15T09:30:02+08:00" }],
    cards: [{ card_id: "handoff-card", message_id: "handoff-message", card_type: "AgentHandoffCard", state: "RESOLVED", snapshot: { title: "交给 Jane 回答", target: "jane" }, action_outcome: { action: "ACCEPT" } }],
    tool_invocations: [{ invocationId: "handoff-1", toolName: "laura_handoff", state: "SUCCEEDED", input: { target: "jane" } }] },
  { id: 2, session_code: "dario-session", assistant_kind: "dario", title: "把发布准备拆成小步骤", user_id: 10, message_count: 1, messages: [{ id: 4, role: "assistant", content: "先打开回归清单，核对第一项。" }] },
  { id: 3, session_code: "jane-session", assistant_kind: "jane", title: "查找昨天的会议记录", user_id: 10, message_count: 1, messages: [{ id: 5, role: "assistant", content: "昨天的会议中讨论了三个发布前需要完成的检查。", feedback_rating: "like" }] },
  { id: 4, session_code: "bella-session", assistant_kind: "bella", title: "今天有些难以开始", user_id: 10, message_count: 1, messages: [{ id: 6, role: "assistant", content: "我在。我们可以先从一个很小的动作开始。" }] },
  { id: 5, session_code: "legacy-session", title: "早期记忆问答", user_id: 10, message_count: 1, query_mode: "agent", messages: [{ id: 7, role: "assistant", content: "历史回答，没有保存 agent 身份。" }] }
];
researchChats[0].messages.push(
  { id: 80, role: "system", content: "TaskCandidateCard", content_kind: "CARD" },
  { id: 81, role: "system", content: "GeneratedSuggestionCard", content_kind: "CARD" },
  { id: 82, role: "system", content: "TaskCandidateCard", content_kind: "CARD" }
);
researchChats[0].cards.push(
  { card_id: "candidate-card", message_id: 80, card_type: "TaskCandidateCard", state: "ACTIVE", snapshot: { title: "候选任务：核对发布清单" } },
  { cardId: "candidate-card-by-object", messageId: 81, cardType: "GeneratedSuggestionCard", objectType: "TaskCandidate", state: "RESOLVED", snapshot: { title: "候选任务：整理会议纪要" } }
);
researchChats[0].message_count = researchChats[0].messages.length;
researchChats[4].messages.push(...Array.from({ length: 20 }, (_, index) => ({ id: 100 + index, role: "system", content: "TaskCandidateCard", source_type: "conversation_projection" })));
researchChats[4].message_count = researchChats[4].messages.length;
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
  checkForUpdates: async () => ({ status: "latest", currentVersion: "1.4.0", latestVersion: "1.4.0" }),
  requestInfera: async payload => {
    record("requestInfera", payload);
    const endpoint = payload.path;
    if (researchSimulationFixture) { const result = simulationRequest(payload); if (result !== undefined) return JSON.parse(JSON.stringify(result)); }
    if (expireRepositoryRequest && endpoint.startsWith("/device/files")) {
      expireRepositoryRequest = false;
      throw new Error("请求失败 (401): fixture token expired");
    }
    if (endpoint === "/auth/refresh") return { token: "fixture-refreshed", refreshToken: "fixture-refresh", user };
    if (endpoint.startsWith("/auth/login")) return { token, refreshToken: "fixture-refresh", user };
    if (endpoint === "/users/me") return user;
    if (researchAgentsFixture && endpoint.startsWith("/admin/research/chats/export")) return { base64: "UEs=", filename: "fixture.zip" };
    if (researchAgentsFixture && endpoint.startsWith("/admin/research/chats")) {
      const agent = new URL(endpoint, "https://fixture.invalid").searchParams.get("assistant_kind");
      if (agent === "laura") await new Promise(resolve => setTimeout(resolve, 180));
      const items = researchChats.filter(item => !agent || (item.assistant_kind || "legacy") === agent);
      return { items, total: items.length, agent_filtering: true, agent_counts: { laura: 1, dario: 1, jane: 1, bella: 1, legacy: 1 } };
    }
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
  streamResearchSimulation: async payload => {
    record("streamResearchSimulation", payload);
    if (!researchSimulationFixture) return { ok: true };
    const body = typeof payload.body === "string" ? JSON.parse(payload.body) : payload.body;
    const code = payload.path.match(/sessions\/([^/]+)/)[1];
    const session = simulationSessions.find(item => item.session_code === code);
    const environment = simulationEnvironments.find(item => item.environment_id === session.environment_id);
    const id = ++simulationSequence;
    session.latest_question = body.question_text;
    session.messages.push({ id, role: "user", content: body.question_text, reserved: JSON.stringify({ research_context: simulationContext(environment) }) });
    simulationCancel = false;
    if (body.question_text.includes("慢一点")) await new Promise(resolve => setTimeout(resolve, 800));
    let answer = simulationCancel ? "已停止回复" : `${session.assistant_kind} 的模拟回答`;
    if (!simulationCancel && body.question_text.includes("撤销")) { environment.taskRows.pop(); answer = "已撤销沙盒操作。"; }
    else if (!simulationCancel && (body.question_text.includes("转交") || body.question_text.includes("删除"))) {
      const handoff = body.question_text.includes("转交");
      const messageId = `card-message-${id}`;
      session.messages.push({ id: messageId, public_message_id: messageId, role: "system", content: handoff ? "AgentHandoffCard" : "TaskOperationConfirmCard", content_kind: "CARD" });
      session.cards.push({ card_id: `card-${id}`, message_id: messageId, card_type: handoff ? "AgentHandoffCard" : "TaskOperationConfirmCard", snapshot: { summary: handoff ? "交给 Dario 创建一个沙盒任务" : "删除任务：准备发布说明" }, state: "ACTIVE", version: 1, available_actions: handoff ? ["ACCEPT", "DECLINE"] : ["CONFIRM", "CANCEL"] });
      answer = handoff ? "要转交给 Dario 吗？" : "确认后我会删除沙盒任务。";
    }
    session.messages.push({ id: ++simulationSequence, role: "assistant", content: answer });
    emit(payload.streamId, { event: "delta", data: { text: answer } });
    emit(payload.streamId, { event: "done", data: { session: JSON.parse(JSON.stringify(session)) } });
    return { ok: true };
  },
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
