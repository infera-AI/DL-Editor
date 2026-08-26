import {
  Activity,
  Archive,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Clock3,
  Cloud,
  Cpu,
  Download,
  Ellipsis,
  FileAudio,
  FileSearch,
  FileVideo,
  Folder,
  FolderOpen,
  Gauge,
  HardDrive,
  Info,
  LayoutGrid,
  List,
  ListVideo,
  LockKeyhole,
  Mail,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  SquareCheck,
  Sun,
  Timer,
  Trash2,
  TriangleAlert,
  Upload,
  UserRound,
  Video,
  Zap
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import packageJson from "../../package.json";
import appIconUrl from "../../build/icon.svg";

const APP_NAME = "DL Studio";
const THEME_STORAGE_KEY = "dl-studio-theme";
const LEGACY_THEME_STORAGE_KEY = "dl-editor-theme";
const AUTH_STORAGE_KEY = "dl-studio-auth";
const AUTOMATION_STORAGE_KEY = "dl-studio-editor-automation";
const TRANSFER_QUEUE_STORAGE_KEY = "dl-studio-transfer-queue";
const INFERA_API_BASE_URL = import.meta.env.VITE_INFERA_API_BASE_URL || "https://api.infera.cn/api/infera";
const DL_ENGINE_API_BASE_URL = import.meta.env.VITE_DL_ENGINE_API_BASE_URL || "http://127.0.0.1:8787";
const WEB_VIDEO_UPLOAD_PATH = "/memory/assets/web-video/events";
const RAW_DATA_LIST_PATH = "/memory/raw-data";
const RAW_DATA_VIDEO_UPLOAD_PATH = "/memory/raw-data/videos";
const DELPHI_UPLOAD_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const DELPHI_UPLOAD_FILE_NAME_PATTERN = /^\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.mp4$/i;
const DELPHI_UPLOAD_VALIDATION_MESSAGES = {
  size: "文件需小于 2GB，请压制后上传。如需上传备份视频，请使用右侧按钮添加。",
  name: "请检查是否为压制后视频，文件名需为 yyyy_mm_dd_hh_mm_ss.mp4"
};
const CLOUD_REPOSITORY_PAGE_SIZE = 100;
const CLOUD_REPOSITORY_MAX_PAGES = 1000;
const CLOUD_REPOSITORY_DEFAULT_MEDIA_FILTER_ID = "all";
const CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID = "all_status";
const NAV_ITEMS = ["Editor", "Cloud", "Delphi", "Engine", "Research"];
const ENGINE_PASSWORD = "111111";
const RESEARCH_PAGE_SIZE = 100;
const RESEARCH_SIGNED_URL_CACHE_TTL_MS = 20 * 60 * 1000;
const RESEARCH_SIGNED_URL_CACHE_MAX = 600;
const RESEARCH_SIGNED_URL_CONCURRENCY = 8;
const INFERA_AUTH_EXPIRED_MESSAGE = "登录已过期，请重新登录";
const CONVERSATION_QUERY_MODES = new Set(["agent", "plain"]);
const RESEARCH_RESOURCE_STATUSES = [
  { id: "", label: "All statuses" },
  { id: "PARSED", label: "PARSED" },
  { id: "FALLBACK_PARSED", label: "FALLBACK_PARSED" },
  { id: "PARTIAL_PARSED", label: "PARTIAL_PARSED" },
  { id: "FAILED", label: "FAILED" }
];
const researchSignedUrlCache = new Map();
const researchSignedUrlQueue = [];
let researchSignedUrlActiveCount = 0;
let inferaAuthController = null;
let inferaRefreshPromise = null;
const DEFAULT_AUTOMATION_OPTIONS = {
  autoUpload: true,
  autoBackup: true,
  autoClearLocal: true
};
const FPS_PRESETS = [1, 2, 4, 5, 10];
const RESOLUTION_PRESETS = [
  { label: "1080p", width: 1920, height: 1080 },
  { label: "720p", width: 1280, height: 720 },
  { label: "480p", width: 854, height: 480 },
  { label: "360p", width: 640, height: 360 }
];

const STATUS_LABELS = {
  queued: "等待",
  processing: "处理中",
  done: "完成",
  error: "压制失败",
  canceled: "取消",
  paused: "暂停"
};

const CLOUD_FILTERS = [
  { id: "all", label: "全部文件" },
  { id: "video", label: "视频" },
  { id: "audio", label: "音频" },
  { id: "all_status", label: "全部状态" },
  { id: "parsed", label: "已解析" },
  { id: "processing", label: "处理中" },
  { id: "failed", label: "解析失败" }
];
const CLOUD_VIEW_MODES = ["list", "grid"];
const CLOUD_SPACES = [
  { id: "repository", label: "DL Repository" },
  { id: "rawdata", label: "DL Rawdata" }
];
const ENGINE_HEALTH_RETRY_MS = 3000;
const ENGINE_INDEX_QUERY = "*";
const ENGINE_INDEX_HITS = 100;
const UPLOAD_STATUS_LABELS = {
  queued: "等待上传",
  uploading: "上传中",
  processing: "服务器处理中",
  done: "完成",
  error: "传输失败",
  upload_error: "上传失败",
  backup_error: "备份失败",
  canceled: "已取消",
  canceling: "取消中",
  paused: "已暂停"
};

const APP_INFO = {
  name: "DL Studio",
  version: packageJson.version,
  updatedAt: "2026-08-25",
  engine: "FFmpeg / FFprobe",
  stack: "Electron + React"
};

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

function logRendererEvent(message, details = {}, level = "info") {
  try {
    void dlEditor.writeLog?.({ details, level, message });
  } catch {
    // Renderer logging must never block UI state updates.
  }
}

const EMAIL_IDENTIFIER_PATTERN = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/;
const PHONE_IDENTIFIER_PATTERN = /^\+?\d{6,20}$/;

function readStoredAuth() {
  try {
    const stored = window.localStorage?.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function readStoredAutomationOptions() {
  try {
    const stored = window.localStorage?.getItem(AUTOMATION_STORAGE_KEY);
    return { ...DEFAULT_AUTOMATION_OPTIONS, ...(stored ? JSON.parse(stored) : {}) };
  } catch {
    return DEFAULT_AUTOMATION_OPTIONS;
  }
}

function readStoredTransferQueue() {
  try {
    const stored = window.localStorage?.getItem(TRANSFER_QUEUE_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStoredTransferTask).filter(Boolean);
  } catch {
    return [];
  }
}

function writeStoredTransferQueue(queue) {
  try {
    const tasks = Array.isArray(queue) ? queue.map(normalizeStoredTransferTask).filter(Boolean) : [];
    window.localStorage?.setItem(TRANSFER_QUEUE_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // localStorage can be unavailable or full; the live queue should keep working.
  }
}

function normalizeStoredTransferTask(task) {
  if (!task || typeof task !== "object") return null;
  if (task.kind !== "upload" && task.kind !== "backup") return null;
  if (!task.id || !task.uploadPath) return null;
  if (task.status === "done") return null;
  if (task.status === "canceling") return null;
  if (task.status === "canceled") return null;

  const activeStatuses = new Set(["uploading", "processing", "paused"]);
  const failedStatuses = new Set(["upload_error", "backup_error", "error"]);
  const status = activeStatuses.has(task.status)
    ? "queued"
    : task.status === "queued" || failedStatuses.has(task.status)
      ? task.status
      : "queued";
  const isQueuedFromActive = activeStatuses.has(task.status);

  return {
    ...task,
    activeUploadId: "",
    bytesUploaded: status === "queued" ? 0 : Number(task.bytesUploaded) || 0,
    completedAt: status === "queued" ? null : task.completedAt || null,
    elapsedMs: status === "queued" ? 0 : Number(task.elapsedMs) || 0,
    message: isQueuedFromActive ? "等待上传" : task.message || (status === "queued" ? "等待上传" : ""),
    percent: status === "queued" ? 0 : clampPercent(task.percent),
    speedBytesPerSecond: 0,
    status,
    totalBytes: Number(task.totalBytes) || 0
  };
}

function inferIdentifierType(identifier) {
  const value = String(identifier || "").trim();
  if (EMAIL_IDENTIFIER_PATTERN.test(value)) return "email";
  if (PHONE_IDENTIFIER_PATTERN.test(value)) return "phone";
  return "";
}

function getAuthenticationErrorMessage(error, fallback) {
  const message = String(error?.message || "").trim();
  if (/Account already exists/i.test(message)) return "该账号已注册，请直接登录";
  if (/Invalid account or password/i.test(message)) return "账号或密码错误";
  if (/Invalid account or verification token/i.test(message)) return "邮箱或验证码错误";
  if (/User is disabled/i.test(message)) return "该账号已停用";
  if (/verification code was sent too recently/i.test(message)) return "验证码发送过于频繁，请稍后重试";
  if (/verification code is invalid or expired/i.test(message)) return "验证码错误或已过期，请重新获取";
  if (/verification token is invalid or expired/i.test(message)) return "验证码验证已过期，请重新获取";
  if (/Identifier cannot be blank|Type cannot be blank/i.test(message)) return "请输入有效的邮箱或手机号";
  if (/Password cannot be blank/i.test(message)) return "请输入密码";
  return message || fallback;
}

function unwrapInferaResult(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if (payload.success === false) {
    throw new Error(payload.message || "请求失败");
  }

  if ("result" in payload) {
    return payload.result;
  }

  if ("data" in payload) {
    return payload.data;
  }

  return payload;
}

function resolveInferaUrl(value) {
  if (!value) return "";
  const rawPath = String(value);
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  if (/^\/?admin\//i.test(rawPath)) {
    try {
      const apiUrl = new URL(INFERA_API_BASE_URL);
      return new URL(rawPath.replace(/^\/+/, ""), `${apiUrl.origin}/`).toString();
    } catch {
      return rawPath;
    }
  }

  const normalizedBase = INFERA_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = rawPath.replace(/^\/+/, "");
  try {
    return new URL(normalizedPath, `${normalizedBase}/`).toString();
  } catch {
    return rawPath;
  }
}

function createInferaHttpError(status, detail) {
  const statusCode = Number(status) || 0;
  const normalizedDetail = typeof detail === "string" ? detail.trim() : detail ? JSON.stringify(detail) : "";
  const message = normalizedDetail.includes(`(${statusCode})`)
    ? normalizedDetail
    : `请求失败 (${statusCode})${normalizedDetail ? `：${normalizedDetail}` : ""}`;
  const error = new Error(message);
  error.status = statusCode;
  return error;
}

function isInferaUnauthorizedError(error) {
  return Number(error?.status || error?.statusCode) === 401 || /\(401\)/.test(String(error?.message || ""));
}

function isInferaAuthEndpoint(path) {
  return /^\/?auth\/(?:login(?:\/email)?|register(?:\/email)?|refresh)\/?(?:\?|$)/i.test(String(path || ""));
}

function setInferaAuthController(controller) {
  inferaAuthController = controller;
  return () => {
    if (inferaAuthController === controller) {
      inferaAuthController = null;
    }
  };
}

function expireInferaAuth() {
  const error = new Error(INFERA_AUTH_EXPIRED_MESSAGE);
  error.status = 401;
  inferaAuthController?.onExpired?.(error);
  return error;
}

function mergeRefreshedInferaAuth(currentAuth, result) {
  const refreshed = normalizeAuthPayload(result, currentAuth?.accountName || "");
  if (!refreshed.token || !refreshed.refreshToken) {
    throw createInferaHttpError(401, "刷新响应缺少 token");
  }
  return {
    ...currentAuth,
    ...refreshed,
    accountName: refreshed.accountName || currentAuth?.accountName || "",
    displayName: refreshed.displayName || currentAuth?.displayName || "",
    phone: refreshed.phone || currentAuth?.phone || "",
    email: refreshed.email || currentAuth?.email || "",
    nickname: refreshed.nickname || currentAuth?.nickname || "",
    avatar: refreshed.avatar || currentAuth?.avatar || ""
  };
}

async function refreshInferaAuth() {
  if (inferaRefreshPromise) {
    return inferaRefreshPromise;
  }

  const currentAuth = inferaAuthController?.getAuth?.();
  if (!currentAuth?.refreshToken) {
    throw expireInferaAuth();
  }

  const operation = (async () => {
    try {
      const result = await requestInferaRaw("/auth/refresh", {
        method: "POST",
        body: { refreshToken: currentAuth.refreshToken }
      });
      const nextAuth = mergeRefreshedInferaAuth(currentAuth, result);
      inferaAuthController?.onRefreshed?.(nextAuth, currentAuth);
      return nextAuth;
    } catch (error) {
      if (isInferaUnauthorizedError(error)) {
        throw expireInferaAuth();
      }
      const refreshError = new Error(`登录状态刷新失败：${error.message || "请检查网络后重试"}`);
      inferaAuthController?.onRefreshError?.(refreshError);
      throw refreshError;
    }
  })();

  inferaRefreshPromise = operation;
  try {
    return await operation;
  } finally {
    if (inferaRefreshPromise === operation) {
      inferaRefreshPromise = null;
    }
  }
}

async function requestInfera(path, options = {}) {
  const currentAuth = inferaAuthController?.getAuth?.();
  const suppliedToken = options.token;
  const effectiveToken = suppliedToken && currentAuth?.token ? currentAuth.token : suppliedToken;

  try {
    return await requestInferaRaw(path, { ...options, token: effectiveToken });
  } catch (error) {
    if (!suppliedToken || isInferaAuthEndpoint(path) || !isInferaUnauthorizedError(error)) {
      throw error;
    }

    const nextAuth = await refreshInferaAuth();
    try {
      return await requestInferaRaw(path, { ...options, token: nextAuth.token });
    } catch (retryError) {
      if (isInferaUnauthorizedError(retryError)) {
        throw expireInferaAuth();
      }
      throw retryError;
    }
  }
}

async function requestInferaRaw(path, { accept, method = "GET", token, body, responseType = "json", signal } = {}) {
  if (typeof dlEditor.requestInfera === "function") {
    const result = await dlEditor.requestInfera({ accept, path, method, token, body, responseType });
    return responseType === "download" ? result : unwrapInferaResult(result);
  }

  const headers = { Accept: accept || (responseType === "download" ? "application/json, application/zip" : "application/json") };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(resolveInferaUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: responseType === "redirect" ? "manual" : "follow",
    signal
  });

  if (responseType === "redirect") {
    if (!response.ok && (response.status < 300 || response.status >= 400)) {
      let detail = "";
      try {
        const text = await response.text();
        const payload = text ? JSON.parse(text) : null;
        detail = payload?.message || payload?.detail || text;
      } catch {
        detail = "";
      }
      throw createInferaHttpError(response.status, detail);
    }
    const location = response.headers.get("location");
    if (location) {
      return { url: new URL(location, resolveInferaUrl(path)).toString() };
    }
    if (response.redirected || response.url) {
      return { url: response.url };
    }
    return { url: resolveInferaUrl(path) };
  }

  if (responseType === "download") {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (!response.ok) {
        const detail = payload?.message || payload?.detail || `请求失败 (${response.status})`;
        throw createInferaHttpError(response.status, detail);
      }
      return payload;
    }
    const blob = await response.blob();
    if (!response.ok) {
      throw createInferaHttpError(response.status, "");
    }
    return {
      blob,
      content_type: contentType || "application/zip",
      delivery: "direct",
      filename: getResearchDownloadFilename(response.headers.get("content-disposition")),
      size_bytes: blob.size
    };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.detail || `请求失败 (${response.status})`;
    throw createInferaHttpError(response.status, detail);
  }

  return unwrapInferaResult(payload);
}

function resolveEngineUrl(value) {
  if (!value) return "";
  const rawPath = String(value);
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const normalizedBase = DL_ENGINE_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = rawPath.replace(/^\/+/, "");
  try {
    return new URL(normalizedPath, `${normalizedBase}/`).toString();
  } catch {
    return rawPath;
  }
}

async function requestEngine(path, { method = "GET", body, signal } = {}) {
  if (typeof dlEditor.requestEngine === "function") {
    return dlEditor.requestEngine({ path, method, body });
  }

  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(resolveEngineUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.detail || payload?.title || text || `DL Engine 请求失败 (${response.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return payload;
}

function createEngineQaStreamId() {
  return `qa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function streamEngineQa(body, onEvent) {
  if (
    typeof dlEditor.streamEngineQa === "function" &&
    typeof dlEditor.onEngineQaStreamEvent === "function"
  ) {
    const streamId = createEngineQaStreamId();
    const unsubscribe = dlEditor.onEngineQaStreamEvent(streamId, onEvent);
    try {
      await dlEditor.streamEngineQa({ streamId, body });
    } finally {
      unsubscribe?.();
    }
    return;
  }

  const response = await requestEngine("/v1/qa", {
    method: "POST",
    body: { ...body, response_mode: "json" }
  });
  onEvent({
    event: "answer_start",
    data: {
      index_watermark: response?.index_watermark,
      plan: response?.plan,
      query_id: response?.query_id
    }
  });
  onEvent({ event: "search.plan", data: response?.plan || null });
  onEvent({ event: "citations", data: response?.citations || [] });
  onEvent({ event: "evidence_reasoning", data: response?.evidence_reasoning || [] });
  onEvent({ event: "retrieval_results", data: response?.retrieval_results || [] });
  onEvent({
    event: "done",
    data: {
      answer: response?.answer || "",
      confidence: response?.confidence,
      evidence_reasoning: response?.evidence_reasoning || [],
      retrieval_results: response?.retrieval_results || [],
      refined: response?.refined || false
    }
  });
}

function mergeEngineQaResponse(currentResponse, patch) {
  return { ...(currentResponse || {}), ...patch };
}

function nonEmptyEngineAnswer(value) {
  return typeof value === "string" && value.trim() ? value : "";
}

function normalizeAuthPayload(result, fallbackAccountName = "") {
  const user = result?.user || result?.profile || {};

  return {
    token: result?.token || "",
    refreshToken: result?.refreshToken || result?.refresh_token || "",
    userId: result?.userId || result?.user_id || user?.userId || user?.user_id || user?.id || "",
    accountName:
      result?.accountName ||
      result?.account_name ||
      result?.account ||
      result?.username ||
      user?.accountName ||
      user?.account_name ||
      user?.account ||
      user?.username ||
      fallbackAccountName ||
      "",
    displayName:
      result?.displayName ||
      result?.display_name ||
      result?.name ||
      user?.displayName ||
      user?.display_name ||
      user?.name ||
      "",
    phone: result?.phone || user?.phone || "",
    email: result?.email || user?.email || "",
    nickname: result?.nickname || user?.nickname || "",
    avatar: result?.avatar || user?.avatar || "",
    exist: Boolean(result?.exist),
    password: Boolean(result?.password)
  };
}

async function loginToInfera({ identifier, password }) {
  const value = String(identifier || "").trim();
  const identifierType = inferIdentifierType(value);
  return requestInfera("/auth/login", {
    method: "POST",
    body: {
      type: identifierType,
      identifier: identifierType === "email" ? value.toLowerCase() : value,
      password
    }
  });
}

async function loginToInferaWithEmailCode({ email, verificationToken }) {
  return requestInfera("/auth/login/email/", {
    method: "POST",
    body: {
      email: String(email || "").trim().toLowerCase(),
      verificationToken
    }
  });
}

async function sendEmailVerificationCode(email, purpose) {
  return requestInfera("/verification/codes", {
    method: "POST",
    body: {
      account: String(email || "").trim().toLowerCase(),
      purpose,
      channel: "email"
    }
  });
}

async function createEmailVerificationToken(email, code, purpose) {
  return requestInfera("/verification/tokens", {
    method: "POST",
    body: {
      account: String(email || "").trim().toLowerCase(),
      purpose,
      channel: "email",
      code: String(code || "").trim()
    }
  });
}

async function registerWithInfera({ email, password, verificationToken }) {
  return requestInfera("/auth/register/email/", {
    method: "POST",
    body: {
      email: String(email || "").trim().toLowerCase(),
      password,
      verificationToken
    }
  });
}

async function fetchCurrentUser(token) {
  return requestInfera("/users/me", { token });
}

function hasResearchAccess(user) {
  return (Array.isArray(user?.permissions) ? user.permissions : []).some((permission) => {
    const key = String(permission?.permissionKey || permission?.permission_key || "").trim().toLowerCase();
    return key === "research.access" && permission?.enabled === true;
  });
}

async function fetchCloudRepository(token, spaceId = CLOUD_SPACES[0].id, options = {}) {
  const items = [];
  let total = null;
  let hasMore = true;
  let cursor = null;
  let offset = 0;
  let pageCount = 0;
  const endpoint = spaceId === "rawdata" ? RAW_DATA_LIST_PATH : "/device/files";
  const dateKey = typeof options.dateKey === "string" && spaceId !== "rawdata" ? options.dateKey : "";
  const filterId = typeof options.filterId === "string" && spaceId !== "rawdata" ? options.filterId : "all";

  while (hasMore && pageCount < CLOUD_REPOSITORY_MAX_PAGES) {
    const result = await requestInfera(buildCloudRepositoryPagePath(endpoint, { cursor, dateKey, filterId, offset }), { token });
    const pageItems = normalizeCloudItems(result);
    items.push(...pageItems);
    total = Number.isFinite(Number(result?.total)) ? Number(result.total) : total;
    hasMore = Boolean(result?.has_more);
    cursor = result?.next_cursor || null;
    offset = Number.isFinite(Number(result?.next_offset)) ? Number(result.next_offset) : offset + pageItems.length;

    if (!hasMore || (!cursor && !Number.isFinite(Number(result?.next_offset)))) {
      hasMore = false;
    }

    pageCount += 1;
  }

  return {
    items,
    total: total ?? items.length,
    hasMore,
    nextCursor: cursor
  };
}

function buildCloudRepositoryPagePath(endpoint, { cursor = null, dateKey = "", filterId = "all", offset = 0 } = {}) {
  const params = new URLSearchParams({
    include_page: "true",
    limit: String(CLOUD_REPOSITORY_PAGE_SIZE),
    page_mode: "cursor"
  });

  if (cursor) {
    params.set("cursor", cursor);
  } else if (offset > 0) {
    params.set("offset", String(offset));
  }

  const dayRange = endpoint === "/device/files" ? getCloudRepositoryDateRange(dateKey) : null;
  if (dayRange) {
    params.set("start_timestamp_ms", String(dayRange.startTimestampMs));
    params.set("end_timestamp_ms", String(dayRange.endTimestampMs));
  }

  const parseStatus = endpoint === "/device/files" ? getCloudRepositoryParseStatusParam(filterId) : "";
  if (parseStatus) {
    params.set("parse_status", parseStatus);
  }

  return `${endpoint}?${params.toString()}`;
}

function getCloudRepositoryParseStatusParam(filterId) {
  if (filterId === "parsed") {
    return "PARSED,FALLBACK_PARSED,PARTIAL_PARSED";
  }
  if (filterId === "processing") {
    return "PENDING,QUEUED,PREVIEW_READY,POSTPROCESSING,SPLITTING,PROCESSING,PARSING,RUNNING,REINDEX_REQUIRED";
  }
  if (filterId === "failed") {
    return "FAIL,FAILED,ERROR,PARSE_FAILED,PROCESSING_FAILED";
  }
  return "";
}

function getCloudRepositoryDateRange(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (!Number.isFinite(start.getTime()) || start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) {
    return null;
  }

  return {
    startTimestampMs: start.getTime(),
    endTimestampMs: start.getTime() + 24 * 60 * 60 * 1000
  };
}

function parseLocalDateBoundary(dateKey, endOfDay = false) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return NaN;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
  return date.getTime();
}

function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function shiftLocalDateKey(dateKey, offsetDays) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return getLocalDateKey();
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + offsetDays);
  return getLocalDateKey(date);
}

function normalizeCloudItems(result) {
  if (Array.isArray(result)) {
    return result;
  }

  const candidates = [result?.items, result?.archives, result?.raw_data, result?.rawData, result?.records, result?.list, result?.data];
  return candidates.find(Array.isArray) || [];
}

async function deleteRawDataArchive(token, item) {
  const rawDataId = getRawDataId(item);
  if (!rawDataId) {
    throw new Error("缺少 raw data id，无法删除");
  }

  return requestInfera(RAW_DATA_LIST_PATH, {
    method: "DELETE",
    token,
    body: {
      id: rawDataId,
      raw_data_id: rawDataId,
      raw_data_ids: [rawDataId]
    }
  });
}

function buildResearchPath(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  return `/admin/research${path}${query.toString() ? `?${query.toString()}` : ""}`;
}

function getResearchDateRangeParams(filters = {}) {
  const params = {};
  if (filters.from) {
    const start = parseLocalDateBoundary(filters.from, false);
    if (Number.isFinite(start)) {
      params.start_ms = start;
      params.date_start_ms = start;
    }
  }
  if (filters.to) {
    const end = parseLocalDateBoundary(filters.to, true);
    if (Number.isFinite(end)) {
      params.end_ms = end;
      params.date_end_ms = end;
    }
  }
  return params;
}

function getResearchListParams(filters = {}, options = {}) {
  const dateParams = getResearchDateRangeParams(filters);
  return {
    limit: options.limit || RESEARCH_PAGE_SIZE,
    offset: options.offset || 0,
    user_id: filters.userId || "",
    parse_status: options.includeStatus ? filters.status || "" : "",
    start_ms: dateParams.start_ms,
    end_ms: dateParams.end_ms,
    date_start_ms: dateParams.date_start_ms,
    date_end_ms: dateParams.date_end_ms
  };
}

async function fetchResearchUsers(token) {
  return requestInfera(buildResearchPath("/users"), { token });
}

async function fetchResearchResources(token, filters, options = {}) {
  const params = getResearchListParams(filters, { includeStatus: true, limit: options.limit, offset: options.offset });
  delete params.start_ms;
  delete params.end_ms;
  return requestInfera(buildResearchPath("/assets/videos", params), { token });
}

async function fetchResearchChats(token, filters, options = {}) {
  const params = getResearchListParams(filters, { limit: options.limit, offset: options.offset });
  delete params.parse_status;
  delete params.date_start_ms;
  delete params.date_end_ms;
  return requestInfera(buildResearchPath("/chats", params), { token });
}

async function fetchResearchStatistics(token) {
  return requestInfera(buildResearchPath("/upload-duration-stats", { timezone: "Asia/Shanghai" }), { token });
}

async function exportResearchResources(token, payload) {
  return requestInfera(buildResearchPath("/assets/videos/export"), {
    method: "POST",
    token,
    body: payload,
    responseType: "download"
  });
}

async function exportResearchChats(token, payload) {
  return requestInfera(buildResearchPath("/chats/export"), {
    method: "POST",
    token,
    body: payload,
    responseType: "download"
  });
}

async function fetchResearchExportCount(token, filters, maxAssets = 2000) {
  const params = getResearchListParams(filters, { includeStatus: true });
  delete params.limit;
  delete params.offset;
  delete params.start_ms;
  delete params.end_ms;
  params.max_assets = maxAssets;
  return requestInfera(buildResearchPath("/assets/videos/export-count", params), { token });
}

async function createResearchDailyExport(token, payload) {
  return requestInfera(buildResearchPath("/assets/videos/daily-exports"), {
    method: "POST",
    token,
    body: payload
  });
}

async function fetchResearchDailyExport(token, jobId) {
  return requestInfera(buildResearchPath(`/assets/videos/daily-exports/${encodeURIComponent(jobId)}`), { token });
}

async function fetchResearchSimulationSessions(token, subjectUserId) {
  return requestInfera(buildResearchPath(`/simulations/users/${encodeURIComponent(subjectUserId)}/sessions`), { token });
}

async function fetchResearchSimulationSession(token, subjectUserId, sessionCode) {
  return requestInfera(
    buildResearchPath(`/simulations/users/${encodeURIComponent(subjectUserId)}/sessions/${encodeURIComponent(sessionCode)}`),
    { token }
  );
}

function createResearchSimulationStreamId() {
  return `research-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function consumeInferaSseResponse(response, onEvent) {
  if (!response.body) throw new Error("Conversation stream returned no body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const dispatch = (block) => {
    if (!block.trim()) return;
    let eventName = "message";
    const dataLines = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return;
    const text = dataLines.join("\n");
    let data = { text };
    try { data = JSON.parse(text); } catch {}
    onEvent({ event: eventName, data });
  };
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || "";
    blocks.forEach(dispatch);
    if (done) break;
  }
  dispatch(buffer);
}

async function streamResearchSimulationInput(token, subjectUserId, sessionCode, body, onEvent) {
  const path = buildResearchPath(
    `/simulations/users/${encodeURIComponent(subjectUserId)}/sessions/${encodeURIComponent(sessionCode || "new")}/input/stream`
  );
  const attempt = async (accessToken) => {
    let streamError = null;
    const handleEvent = (message) => {
      const eventName = message?.event || "message";
      const data = message?.data || {};
      if (eventName === "error" || eventName === "stream_error") {
        streamError = new Error(data.message || "Unable to complete the Research simulation");
        return;
      }
      onEvent(message);
    };
    if (
      typeof dlEditor.streamResearchSimulation === "function" &&
      typeof dlEditor.onResearchSimulationStreamEvent === "function"
    ) {
      const streamId = createResearchSimulationStreamId();
      const unsubscribe = dlEditor.onResearchSimulationStreamEvent(streamId, handleEvent);
      try {
        await dlEditor.streamResearchSimulation({ streamId, path, token: accessToken, body });
      } finally {
        unsubscribe?.();
      }
      if (streamError) throw streamError;
      return;
    }

    const response = await fetch(resolveInferaUrl(path), {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const payload = JSON.parse(text);
        detail = payload?.message || payload?.detail || text;
      } catch {}
      throw createInferaHttpError(response.status, detail);
    }
    await consumeInferaSseResponse(response, handleEvent);
    if (streamError) throw streamError;
  };

  const currentAuth = inferaAuthController?.getAuth?.();
  const effectiveToken = currentAuth?.token || token;
  try {
    await attempt(effectiveToken);
  } catch (error) {
    if (!isInferaUnauthorizedError(error)) throw error;
    const nextAuth = await refreshInferaAuth();
    await attempt(nextAuth.token);
  }
}

function normalizeConversationQueryMode(queryMode) {
  return CONVERSATION_QUERY_MODES.has(queryMode) ? queryMode : "agent";
}

function buildConversationPath(path, queryMode) {
  const mode = normalizeConversationQueryMode(queryMode);
  return `${path}${String(path).includes("?") ? "&" : "?"}query_mode=${encodeURIComponent(mode)}`;
}

async function fetchConversationSessions(token, queryMode) {
  return requestInfera(buildConversationPath("/conversation/sessions", queryMode), { token });
}

async function fetchConversationSession(token, sessionCode, queryMode) {
  return requestInfera(
    buildConversationPath(`/conversation/sessions/${encodeURIComponent(sessionCode)}`, queryMode),
    { token }
  );
}

function createConversationStreamId(queryMode) {
  return `conversation-${normalizeConversationQueryMode(queryMode)}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createConversationRequestId(queryMode) {
  return `${normalizeConversationQueryMode(queryMode)}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function streamConversationInput(token, sessionCode, queryMode, body, onEvent) {
  const mode = normalizeConversationQueryMode(queryMode);
  const path = `/conversation/sessions/${encodeURIComponent(sessionCode || "new")}/input/mode/${mode}/stream`;
  const attempt = async (accessToken) => {
    let streamError = null;
    const handleEvent = (message) => {
      const eventName = message?.event || "message";
      const data = message?.data || {};
      if (eventName === "error" || eventName === "stream_error") {
        streamError = new Error(data.message || "对话请求失败");
        streamError.code = data.code || "";
        streamError.retryable = Boolean(data.retryable);
        return;
      }
      onEvent(message);
    };

    if (
      typeof dlEditor.streamConversation === "function" &&
      typeof dlEditor.onConversationStreamEvent === "function"
    ) {
      const streamId = createConversationStreamId(mode);
      const unsubscribe = dlEditor.onConversationStreamEvent(streamId, handleEvent);
      try {
        await dlEditor.streamConversation({ streamId, path, token: accessToken, body });
      } finally {
        unsubscribe?.();
      }
      if (streamError) throw streamError;
      return;
    }

    const response = await fetch(resolveInferaUrl(path), {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const payload = JSON.parse(text);
        detail = payload?.message || payload?.detail || text;
      } catch {}
      throw createInferaHttpError(response.status, detail);
    }
    await consumeInferaSseResponse(response, handleEvent);
    if (streamError) throw streamError;
  };

  const currentAuth = inferaAuthController?.getAuth?.();
  const effectiveToken = currentAuth?.token || token;
  try {
    await attempt(effectiveToken);
  } catch (error) {
    if (!isInferaUnauthorizedError(error)) throw error;
    const nextAuth = await refreshInferaAuth();
    await attempt(nextAuth.token);
  }
}

function getResearchDownloadFilename(disposition, fallback = "research-export.zip") {
  const text = String(disposition || "");
  const utf8Match = text.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  return text.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
}

async function resolveResearchSignedUrl(token, path) {
  if (!path) return "";
  const cacheKey = `${String(token || "").slice(-18)}:${path}`;
  const cached = researchSignedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise || cached.url || "";
  }

  const promise = enqueueResearchSignedUrlRequest(async () => {
    const result = await requestInfera(path, { token, responseType: "redirect" });
    return result?.url || "";
  })
    .then((url) => {
      researchSignedUrlCache.set(cacheKey, {
        expiresAt: Date.now() + RESEARCH_SIGNED_URL_CACHE_TTL_MS,
        url
      });
      trimResearchSignedUrlCache();
      return url;
    })
    .catch((error) => {
      researchSignedUrlCache.delete(cacheKey);
      throw error;
    });

  researchSignedUrlCache.set(cacheKey, {
    expiresAt: Date.now() + RESEARCH_SIGNED_URL_CACHE_TTL_MS,
    promise
  });
  trimResearchSignedUrlCache();
  return promise;
}

function enqueueResearchSignedUrlRequest(run) {
  return new Promise((resolve, reject) => {
    researchSignedUrlQueue.push({ reject, resolve, run });
    pumpResearchSignedUrlQueue();
  });
}

function pumpResearchSignedUrlQueue() {
  while (researchSignedUrlActiveCount < RESEARCH_SIGNED_URL_CONCURRENCY && researchSignedUrlQueue.length > 0) {
    const task = researchSignedUrlQueue.shift();
    researchSignedUrlActiveCount += 1;
    Promise.resolve()
      .then(task.run)
      .then(task.resolve, task.reject)
      .finally(() => {
        researchSignedUrlActiveCount = Math.max(0, researchSignedUrlActiveCount - 1);
        pumpResearchSignedUrlQueue();
      });
  }
}

function trimResearchSignedUrlCache() {
  if (researchSignedUrlCache.size <= RESEARCH_SIGNED_URL_CACHE_MAX) return;
  const overflow = researchSignedUrlCache.size - RESEARCH_SIGNED_URL_CACHE_MAX;
  let removed = 0;
  for (const key of researchSignedUrlCache.keys()) {
    researchSignedUrlCache.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

function useResearchLazyLoad(rootMargin = "360px") {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return undefined;
    const element = ref.current;
    if (!element) return undefined;
    if (typeof IntersectionObserver !== "function") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return [ref, visible];
}

async function fetchResearchParsedData(token, path) {
  if (!path) return null;
  return requestInfera(path, { token });
}

function getResearchResourceId(item) {
  return String(item?.asset_id || item?.id || "");
}

function getResearchChatId(item) {
  return String(item?.session_id || item?.id || "");
}

function getResearchItemTimestamp(item) {
  return Number(item?.timestamp_ms || item?.start_timestamp_ms || item?.["captured_at_ms"] || item?.created_at_ms || 0) || 0;
}

function isResearchAudio(item) {
  const type = String(item?.asset_type || item?.media_type || item?.mime || "").toLowerCase();
  return type.includes("audio");
}

function groupResearchResources(items) {
  const groups = new Map();
  for (const item of items || []) {
    const timestampMs = getResearchItemTimestamp(item);
    const fallbackDate = timestampMs ? getLocalDateKey(new Date(timestampMs)) : "unknown";
    const key = item.captured_date_key || fallbackDate;
    if (!groups.has(key)) {
      groups.set(key, {
        dateKey: key,
        dateLabel: item.captured_date_label || (key === "unknown" ? "Unknown date" : key),
        items: []
      });
    }
    groups.get(key).items.push(item);
  }
  return Array.from(groups.values()).sort((left, right) => String(right.dateKey).localeCompare(String(left.dateKey)));
}

function getResearchFeedbackMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).filter((message) => message.feedback_rating || message.feedback_text);
}

function normalizeResearchFeedbackRating(value) {
  const rating = String(value || "").toLowerCase();
  if (rating === "up" || rating === "like" || rating === "thumbs_up") return "like";
  if (rating === "down" || rating === "dislike" || rating === "thumbs_down") return "dislike";
  return rating;
}

function formatResearchDateTime(value) {
  const timestamp = Number(value || 0);
  if (!timestamp) return "";
  return formatRepositoryDate(timestamp);
}

function formatResearchShortTime(value) {
  const timestamp = Number(value || 0);
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatResearchLongDuration(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

function formatResearchNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function getRecentResearchDateKeys(days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return getLocalDateKey(date);
  });
}

function shortResearchDateKey(value) {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? `${parts[1]}-${parts[2]}` : value;
}

function getResearchUserLabel(user) {
  const userId = user?.user_id || user?.id || "-";
  const name = String(user?.nickname || user?.name || "").trim() || `User ${userId}`;
  const parsedCount = user?.parsed_asset_count ?? user?.parsed_video_count ?? 0;
  return `${name} (ID ${userId} · parsed ${formatResearchNumber(parsedCount)} · chats ${formatResearchNumber(user?.chat_session_count || 0)})`;
}

function getResearchEvidenceKind(evidence) {
  const type = String(evidence?.evidence_type || "").trim().toLowerCase();
  const mime = String(evidence?.mime || "").trim().toLowerCase();
  const variant = String(evidence?.metadata?.display_variant || "").trim().toLowerCase();
  const mediaUrl = String(evidence?.media_url || "").toLowerCase();
  if (mime.startsWith("image/") || ["image", "frame", "keyframe", "snapshot", "still"].includes(type) || variant.includes("frame")) return "image";
  if (mime.startsWith("audio/") || type === "audio" || /\.(mp3|m4a|ogg|opus|wav)(?:[?#]|$)/.test(mediaUrl)) return "audio";
  if (mime.startsWith("video/") || type === "video" || variant.includes("video") || /\.(mp4|mov|m4v|webm)(?:[?#]|$)/.test(mediaUrl)) return "video";
  return "text";
}

function formatResearchEvidenceOffset(value) {
  if (value === null || value === undefined || value === "") return "";
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getResearchEvidenceTimeLabel(evidence) {
  const metadataLabel = String(evidence?.metadata?.time_label || "").trim();
  if (metadataLabel) return metadataLabel;
  const start = formatResearchEvidenceOffset(evidence?.start_ms);
  const end = formatResearchEvidenceOffset(evidence?.end_ms);
  return start && end && start !== end ? `${start} - ${end}` : start || end;
}

async function resolveResearchEvidenceUrl(token, rawUrl) {
  const normalized = String(rawUrl || "").trim();
  if (!normalized) return "";
  try {
    const url = new URL(normalized, resolveInferaUrl("/"));
    const keyframe = url.pathname.match(/^\/memory\/keyframes\/(\d+)\/content\/?$/);
    if (keyframe) return resolveResearchSignedUrl(token, buildResearchPath(`/keyframes/${keyframe[1]}/content`));
    const asset = url.pathname.match(/^\/memory\/assets\/(\d+)\/clip\/?$/);
    if (asset) {
      return resolveResearchSignedUrl(token, buildResearchPath(`/assets/${asset[1]}/video`, {
        start_ms: url.searchParams.get("start_ms"),
        end_ms: url.searchParams.get("end_ms")
      }));
    }
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return resolveResearchSignedUrl(token, normalized);
  } catch {
    return "";
  }
}

async function resolveConversationEvidenceUrl(token, rawUrl) {
  const normalized = String(rawUrl || "").trim();
  if (!normalized || !token) return "";
  try {
    const url = new URL(normalized, resolveInferaUrl("/"));
    const isProtectedMemoryMedia = /\/memory\/(?:keyframes\/\d+\/content|assets\/\d+\/clip)\/?$/i.test(url.pathname);
    if (isProtectedMemoryMedia) {
      const result = await requestInfera(url.toString(), { token, responseType: "redirect" });
      return result?.url || "";
    }
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return resolveResearchSignedUrl(token, normalized);
  } catch {
    return "";
  }
}

function App() {
  const [jobs, setJobs] = useState([]);
  const [fpsPreset, setFpsPreset] = useState(2);
  const [customFps, setCustomFps] = useState("");
  const [resolutionPreset, setResolutionPreset] = useState("720p");
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [useSourceResolution, setUseSourceResolution] = useState(false);
  const [processingDevice, setProcessingDevice] = useState("gpu");
  const [outputDirectory, setOutputDirectory] = useState("");
  const [capabilities, setCapabilities] = useState(null);
  const [systemUsage, setSystemUsage] = useState(null);
  const [batchState, setBatchState] = useState({ status: "idle" });
  const [notice, setNotice] = useState("");
  const [clockNow, setClockNow] = useState(Date.now());
  const [pauseTransitioning, setPauseTransitioning] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved =
      window.localStorage?.getItem(THEME_STORAGE_KEY) || window.localStorage?.getItem(LEGACY_THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeNav, setActiveNav] = useState(NAV_ITEMS[0]);
  const [showSplash, setShowSplash] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [engineUnlocked, setEngineUnlocked] = useState(false);
  const [enginePassword, setEnginePassword] = useState("");
  const [engineError, setEngineError] = useState("");
  const [authState, setAuthState] = useState(readStoredAuth);
  const [loginMode, setLoginMode] = useState("login");
  const [loginMethod, setLoginMethod] = useState("password");
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "", confirmPassword: "", verificationCode: "", remember: true });
  const [loginStatus, setLoginStatus] = useState({ status: "idle", message: "" });
  const [emailCodeCooldown, setEmailCodeCooldown] = useState(0);
  const [cloudSpaceId, setCloudSpaceId] = useState(CLOUD_SPACES[0].id);
  const [cloudRepositoryDateKey, setCloudRepositoryDateKey] = useState(() => getLocalDateKey());
  const [cloudRepositoryMediaFilterId, setCloudRepositoryMediaFilterId] = useState(CLOUD_REPOSITORY_DEFAULT_MEDIA_FILTER_ID);
  const [cloudRepositoryStatusFilterId, setCloudRepositoryStatusFilterId] = useState(CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID);
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
  const authStateRef = useRef(authState);
  const automationOptionsRef = useRef(automationOptions);
  const automationEnqueueRunningRef = useRef(false);
  const autoLoginPromptedRef = useRef(false);
  const researchAccessRequestRef = useRef(0);
  const [repositoryState, setRepositoryState] = useState({
    status: "idle",
    spaceId: cloudSpaceId,
    dateKey: cloudRepositoryDateKey,
    filterId: cloudRepositoryStatusFilterId,
    items: [],
    statsItems: [],
    total: 0,
    hasMore: false,
    nextCursor: null,
    nextOffset: 0,
    message: ""
  });
  const [researchTab, setResearchTab] = useState("resources");
  const [researchFilters, setResearchFilters] = useState({
    from: "",
    status: "",
    to: "",
    userId: ""
  });
  const [researchAccessState, setResearchAccessState] = useState({ status: "idle", token: "", message: "" });
  const [researchState, setResearchState] = useState({
    status: "idle",
    users: [],
    resources: [],
    resourcesTotal: 0,
    videoCount: 0,
    audioCount: 0,
    chats: [],
    chatsTotal: 0,
    statistics: null,
    selectedResourceIds: [],
    selectedChatIds: [],
    message: "",
    exportMessage: "",
    exportDownload: null
  });
  const [startTimeEditor, setStartTimeEditor] = useState(null);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [updateState, setUpdateState] = useState({ status: "idle", message: "" });

  const isRunning = batchState.status === "started";
  const isPaused = isRunning && Boolean(batchState.paused);
  const pendingJobs = jobs.filter((job) => job.status === "queued" || job.status === "error" || job.status === "canceled");
  const hasProcessingJobs = jobs.some((job) => job.status === "processing" || job.status === "paused");
  const activeEncodingJob = getActiveEncodingJob(jobs);
  const canClearFinished = jobs.some((job) => canClearFinishedJob(job));
  const transferQueueSorted = useMemo(() => sortTransferQueue(transferQueue), [transferQueue]);
  const canAddTransfer = !isUploadActive(uploadState) && !transferRunning;
  const canStartTransfers = !isUploadActive(uploadState) && !transferRunning && transferQueue.some(isTransferStartable);
  const canClearFinishedTransfers = transferQueue.some((item) => item.status === "done");

  useEffect(() => {
    dlEditor.getCapabilities().then((data) => {
      setCapabilities(data);
      setOutputDirectory(data.outputDirectory);
    });

    dlEditor.getUsage().then(setSystemUsage).catch(() => undefined);

    const offJob = dlEditor.onJobUpdate((update) => {
      setJobs((current) =>
        current.map((job) => {
          if (job.id !== update.id) {
            return job;
          }

          const completedNow = update.status === "done" && job.status !== "done";
          return {
            ...job,
            ...update,
            ...(completedNow
              ? {
                  autoBackupRequested: Boolean(automationOptionsRef.current.autoBackup),
                  autoUploadRequested: Boolean(automationOptionsRef.current.autoUpload)
                }
              : {})
          };
        })
      );
    });

    const offBatch = dlEditor.onBatchUpdate((update) => {
      setBatchState((current) => ({ ...current, ...update }));
      if (update.status === "finished") {
        const failedCount = Number(update.failed) || 0;
        const failedText = failedCount > 0 ? `，失败 ${failedCount} 个` : "";
        setNotice(`已完成 ${update.completed} 个视频${failedText}，输出到 ${update.outputDirectory}`);
      } else if (update.status === "canceled") {
        setNotice("批量处理已取消");
      } else if (update.status === "error") {
        setNotice(update.message || "批量处理失败");
      } else if (update.status === "started" && update.paused) {
        setJobs((current) =>
          current.map((job) => (job.status === "processing" ? { ...job, status: "paused", message: job.message || "已暂停" } : job))
        );
        setNotice("处理已暂停");
      } else if (update.status === "started" && update.resumed) {
        setJobs((current) =>
          current.map((job) => (job.status === "paused" ? { ...job, status: "processing", message: job.message || "已继续" } : job))
        );
        setNotice("处理已继续");
      } else if (update.status === "started") {
        const modeText =
          update.processingDevice === "cpu"
            ? "CPU"
            : `GPU 极速，视频并发：${update.videoConcurrency || 1}，分段并发：${update.concurrency || 1}`;
        setNotice(`开始处理 ${update.total} 个视频，模式：${modeText}，编码器：${update.encoder}`);
      }
    });

    const offUsage = dlEditor.onSystemUsageUpdate(setSystemUsage);
    const offFullscreen = dlEditor.onWindowFullscreenChange(setIsFullscreen);
    const offUpload = dlEditor.onInferaUploadProgress((progress) => {
      setUploadState((current) => applyUploadProgress(current, progress));
      setTransferQueue((current) => {
        const next = applyTransferProgress(current, progress);
        transferQueueRef.current = next;
        return next;
      });
    });
    dlEditor.isWindowFullscreen().then(setIsFullscreen).catch(() => undefined);

    return () => {
      offJob();
      offBatch();
      offUsage();
      offFullscreen();
      offUpload();
    };
  }, []);

  useEffect(() => {
    dlEditor.setTitleBarTheme?.(theme).catch(() => undefined);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage?.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage?.removeItem(LEGACY_THEME_STORAGE_KEY);
  }, [theme]);

  useEffect(() => {
    authStateRef.current = authState;
    if (authState?.token) {
      autoLoginPromptedRef.current = false;
    }
  }, [authState]);

  useEffect(() => {
    if (emailCodeCooldown <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setEmailCodeCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [emailCodeCooldown]);

  useEffect(() => {
    const controller = {
      getAuth: () => authStateRef.current,
      onRefreshed: (nextAuth, previousAuth) => {
        authStateRef.current = nextAuth;
        setAuthState(nextAuth);
        const storedAuth = readStoredAuth();
        if (
          storedAuth &&
          (storedAuth.refreshToken === previousAuth?.refreshToken || storedAuth.token === previousAuth?.token)
        ) {
          window.localStorage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
        }
        logRendererEvent("Infera access token refreshed", { userId: nextAuth.userId });
      },
      onExpired: () => {
        const previousAuth = authStateRef.current;
        researchAccessRequestRef.current += 1;
        window.localStorage?.removeItem(AUTH_STORAGE_KEY);
        authStateRef.current = null;
        setAuthState(null);
        setLoginMode("login");
        setLoginMethod("password");
        setEmailCodeCooldown(0);
        setLoginForm((current) => ({
          ...current,
          identifier: current.identifier || getAuthAccountName(previousAuth),
          password: "",
          confirmPassword: "",
          verificationCode: ""
        }));
        setLoginStatus({ status: "error", message: INFERA_AUTH_EXPIRED_MESSAGE });
        setNotice(INFERA_AUTH_EXPIRED_MESSAGE);
        setShowLogin(true);
        logRendererEvent("Infera session expired", { userId: previousAuth?.userId || "" }, "warn");
      },
      onRefreshError: (error) => {
        setNotice(error.message || "登录状态刷新失败，请检查网络后重试");
        logRendererEvent("Infera token refresh failed", { message: error.message || "" }, "warn");
      }
    };
    return setInferaAuthController(controller);
  }, []);

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

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const shouldLoadCloudRepository = activeNav === "Cloud";
    if (!shouldLoadCloudRepository) {
      return;
    }

    if (!authState?.token) {
      setRepositoryState({
        status: "auth",
        spaceId: cloudSpaceId,
        dateKey: cloudSpaceId === "rawdata" ? "" : cloudRepositoryDateKey,
        filterId: getDefaultCloudStatusFilterIdForSpace(cloudSpaceId),
        items: [],
        statsItems: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
        message: "请先登录后查看 Cloud repository"
      });
      return;
    }

    loadCloudRepository(authState, cloudSpaceId, cloudRepositoryDateKey, cloudRepositoryStatusFilterId);
  }, [activeNav, authState?.token, cloudRepositoryDateKey, cloudRepositoryStatusFilterId, cloudSpaceId]);

  useEffect(() => {
    if (activeNav !== "Research") {
      return;
    }

    if (!authState?.token) {
      researchAccessRequestRef.current += 1;
      setResearchAccessState({ status: "auth", token: "", message: "" });
      setResearchState((current) => ({
        ...current,
        status: "auth",
        resources: [],
        resourcesTotal: 0,
        chats: [],
        chatsTotal: 0,
        message: "请先登录后查看 Research"
      }));
      return;
    }

    if (
      researchAccessState.token === authState.token &&
      ["checking", "allowed", "forbidden", "error"].includes(researchAccessState.status)
    ) {
      return;
    }

    loadResearchAccess(authState);
  }, [activeNav, authState?.token, researchAccessState.status, researchAccessState.token]);

  useEffect(() => {
    if (
      activeNav !== "Research" ||
      !authState?.token ||
      researchAccessState.status !== "allowed" ||
      researchAccessState.token !== authState.token
    ) {
      return;
    }

    loadResearchData(researchTab, authState, researchFilters);
  }, [
    activeNav,
    authState?.token,
    researchAccessState.status,
    researchAccessState.token,
    researchFilters.from,
    researchFilters.status,
    researchFilters.to,
    researchFilters.userId,
    researchTab
  ]);

  useEffect(() => {
    if (!hasProcessingJobs && !isUploadActive(uploadState) && !transferQueue.some((item) => item.status === "uploading")) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 80);

    return () => window.clearInterval(timer);
  }, [hasProcessingJobs, transferQueue, uploadState.status]);

  const selectedResolution = useMemo(() => {
    if (useSourceResolution) {
      return { mode: "source", label: "原分辨率" };
    }

    if (resolutionPreset === "custom") {
      return {
        mode: "target",
        label: `${customWidth || "-"} x ${customHeight || "-"}`,
        width: Number(customWidth),
        height: Number(customHeight)
      };
    }

    const preset = RESOLUTION_PRESETS.find((item) => item.label === resolutionPreset) || RESOLUTION_PRESETS[1];
    return { mode: "target", label: preset.label, width: preset.width, height: preset.height };
  }, [customHeight, customWidth, resolutionPreset, useSourceResolution]);

  const selectedFps = fpsPreset === "custom" ? Number(customFps) : fpsPreset;
  const activeEncoder = processingDevice === "cpu" ? "libx264" : capabilities?.selectedGpuEncoder || "检测中";
  const isGpuModeAvailable = processingDevice === "gpu" && activeEncoder !== "libx264" && activeEncoder !== "检测中";

  const canStart =
    jobs.length > 0 &&
    pendingJobs.length > 0 &&
    !isRunning &&
    Number.isFinite(selectedFps) &&
    selectedFps > 0 &&
    selectedFps <= 240 &&
    (selectedResolution.mode === "source" ||
      (Number.isFinite(selectedResolution.width) &&
        selectedResolution.width > 0 &&
        Number.isFinite(selectedResolution.height) &&
        selectedResolution.height > 0));

  const totals = useMemo(() => {
    const done = jobs.filter((job) => job.status === "done").length;
    const active = jobs.filter((job) => job.status === "processing" || job.status === "paused").length;
    const errors = jobs.filter((job) => job.status === "error").length;
    return { done, active, errors, total: jobs.length };
  }, [jobs]);

  async function addVideos() {
    if (isRunning) return;

    const selected = await dlEditor.selectVideos();
    if (!selected.length) return;

    setJobs((current) => {
      const known = new Set(current.map((job) => job.path));
      const fresh = selected.filter((job) => !known.has(job.path));
      return [...current, ...fresh];
    });
    logRendererEvent("Processing jobs added", { count: selected.length });
    setNotice(`已加入 ${selected.length} 个视频`);
  }

  function updateAutomationOption(key, value) {
    setAutomationOptions((current) => ({ ...current, [key]: Boolean(value) }));
    if (key === "autoBackup" && value) {
      setNotice("自动备份已开启，处理完成后会备份原视频");
    }
  }

  async function openProcessingOutput(job, action) {
    const outputPath = getProcessingOutputActionPath(job);
    if (!outputPath) {
      setNotice(getProcessingDoneMessage(job));
      return;
    }

    try {
      const result = action === "reveal" ? await dlEditor.revealPath(outputPath) : await dlEditor.openPath(outputPath);
      const errorMessage = getShellActionErrorMessage(result);
      if (errorMessage) {
        setNotice(errorMessage);
      }
    } catch (error) {
      setNotice(error.message || "打开本地压制视频失败");
    }
  }

  async function enqueueAutomationTransfers(nextJobs) {
    if (automationEnqueueRunningRef.current) {
      return;
    }

    automationEnqueueRunningRef.current = true;
    const tasks = [];
    const consumed = new Map();
    try {
      for (const job of nextJobs) {
        for (const kind of getPendingAutomationTransferKinds(job)) {
          if (hasExistingAutomationTransferTask(job, kind)) {
            const entry = consumed.get(job.id) || { backup: false, upload: false };
            entry[kind] = true;
            consumed.set(job.id, entry);
            continue;
          }
          const task = createTransferTask(await materializeAutomationTransferJob(job, kind), {
            auto: true,
            kind
          });
          if (task) {
            tasks.push(task);
            const entry = consumed.get(job.id) || { backup: false, upload: false };
            entry[kind] = true;
            consumed.set(job.id, entry);
          }
        }
      }
    } finally {
      automationEnqueueRunningRef.current = false;
    }

    if (!tasks.length) {
      return;
    }

    const nextQueue = [...transferQueueRef.current, ...tasks];
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
    logRendererEvent("Automation transfer tasks enqueued", {
      backupCount: tasks.filter((task) => task.kind === "backup").length,
      queueLength: nextQueue.length,
      uploadCount: tasks.filter((task) => task.kind === "upload").length
    });
    setJobs((current) =>
      current.map((job) => {
        const entry = consumed.get(job.id);
        if (!entry) {
          return job;
        }
        return {
          ...job,
          ...(entry.upload ? { autoUploadRequested: false } : {}),
          ...(entry.backup ? { autoBackupRequested: false } : {})
        };
      })
    );
    setTransferDockExpanded(true);
    setNotice(`已加入 ${tasks.length} 个上传/备份任务`);
    scheduleTransferQueueStart({ restartFailed: false });
  }

  function hasExistingAutomationTransferTask(job, kind) {
    const sourceJobId = String(job?.id || "");
    if (!sourceJobId) {
      return false;
    }

    return transferQueueRef.current.some((item) => item.kind === kind && String(item.sourceJobId || "") === sourceJobId);
  }

  async function materializeAutomationTransferJob(job, kind) {
    const uploadPath = getTransferUploadPath(job, kind);
    if (!uploadPath || typeof dlEditor.getVideoMetadata !== "function") {
      return { ...job, uploadPath };
    }

    try {
      const metadata = await dlEditor.getVideoMetadata(uploadPath);
      if (!metadata) {
        return { ...job, uploadPath };
      }

      return {
        ...job,
        name: metadata.name || job.name,
        outputPath: kind === "backup" ? job.outputPath : metadata.path || uploadPath,
        path: kind === "backup" ? metadata.path || uploadPath : job.path,
        size: metadata.size,
        sizeLabel: metadata.sizeLabel,
        uploadPath: metadata.path || uploadPath
      };
    } catch {
      return { ...job, uploadPath };
    }
  }

  async function addTransferFiles(kind) {
    if (!canAddTransfer) return;

    const selected = await dlEditor.selectVideos();
    if (!selected.length) return;

    const selection = selected.map((job) => ({
      error: kind === "upload" ? getManualDelphiUploadValidationError(job) : "",
      job
    }));
    const rejectedErrors = selection.map((entry) => entry.error).filter(Boolean);
    const validSelection = selection
      .filter((entry) => !entry.error)
      .map((entry) => entry.job);
    const rejectedCount = rejectedErrors.length;
    const tasks = validSelection
      .map((job) =>
        createTransferTask(job, {
          auto: false,
          kind
        })
      )
      .filter(Boolean);
    if (!tasks.length) {
      setNotice(kind === "upload" ? getManualDelphiUploadErrorMessage(rejectedErrors) : "没有可添加的备份视频");
      return;
    }
    const nextQueue = [...transferQueueRef.current, ...tasks];
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
    setTransferDockExpanded(true);
    logRendererEvent("Manual transfer tasks added", {
      kind,
      queueLength: nextQueue.length,
      rejectedCount,
      taskCount: tasks.length
    });
    const rejectedText =
      rejectedCount > 0
        ? `，${rejectedCount} 个文件未加入：${getManualDelphiUploadErrorMessage(rejectedErrors)}`
        : "";
    setNotice(`已加入 ${tasks.length} 个${kind === "backup" ? "备份" : "上传"}任务${rejectedText}`);
  }

  function clearFinishedTransfers() {
    const nextQueue = transferQueueRef.current.filter((item) => item.status !== "done");
    const clearedCount = transferQueueRef.current.length - nextQueue.length;
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
    logRendererEvent("Finished transfer tasks cleared", { clearedCount, queueLength: nextQueue.length });
  }

  function removeTransferTask(taskId) {
    const before = transferQueueRef.current;
    const nextQueue = transferQueueRef.current.filter(
      (item) => item.id !== taskId || (item.status !== "queued" && !isTransferErrorStatus(item.status))
    );
    const removedTask = before.find((item) => item.id === taskId && !nextQueue.some((nextItem) => nextItem.id === item.id));
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
    if (removedTask) {
      logRendererEvent("Transfer task removed", {
        kind: removedTask.kind,
        name: removedTask.name,
        previousStatus: removedTask.status,
        queueLength: nextQueue.length,
        taskId
      });
    }
  }

  function retryTransferTask(taskId) {
    const retryTask = transferQueueRef.current.find((item) => item.id === taskId);
    const nextQueue = transferQueueRef.current.map((item) =>
        item.id === taskId && isTransferErrorStatus(item.status)
          ? {
              ...item,
              completedAt: null,
              activeUploadId: "",
              elapsedMs: 0,
              message: "等待上传",
              percent: 0,
              speedBytesPerSecond: 0,
              status: "queued"
            }
          : item
    );
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
    if (retryTask) {
      logRendererEvent("Transfer task retry requested", {
        kind: retryTask.kind,
        name: retryTask.name,
        previousStatus: retryTask.status,
        taskId
      });
    }
    if (!transferRunningRef.current && !isUploadActive(uploadStateRef.current)) {
      scheduleTransferQueueStart({ restartFailed: false });
    }
  }

  function scheduleTransferQueueStart(options = {}) {
    if (transferRunningRef.current || isUploadActive(uploadStateRef.current)) {
      return;
    }

    window.setTimeout(() => {
      startTransferQueue(options);
    }, 0);
  }

  async function startTransferQueue({ restartFailed = true } = {}) {
    if (transferRunningRef.current || isUploadActive(uploadStateRef.current)) return;

    const startableQueue = restartFailed
      ? transferQueueRef.current.map((item) =>
          isTransferRestartable(item)
            ? {
                ...item,
                completedAt: null,
                activeUploadId: "",
                elapsedMs: 0,
                message: "等待上传",
                percent: 0,
                speedBytesPerSecond: 0,
                status: "queued"
              }
            : item
        )
      : transferQueueRef.current;
    if (!startableQueue.some((item) => item.status === "queued")) {
      return;
    }

    const auth = authStateRef.current;
    if (!auth?.token) {
      if (!autoLoginPromptedRef.current) {
        autoLoginPromptedRef.current = true;
        setShowLogin(true);
      }
      setNotice("上传/备份需要先登录");
      logRendererEvent("Transfer queue start blocked", { reason: "missing_auth" }, "warn");
      return;
    }

    transferQueueRef.current = startableQueue;
    setTransferQueue(startableQueue);

    transferRunningRef.current = true;
    setTransferRunning(true);
    setTransferDockExpanded(true);
    logRendererEvent("Transfer queue started", {
      backupQueued: startableQueue.filter((item) => item.kind === "backup" && item.status === "queued").length,
      uploadQueued: startableQueue.filter((item) => item.kind === "upload" && item.status === "queued").length
    });
    try {
      while (true) {
        const nextTask = getNextTransferTask(transferQueueRef.current);
        if (!nextTask) {
          break;
        }
        await runTransferTask(nextTask, auth.token);
      }
    } finally {
      transferRunningRef.current = false;
      setTransferRunning(false);
      setUploadState((current) =>
        isUploadActive(current)
          ? current
          : {
              ...current,
              status: current.status === "idle" ? "idle" : "ready",
              uploadId: "",
              retryJobs: [],
              retryOptions: null
            }
      );
    }
  }

  async function runTransferTask(task, token) {
    const taskJob = createJobFromTransferTask(task);
    const taskUploadId = `${task.kind}-${task.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const options = getTransferTaskUploadOptions(task, () => Boolean(automationOptionsRef.current.autoClearLocal));
    logRendererEvent("Transfer task started", { kind: task.kind, name: task.name, taskId: task.id });

    updateTransferTask(task.id, {
      activeUploadId: taskUploadId,
      completedAt: null,
      message: "正在上传",
      startedAt: Date.now(),
      status: "uploading"
    });

    try {
      const result = await uploadJobsToRepository([taskJob], { ...options, uploadId: taskUploadId });
      const failed = Boolean(result?.failureSnapshot || result?.failed);
      if (failed) {
        updateTransferTask(task.id, {
          activeUploadId: "",
          completedAt: Date.now(),
          message: result?.failureSnapshot?.message || (task.kind === "backup" ? "备份失败" : "上传失败"),
          speedBytesPerSecond: 0,
          status: task.kind === "backup" ? "backup_error" : "upload_error"
        });
        logRendererEvent("Transfer task failed", {
          kind: task.kind,
          message: result?.failureSnapshot?.message || (task.kind === "backup" ? "备份失败" : "上传失败"),
          name: task.name,
          taskId: task.id
        }, "warn");
        setNotice(`${task.kind === "backup" ? "备份" : "上传"}失败：${task.name}`);
        return;
      }

      updateTransferTask(task.id, {
        activeUploadId: "",
        completedAt: Date.now(),
        message: task.kind === "backup" ? "备份完成" : "上传完成",
        percent: 100,
        speedBytesPerSecond: 0,
        status: "done"
      });
      logRendererEvent("Transfer task completed", { kind: task.kind, name: task.name, taskId: task.id });
      setNotice(`${task.kind === "backup" ? "备份" : "上传"}完成：${task.name}`);
    } catch (error) {
      const message = error.message || "上传失败";
      if (message.includes("取消")) {
        updateTransferTask(task.id, {
          activeUploadId: "",
          completedAt: Date.now(),
          message: "上传已取消",
          speedBytesPerSecond: 0,
          status: "canceled"
        });
        logRendererEvent("Transfer task canceled", { kind: task.kind, name: task.name, taskId: task.id }, "warn");
        return;
      }

      updateTransferTask(task.id, {
        activeUploadId: "",
        completedAt: Date.now(),
        message,
        speedBytesPerSecond: 0,
        status: task.kind === "backup" ? "backup_error" : "upload_error"
      });
      logRendererEvent("Transfer task failed", { kind: task.kind, message, name: task.name, taskId: task.id }, "warn");
      setNotice(`${task.kind === "backup" ? "备份" : "上传"}失败：${task.name}`);
    }
  }

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

  function updateTransferTask(taskId, patch) {
    const nextQueue = transferQueueRef.current.map((item) => (item.id === taskId ? { ...item, ...patch } : item));
    transferQueueRef.current = nextQueue;
    setTransferQueue(nextQueue);
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

  async function chooseOutputDirectory() {
    const directory = await dlEditor.selectOutputDirectory();
    if (directory) {
      setOutputDirectory(directory);
    }
  }

  async function startBatch() {
    if (!canStart) return;

    setNotice("");
    setJobs((current) =>
      current.map((job) => ({
        ...job,
        status: job.status === "done" ? "done" : "queued",
        progress: job.status === "done" ? 100 : 0,
        currentTime: 0,
        elapsedSeconds: 0,
        message: "",
        outputPath: job.status === "done" ? job.outputPath : "",
        autoClearError: job.status === "done" ? job.autoClearError : undefined,
        autoClearOriginalError: job.status === "done" ? job.autoClearOriginalError : undefined,
        autoClearOriginalStatus: job.status === "done" ? job.autoClearOriginalStatus : undefined,
        autoClearStatus: job.status === "done" ? job.autoClearStatus : undefined,
        autoClearedAt: job.status === "done" ? job.autoClearedAt : undefined,
        autoClearedOriginalAt: job.status === "done" ? job.autoClearedOriginalAt : undefined,
        backedUpAt: job.status === "done" ? job.backedUpAt : undefined,
        backupResult: job.status === "done" ? job.backupResult : undefined,
        deletedOriginalPath: job.status === "done" ? job.deletedOriginalPath : undefined,
        deletedOutputPath: job.status === "done" ? job.deletedOutputPath : undefined,
        uploadedAt: job.status === "done" ? job.uploadedAt : undefined,
        uploadResult: job.status === "done" ? job.uploadResult : undefined
      }))
    );

    try {
      await dlEditor.startBatch({
        jobs: pendingJobs,
        outputDirectory,
        options: {
          fps: selectedFps,
          resolutionMode: selectedResolution.mode,
          width: selectedResolution.width,
          height: selectedResolution.height,
          processingDevice
        }
      });
    } catch (error) {
      setNotice(error.message || "无法开始处理");
    }
  }

  async function cancelBatch() {
    await dlEditor.cancelBatch();
  }

  async function togglePause() {
    if (!isRunning || pauseTransitioning) return;

    const shouldResume = isPaused;
    setPauseTransitioning(true);
    setBatchState((current) => ({ ...current, paused: !shouldResume, resumed: shouldResume || undefined }));
    setJobs((current) =>
      current.map((job) => {
        if (shouldResume && job.status === "paused") {
          return { ...job, status: "processing", message: "已继续" };
        }

        if (!shouldResume && job.status === "processing") {
          return { ...job, status: "paused", message: "已暂停" };
        }

        return job;
      })
    );
    setNotice(shouldResume ? "处理已继续" : "处理已暂停");

    try {
      const result = shouldResume ? await dlEditor.resumeBatch() : await dlEditor.pauseBatch();
      if (typeof result?.paused === "boolean") {
        setBatchState((current) => ({ ...current, paused: result.paused, resumed: shouldResume && !result.paused }));
      }
    } catch (error) {
      setBatchState((current) => ({ ...current, paused: shouldResume, resumed: undefined }));
      setJobs((current) =>
        current.map((job) => {
          if (shouldResume && job.status === "processing") {
            return { ...job, status: "paused" };
          }

          if (!shouldResume && job.status === "paused") {
            return { ...job, status: "processing" };
          }

          return job;
        })
      );
      setNotice(error.message || (shouldResume ? "无法继续处理" : "无法暂停处理"));
    } finally {
      setPauseTransitioning(false);
    }
  }

  function clearFinished() {
    setJobs((current) => current.filter((job) => !canClearFinishedJob(job)));
  }

  function removeJob(id) {
    setJobs((current) => current.filter((job) => job.id !== id || !canRemoveJob(job)));
  }

  function openStartTimeEditor(job) {
    const startTimeMs = normalizeTimestamp(job.startTimeMs ?? job.modifiedAtMs);
    setStartTimeEditor({
      jobId: job.id,
      fileName: job.name,
      value: formatDateTime(startTimeMs),
      error: ""
    });
  }

  function saveStartTime() {
    if (!startTimeEditor) return;

    const startTimeMs = parseDateTimeFromText(startTimeEditor.value);
    if (!Number.isFinite(startTimeMs)) {
      setStartTimeEditor((current) => (current ? { ...current, error: "请输入有效的年月日和时分秒" } : current));
      return;
    }

    setJobs((current) =>
      current.map((job) => (job.id === startTimeEditor.jobId ? { ...job, startTimeMs } : job))
    );
    setStartTimeEditor(null);
  }

  function parseStartTimeFromFileName() {
    if (!startTimeEditor) return;

    const startTimeMs = parseDateTimeFromText(startTimeEditor.fileName);
    if (!Number.isFinite(startTimeMs)) {
      setStartTimeEditor((current) => (current ? { ...current, error: "文件名里没有可识别的年月日和时分秒" } : current));
      return;
    }

    setStartTimeEditor((current) => (current ? { ...current, value: formatDateTime(startTimeMs), error: "" } : current));
  }

  async function checkForUpdates() {
    setUpdateState({ status: "checking", message: "正在检查最新版本..." });

    try {
      const result = await dlEditor.checkForUpdates();
      setUpdateState({ ...result, message: getUpdateMessage(result) });
    } catch (error) {
      setUpdateState({
        status: "error",
        message: error.message || "无法检查更新，请稍后再试"
      });
    }
  }

  async function openUpdateLink(update) {
    const targetUrl = update?.downloadUrl || update?.releaseUrl;
    if (!targetUrl) return;

    try {
      await dlEditor.openExternal(targetUrl);
    } catch (error) {
      setUpdateState((current) => ({
        ...current,
        status: "error",
        message: error.message || "无法打开更新链接"
      }));
    }
  }

  async function revealMainLog() {
    try {
      const result = await dlEditor.revealMainLog();
      setNotice(result?.opened ? "已打开日志文件位置" : "无法打开日志文件位置");
    } catch (error) {
      setNotice(error.message || "无法打开日志文件位置");
    }
  }

  function changeCloudSpace(nextSpaceId) {
    const nextMediaFilterId = getDefaultCloudMediaFilterIdForSpace(nextSpaceId);
    const nextStatusFilterId = getDefaultCloudStatusFilterIdForSpace(nextSpaceId);
    setCloudSpaceId(nextSpaceId);
    setCloudRepositoryMediaFilterId(nextMediaFilterId);
    setCloudRepositoryStatusFilterId(nextStatusFilterId);
    setRepositoryState({
      status: authStateRef.current?.token ? "loading" : "auth",
      spaceId: nextSpaceId,
      dateKey: nextSpaceId === "rawdata" ? "" : cloudRepositoryDateKey,
      filterId: nextStatusFilterId,
      items: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      nextOffset: 0,
      message: authStateRef.current?.token ? "" : "请先登录后查看 Cloud repository"
    });
  }

  async function submitLogin() {
    if (loginMethod === "code") {
      await submitEmailCodeLogin();
      return;
    }

    const rawIdentifier = loginForm.identifier.trim();
    const identifierType = inferIdentifierType(rawIdentifier);
    const identifier = identifierType === "email" ? rawIdentifier.toLowerCase() : rawIdentifier;
    if (!identifier || !loginForm.password) {
      setLoginStatus({ status: "error", message: "请输入账号和密码" });
      return;
    }

    if (!identifierType) {
      setLoginStatus({ status: "error", message: "请输入有效的邮箱或手机号" });
      return;
    }

    setLoginStatus({ status: "checking", message: "正在登录..." });
    try {
      const result = await loginToInfera({ identifier, password: loginForm.password });
      completeAuthentication(result, identifier, "登录响应缺少 token");
    } catch (error) {
      setLoginStatus({
        status: "error",
        message: getAuthenticationErrorMessage(error, "登录验证失败")
      });
    }
  }

  async function submitEmailCodeLogin() {
    const email = loginForm.identifier.trim().toLowerCase();
    const verificationCode = loginForm.verificationCode.trim();
    if (!email || !verificationCode) {
      setLoginStatus({ status: "error", message: "请输入邮箱和验证码" });
      return;
    }
    if (!EMAIL_IDENTIFIER_PATTERN.test(email)) {
      setLoginStatus({ status: "error", message: "请输入有效的邮箱地址" });
      return;
    }

    setLoginStatus({ status: "checking", message: "正在验证并登录..." });
    try {
      const verification = await createEmailVerificationToken(email, verificationCode, "login");
      const verificationToken = verification?.verificationToken || verification?.verification_token || "";
      if (!verificationToken) {
        throw new Error("验证码验证响应缺少 verification token");
      }
      const result = await loginToInferaWithEmailCode({ email, verificationToken });
      completeAuthentication(result, email, "登录响应缺少 token");
    } catch (error) {
      setLoginStatus({
        status: "error",
        message: getAuthenticationErrorMessage(error, "邮箱验证码登录失败")
      });
    }
  }

  async function sendEmailCode() {
    const email = loginForm.identifier.trim().toLowerCase();
    if (!EMAIL_IDENTIFIER_PATTERN.test(email)) {
      setLoginStatus({ status: "error", message: "请先输入有效的邮箱地址" });
      return;
    }

    setLoginStatus({ status: "sending", message: "正在发送验证码..." });
    try {
      const purpose = loginMode === "register" ? "register" : "login";
      const result = await sendEmailVerificationCode(email, purpose);
      const cooldownSeconds = Math.max(1, Number(result?.cooldownSeconds || result?.cooldown_seconds) || 60);
      setLoginForm((current) => ({ ...current, identifier: email, verificationCode: "" }));
      setEmailCodeCooldown(cooldownSeconds);
      setLoginStatus({ status: "success", message: `验证码已发送至 ${email}` });
    } catch (error) {
      setLoginStatus({
        status: "error",
        message: getAuthenticationErrorMessage(error, "验证码发送失败")
      });
    }
  }

  async function submitRegister() {
    const identifier = loginForm.identifier.trim().toLowerCase();
    const verificationCode = loginForm.verificationCode.trim();
    if (!identifier || !verificationCode || !loginForm.password || !loginForm.confirmPassword) {
      setLoginStatus({ status: "error", message: "请输入邮箱、验证码、密码并确认密码" });
      return;
    }
    if (!EMAIL_IDENTIFIER_PATTERN.test(identifier)) {
      setLoginStatus({ status: "error", message: "请输入有效的邮箱地址" });
      return;
    }
    if (loginForm.password !== loginForm.confirmPassword) {
      setLoginStatus({ status: "error", message: "两次输入的密码不一致" });
      return;
    }

    setLoginStatus({ status: "checking", message: "正在验证并注册..." });
    try {
      const verification = await createEmailVerificationToken(identifier, verificationCode, "register");
      const verificationToken = verification?.verificationToken || verification?.verification_token || "";
      if (!verificationToken) {
        throw new Error("验证码验证响应缺少 verification token");
      }
      const result = await registerWithInfera({
        email: identifier,
        password: loginForm.password,
        verificationToken
      });
      completeAuthentication(result, identifier, "注册响应缺少 token");
      setNotice("注册成功，已自动登录");
    } catch (error) {
      setLoginStatus({
        status: "error",
        message: getAuthenticationErrorMessage(error, "注册失败")
      });
    }
  }

  function completeAuthentication(result, identifier, missingTokenMessage) {
    const nextAuth = normalizeAuthPayload(result, identifier);
    if (!nextAuth.token) {
      throw new Error(missingTokenMessage);
    }

    if (loginForm.remember) {
      window.localStorage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
    } else {
      window.localStorage?.removeItem(AUTH_STORAGE_KEY);
    }

    authStateRef.current = nextAuth;
    setAuthState(nextAuth);
    setLoginMode("login");
    setLoginMethod("password");
    setLoginStatus({ status: "idle", message: "" });
    setEmailCodeCooldown(0);
    setLoginForm((current) => ({ ...current, identifier, password: "", confirmPassword: "", verificationCode: "" }));
    setShowLogin(false);

    if (activeNav === "Cloud") {
      loadCloudRepository(nextAuth, cloudSpaceId, cloudRepositoryDateKey, cloudRepositoryStatusFilterId);
    } else if (activeNav === "Research") {
      loadResearchAccess(nextAuth);
    }
  }

  function changeLoginMode(mode) {
    setLoginMode(mode);
    setLoginMethod("password");
    setLoginStatus({ status: "idle", message: "" });
    setEmailCodeCooldown(0);
    setLoginForm((current) => ({ ...current, password: "", confirmPassword: "", verificationCode: "" }));
  }

  function changeLoginMethod(method) {
    setLoginMethod(method);
    setLoginStatus({ status: "idle", message: "" });
    setEmailCodeCooldown(0);
    setLoginForm((current) => ({ ...current, password: "", verificationCode: "" }));
  }

  function changeLoginForm(changes) {
    if ((loginMode === "register" || loginMethod === "code") && Object.prototype.hasOwnProperty.call(changes, "identifier")) {
      setEmailCodeCooldown(0);
      if (loginStatus.status !== "checking" && loginStatus.status !== "sending") {
        setLoginStatus({ status: "idle", message: "" });
      }
    }
    setLoginForm((current) => ({ ...current, ...changes }));
  }

  function closeLoginDialog() {
    setShowLogin(false);
    setLoginMode("login");
    setLoginMethod("password");
    setLoginStatus({ status: "idle", message: "" });
    setEmailCodeCooldown(0);
    setLoginForm((current) => ({ ...current, password: "", confirmPassword: "", verificationCode: "" }));
  }

  function logout() {
    researchAccessRequestRef.current += 1;
    window.localStorage?.removeItem(AUTH_STORAGE_KEY);
    authStateRef.current = null;
    setAuthState(null);
    setLoginStatus({ status: "idle", message: "" });
    setResearchAccessState({ status: "auth", token: "", message: "" });
    setRepositoryState({
      status: "auth",
      spaceId: cloudSpaceId,
      dateKey: cloudSpaceId === "rawdata" ? "" : cloudRepositoryDateKey,
      filterId: getDefaultCloudStatusFilterIdForSpace(cloudSpaceId),
      items: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      nextOffset: 0,
      message: "请先登录后查看 Cloud repository"
    });
  }

  async function loadResearchAccess(authOverride = authState) {
    const token = authOverride?.token;
    if (!token) {
      researchAccessRequestRef.current += 1;
      setResearchAccessState({ status: "auth", token: "", message: "" });
      return;
    }

    const requestId = researchAccessRequestRef.current + 1;
    researchAccessRequestRef.current = requestId;
    setResearchAccessState({ status: "checking", token, message: "" });
    try {
      const currentUser = await fetchCurrentUser(token);
      if (researchAccessRequestRef.current !== requestId) {
        return;
      }

      const resolvedToken = authStateRef.current?.token || token;
      if (!hasResearchAccess(currentUser)) {
        setResearchAccessState({
          status: "forbidden",
          token: resolvedToken,
          message: "当前账号未被授予 Research 访问权限，请联系管理员。"
        });
        setResearchState((current) => ({
          ...current,
          status: "idle",
          users: [],
          resources: [],
          resourcesTotal: 0,
          chats: [],
          chatsTotal: 0,
          statistics: null,
          message: ""
        }));
        return;
      }

      setResearchAccessState({ status: "allowed", token: resolvedToken, message: "" });
    } catch (error) {
      if (researchAccessRequestRef.current !== requestId || !authStateRef.current?.token) {
        return;
      }
      setResearchAccessState({
        status: "error",
        token: authStateRef.current.token,
        message: error.message || "无法验证 Research 访问权限"
      });
    }
  }

  async function loadResearchData(tabOverride = researchTab, authOverride = authState, filtersOverride = researchFilters, options = {}) {
    const token = authOverride?.token;
    const append = Boolean(options.append);
    const offset = Number(options.offset || 0);
    if (!token) {
      setResearchState((current) => ({
        ...current,
        status: "auth",
        message: "请先登录后查看 Research"
      }));
      return;
    }

    setResearchState((current) => ({ ...current, status: append ? "ready" : "loading", message: "", exportMessage: "" }));
    try {
      const usersPromise = fetchResearchUsers(token);
      if (tabOverride === "chats") {
        const [users, chats] = await Promise.all([usersPromise, fetchResearchChats(token, filtersOverride, { offset })]);
        const chatItems = normalizeResearchItems(chats);
        setResearchState((current) => ({
          ...current,
          status: "ready",
          users: normalizeResearchItems(users),
          chats: append ? [...current.chats, ...chatItems] : chatItems,
          chatsTotal: Number(chats?.total) || chatItems.length,
          selectedChatIds: append
            ? current.selectedChatIds
            : current.selectedChatIds.filter((id) => chatItems.some((item) => getResearchChatId(item) === String(id))),
          message: ""
        }));
      } else if (tabOverride === "statistics") {
        const [users, statistics] = await Promise.all([usersPromise, fetchResearchStatistics(token)]);
        setResearchState((current) => ({
          ...current,
          status: "ready",
          users: normalizeResearchItems(users),
          statistics,
          message: ""
        }));
      } else if (tabOverride === "simulation") {
        const users = await usersPromise;
        setResearchState((current) => ({
          ...current,
          status: "ready",
          users: normalizeResearchItems(users),
          message: ""
        }));
      } else {
        const [users, resources] = await Promise.all([usersPromise, fetchResearchResources(token, filtersOverride, { offset })]);
        const resourceItems = normalizeResearchItems(resources);
        setResearchState((current) => ({
          ...current,
          status: "ready",
          users: normalizeResearchItems(users),
          resources: append ? [...current.resources, ...resourceItems] : resourceItems,
          resourcesTotal: Number(resources?.total) || resourceItems.length,
          videoCount: Number(resources?.video_count) || 0,
          audioCount: Number(resources?.audio_count) || 0,
          selectedResourceIds: append
            ? current.selectedResourceIds
            : current.selectedResourceIds.filter((id) => resourceItems.some((item) => getResearchResourceId(item) === String(id))),
          message: ""
        }));
      }
    } catch (error) {
      const permissionDenied = isResearchPermissionDenied(error);
      if (permissionDenied) {
        setResearchAccessState({
          status: "forbidden",
          token: authStateRef.current?.token || token,
          message: "当前账号未被授予 Research 访问权限，请联系管理员。"
        });
      }
      setResearchState((current) => ({
        ...current,
        status: permissionDenied ? "forbidden" : "error",
        message: getResearchErrorMessage(error)
      }));
    }
  }

  function loadMoreResearchResources() {
    return loadResearchData("resources", authState, researchFilters, {
      append: true,
      offset: researchState.resources.length
    });
  }

  function loadMoreResearchChats() {
    return loadResearchData("chats", authState, researchFilters, {
      append: true,
      offset: researchState.chats.length
    });
  }

  function updateResearchFilter(patch) {
    setResearchFilters((current) => ({ ...current, ...patch }));
  }

  function toggleResearchResource(id) {
    setResearchState((current) => ({ ...current, selectedResourceIds: toggleId(current.selectedResourceIds, id) }));
  }

  function toggleResearchChat(id) {
    setResearchState((current) => ({ ...current, selectedChatIds: toggleId(current.selectedChatIds, id) }));
  }

  function selectLoadedResearchResources() {
    setResearchState((current) => ({
      ...current,
      selectedResourceIds: current.resources.map(getResearchResourceId).filter(Boolean)
    }));
  }

  function selectLoadedResearchChats() {
    setResearchState((current) => ({
      ...current,
      selectedChatIds: current.chats.map(getResearchChatId).filter(Boolean)
    }));
  }

  async function exportSelectedResearchResources() {
    await exportResearchArchive("resources", false);
  }

  async function exportFilteredResearchResources() {
    await exportResearchArchive("resources", true);
  }

  async function exportSelectedResearchChats() {
    await exportResearchArchive("chats", false);
  }

  async function exportFilteredResearchChats() {
    await exportResearchArchive("chats", true);
  }

  async function exportResearchArchive(kind, selectAll) {
    const token = authStateRef.current?.token;
    if (!token) {
      setShowLogin(true);
      return;
    }

    const selectedIds = kind === "chats" ? researchState.selectedChatIds : researchState.selectedResourceIds;
    if (!selectAll && selectedIds.length === 0) {
      setResearchState((current) => ({ ...current, exportMessage: kind === "chats" ? "请选择要导出的 chat" : "请选择要导出的资源" }));
      return;
    }

    const dateParams = getResearchDateRangeParams(researchFilters);
    const commonPayload = {
      select_all: Boolean(selectAll),
      user_id: researchFilters.userId ? Number(researchFilters.userId) : null
    };
    setResearchState((current) => ({ ...current, exportMessage: "正在打包导出..." }));
    try {
      const result =
        kind === "chats"
          ? await exportResearchChats(token, {
              ...commonPayload,
              session_ids: selectAll ? [] : selectedIds.map(Number),
              max_sessions: 2000,
              start_ms: dateParams.start_ms,
              end_ms: dateParams.end_ms,
              include_evidences: true
            })
          : await exportResearchResources(token, {
              ...commonPayload,
              asset_ids: selectAll ? [] : selectedIds.map(Number),
              delivery: "oss",
              max_assets: 2000,
              parse_status: researchFilters.status || null,
              date_start_ms: dateParams.date_start_ms,
              date_end_ms: dateParams.date_end_ms,
              include_metadata: true,
              include_parsed_data: true
            });
      await saveResearchDownload(result, kind === "chats" ? "research-chats.zip" : "research-videos.zip");
      const exportDownload = result?.download_url
        ? {
            kind,
            url: result.download_url,
            filename: result.filename || (kind === "chats" ? "research-chats.zip" : "research-videos.zip"),
            sizeBytes: Number(result.size_bytes) || 0,
            expiresAt: Number(result.expires_seconds) > 0 ? Date.now() + Number(result.expires_seconds) * 1000 : 0
          }
        : null;
      setResearchState((current) => ({
        ...current,
        exportMessage: exportDownload ? "" : "导出已开始下载",
        exportDownload: exportDownload || current.exportDownload
      }));
    } catch (error) {
      setResearchState((current) => ({ ...current, exportMessage: error.message || "导出失败" }));
    }
  }

  async function loadCloudRepository(
    authOverride = authState,
    spaceIdOverride = cloudSpaceId,
    dateKeyOverride = cloudRepositoryDateKey,
    filterIdOverride = cloudRepositoryStatusFilterId
  ) {
    const token = authOverride?.token;
    const effectiveDateKey = spaceIdOverride === "rawdata" ? "" : dateKeyOverride;
    const effectiveFilterId = getCloudStatusFilterIdForSpace(spaceIdOverride, filterIdOverride);
    if (!token) {
      setRepositoryState({
        status: "auth",
        spaceId: spaceIdOverride,
        dateKey: effectiveDateKey,
        filterId: effectiveFilterId,
        items: [],
        statsItems: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
        nextOffset: 0,
        message: "请先登录后查看 Cloud repository"
      });
      return;
    }

    setRepositoryState((current) => ({
      ...current,
      items:
        current.spaceId === spaceIdOverride && current.dateKey === effectiveDateKey && current.filterId === effectiveFilterId
          ? current.items
          : [],
      statsItems:
        current.spaceId === spaceIdOverride && current.dateKey === effectiveDateKey
          ? current.statsItems || []
          : [],
      spaceId: spaceIdOverride,
      dateKey: effectiveDateKey,
      filterId: effectiveFilterId,
      status: "loading",
      message: ""
    }));

    try {
      const repository = await fetchCloudRepository(token, spaceIdOverride, {
        dateKey: effectiveDateKey,
        filterId: effectiveFilterId
      });
      const statsRepository =
        spaceIdOverride !== "rawdata" && effectiveFilterId !== CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID
          ? await fetchCloudRepository(token, spaceIdOverride, {
              dateKey: effectiveDateKey,
              filterId: CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID
            })
          : repository;
      setRepositoryState((current) =>
        current.spaceId === spaceIdOverride && current.dateKey === effectiveDateKey && current.filterId === effectiveFilterId
          ? {
              status: "ready",
              spaceId: spaceIdOverride,
              dateKey: effectiveDateKey,
              filterId: effectiveFilterId,
              items: repository.items,
              statsItems: statsRepository.items,
              total: repository.total,
              hasMore: repository.hasMore,
              nextCursor: repository.nextCursor,
              message: ""
            }
          : current
      );
    } catch (error) {
      setRepositoryState((current) =>
        current.spaceId === spaceIdOverride && current.dateKey === effectiveDateKey && current.filterId === effectiveFilterId
          ? {
              ...current,
              spaceId: spaceIdOverride,
              dateKey: effectiveDateKey,
              filterId: effectiveFilterId,
              status: "error",
              message: error.message || "无法读取 Cloud repository"
            }
          : current
      );
    }
  }

  async function deleteCloudRepositoryItem(item, spaceIdOverride = cloudSpaceId) {
    if (spaceIdOverride !== "rawdata") {
      setNotice("Repository 删除稍后接入");
      return;
    }

    if (!authState?.token) {
      setShowLogin(true);
      setNotice("请先登录后删除 Rawdata");
      return;
    }

    const title = getRepositoryTitle(item);
    setRepositoryState((current) => ({ ...current, spaceId: spaceIdOverride, dateKey: "", filterId: "all", status: "loading", message: "" }));
    try {
      await deleteRawDataArchive(authState.token, item);
      setNotice(`已删除 ${title}`);
      await loadCloudRepository(authState, spaceIdOverride, cloudRepositoryDateKey, cloudRepositoryStatusFilterId);
    } catch (error) {
      setRepositoryState((current) => ({
        ...current,
        spaceId: spaceIdOverride,
        dateKey: "",
        filterId: "all",
        status: "error",
        message: error.message || "删除 Rawdata 失败"
      }));
      setNotice(error.message || "删除 Rawdata 失败");
    }
  }

  function unlockEngine() {
    if (enginePassword === ENGINE_PASSWORD) {
      setEngineUnlocked(true);
      setEnginePassword("");
      setEngineError("");
      return;
    }

    setEngineError("密码错误");
  }

  function lockEngine() {
    setEngineUnlocked(false);
    setEnginePassword("");
    setEngineError("");
  }

  return (
    <>
      <main
        aria-hidden={showSplash}
        className={["app-shell", `platform-${dlEditor.platform || "browser"}`, isFullscreen ? "is-fullscreen" : ""].filter(Boolean).join(" ")}
      >
      <AppChrome
        activeNav={activeNav}
        authState={authState}
        isFullscreen={isFullscreen}
        onLoginClick={() => setShowLogin(true)}
        onNavChange={setActiveNav}
        onInfoClick={() => setShowAppInfo(true)}
        onThemeToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        theme={theme}
      />

      {activeNav === "Editor" ? (
        <section className="workspace">
        <aside className="control-panel">
          <div className="panel-heading">
            <Settings2 size={18} />
            <span>转换设置</span>
          </div>

          <div className="field-group">
            <label>目标帧率</label>
            <div className="segmented-grid">
              {FPS_PRESETS.map((fps) => (
                <button
                  className={fpsPreset === fps ? "segment active" : "segment"}
                  key={fps}
                  onClick={() => setFpsPreset(fps)}
                  type="button"
                >
                  {fps}
                </button>
              ))}
              <button
                className={fpsPreset === "custom" ? "segment active" : "segment"}
                onClick={() => setFpsPreset("custom")}
                type="button"
              >
                自定义
              </button>
            </div>
            {fpsPreset === "custom" && (
              <input
                className="text-input"
                min="1"
                max="240"
                onChange={(event) => setCustomFps(event.target.value)}
                placeholder="例如 12"
                type="number"
                value={customFps}
              />
            )}
          </div>

          <div className="field-group">
            <label>目标分辨率</label>
            <div className="segmented-grid two-col">
              {RESOLUTION_PRESETS.map((preset) => (
                <button
                  className={resolutionPreset === preset.label && !useSourceResolution ? "segment active" : "segment"}
                  key={preset.label}
                  onClick={() => {
                    setUseSourceResolution(false);
                    setResolutionPreset(preset.label);
                  }}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
              <button
                className={resolutionPreset === "custom" && !useSourceResolution ? "segment active" : "segment"}
                onClick={() => {
                  setUseSourceResolution(false);
                  setResolutionPreset("custom");
                }}
                type="button"
              >
                自定义
              </button>
              <button
                className={useSourceResolution ? "segment active" : "segment"}
                onClick={() => setUseSourceResolution(true)}
                type="button"
              >
                原尺寸
              </button>
            </div>
            {resolutionPreset === "custom" && !useSourceResolution && (
              <div className="split-inputs">
                <input
                  className="text-input"
                  min="2"
                  onChange={(event) => setCustomWidth(event.target.value)}
                  placeholder="宽"
                  type="number"
                  value={customWidth}
                />
                <input
                  className="text-input"
                  min="2"
                  onChange={(event) => setCustomHeight(event.target.value)}
                  placeholder="高"
                  type="number"
                  value={customHeight}
                />
              </div>
            )}
          </div>

          <div className="field-group">
            <label>处理设备</label>
            <div className="segmented-grid two-col">
              <button
                className={processingDevice === "gpu" ? "segment active" : "segment"}
                onClick={() => setProcessingDevice("gpu")}
                type="button"
              >
                GPU
              </button>
              <button
                className={processingDevice === "cpu" ? "segment active" : "segment"}
                onClick={() => setProcessingDevice("cpu")}
                type="button"
              >
                CPU
              </button>
            </div>
            <DeviceStatus capabilities={capabilities} device={processingDevice} encoder={activeEncoder} usage={systemUsage} />
          </div>

          <div className="field-group">
            <label>输出位置</label>
            <button className="path-button" onClick={chooseOutputDirectory} title="选择输出文件夹" type="button">
              <FolderOpen size={16} />
              <span>{outputDirectory || "选择文件夹"}</span>
            </button>
          </div>

          <div className="hardware-box">
            <Gauge size={18} />
            <div>
              <strong>{activeEncoder}</strong>
              <span>
                {processingDevice === "cpu"
                  ? "CPU 模式：强制使用 libx264，适合稳定压缩或对 GPU 占用敏感的任务"
                  : isGpuModeAvailable
                    ? `GPU：${capabilities?.gpuNames?.join(", ") || "已检测"}`
                    : "未发现可用 GPU 硬件编码器，开始任务时会回退到 CPU"}
              </span>
            </div>
          </div>

          <UsageCard activeEncodingJob={activeEncodingJob} device={processingDevice} usage={systemUsage} />

          <AutomationOptions options={automationOptions} onChange={updateAutomationOption} />

          <div className="actions">
            <button className="primary-button" disabled={!canStart} onClick={startBatch} type="button">
              <Play size={17} />
              <span>开始处理</span>
            </button>
            <button className="ghost-button action-button" disabled={!isRunning || pauseTransitioning} onClick={togglePause} type="button">
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              <span>{isPaused ? "继续" : "暂停"}</span>
            </button>
            <button className="ghost-button danger-button" disabled={!isRunning} onClick={cancelBatch} type="button">
              <CircleStop size={17} />
              <span>取消</span>
            </button>
          </div>
        </aside>

        <section className="queue-panel">
          <div className="queue-toolbar">
            <div>
              <p className="eyebrow">Queue</p>
              <h2>处理队列</h2>
            </div>
            <div className="toolbar-actions">
              <button className="icon-button" disabled={isRunning || !canClearFinished} onClick={clearFinished} title="清除已完成" type="button">
                <RotateCcw size={18} />
              </button>
              <button className="secondary-button" disabled={isRunning} onClick={addVideos} type="button">
                <Plus size={18} />
                <span>添加视频</span>
              </button>
            </div>
          </div>

          <div className="summary-strip">
            <Metric icon={<ListVideo size={16} />} label="总数" value={totals.total} />
            <Metric icon={<Clock3 size={16} />} label="处理中" value={totals.active} />
            <Metric icon={<CheckCircle2 size={16} />} label="完成" value={totals.done} />
            <Metric icon={<TriangleAlert size={16} />} label="压制失败" value={totals.errors} />
          </div>

          {notice && (
            <div className="notice">
              <Sparkles size={16} />
              <span>{notice}</span>
            </div>
          )}

          {jobs.length === 0 ? (
            <button className="empty-state" onClick={addVideos} type="button">
              <Video size={32} />
              <span>选择本地视频</span>
            </button>
          ) : (
            <div className="queue-list">
              {jobs.map((job) => (
                <QueueItem
                  job={job}
                  key={job.id}
                  now={clockNow}
                  onOpen={() => openProcessingOutput(job, "open")}
                  onRemove={() => removeJob(job.id)}
                  onReveal={() => openProcessingOutput(job, "reveal")}
                  removeDisabled={isRunning || !canRemoveJob(job)}
                />
              ))}
            </div>
          )}
        </section>
        <UploadQueueDock
          canAdd={canAddTransfer}
          canClearFinished={canClearFinishedTransfers}
          canStart={canStartTransfers}
          expanded={transferDockExpanded}
          items={transferQueueSorted}
          now={clockNow}
          onAddBackup={() => addTransferFiles("backup")}
          onAddUpload={() => addTransferFiles("upload")}
          onCancel={cancelCurrentUpload}
          onClearFinished={clearFinishedTransfers}
          onPauseToggle={toggleCurrentUploadPaused}
          onRemove={removeTransferTask}
          onRetry={retryTransferTask}
          onStart={startTransferQueue}
          onToggle={() => setTransferDockExpanded((current) => !current)}
        />
        </section>
      ) : activeNav === "Cloud" ? (
        <CloudRepository
          authState={authState}
          cloudSpaceId={cloudSpaceId}
          cloudRepositoryDateKey={cloudRepositoryDateKey}
          cloudRepositoryMediaFilterId={cloudRepositoryMediaFilterId}
          cloudRepositoryStatusFilterId={cloudRepositoryStatusFilterId}
          onDeleteItem={deleteCloudRepositoryItem}
          onMediaFilterChange={setCloudRepositoryMediaFilterId}
          onStatusFilterChange={setCloudRepositoryStatusFilterId}
          onRepositoryDateChange={setCloudRepositoryDateKey}
          onLogin={() => setShowLogin(true)}
          onRefresh={(spaceId = cloudSpaceId) => loadCloudRepository(authState, spaceId, cloudRepositoryDateKey, cloudRepositoryStatusFilterId)}
          onSpaceChange={changeCloudSpace}
          repositoryState={repositoryState}
        />
      ) : activeNav === "Delphi" ? (
        <ConversationWorkspace
          allowModeSwitch
          authState={authState}
          onLogin={() => setShowLogin(true)}
          queryMode="plain"
          subtitle="Memory conversation"
          title="Delphi"
        />
      ) : activeNav === "Engine" ? (
        engineUnlocked ? (
          <EngineWorkspace authState={authState} onLock={lockEngine} onLogin={() => setShowLogin(true)} />
        ) : (
          <EngineGate
            error={engineError}
            onChange={(value) => {
              setEnginePassword(value);
              setEngineError("");
            }}
            onSubmit={unlockEngine}
            value={enginePassword}
          />
        )
      ) : activeNav === "Research" ? (
        <ResearchPage
          accessState={researchAccessState}
          authState={authState}
          filters={researchFilters}
          onExportFilteredChats={exportFilteredResearchChats}
          onExportFilteredResources={exportFilteredResearchResources}
          onExportSelectedChats={exportSelectedResearchChats}
          onExportSelectedResources={exportSelectedResearchResources}
          onFilterChange={updateResearchFilter}
          onLogin={() => setShowLogin(true)}
          onLoadMoreChats={loadMoreResearchChats}
          onLoadMoreResources={loadMoreResearchResources}
          onRefresh={() => loadResearchData(researchTab, authState, researchFilters)}
          onRetryAccess={() => loadResearchAccess(authState)}
          onSelectLoadedChats={selectLoadedResearchChats}
          onSelectLoadedResources={selectLoadedResearchResources}
          onTabChange={setResearchTab}
          onToggleChat={toggleResearchChat}
          onToggleResource={toggleResearchResource}
          state={researchState}
          tab={researchTab}
        />
      ) : (
        <PlaceholderPage title={activeNav} />
      )}
      {activeNav === "Editor" && startTimeEditor && (
        <StartTimeDialog
          editor={startTimeEditor}
          onCancel={() => setStartTimeEditor(null)}
          onChange={(changes) => setStartTimeEditor((current) => (current ? { ...current, ...changes } : current))}
          onParseFileName={parseStartTimeFromFileName}
          onSave={saveStartTime}
        />
      )}
      {showAppInfo && (
        <AppInfoDialog
          activeEncoder={activeEncoder}
          capabilities={capabilities}
          info={APP_INFO}
          onCheckUpdates={checkForUpdates}
          onClose={() => setShowAppInfo(false)}
          onOpenUpdate={openUpdateLink}
          onRevealLog={revealMainLog}
          outputDirectory={outputDirectory}
          updateState={updateState}
        />
      )}
      {showLogin && (
        <LoginDialog
          authState={authState}
          form={loginForm}
          mode={loginMode}
          loginStatus={loginStatus}
          emailCodeCooldown={emailCodeCooldown}
          loginMethod={loginMethod}
          onChange={changeLoginForm}
          onClose={closeLoginDialog}
          onLoginMethodChange={changeLoginMethod}
          onLogout={logout}
          onModeChange={changeLoginMode}
          onSendCode={sendEmailCode}
          onSubmit={loginMode === "register" ? submitRegister : submitLogin}
        />
      )}
      </main>
      {showSplash && <SplashScreen />}
    </>
  );
}

function PlaceholderPage({ title }) {
  return (
    <section className="placeholder-page">
      <h1>{title}</h1>
    </section>
  );
}

function EngineGate({ error, label = "Engine", onChange, onSubmit, title = "DL Engine", value }) {
  return (
    <section className="engine-page">
      <form
        className="engine-gate"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="engine-gate-heading">
          <LockKeyhole size={18} />
          <div>
            <strong>{title}</strong>
            <span>{label}</span>
          </div>
        </div>
        <label className="login-field">
          <span>密码</span>
          <div className="login-input-wrap">
            <LockKeyhole size={15} />
            <input
              autoComplete="current-password"
              autoFocus
              onChange={(event) => onChange(event.target.value)}
              placeholder="输入密码"
              type="password"
              value={value}
            />
          </div>
        </label>
        {error && <div className="login-status error">{error}</div>}
        <button className="primary-button" type="submit">
          进入
        </button>
      </form>
    </section>
  );
}

function getEngineErrorMessage(error) {
  const message = String(error?.message || error || "").trim();
  if (/fetch failed|ECONNREFUSED|Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return "DL Engine API 未连接";
  }
  return message || "DL Engine 请求失败";
}

function getEngineStatusLabel(status) {
  if (status === "online") return "Online";
  if (status === "checking") return "Checking";
  if (status === "offline") return "Offline";
  return "Engine";
}

function getEngineStatusDetail(engineStatus) {
  if (engineStatus.status === "online") {
    const health = engineStatus.health || {};
    return [health.pipeline_version, health.storage, health.vespa_search].filter(Boolean).join(" · ") || "Ready";
  }
  return engineStatus.message || "Waiting";
}

function formatEngineTimeRange(range) {
  if (!range?.start) {
    return "";
  }

  const options = {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  };
  const start = new Date(range.start).toLocaleString("zh-CN", options);
  const end = range.end ? new Date(range.end).toLocaleString("zh-CN", options) : "";
  return end ? `${start} - ${end}` : start;
}

function getEngineSourceLabel(type) {
  const labels = {
    event: "记忆事件",
    memory_event: "记忆事件",
    span: "证据片段",
    evidence_span: "证据片段",
    summary: "记忆摘要",
    memory_summary: "记忆摘要",
    timeseries: "时序信号",
    signal_episode: "信号片段"
  };
  return labels[type] || type || "证据";
}

function getEngineConfidenceLabel(value) {
  const labels = {
    high: "高置信度",
    medium: "中等置信度",
    low: "低置信度",
    not_found: "未找到"
  };
  return labels[value] || value || "未知";
}

function getEngineEvidenceCountLabel(count) {
  return `${Number(count || 0)} 条证据`;
}

function getEngineSearchSupport(response, index) {
  return response?.debug?.result_support?.[index]?.support || "";
}

function getEnginePlanSummary(plan) {
  if (!plan) {
    return "";
  }

  const compiled = plan.aggregation?.compiled_query;
  const intent = compiled?.intent || plan.intent || "";
  const sources = (plan.sources || []).map(getEngineSourceLabel).filter(Boolean).slice(0, 4);
  const passes = (compiled?.retrieval_passes || []).map((item) => item.name).filter(Boolean).slice(0, 4);
  return [intent, sources.join(" / "), passes.join(" / ")].filter(Boolean).join(" · ");
}

function getEngineEntryStatusLabel(entry) {
  if (entry.status === "loading") return "Running";
  if (entry.status === "error") return "Error";
  if (entry.kind === "query") return getEngineConfidenceLabel(entry.response?.confidence);
  return `${entry.response?.results?.length || 0} hits`;
}

function getEngineIndexResults(response) {
  if (Array.isArray(response?.results)) {
    return response.results;
  }
  if (Array.isArray(response?.items)) {
    return response.items;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
}

function getEngineIndexResultKey(hit, index) {
  return hit?.id || hit?.source_id || hit?.span_id || hit?.asset_id || `${index}-index-result`;
}

function getEngineIndexContentText(hit) {
  return (
    hit?.content_text ||
    hit?.text ||
    hit?.summary_text ||
    hit?.summary ||
    hit?.description ||
    hit?.caption_text ||
    hit?.ocr_text ||
    ""
  );
}

function formatEngineJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value || "");
  }
}

function getEngineRawRefFromReferences(references) {
  for (const reference of references || []) {
    const rawRef = (reference?.raw_refs || []).find((item) => item?.asset_id);
    if (rawRef) {
      return rawRef;
    }
  }
  return null;
}

function getEngineMediaSeconds(value) {
  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds / 1000 : 0;
}

function formatEngineMediaOffset(value) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0s";
  }
  return formatDurationCompact(milliseconds) || `${Math.round(milliseconds / 1000)}s`;
}

function getEngineMediaSegmentLabel(rawRef) {
  if (!rawRef?.asset_id) {
    return "";
  }
  const start = formatEngineMediaOffset(rawRef.start_offset_ms);
  const endValue = Number(rawRef.end_offset_ms);
  const startValue = Number(rawRef.start_offset_ms);
  if (!Number.isFinite(endValue) || endValue <= startValue) {
    return `${start} 开始`;
  }
  return `${start} - ${formatEngineMediaOffset(endValue)}`;
}

function buildEngineMediaUrl(rawRef, mediaProxyUrl) {
  if (!rawRef?.asset_id || !mediaProxyUrl) {
    return "";
  }

  const normalizedBase = String(mediaProxyUrl).replace(/\/+$/, "");
  const start = getEngineMediaSeconds(rawRef.start_offset_ms);
  const end = getEngineMediaSeconds(rawRef.end_offset_ms);
  const mediaUrl = `${normalizedBase}/engine-media/assets/${encodeURIComponent(rawRef.asset_id)}/media?expires_seconds=600`;
  if (end > start) {
    return `${mediaUrl}#t=${start.toFixed(3)},${end.toFixed(3)}`;
  }
  if (start > 0) {
    return `${mediaUrl}#t=${start.toFixed(3)}`;
  }
  return mediaUrl;
}

function EngineMediaPreview({ mediaProxyUrl, rawRef }) {
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [mediaState, setMediaState] = useState({ status: "idle", kind: "video" });
  const src = rawRef?.asset_id ? buildEngineMediaUrl(rawRef, mediaProxyUrl) : "";

  useEffect(() => {
    setPlaybackFailed(false);
    if (!src) {
      setMediaState({ status: "idle", kind: "video" });
      return undefined;
    }

    const controller = new AbortController();
    const mediaProbeUrl = src.split("#")[0];
    setMediaState({ status: "loading", kind: "video" });

    fetch(mediaProbeUrl, { method: "HEAD", signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`media unavailable (${response.status})`);
        }
        const contentType = response.headers.get("content-type") || "";
        setMediaState({
          status: "ready",
          kind: contentType.startsWith("audio/") ? "audio" : "video"
        });
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setMediaState({ status: "error", kind: "video" });
        }
      });

    return () => controller.abort();
  }, [src]);

  if (!rawRef?.asset_id) {
    return null;
  }

  return (
    <div className="engine-media-preview">
      <div className="engine-media-caption">
        {mediaState.kind === "audio" ? <FileAudio size={14} /> : <Video size={14} />}
        <span>{getEngineMediaSegmentLabel(rawRef)}</span>
      </div>
      {!src ? (
        <div className="engine-media-placeholder">视频代理未就绪</div>
      ) : mediaState.status === "loading" ? (
        <div className="engine-media-placeholder">正在读取媒体</div>
      ) : mediaState.status === "error" || playbackFailed ? (
        <div className="engine-media-placeholder">媒体源暂不可用</div>
      ) : mediaState.kind === "audio" ? (
        <div className="engine-audio-frame">
          <audio controls onError={() => setPlaybackFailed(true)} preload="metadata" src={src} />
        </div>
      ) : (
        <div className="engine-video-frame">
          <video controls onError={() => setPlaybackFailed(true)} preload="metadata" src={src} />
        </div>
      )}
    </div>
  );
}

function normalizeConversationSessions(result, queryMode) {
  const items = Array.isArray(result)
    ? result
    : Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.sessions)
        ? result.sessions
        : [];
  const mode = normalizeConversationQueryMode(queryMode);
  return items.filter((item) => {
    const itemMode = item?.query_mode === "agent" ? "agent" : "plain";
    return itemMode === mode;
  });
}

function getConversationTitle(item, fallback = "新对话") {
  return String(item?.title || item?.latest_question || "").trim() || fallback;
}

function formatConversationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function ConversationWorkspace({ allowModeSwitch = false, authState, embedded = false, onLogin, queryMode, subtitle, title }) {
  const [selectedQueryMode, setSelectedQueryMode] = useState(() => normalizeConversationQueryMode(queryMode));
  const mode = allowModeSwitch ? selectedQueryMode : normalizeConversationQueryMode(queryMode);
  const token = authState?.token || "";
  const [sessions, setSessions] = useState([]);
  const [activeSessionCode, setActiveSessionCode] = useState("new");
  const [session, setSession] = useState(null);
  const [draft, setDraft] = useState("");
  const [thinkingLevel, setThinkingLevel] = useState("1");
  const [listState, setListState] = useState({ status: "idle", message: "" });
  const [sessionState, setSessionState] = useState({ status: "idle", message: "" });
  const [streaming, setStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [streamTurn, setStreamTurn] = useState(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setSessions([]);
    setActiveSessionCode("new");
    setSession(null);
    setStreamTurn(null);
    setStreamStatus("");
    if (!token) {
      setListState({ status: "idle", message: "" });
      return undefined;
    }

    setListState({ status: "loading", message: "" });
    fetchConversationSessions(token, mode)
      .then((result) => {
        if (cancelled) return;
        const nextSessions = normalizeConversationSessions(result, mode);
        setSessions(nextSessions);
        setListState({ status: "ready", message: "" });
        if (nextSessions[0]?.session_code) {
          setActiveSessionCode(nextSessions[0].session_code);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setListState({ status: "error", message: error.message || "会话列表加载失败" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, token]);

  useEffect(() => {
    let cancelled = false;
    if (!token || !activeSessionCode || activeSessionCode === "new" || streaming) {
      if (activeSessionCode === "new") {
        setSession(null);
        setSessionState({ status: "idle", message: "" });
      }
      return undefined;
    }

    setSessionState({ status: "loading", message: "" });
    fetchConversationSession(token, activeSessionCode, mode)
      .then((result) => {
        if (!cancelled) {
          setSession(result);
          setSessionState({ status: "ready", message: "" });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSession(null);
          setSessionState({ status: "error", message: error.message || "会话加载失败" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeSessionCode, mode, streaming, token]);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    const frame = window.requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSessionCode, session?.messages?.length, streamTurn?.answer]);

  function startNewConversation() {
    if (streaming) return;
    setActiveSessionCode("new");
    setSession(null);
    setSessionState({ status: "idle", message: "" });
    setStreamTurn(null);
    setStreamStatus("");
    setDraft("");
  }

  async function refreshConversationSessions(preferredSessionCode = activeSessionCode) {
    if (!token) return;
    try {
      const result = await fetchConversationSessions(token, mode);
      const nextSessions = normalizeConversationSessions(result, mode);
      setSessions(nextSessions);
      setListState({ status: "ready", message: "" });
      if (
        preferredSessionCode &&
        preferredSessionCode !== "new" &&
        nextSessions.some((item) => item.session_code === preferredSessionCode)
      ) {
        setActiveSessionCode(preferredSessionCode);
      }
    } catch (error) {
      setListState({ status: "error", message: error.message || "会话列表加载失败" });
    }
  }

  async function submitConversation(event) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || streaming) return;
    if (!token) {
      onLogin?.();
      return;
    }

    const requestId = createConversationRequestId(mode);
    let resolvedSessionCode = activeSessionCode || "new";
    let completedSession = null;
    setDraft("");
    setStreaming(true);
    setStreamStatus("正在准备回答");
    setStreamTurn({
      answer: "",
      candidateEvidences: [],
      error: "",
      evidences: [],
      question,
      requestId
    });

    try {
      await streamConversationInput(
        token,
        resolvedSessionCode,
        mode,
        {
          client_request_id: requestId,
          question_text: question,
          query_mode: mode,
          thinking_level: Number(thinkingLevel) || 0,
          top_k: 3
        },
        ({ event: eventName, data }) => {
          if (eventName === "queue") {
            const position = Number(data?.position || 0);
            setStreamStatus(position > 0 ? `排队中 · 前方 ${position} 个请求` : "排队中");
            return;
          }
          if (eventName === "status") {
            setStreamStatus(data?.text || data?.stage || "正在处理");
            return;
          }
          if (eventName === "session" && data?.session_code) {
            resolvedSessionCode = data.session_code;
            setActiveSessionCode(data.session_code);
            return;
          }
          if (eventName === "candidate_evidence") {
            setStreamTurn((current) => current ? {
              ...current,
              candidateEvidences: Array.isArray(data?.evidences) ? data.evidences : []
            } : current);
            return;
          }
          if (eventName === "selected_evidence") {
            setStreamTurn((current) => current ? {
              ...current,
              evidences: Array.isArray(data?.evidences) ? data.evidences : current.evidences
            } : current);
            return;
          }
          if (eventName === "delta") {
            const text = String(data?.text || "");
            setStreamTurn((current) => current ? { ...current, answer: `${current.answer || ""}${text}` } : current);
            return;
          }
          if (eventName === "final") {
            setStreamTurn((current) => current ? {
              ...current,
              answer: String(data?.answer || current.answer || ""),
              evidences: Array.isArray(data?.evidences) ? data.evidences : current.evidences
            } : current);
            return;
          }
          if (eventName === "done") {
            if (data?.session) {
              completedSession = data.session;
              resolvedSessionCode = data.session.session_code || resolvedSessionCode;
              setSession(data.session);
              setSessionState({ status: "ready", message: "" });
            }
            setStreamStatus("回答完成");
          }
        }
      );

      if (!completedSession && resolvedSessionCode !== "new") {
        completedSession = await fetchConversationSession(token, resolvedSessionCode, mode);
        setSession(completedSession);
        setSessionState({ status: "ready", message: "" });
      }
      if (completedSession) {
        setStreamTurn(null);
      }
      await refreshConversationSessions(resolvedSessionCode);
    } catch (error) {
      const message = error.message || "对话请求失败";
      setStreamStatus(message);
      setStreamTurn((current) => current ? { ...current, error: message } : current);
    } finally {
      setStreaming(false);
    }
  }

  const messages = Array.isArray(session?.messages) ? session.messages : [];
  const activeSummary = sessions.find((item) => item.session_code === activeSessionCode);
  const activeTitle = activeSessionCode === "new"
    ? "新对话"
    : getConversationTitle(session || activeSummary, activeSessionCode);
  const activeSubtitle = allowModeSwitch
    ? mode === "agent"
      ? "DL Engine Agent memory conversation"
      : "Direct memory conversation"
    : subtitle;

  return (
    <section className={`conversation-workspace ${embedded ? "embedded" : ""}`}>
      <aside className="conversation-sidebar">
        <header className="conversation-sidebar-head">
          <button className="engine-icon-button" disabled={streaming} onClick={startNewConversation} title="新建对话" type="button">
            <Plus size={16} />
          </button>
          <div>
            <strong>{title}</strong>
            <span>{mode === "agent" ? "Agent sessions" : "Plain sessions"}</span>
          </div>
          <button className="engine-icon-button" disabled={!token || streaming} onClick={() => refreshConversationSessions()} title="刷新会话" type="button">
            <RotateCcw size={15} />
          </button>
        </header>
        <div className="conversation-session-list">
          {!token ? (
            <div className="conversation-sidebar-empty">登录后查看会话</div>
          ) : listState.status === "loading" ? (
            <div className="conversation-sidebar-empty">正在加载会话</div>
          ) : listState.status === "error" ? (
            <div className="conversation-sidebar-empty error">{listState.message}</div>
          ) : sessions.length === 0 ? (
            <div className="conversation-sidebar-empty">还没有{mode === "agent" ? " Agent" : " Plain"}对话</div>
          ) : (
            sessions.map((item) => (
              <button
                className={item.session_code === activeSessionCode ? "conversation-session active" : "conversation-session"}
                disabled={streaming}
                key={item.session_code}
                onClick={() => {
                  setActiveSessionCode(item.session_code);
                  setSession(null);
                  setStreamTurn(null);
                  setStreamStatus("");
                }}
                type="button"
              >
                <Sparkles size={15} />
                <span>
                  <strong>{getConversationTitle(item)}</strong>
                  <small>{formatConversationTime(item.update_time)}</small>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="conversation-main">
        <header className="conversation-header">
          <div>
            <strong>{activeTitle}</strong>
            <span>{activeSubtitle}</span>
          </div>
          {allowModeSwitch ? (
            <div aria-label="Delphi conversation mode" className="conversation-mode-switch" role="tablist">
              {["plain", "agent"].map((item) => (
                <button
                  aria-selected={mode === item}
                  className={mode === item ? "active" : ""}
                  disabled={streaming}
                  key={item}
                  onClick={() => {
                    setSelectedQueryMode(item);
                    setDraft("");
                    setStreamStatus("");
                  }}
                  role="tab"
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : (
            <span className={`conversation-mode-badge ${mode}`}>{mode}</span>
          )}
        </header>

        <div className="conversation-messages" ref={messagesRef}>
          {!token ? (
            <div className="conversation-empty-state">
              <UserRound size={24} />
              <strong>登录后使用 {title}</strong>
              <span>会话和消息会按当前账号隔离。</span>
              <button className="primary-button" onClick={onLogin} type="button">登录</button>
            </div>
          ) : sessionState.status === "loading" && !streamTurn ? (
            <div className="conversation-empty-state">正在加载对话</div>
          ) : sessionState.status === "error" && !streamTurn ? (
            <div className="conversation-empty-state error">{sessionState.message}</div>
          ) : messages.length === 0 && !streamTurn ? (
            <div className="conversation-empty-state">
              <Sparkles size={24} />
              <strong>{mode === "agent" ? "开始 Agent 对话" : "开始 Plain 对话"}</strong>
              <span>{mode === "agent" ? "由 DL Engine Agent 检索记忆并生成回答。" : "直接检索记忆上下文并生成回答。"}</span>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ConversationMessage
                  key={message.id || `${message.role}-${message.create_time || index}`}
                  message={message}
                  token={token}
                />
              ))}
              {streamTurn && <ConversationStreamTurn status={streamStatus} token={token} turn={streamTurn} />}
            </>
          )}
        </div>

        <form className="conversation-composer" onSubmit={submitConversation}>
          <textarea
            disabled={!token || streaming}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={token ? "输入问题，Enter 发送，Shift + Enter 换行" : "请先登录"}
            rows={2}
            value={draft}
          />
          <div className="conversation-composer-footer">
            <span title={streamStatus}>{streamStatus}</span>
            <div>
              <select disabled={!token || streaming} onChange={(event) => setThinkingLevel(event.target.value)} value={thinkingLevel}>
                <option value="0">Fast</option>
                <option value="1">Balanced</option>
                <option value="2">Deep</option>
                <option value="3">Max</option>
              </select>
              <button className="primary-button" disabled={!token || streaming || !draft.trim()} type="submit">
                {streaming ? <Activity size={15} /> : <Play size={15} />}
                <span>{streaming ? "Working" : "Send"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

function ConversationMessage({ message, token }) {
  const role = String(message?.role || "assistant").toLowerCase();
  const evidences = Array.isArray(message?.evidences) ? message.evidences : [];
  return (
    <div className={`conversation-message-row ${role}`}>
      <article className={`conversation-message ${role}`}>
        {role !== "user" && <Sparkles size={15} />}
        <div>
          <p>{message?.content || ""}</p>
          {evidences.length > 0 && <ResearchEvidenceList evidences={evidences} resolveUrl={resolveConversationEvidenceUrl} token={token} />}
          {message?.processing_status === "FAILED" && message?.processing_error && (
            <span className="conversation-message-error">{message.processing_error}</span>
          )}
        </div>
      </article>
      {message?.create_time && <time dateTime={message.create_time}>{formatConversationTime(message.create_time)}</time>}
    </div>
  );
}

function ConversationStreamTurn({ status, token, turn }) {
  const evidences = turn.evidences.length > 0 ? turn.evidences : turn.candidateEvidences;
  return (
    <>
      <div className="conversation-message-row user pending">
        <article className="conversation-message user"><div><p>{turn.question}</p></div></article>
      </div>
      <div className="conversation-message-row assistant pending">
        <article className={`conversation-message assistant ${turn.error ? "error" : "streaming"}`}>
          <Sparkles size={15} />
          <div>
            <p>{turn.answer || (turn.error ? turn.error : status || "正在处理...")}</p>
            {evidences.length > 0 && <ResearchEvidenceList evidences={evidences} resolveUrl={resolveConversationEvidenceUrl} token={token} />}
            {turn.error && turn.answer && <span className="conversation-message-error">{turn.error}</span>}
          </div>
        </article>
      </div>
    </>
  );
}

function EngineWorkspace({ authState, onLock, onLogin }) {
  const [activeEngineTab, setActiveEngineTab] = useState("search");
  const [engineView, setEngineView] = useState("workspace");
  const [engineUseVespa, setEngineUseVespa] = useState(false);
  const [engineInput, setEngineInput] = useState("");
  const [searchEvents, setSearchEvents] = useState([]);
  const [queryEvents, setQueryEvents] = useState([]);
  const [engineStatus, setEngineStatus] = useState({ status: "checking", message: "", health: null });
  const [engineMediaProxyUrl, setEngineMediaProxyUrl] = useState("");
  const [engineIndexState, setEngineIndexState] = useState({
    status: "idle",
    message: "",
    response: null,
    loadedAt: ""
  });

  useEffect(() => {
    let isCurrent = true;

    async function checkHealth() {
      try {
        const health = await requestEngine("/healthz");
        if (isCurrent) {
          setEngineStatus({ status: "online", message: "", health });
        }
      } catch (error) {
        if (isCurrent) {
          setEngineStatus({ status: "offline", message: getEngineErrorMessage(error), health: null });
        }
      }
    }

    checkHealth();
    const intervalId = window.setInterval(checkHealth, ENGINE_HEALTH_RETRY_MS);
    return () => {
      isCurrent = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadMediaProxyUrl() {
      try {
        const proxyUrl = typeof dlEditor.getEngineMediaProxyUrl === "function" ? await dlEditor.getEngineMediaProxyUrl() : "";
        if (isCurrent) {
          setEngineMediaProxyUrl(proxyUrl || "");
        }
      } catch {
        if (isCurrent) {
          setEngineMediaProxyUrl("");
        }
      }
    }

    loadMediaProxyUrl();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function refreshEngineHealth() {
    setEngineView("workspace");
    setEngineInput("");
    setSearchEvents([]);
    setQueryEvents([]);
    setEngineStatus((current) => ({ ...current, status: "checking", message: "" }));
    try {
      const health = await requestEngine("/healthz");
      setEngineStatus({ status: "online", message: "", health });
    } catch (error) {
      setEngineStatus({ status: "offline", message: getEngineErrorMessage(error), health: null });
    }
  }

  function updateEngineEntry(kind, id, patch) {
    const updater = (current) =>
      current.map((entry) => {
        if (entry.id !== id) {
          return entry;
        }
        const nextPatch = typeof patch === "function" ? patch(entry) : patch;
        return { ...entry, ...nextPatch };
      });
    if (kind === "search") {
      setSearchEvents(updater);
    } else {
      setQueryEvents(updater);
    }
  }

  function handleEngineQaStreamEvent(entryId, startedAt, message) {
    const eventName = message?.event || "message";
    const data = message?.data || {};

    if (eventName === "planner_status") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          planner_status: data,
          planner_progress: [...(entry.response?.planner_progress || []), data].slice(-14)
        }),
        status: "streaming",
        streamStage: "planner"
      }));
      return;
    }

    if (eventName === "evidence_status") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          evidence_status: data,
          evidence_progress: [...(entry.response?.evidence_progress || []), data].slice(-14)
        }),
        status: "streaming",
        streamStage: "evidence"
      }));
      return;
    }

    if (eventName === "answer_start") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          index_watermark: data.index_watermark,
          plan: data.plan,
          query_id: data.query_id
        }),
        status: "streaming",
        streamStage: "evidence"
      }));
      return;
    }

    if (eventName === "search.plan") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, { plan: data }),
        status: "streaming",
        streamStage: "evidence"
      }));
      return;
    }

    if (eventName === "answer_delta") {
      const text = String(data.text || "");
      updateEngineEntry("query", entryId, (entry) => {
        const previousStreamAnswer = entry.response?.stream_answer || entry.response?.answer || "";
        const nextStreamAnswer =
          data.replace && text ? text : data.replace ? previousStreamAnswer : `${previousStreamAnswer}${text}`;
        return {
          response: mergeEngineQaResponse(entry.response, {
            answer: nextStreamAnswer,
            stream_answer: nextStreamAnswer,
            answer_source: data.source || entry.response?.answer_source
          }),
          status: "streaming",
          streamStage: data.source === "llm" ? "llm" : "grounded"
        };
      });
      return;
    }

    if (eventName === "citations") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          citations: Array.isArray(data) ? data : []
        }),
        status: "streaming",
        streamStage: "evidence"
      }));
      return;
    }

    if (eventName === "evidence_reasoning") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          evidence_reasoning: Array.isArray(data) ? data : []
        }),
        status: "streaming",
        streamStage: "reasoning"
      }));
      return;
    }

    if (eventName === "retrieval_results") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          retrieval_results: Array.isArray(data) ? data : []
        }),
        status: "streaming",
        streamStage: "retrieval"
      }));
      return;
    }

    if (eventName === "llm_status") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          llm_status: data
        }),
        status: "streaming",
        streamStage: data.stage === "refinement_finished" ? "llm" : "llm_waiting"
      }));
      return;
    }

    if (eventName === "llm_thinking_delta") {
      const text = String(data.text || "");
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          llm_thinking: `${entry.response?.llm_thinking || ""}${text}`,
          llm_status: { stage: "thinking", elapsed_ms: data.elapsed_ms }
        }),
        status: "streaming",
        streamStage: "llm_thinking"
      }));
      return;
    }

    if (eventName === "refinement_error") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          refinement_error: data.message || "LLM refinement unavailable"
        }),
        status: "streaming",
        streamStage: "llm_error"
      }));
      return;
    }

    if (eventName === "done") {
      updateEngineEntry("query", entryId, (entry) => ({
        elapsedMs: data.latency_ms || Math.max(1, Math.round(performance.now() - startedAt)),
        response: (() => {
          const finalAnswer =
            nonEmptyEngineAnswer(data.answer) ||
            nonEmptyEngineAnswer(entry.response?.answer) ||
            nonEmptyEngineAnswer(entry.response?.stream_answer);
          return mergeEngineQaResponse(entry.response, {
            answer: finalAnswer,
            final_answer: finalAnswer,
            confidence: data.confidence || entry.response?.confidence,
            evidence_reasoning: data.evidence_reasoning || entry.response?.evidence_reasoning || [],
            refined: Boolean(data.refined),
            retrieval_results: data.retrieval_results || entry.response?.retrieval_results || []
          });
        })(),
        status: "done",
        streamStage: data.refined ? "done_refined" : "done_grounded"
      }));
      return;
    }

    if (eventName === "stream_error") {
      updateEngineEntry("query", entryId, {
        elapsedMs: Math.max(1, Math.round(performance.now() - startedAt)),
        error: data.message || "DL Engine QA stream failed.",
        status: "error"
      });
    }
  }

  async function commitEnginePrompt(prompt) {
    const value = String(prompt || "").trim();
    if (!value) {
      return;
    }

    const kind = activeEngineTab;
    const startedAt = performance.now();
    const entry = {
      id: `${Date.now()}-${kind}`,
      kind,
      prompt: value,
      status: "loading",
      version: engineUseVespa ? "Vespa" : "Local",
      versionMode: engineUseVespa ? "Vespa hybrid" : "Local multi-index",
      scopeTitle: "DL Engine Memory",
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    };

    if (kind === "search") {
      setSearchEvents((current) => [entry, ...current].slice(0, 8));
    } else {
      setQueryEvents((current) => [...current, entry].slice(-8));
    }

    try {
      if (kind === "search") {
        const response = await requestEngine("/v1/search", {
          method: "POST",
          body: {
            query: value,
            hits: 8,
            include_debug: true,
            use_vespa: engineUseVespa,
            request_id: entry.id
          }
        });

        updateEngineEntry(kind, entry.id, {
          elapsedMs: Math.max(1, Math.round(performance.now() - startedAt)),
          response,
          status: "done"
        });
      } else {
        await streamEngineQa(
          {
            query: value,
            response_mode: "sse",
            include_plan: true,
            max_answer_tokens: 1024
          },
          (message) => handleEngineQaStreamEvent(entry.id, startedAt, message)
        );
      }
      setEngineStatus((current) => ({ status: "online", message: "", health: current.health || { status: "ok" } }));
    } catch (error) {
      const message = getEngineErrorMessage(error);
      updateEngineEntry(kind, entry.id, {
        elapsedMs: Math.max(1, Math.round(performance.now() - startedAt)),
        error: message,
        status: "error"
      });
      setEngineStatus({ status: "offline", message, health: null });
    }
  }

  function submitEnginePrompt(event) {
    event.preventDefault();
    setEngineView("workspace");
    commitEnginePrompt(engineInput);
    setEngineInput("");
  }

  async function loadEngineIndexContent() {
    setEngineView("test");
    setEngineIndexState({
      status: "loading",
      message: "",
      response: null,
      loadedAt: ""
    });

    try {
      let response = null;
      if (typeof dlEditor.getEngineIndexContent === "function") {
        try {
          response = await dlEditor.getEngineIndexContent();
        } catch (error) {
          if (/No handler registered for 'engine:get-index-content'/i.test(String(error?.message || error))) {
            throw new Error("Engine index handler 还没有加载，请重启 Electron dev app 后再点测试 icon。");
          }
          throw error;
        }
      }
      if (!response) {
        response = await requestEngine("/v1/search", {
          method: "POST",
          body: {
            query: ENGINE_INDEX_QUERY,
            hits: ENGINE_INDEX_HITS,
            include_debug: true,
            use_vespa: engineUseVespa,
            request_id: `engine-index-${Date.now()}`
          }
        });
      }

      setEngineIndexState({
        status: "done",
        message: "",
        response,
        loadedAt: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      });
      setEngineStatus((current) => ({ status: "online", message: "", health: current.health || { status: "ok" } }));
    } catch (error) {
      const message = getEngineErrorMessage(error);
      setEngineIndexState({
        status: "error",
        message,
        response: null,
        loadedAt: ""
      });
      setEngineStatus({ status: "offline", message, health: null });
    }
  }

  function runEngineTest() {
    loadEngineIndexContent();
  }

  function clearEngineWorkspace() {
    setEngineView("workspace");
    setEngineInput("");
    setSearchEvents([]);
    setQueryEvents([]);
    setEngineIndexState({ status: "idle", message: "", response: null, loadedAt: "" });
    refreshEngineHealth();
  }

  return (
    <section className="engine-workspace">
      <header className="engine-main-toolbar">
        <div className="engine-toolbar-title">
          <strong>DL Engine</strong>
          <span>{activeEngineTab === "query" ? "Infera agent conversation" : getEngineStatusDetail(engineStatus)}</span>
        </div>
        <div aria-label="Engine mode" className="engine-tabs" role="tablist">
          {["search", "query"].map((tab) => (
            <button
              aria-selected={activeEngineTab === tab}
              className={activeEngineTab === tab ? "active" : ""}
              key={tab}
              onClick={() => {
                setActiveEngineTab(tab);
                setEngineView("workspace");
              }}
              role="tab"
              type="button"
            >
              {tab === "search" ? <Search size={15} /> : <Sparkles size={15} />}
              <span>{tab === "search" ? "Search" : "Query"}</span>
            </button>
          ))}
        </div>
        <div className="engine-toolbar-actions">
          {activeEngineTab === "search" && (
            <>
              <label className="engine-vespa-toggle">
                <input checked={engineUseVespa} onChange={(event) => setEngineUseVespa(event.target.checked)} type="checkbox" />
                <span>Vespa</span>
              </label>
              <button className="engine-icon-button" onClick={clearEngineWorkspace} title="刷新" type="button">
                <RotateCcw size={16} />
              </button>
              <button className="engine-icon-button" onClick={runEngineTest} title="测试" type="button">
                <Activity size={17} />
              </button>
            </>
          )}
          <button className="engine-icon-button danger" onClick={onLock} title="锁定" type="button">
            <LockKeyhole size={17} />
          </button>
        </div>
      </header>

      {engineView === "test" ? (
        <EngineTestView
          engineIndexState={engineIndexState}
          engineMediaProxyUrl={engineMediaProxyUrl}
          onRefresh={loadEngineIndexContent}
          useVespa={engineUseVespa}
        />
      ) : (
        <section className={`engine-main ${activeEngineTab === "query" ? "conversation-mode" : ""}`}>
          {activeEngineTab === "search" ? (
            <EngineSearchPanel engineMediaProxyUrl={engineMediaProxyUrl} engineStatus={engineStatus} entries={searchEvents} useVespa={engineUseVespa} />
          ) : (
            <ConversationWorkspace
              authState={authState}
              embedded
              onLogin={onLogin}
              queryMode="agent"
              subtitle="DL Engine Agent memory conversation"
              title="Engine"
            />
          )}

          {activeEngineTab === "search" && <form className="engine-input-bar" onSubmit={submitEnginePrompt}>
            <label className="engine-input-wrap">
              {activeEngineTab === "search" ? <Search size={16} /> : <Sparkles size={16} />}
              <input
                autoComplete="off"
                onChange={(event) => setEngineInput(event.target.value)}
                placeholder={activeEngineTab === "search" ? "输入检索内容" : "输入问题"}
                type="text"
                value={engineInput}
              />
            </label>
            <button className="primary-button engine-submit-button" type="submit">
              {activeEngineTab === "search" ? <Search size={15} /> : <Play size={15} />}
              <span>{activeEngineTab === "search" ? "Search" : "Query"}</span>
            </button>
          </form>}
        </section>
      )}
    </section>
  );
}

function EngineTestView({ engineIndexState, engineMediaProxyUrl, onRefresh, useVespa }) {
  const response = engineIndexState.response || null;
  const results = getEngineIndexResults(response);
  const isLoading = engineIndexState.status === "loading";
  const planSummary = getEnginePlanSummary(response?.debug?.query_plan || response?.plan);
  const rawJson = response ? formatEngineJson(response) : "";
  const counts = Array.isArray(response?.counts) ? response.counts : [];
  const sourceLabel = response?.db_path ? "SQLite records" : "Search API";

  return (
    <section className="engine-test-view">
      <header className="engine-panel-head">
        <div>
          <strong>Index Content</strong>
          <span>
            {useVespa ? "Vespa hybrid" : "Local multi-index"} · {results.length} results
            {engineIndexState.loadedAt ? ` · ${engineIndexState.loadedAt}` : ""}
          </span>
        </div>
        <button className="secondary-button engine-test-refresh" disabled={isLoading} onClick={onRefresh} type="button">
          <RotateCcw size={15} />
          <span>{isLoading ? "Loading" : "Refresh"}</span>
        </button>
      </header>

      <div className="engine-test-body">
        {isLoading ? (
          <div className="engine-empty-state">Loading index content</div>
        ) : engineIndexState.status === "error" ? (
          <div className="engine-test-alert">
            <TriangleAlert size={16} />
            <span>{engineIndexState.message}</span>
          </div>
        ) : !response ? (
          <div className="engine-empty-state">No index response</div>
        ) : (
          <>
            <div className="engine-index-summary">
              <div>
                <span>Source</span>
                <strong>{sourceLabel}</strong>
              </div>
              <div>
                <span>Records</span>
                <strong>{results.length}</strong>
              </div>
              <div>
                <span>Kinds</span>
                <strong>{counts.length || "-"}</strong>
              </div>
            </div>
            {response?.db_path && <p className="engine-plan-line">{response.db_path}</p>}
            {counts.length > 0 && (
              <div className="engine-index-counts">
                {counts.map((item) => (
                  <span key={item.kind}>
                    {item.kind}: {item.count}
                  </span>
                ))}
              </div>
            )}
            {planSummary && <p className="engine-plan-line">{planSummary}</p>}
            <div className="engine-index-list">
              {results.length === 0 ? (
                <div className="engine-empty-state">No index content returned</div>
              ) : (
                results.map((hit, index) => (
                  <EngineIndexResult hit={hit} index={index} key={getEngineIndexResultKey(hit, index)} mediaProxyUrl={engineMediaProxyUrl} />
                ))
              )}
            </div>
            <details className="engine-index-raw">
              <summary>Raw index response</summary>
              <pre>{rawJson}</pre>
            </details>
          </>
        )}
      </div>
    </section>
  );
}

function EngineIndexResult({ hit, index, mediaProxyUrl }) {
  const evidenceRefs = hit?.evidence_refs || hit?.references || [];
  const rawRef = getEngineRawRefFromReferences(evidenceRefs);
  const timeRange = formatEngineTimeRange(hit?.time_range);
  const matchedFields = Array.isArray(hit?.matched_fields) ? hit.matched_fields.join(" / ") : "";
  const contentText = getEngineIndexContentText(hit);

  return (
    <article className="engine-index-result">
      <div className="engine-hit-title-row">
        <strong>{hit?.title || hit?.label || hit?.id || `Index ${index + 1}`}</strong>
        <span>{Number(hit?.score || 0).toFixed(3)}</span>
      </div>
      <div className="engine-meta-row">
        <span>{getEngineSourceLabel(hit?.type || hit?.source_type)}</span>
        {hit?.id && <span>{hit.id}</span>}
        {timeRange && <span>{timeRange}</span>}
        <span>{getEngineEvidenceCountLabel(evidenceRefs.length)}</span>
        {matchedFields && <span>{matchedFields}</span>}
      </div>
      {hit?.snippet && <p>{hit.snippet}</p>}
      {contentText && contentText !== hit?.snippet && <p>{contentText}</p>}
      <EngineMediaPreview mediaProxyUrl={mediaProxyUrl} rawRef={rawRef} />
      <details className="engine-index-result-raw">
        <summary>JSON</summary>
        <pre>{formatEngineJson(hit)}</pre>
      </details>
    </article>
  );
}

function EngineSearchPanel({ engineMediaProxyUrl, engineStatus, entries, useVespa }) {
  return (
    <section className="engine-presenter">
      <div className="engine-panel-head">
        <div>
          <strong>Search</strong>
          <span>{useVespa ? "Vespa hybrid" : "Local multi-index"}</span>
        </div>
        <span className={`engine-status-pill ${engineStatus.status}`}>{getEngineStatusLabel(engineStatus.status)}</span>
      </div>
      <div className="engine-result-list">
        {entries.length === 0 ? (
          <div className="engine-empty-state">等待检索</div>
        ) : (
          entries.map((entry) => (
            <article className={`engine-result-item ${entry.status}`} key={entry.id}>
              <div>
                <strong>{entry.prompt}</strong>
                <span>
                  {entry.scopeTitle} · {entry.versionMode || entry.version} · {entry.time}
                </span>
                <EngineSearchEntryBody entry={entry} mediaProxyUrl={engineMediaProxyUrl} />
              </div>
              <b>{getEngineEntryStatusLabel(entry)}</b>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function EngineSearchEntryBody({ entry, mediaProxyUrl }) {
  if (entry.status === "loading") {
    return <p className="engine-entry-message">正在执行多索引检索...</p>;
  }

  if (entry.status === "error") {
    return <p className="engine-entry-message error">{entry.error}</p>;
  }

  const results = entry.response?.results || [];
  const planSummary = getEnginePlanSummary(entry.response?.debug?.query_plan);
  if (results.length === 0) {
    return (
      <div className="engine-hit-stack">
        {planSummary && <p className="engine-plan-line">{planSummary}</p>}
        <p className="engine-entry-message">没有找到可引用证据。</p>
      </div>
    );
  }

  return (
    <div className="engine-hit-stack">
      {planSummary && <p className="engine-plan-line">{planSummary}</p>}
      {results.map((hit, index) => (
        <EngineSearchHit hit={hit} key={hit.id || `${entry.id}-${index}`} mediaProxyUrl={mediaProxyUrl} support={getEngineSearchSupport(entry.response, index)} />
      ))}
    </div>
  );
}

function EngineSearchHit({ hit, mediaProxyUrl, support }) {
  const evidenceRefs = hit.evidence_refs || [];
  const rawRef = getEngineRawRefFromReferences(evidenceRefs);
  const timeRange = formatEngineTimeRange(hit.time_range);
  const matchedFields = (hit.matched_fields || []).slice(0, 3).join(" / ");

  return (
    <article className="engine-hit">
      <div className="engine-hit-title-row">
        <strong>{hit.title || hit.id}</strong>
        <span>{Number(hit.score || 0).toFixed(3)}</span>
      </div>
      <div className="engine-meta-row">
        <span>{getEngineSourceLabel(hit.type)}</span>
        {support && <span>{support}</span>}
        {timeRange && <span>{timeRange}</span>}
        <span>{getEngineEvidenceCountLabel(evidenceRefs.length)}</span>
        {matchedFields && <span>{matchedFields}</span>}
      </div>
      {hit.snippet && <p>{hit.snippet}</p>}
      <EngineMediaPreview mediaProxyUrl={mediaProxyUrl} rawRef={rawRef} />
    </article>
  );
}

function EngineQueryPanel({ engineMediaProxyUrl, engineStatus, entries, useVespa }) {
  return (
    <section className="engine-presenter">
      <div className="engine-panel-head">
        <div>
          <strong>Query</strong>
          <span>{useVespa ? "Vespa hybrid" : "Local multi-index"}</span>
        </div>
        <span className={`engine-status-pill ${engineStatus.status}`}>{getEngineStatusLabel(engineStatus.status)}</span>
      </div>
      <div className="engine-qa-stream">
        {entries.length === 0 ? (
          <div className="engine-empty-state">等待 query</div>
        ) : (
          entries.map((entry) => (
            <article className="engine-qa-pair" key={entry.id}>
              <div className="engine-question">
                <strong>{entry.prompt}</strong>
                <span>
                  {entry.versionMode || entry.version} · {entry.time}
                </span>
              </div>
              <div className="engine-answer">
                <Sparkles size={15} />
                <EngineQueryEntryBody entry={entry} mediaProxyUrl={engineMediaProxyUrl} />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function getEngineQueryStageLabel(stage) {
  switch (stage) {
    case "planner":
      return "Query planner running";
    case "evidence":
      return "EvidencePack 构建中";
    case "grounded":
      return "Grounded answer 已生成";
    case "reasoning":
      return "Evidence reasoning 已生成";
    case "retrieval":
      return "Retrieval results 已生成";
    case "llm_waiting":
      return "LLM refinement waiting for tokens";
    case "llm_thinking":
      return "LLM thinking streaming";
    case "llm":
      return "LLM refinement 流式生成中";
    case "llm_error":
      return "LLM refinement 不可用，保留 grounded answer";
    case "done_refined":
      return "最终回答已由 LLM refinement 改写并通过证据校验";
    case "done_grounded":
      return "最终回答来自 grounded answer";
    default:
      return "正在构建 evidence pack";
  }
}

function getEngineLlmStatusLabel(status) {
  const stage = status?.stage || "";
  switch (stage) {
    case "refinement_started":
      return "LLM refinement started";
    case "waiting_for_llm_delta":
      return `Waiting for LLM stream${status.elapsed_ms ? ` · ${status.elapsed_ms} ms` : ""}`;
    case "thinking":
      return `Thinking${status.elapsed_ms ? ` · ${status.elapsed_ms} ms` : ""}`;
    case "refinement_finished":
      return `LLM refinement finished${status.elapsed_ms ? ` · ${status.elapsed_ms} ms` : ""}`;
    default:
      return "LLM refinement running";
  }
}

function getEnginePlannerStatusLabel(status) {
  if (!status) {
    return "Query planner queued";
  }
  const details = [];
  if (status.intent) {
    details.push(status.intent);
  }
  if (status.compiled_intent && status.compiled_intent !== status.intent) {
    details.push(`compiled ${status.compiled_intent}`);
  }
  if (status.answer_shape) {
    details.push(status.answer_shape);
  }
  if (status.operator) {
    details.push(status.operator);
  }
  if (status.ranking_profile) {
    details.push(status.ranking_profile);
  }
  if (status.model) {
    details.push(status.model);
  }
  if (status.fallback) {
    details.push(`fallback ${status.fallback}`);
  }
  if (status.fallback_intent) {
    details.push(`baseline ${status.fallback_intent}`);
  }
  if (typeof status.concept_count === "number") {
    details.push(`${status.concept_count} concepts`);
  }
  if (typeof status.candidate_budget === "number") {
    details.push(`${status.candidate_budget} candidates`);
  }
  if (Array.isArray(status.hard_constraints)) {
    details.push(`${status.hard_constraints.length} constraints`);
  }
  if (Array.isArray(status.retrieval_passes)) {
    details.push(`${status.retrieval_passes.length} passes`);
  }
  if (typeof status.elapsed_ms === "number") {
    details.push(`${status.elapsed_ms} ms`);
  }
  if (status.rationale) {
    details.push(status.rationale);
  }
  if (status.reason) {
    details.push(status.reason);
  }
  return [status.message || status.stage || "Query planner", details.join(" 路 ")].filter(Boolean).join(" 路 ");
}

function getEngineEvidenceStatusLabel(status) {
  if (!status) {
    return "EvidencePack build queued";
  }
  const details = [];
  if (status.pass) {
    details.push(`pass ${status.pass}${status.max_passes ? `/${status.max_passes}` : ""}`);
  }
  if (typeof status.candidate_count === "number") {
    details.push(`${status.candidate_count} candidates`);
  }
  if (typeof status.accumulated_candidate_count === "number") {
    details.push(`${status.accumulated_candidate_count} fused`);
  }
  if (typeof status.item_count === "number") {
    details.push(`${status.item_count} evidence items`);
  }
  if (typeof status.direct_support_count === "number") {
    details.push(`${status.direct_support_count} direct`);
  }
  if (typeof status.elapsed_ms === "number") {
    details.push(`${status.elapsed_ms} ms`);
  }
  return [status.message || status.stage || "EvidencePack build", details.join(" · ")].filter(Boolean).join(" · ");
}

function getEngineReasoningStepLabel(step) {
  switch (step) {
    case "retrieval":
      return "Retrieval";
    case "support_check":
      return "Support";
    case "synthesis":
      return "Synthesis";
    case "gap":
      return "Gap";
    default:
      return "Reasoning";
  }
}

function getEngineSupportLabel(support) {
  switch (support) {
    case "direct":
      return "direct";
    case "inference":
      return "inference";
    case "near":
      return "near";
    case "missing":
      return "missing";
    case "not_found":
      return "not found";
    default:
      return "support";
  }
}

function EngineQueryEntryBody({ entry, mediaProxyUrl }) {
  const response = entry.response || {};
  const displayAnswer = response.final_answer || response.answer || response.stream_answer || "";
  const citations = response.citations || [];
  const evidenceReasoning = response.evidence_reasoning || [];
  const retrievalResults = response.retrieval_results || [];
  const plannerProgress = response.planner_progress || [];
  const plannerStatus = response.planner_status || null;
  const evidenceProgress = response.evidence_progress || [];
  const evidenceStatus = response.evidence_status || null;
  const llmThinking = response.llm_thinking || "";
  const llmStatus = response.llm_status || null;
  const planSummary = getEnginePlanSummary(response.plan);

  if (
    entry.status === "loading" &&
    !displayAnswer &&
    !citations.length &&
    !evidenceReasoning.length &&
    !plannerProgress.length &&
    !evidenceProgress.length
  ) {
    return <span>正在构建 evidence pack...</span>;
  }

  if (entry.status === "error") {
    return <span className="engine-error-text">{entry.error}</span>;
  }

  return (
    <div className="engine-answer-content">
      <div className="engine-meta-row">
        <span>{getEngineConfidenceLabel(response.confidence)}</span>
        <span>{getEngineEvidenceCountLabel(citations.length)}</span>
        <span>{getEngineQueryStageLabel(entry.streamStage)}</span>
        {entry.elapsedMs && <span>{entry.elapsedMs} ms</span>}
      </div>
      {planSummary && <p className="engine-plan-line">{planSummary}</p>}
      {(plannerStatus || plannerProgress.length > 0) && (
        <div className="engine-planner-progress">
          <div>
            <strong>Query planner process</strong>
            <span>{getEnginePlannerStatusLabel(plannerStatus || plannerProgress[plannerProgress.length - 1])}</span>
          </div>
          <ol>
            {plannerProgress.slice(-8).map((item, index) => (
              <li key={`${item.stage || "planner"}-${item.elapsed_ms || index}-${index}`}>
                <span>{item.stage || "planner"}</span>
                <p>{getEnginePlannerStatusLabel(item)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {(evidenceStatus || evidenceProgress.length > 0) && (
        <div className="engine-evidence-progress">
          <div>
            <strong>EvidencePack process</strong>
            <span>{getEngineEvidenceStatusLabel(evidenceStatus || evidenceProgress[evidenceProgress.length - 1])}</span>
          </div>
          <ol>
            {evidenceProgress.slice(-8).map((item, index) => (
              <li key={`${item.stage || "stage"}-${item.elapsed_ms || index}-${index}`}>
                <span>{item.stage || "stage"}</span>
                <p>{getEngineEvidenceStatusLabel(item)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p>{displayAnswer || "正在等待 grounded answer..."}</p>
      {(llmThinking || llmStatus) && (
        <div className="engine-thinking-panel">
          <div>
            <strong>LLM thinking</strong>
            <span>{getEngineLlmStatusLabel(llmStatus)}</span>
          </div>
          {llmThinking && <p>{llmThinking}</p>}
        </div>
      )}
      {response.refinement_error && <p className="engine-entry-message error">{response.refinement_error}</p>}
      {evidenceReasoning.length > 0 && (
        <div className="engine-reasoning-list">
          {evidenceReasoning.map((step, index) => (
            <article className="engine-reasoning-step" key={`${step.step || "step"}-${index}`}>
              <div>
                <strong>{getEngineReasoningStepLabel(step.step)}</strong>
                <span>{getEngineSupportLabel(step.support)}</span>
              </div>
              <p>{step.claim}</p>
              {step.reason && <small>{step.reason}</small>}
            </article>
          ))}
        </div>
      )}
      {retrievalResults.length > 0 && (
        <div className="engine-retrieval-result-list">
          {retrievalResults.map((result, index) => (
            <div className="engine-retrieval-result" key={result.id || index}>
              <strong>{result.title || `${getEngineSourceLabel(result.type)} ${index + 1}`}</strong>
              <span>
                {getEngineSourceLabel(result.type)} · score {Number(result.score || 0).toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      )}
      {citations.length > 0 && (
        <div className="engine-citation-list">
          {citations.map((citation, index) => (
            <div className="engine-citation" key={citation.source_id || citation.span_id || index}>
              <strong>{citation.label || citation.source_id || `证据 ${index + 1}`}</strong>
              <span>
                {getEngineSourceLabel(citation.source_type)} · {formatEngineTimeRange(citation.time_range) || "无时间范围"}
              </span>
              <EngineMediaPreview mediaProxyUrl={mediaProxyUrl} rawRef={getEngineRawRefFromReferences([citation])} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResearchPage({
  accessState,
  authState,
  filters,
  onExportFilteredChats,
  onExportFilteredResources,
  onExportSelectedChats,
  onExportSelectedResources,
  onFilterChange,
  onLogin,
  onLoadMoreChats,
  onLoadMoreResources,
  onRefresh,
  onRetryAccess,
  onSelectLoadedChats,
  onSelectLoadedResources,
  onTabChange,
  onToggleChat,
  onToggleResource,
  state,
  tab
}) {
  const isLoading = state.status === "loading";
  const users = state.users || [];
  const [activeResourceId, setActiveResourceId] = useState("");
  const [activeChatId, setActiveChatId] = useState("");
  const [showBatchExport, setShowBatchExport] = useState(false);
  const [exportAllState, setExportAllState] = useState({ open: false, status: "idle", data: null, message: "" });
  const selectedResourceCount = state.selectedResourceIds?.length || 0;
  const selectedChatCount = state.selectedChatIds?.length || 0;
  const loadedResourceCount = state.resources?.length || 0;
  const loadedChatCount = state.chats?.length || 0;
  const activeResource = (state.resources || []).find((item) => getResearchResourceId(item) === String(activeResourceId)) || state.resources?.[0] || null;
  const activeChat = (state.chats || []).find((item) => getResearchChatId(item) === String(activeChatId)) || state.chats?.[0] || null;
  const exportDownload = state.exportDownload?.kind === tab ? state.exportDownload : null;

  useEffect(() => {
    if (tab !== "resources") return;
    const ids = (state.resources || []).map(getResearchResourceId);
    if (!ids.length) {
      setActiveResourceId("");
    } else if (!ids.includes(String(activeResourceId))) {
      setActiveResourceId(ids[0]);
    }
  }, [activeResourceId, state.resources, tab]);

  useEffect(() => {
    if (tab !== "chats") return;
    const ids = (state.chats || []).map(getResearchChatId);
    if (!ids.length) {
      setActiveChatId("");
    } else if (!ids.includes(String(activeChatId))) {
      setActiveChatId(ids[0]);
    }
  }, [activeChatId, state.chats, tab]);

  const tabs = [
    ["resources", "Resources"],
    ["chats", "Chats"],
    ["simulation", "Simulation"],
    ["statistics", "Statistics"]
  ];
  const title = tab === "chats" ? "Agent Chats" : tab === "simulation" ? "Research Simulation" : tab === "statistics" ? "User Statistics" : "Research Resources";
  const meta =
    tab === "chats"
      ? `${loadedChatCount}${state.chatsTotal > loadedChatCount ? ` / ${state.chatsTotal}` : ""} chats loaded · Selected ${selectedChatCount} chats`
      : tab === "simulation"
        ? "Use a provider's data context without writing to their chat history"
      : tab === "statistics"
        ? `${state.statistics?.users?.length || 0} users counted`
        : `${loadedResourceCount}${state.resourcesTotal > loadedResourceCount ? ` / ${state.resourcesTotal}` : ""} files loaded · Selected ${selectedResourceCount} items`;

  async function openExportAllModal() {
    setExportAllState({ open: true, status: "loading", data: null, message: "Checking matching resources..." });
    try {
      const data = await fetchResearchExportCount(authState.token, filters, 2000);
      setExportAllState({ open: true, status: "ready", data, message: "" });
    } catch (error) {
      setExportAllState({ open: true, status: "error", data: null, message: error.message || "Unable to count matching resources" });
    }
  }

  async function confirmExportAll() {
    setExportAllState((current) => ({ ...current, status: "exporting" }));
    await onExportFilteredResources();
    setExportAllState({ open: false, status: "idle", data: null, message: "" });
  }

  if (!authState?.token) {
    return (
      <section className="research-login-page">
        <div className="research-login-card">
          <div className="research-login-icon">
            <LockKeyhole size={24} />
          </div>
          <div className="research-login-copy">
            <h1>登录后访问 Research</h1>
            <p>使用当前 DL Studio 账户查看有权限的 Research 数据。</p>
          </div>
          <button className="primary-button" onClick={onLogin} type="button">
            <UserRound size={16} />
            <span>登录</span>
          </button>
        </div>
      </section>
    );
  }

  const accessStatus = state.status === "forbidden" ? "forbidden" : accessState?.status;

  if (accessStatus === "idle" || accessStatus === "checking") {
    return (
      <section className="research-login-page">
        <div className="research-login-card">
          <div className="research-login-icon">
            <LockKeyhole size={24} />
          </div>
          <div className="research-login-copy">
            <h1>正在检查 Research 权限</h1>
            <p>正在读取当前账号的访问权限。</p>
          </div>
        </div>
      </section>
    );
  }

  if (accessStatus === "forbidden") {
    return (
      <section className="research-login-page">
        <div className="research-login-card">
          <div className="research-login-icon">
            <LockKeyhole size={24} />
          </div>
          <div className="research-login-copy">
            <h1>无 Research 访问权限</h1>
            <p>{accessState?.message || "当前账号未被授予 Research 访问权限，请联系管理员。"}</p>
          </div>
          <button className="primary-button" onClick={onRetryAccess} type="button">
            <RotateCcw size={16} />
            <span>重新检查</span>
          </button>
        </div>
      </section>
    );
  }

  if (accessStatus === "error") {
    return (
      <section className="research-login-page">
        <div className="research-login-card">
          <div className="research-login-icon">
            <TriangleAlert size={24} />
          </div>
          <div className="research-login-copy">
            <h1>无法验证 Research 权限</h1>
            <p>{accessState?.message || "请检查网络后重试。"}</p>
          </div>
          <button className="primary-button" onClick={onRetryAccess} type="button">
            <RotateCcw size={16} />
            <span>重试</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="research-page">
      <div className="research-tabs">
        {tabs.map(([id, label]) => (
          <button className={tab === id ? "active" : ""} key={id} onClick={() => onTabChange(id)} type="button">
            {label}
          </button>
        ))}
      </div>
      <div className="research-body">
        <header className="research-head">
          <div>
            <p className="eyebrow">RESEARCH</p>
            <h1>{title}</h1>
            <span>
              {tab === "chats"
                ? `${state.chatsTotal || 0} chats · selected ${selectedChatCount}`
                : tab === "statistics"
                  ? `${state.statistics?.users?.length || 0} users`
                  : tab === "simulation"
                    ? "Researcher-owned test conversations"
                  : `${state.resourcesTotal || 0} files · selected ${selectedResourceCount}`}
            </span>
          </div>
          {tab === "resources" && (
            <div className="research-count-chips">
              <span>Videos <strong>{formatResearchNumber(state.videoCount)}</strong></span>
              <span>Audio <strong>{formatResearchNumber(state.audioCount)}</strong></span>
            </div>
          )}
          <button className="secondary-button research-refresh" disabled={isLoading} onClick={onRefresh} type="button">
            <RotateCcw size={16} />
            <span>{isLoading ? "Loading" : "Refresh"}</span>
          </button>
        </header>

        {(tab === "resources" || tab === "chats") && <ResearchFilters filters={filters} onChange={onFilterChange} showStatus={tab === "resources"} users={users} />}

        {state.status === "error" && (
          <div className="repository-alert">
            <TriangleAlert size={16} />
            <span>{state.message}</span>
          </div>
        )}
        {state.exportMessage && <div className="notice">{state.exportMessage}</div>}
        {exportDownload && (
          <div className="research-download-notice">
            <div>
              <strong>导出包已就绪</strong>
              <span>
                {[formatBytes(exportDownload.sizeBytes), formatResearchDownloadExpiry(exportDownload.expiresAt)].filter(Boolean).join(" · ")}
              </span>
            </div>
            <a className="secondary-button" download={exportDownload.filename} href={exportDownload.url} rel="noreferrer">
              <Download size={16} />
              <span>再次下载 {exportDownload.filename}</span>
            </a>
          </div>
        )}

        {tab === "chats" ? (
          <ResearchChatsView
            activeId={getResearchChatId(activeChat)}
            activeItem={activeChat}
            hasMore={loadedChatCount < Number(state.chatsTotal || 0)}
            items={state.chats}
            onExportFiltered={onExportFilteredChats}
            onExportSelected={onExportSelectedChats}
            onLoadMore={onLoadMoreChats}
            onSelectItem={setActiveChatId}
            onSelectLoaded={onSelectLoadedChats}
            onToggle={onToggleChat}
            selectedIds={state.selectedChatIds}
            token={authState.token}
          />
        ) : tab === "simulation" ? (
          <ResearchSimulationView token={authState.token} users={users} />
        ) : tab === "statistics" ? (
          <ResearchStatisticsView data={state.statistics} />
        ) : (
          <ResearchResourcesView
            activeId={getResearchResourceId(activeResource)}
            activeItem={activeResource}
            hasMore={loadedResourceCount < Number(state.resourcesTotal || 0)}
            items={state.resources}
            onBatchExport={() => setShowBatchExport(true)}
            onExportFiltered={openExportAllModal}
            onExportSelected={onExportSelectedResources}
            onLoadMore={onLoadMoreResources}
            onSelectItem={setActiveResourceId}
            onSelectLoaded={onSelectLoadedResources}
            onToggle={onToggleResource}
            selectedIds={state.selectedResourceIds}
            token={authState.token}
          />
        )}
      </div>
      {showBatchExport && (
        <ResearchBatchExportModal
          initialUserId={filters.userId}
          onClose={() => setShowBatchExport(false)}
          token={authState.token}
          users={users}
        />
      )}
      {exportAllState.open && (
        <ResearchExportAllModal
          onClose={() => setExportAllState({ open: false, status: "idle", data: null, message: "" })}
          onConfirm={confirmExportAll}
          state={exportAllState}
        />
      )}
    </section>
  );
}

function ResearchFilters({ filters, onChange, showStatus, users }) {
  return (
    <div className="research-filter-row">
      <select onChange={(event) => onChange({ userId: event.target.value })} value={filters.userId}>
        <option value="">All users</option>
        {users.map((user) => (
          <option key={user.user_id || user.id} value={user.user_id || user.id}>
            {getResearchUserLabel(user)}
          </option>
        ))}
      </select>
      {showStatus && (
        <select onChange={(event) => onChange({ status: event.target.value })} value={filters.status}>
          {RESEARCH_RESOURCE_STATUSES.map((status) => (
            <option key={status.id || "all"} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
      )}
      <label className="research-date-input">
        <span>From</span>
        <input onChange={(event) => onChange({ from: event.target.value })} type="date" value={filters.from} />
      </label>
      <label className="research-date-input">
        <span>To</span>
        <input onChange={(event) => onChange({ to: event.target.value })} type="date" value={filters.to} />
      </label>
    </div>
  );
}

function ResearchExportAllModal({ onClose, onConfirm, state }) {
  const data = state.data || {};
  const total = Number(data.total || 0);
  const estimated = Number(data.estimated_export_count || 0);
  const busy = state.status === "loading" || state.status === "exporting";
  const message = state.status === "error"
    ? state.message
    : state.status === "loading"
      ? "Checking matching resources..."
      : data.truncated
        ? `${formatResearchNumber(total)} assets match. The most recent ${formatResearchNumber(estimated)} will be exported because each export is limited to ${formatResearchNumber(data.max_assets || 2000)}.`
        : total > 0
          ? `${formatResearchNumber(total)} assets match the current filters and will be exported.`
          : "No parsed media matches the current filters.";
  return (
    <div className="research-modal" onClick={busy ? undefined : onClose}>
      <div className="research-modal-panel research-export-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>Export all matching resources</h2>
          <button className="ghost-button" disabled={busy} onClick={onClose} type="button">Close</button>
        </header>
        <div className="research-modal-body">
          <div className="research-export-summary">
            <div><span>Videos</span><strong>{state.status === "loading" ? "--" : formatResearchNumber(data.video_count)}</strong></div>
            <div><span>Audio</span><strong>{state.status === "loading" ? "--" : formatResearchNumber(data.audio_count)}</strong></div>
            <div><span>Will export</span><strong>{state.status === "loading" ? "--" : formatResearchNumber(estimated)}</strong></div>
          </div>
          <div className={`research-export-status ${state.status === "error" ? "error" : ""}`}>{message}</div>
        </div>
        <footer>
          <span>Uses the current filters · maximum 2,000 assets</span>
          <div>
            <button className="ghost-button" disabled={busy} onClick={onClose} type="button">Cancel</button>
            <button className="primary-button" disabled={state.status !== "ready" || estimated <= 0} onClick={onConfirm} type="button">
              {state.status === "exporting" ? "Exporting" : "Export"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ResearchBatchExportModal({ initialUserId, onClose, token, users }) {
  const [userId, setUserId] = useState(initialUserId || "");
  const [date, setDate] = useState(() => getLocalDateKey());
  const [includeMedia, setIncludeMedia] = useState(true);
  const [countState, setCountState] = useState({ status: "idle", total: 0, video: 0, audio: 0, message: "" });
  const [jobState, setJobState] = useState({ status: "idle", data: null, message: "" });
  const running = jobState.status === "running";

  useEffect(() => {
    let cancelled = false;
    if (!userId || !date) {
      setCountState({ status: "idle", total: 0, video: 0, audio: 0, message: "Select a user and date to check available resources." });
      return undefined;
    }
    setCountState({ status: "loading", total: 0, video: 0, audio: 0, message: "Checking available resources..." });
    fetchResearchResources(token, { userId, from: date, to: date }, { limit: 1, offset: 0 })
      .then((data) => {
        if (cancelled) return;
        const total = Number(data?.total || 0);
        const video = Number(data?.video_count || 0);
        const audio = Number(data?.audio_count || 0);
        setCountState({
          status: "ready",
          total,
          video,
          audio,
          message: total > 0 ? `Found ${formatResearchNumber(video)} videos and ${formatResearchNumber(audio)} audio assets.` : "No parsed media is available for this user and date."
        });
      })
      .catch((error) => {
        if (!cancelled) setCountState({ status: "error", total: 0, video: 0, audio: 0, message: error.message || "Unable to count resources" });
      });
    return () => { cancelled = true; };
  }, [date, token, userId]);

  async function startExport() {
    if (!userId || !date || countState.total <= 0 || running) return;
    setJobState({ status: "running", data: null, message: "Queuing export..." });
    try {
      let data = await createResearchDailyExport(token, {
        user_id: Number(userId),
        date,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai",
        include_media: includeMedia
      });
      while (data.status !== "READY") {
        if (data.status === "FAILED") throw new Error(data.error_message || "Batch export failed");
        const mode = data.include_media === false ? "parsed data only" : "media and parsed data";
        setJobState({ status: "running", data, message: `${data.status === "PROCESSING" ? "Packaging" : "Queued"} ${formatResearchNumber(data.asset_count)} assets (${mode}).` });
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        data = await fetchResearchDailyExport(token, data.job_id);
      }
      await saveResearchDownload(data, data.filename || "research-daily-export.zip");
      const mode = data.include_media === false ? "parsed data only" : "media and parsed data";
      setJobState({
        status: "ready",
        data,
        message: `${data.cached ? "Cached package" : "Package ready"}: ${mode}. ${formatResearchNumber(data.asset_count)} assets, ${formatBytes(data.size_bytes) || "0 B"}.`
      });
    } catch (error) {
      setJobState({ status: "error", data: null, message: error.message || "Batch export failed" });
    }
  }

  return (
    <div className="research-modal" onClick={running ? undefined : onClose}>
      <div className="research-modal-panel research-export-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>Batch export</h2>
          <button className="ghost-button" disabled={running} onClick={onClose} type="button">Close</button>
        </header>
        <div className="research-modal-body">
          <div className="research-batch-fields">
            <label><span>User *</span><select disabled={running} onChange={(event) => setUserId(event.target.value)} value={userId}>
              <option value="">Select a user</option>
              {users.map((user) => <option key={user.user_id || user.id} value={user.user_id || user.id}>{getResearchUserLabel(user)}</option>)}
            </select></label>
            <label><span>Date *</span><input disabled={running} onChange={(event) => setDate(event.target.value)} type="date" value={date} /></label>
          </div>
          <div className="research-export-summary">
            <div><span>Videos</span><strong>{countState.status === "loading" ? "--" : formatResearchNumber(countState.video)}</strong></div>
            <div><span>Audio</span><strong>{countState.status === "loading" ? "--" : formatResearchNumber(countState.audio)}</strong></div>
            <div><span>Total assets</span><strong>{countState.status === "loading" ? "--" : formatResearchNumber(countState.total)}</strong></div>
          </div>
          <label className="research-export-media-option">
            <input checked={includeMedia} disabled={running} onChange={(event) => setIncludeMedia(event.target.checked)} type="checkbox" />
            <span><strong>Include video and audio files</strong><small>Turn this off to export metadata and parsed data only.</small></span>
          </label>
          <div className={`research-export-status ${countState.status === "error" || jobState.status === "error" ? "error" : ""}`}>
            {jobState.status === "idle" ? countState.message : jobState.message}
          </div>
          {jobState.status === "ready" && jobState.data?.download_url && (
            <a className="secondary-button research-export-download" download={jobState.data.filename} href={jobState.data.download_url} rel="noreferrer">Download {jobState.data.filename}</a>
          )}
        </div>
        <footer>
          <span>Parsed media only</span>
          <div>
            <button className="ghost-button" disabled={running} onClick={onClose} type="button">Cancel</button>
            <button className="primary-button" disabled={running || countState.status !== "ready" || countState.total <= 0} onClick={startExport} type="button">
              {running ? "Packaging" : "Start export"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ResearchSimulationView({ token, users }) {
  const [subjectUserId, setSubjectUserId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activeSessionCode, setActiveSessionCode] = useState("new");
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState("");
  const [thinkingLevel, setThinkingLevel] = useState("0");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [status, setStatus] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [draftAnswer, session?.messages]);

  useEffect(() => {
    let cancelled = false;
    setSessions([]);
    setActiveSessionCode("new");
    setSession(null);
    setDraftAnswer("");
    if (!subjectUserId) {
      setStatus("");
      return undefined;
    }
    setStatus("Loading conversations...");
    fetchResearchSimulationSessions(token, subjectUserId)
      .then((data) => {
        if (!cancelled) {
          setSessions(normalizeResearchItems(data));
          setStatus("");
        }
      })
      .catch((error) => { if (!cancelled) setStatus(error.message || "Unable to load simulations"); });
    return () => { cancelled = true; };
  }, [subjectUserId]);

  async function loadSession(sessionCode) {
    if (!subjectUserId || streaming) return;
    setStatus("Loading conversation...");
    try {
      const data = await fetchResearchSimulationSession(token, subjectUserId, sessionCode);
      setActiveSessionCode(sessionCode);
      setSession(data);
      setDraftAnswer("");
      setStatus("");
    } catch (error) {
      setStatus(error.message || "Unable to load the conversation");
    }
  }

  function startNewSession() {
    if (streaming) return;
    setActiveSessionCode("new");
    setSession(null);
    setDraftAnswer("");
    setStatus("");
  }

  async function submitQuestion(event) {
    event.preventDefault();
    const normalizedQuestion = question.trim();
    if (!subjectUserId || !normalizedQuestion || streaming) return;
    const requestId = createResearchSimulationStreamId();
    const existingMessages = Array.isArray(session?.messages) ? session.messages : [];
    setSession((current) => ({ ...(current || {}), messages: [...existingMessages, { role: "user", content: normalizedQuestion, evidences: [] }] }));
    setQuestion("");
    setDraftAnswer("");
    setStreaming(true);
    setStatus("Preparing your answer...");
    let resolvedSessionCode = activeSessionCode || "new";
    try {
      await streamResearchSimulationInput(
        token,
        subjectUserId,
        resolvedSessionCode,
        { client_request_id: requestId, question_text: normalizedQuestion, top_k: 3, thinking_level: Number(thinkingLevel) || 0 },
        ({ event: eventName, data }) => {
          if (eventName === "session" && data?.session_code) {
            resolvedSessionCode = data.session_code;
            setActiveSessionCode(data.session_code);
          } else if (eventName === "status") {
            setStatus(data?.text || data?.stage || "Working...");
          } else if (eventName === "delta") {
            setDraftAnswer((current) => current + (data?.text || ""));
          } else if (eventName === "done" && data?.session) {
            resolvedSessionCode = data.session.session_code || resolvedSessionCode;
            setActiveSessionCode(resolvedSessionCode);
            setSession(data.session);
            setDraftAnswer("");
          }
        }
      );
      const list = await fetchResearchSimulationSessions(token, subjectUserId);
      setSessions(normalizeResearchItems(list));
      if (resolvedSessionCode !== "new") {
        setSession(await fetchResearchSimulationSession(token, subjectUserId, resolvedSessionCode));
        setActiveSessionCode(resolvedSessionCode);
      }
      setStatus("");
    } catch (error) {
      setStatus(error.message || "Unable to complete the conversation");
    } finally {
      setStreaming(false);
      setDraftAnswer("");
    }
  }

  const messages = Array.isArray(session?.messages) ? session.messages : [];
  return (
    <section className="research-simulation-view">
      <aside className="research-simulation-sidebar">
        <div className="research-simulation-toolbar">
          <select disabled={streaming} onChange={(event) => setSubjectUserId(event.target.value)} value={subjectUserId}>
            <option value="">Select data provider</option>
            {users.map((user) => <option key={user.user_id || user.id} value={user.user_id || user.id}>{getResearchUserLabel(user)}</option>)}
          </select>
          <button className="primary-button" disabled={streaming || !subjectUserId} onClick={startNewSession} type="button">New</button>
        </div>
        <div className="research-simulation-sessions">
          {!subjectUserId ? <div className="research-preview-empty">Select a data provider</div> : sessions.length === 0 ? <div className="research-preview-empty">No saved simulations for this provider</div> : sessions.map((item) => (
            <button className={item.session_code === activeSessionCode ? "active" : ""} key={item.session_code} onClick={() => loadSession(item.session_code)} type="button">
              <strong>{item.title || item.latest_question || "Untitled conversation"}</strong>
              <span>{item.update_time ? new Date(item.update_time).toLocaleString() : ""}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="research-simulation-chat">
        <header>
          <div>
            <h2>{activeSessionCode === "new" ? "New research simulation" : session?.title || session?.latest_question || "Research simulation"}</h2>
            {activeSessionCode !== "new" && <span className="research-chat-id" title={activeSessionCode}>Chat ID: {activeSessionCode}</span>}
            <span>The data provider is fixed when a new session starts. Switch providers to browse their conversations.</span>
          </div>
        </header>
        <div className="research-simulation-messages" ref={messagesRef}>
          {!messages.length && !draftAnswer ? (
            <div className="research-preview-empty">{subjectUserId ? "Start a new conversation with this provider's data context." : "Select a data provider, then start a conversation."}</div>
          ) : (
            <>
              {messages.map((message, index) => <ResearchChatMessage key={message.message_id || message.id || `${message.role}-${index}`} message={message} token={token} />)}
              {streaming && <div className="research-chat-message-row assistant"><article className="research-chat-message assistant streaming"><p>{draftAnswer || "..."}</p></article></div>}
            </>
          )}
        </div>
        <form className="research-simulation-composer" onSubmit={submitQuestion}>
          <textarea disabled={streaming || !subjectUserId} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask the agent as this data provider..." value={question} />
          <div><span>{status}</span><select disabled={streaming} onChange={(event) => setThinkingLevel(event.target.value)} value={thinkingLevel}><option value="0">Fast</option><option value="1">Balanced</option><option value="2">Deep</option></select><button className="primary-button" disabled={streaming || !subjectUserId || !question.trim()} type="submit">{streaming ? "Working" : "Send"}</button></div>
        </form>
      </div>
    </section>
  );
}

function ResearchResourcesView({
  activeId,
  activeItem,
  hasMore,
  items,
  onBatchExport,
  onExportFiltered,
  onExportSelected,
  onLoadMore,
  onSelectItem,
  onSelectLoaded,
  onToggle,
  selectedIds,
  token
}) {
  const selected = new Set((selectedIds || []).map(String));
  const groups = groupResearchResources(items || []);
  return (
    <section className="research-shell">
      <div className="research-actions">
        <button className="ghost-button" onClick={onSelectLoaded} type="button">Select loaded</button>
        <button className="primary-button" onClick={onExportSelected} type="button">Export selected</button>
        <button className="ghost-button" onClick={onExportFiltered} type="button">Export all</button>
        <button className="ghost-button" onClick={onBatchExport} type="button">Batch export</button>
      </div>
      <div className="research-workspace">
        <div className="research-gallery">
          {items.length === 0 ? (
            <div className="repository-empty">No matching resources</div>
          ) : (
            <>
              {groups.map((group) => (
                <section className="research-date-group" key={group.dateKey}>
                  <h2>
                    {group.dateLabel}
                    <span>{group.dateKey} · {group.items.length} captures</span>
                  </h2>
                  <div className="research-grid">
                    {group.items.map((item) => {
                      const id = getResearchResourceId(item);
                      return (
                        <ResearchResourceTile
                          active={String(activeId) === id}
                          item={item}
                          key={id}
                          onSelect={onSelectItem}
                          onToggle={onToggle}
                          selected={selected.has(id)}
                          token={token}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
              {hasMore && (
                <div className="research-pager">
                  <button className="ghost-button" onClick={onLoadMore} type="button">Show next {RESEARCH_PAGE_SIZE}</button>
                  <span>{items.length} loaded</span>
                </div>
              )}
            </>
          )}
        </div>
        <ResearchResourceDetail item={activeItem} token={token} />
      </div>
    </section>
  );
}

function ResearchResourceTile({ active, item, onSelect, onToggle, selected, token }) {
  const id = getResearchResourceId(item);
  const timestamp = getResearchItemTimestamp(item);
  function handleClick(event) {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      onToggle(id);
    } else {
      onSelect(id);
    }
  }
  return (
    <article
      className={`research-tile ${active ? "active" : ""} ${selected ? "selected" : ""}`}
      onClick={handleClick}
      onDoubleClick={() => onToggle(id)}
      title={item.file_name || `Asset ${id}`}
    >
      <ResearchThumbnail item={item} token={token} />
      <span className="research-tile-duration">{formatDurationCompact(Number(item.duration_ms || 0)) || "0:00"}</span>
      <span className="research-tile-time">{formatResearchShortTime(timestamp)}</span>
      <span className="research-tile-status">{item.parse_status || "-"}</span>
      <span className="research-tile-check">{selected ? "✓" : ""}</span>
    </article>
  );
}

function ResearchThumbnail({ item, token }) {
  const [url, setUrl] = useState("");
  const [containerRef, shouldLoad] = useResearchLazyLoad();
  useEffect(() => {
    let canceled = false;
    setUrl("");
    if (!shouldLoad || !item?.thumbnail_url || !token) return;
    resolveResearchSignedUrl(token, item.thumbnail_url)
      .then((nextUrl) => {
        if (!canceled) setUrl(nextUrl);
      })
      .catch(() => {
        if (!canceled) setUrl("");
      });
    return () => {
      canceled = true;
    };
  }, [item?.thumbnail_url, shouldLoad, token]);

  return (
    <div className="research-thumb" ref={containerRef}>
      {url ? (
        <img alt="" decoding="async" loading="lazy" src={url} />
      ) : (
        <div className="research-tile-placeholder">
          {isResearchAudio(item) ? <FileAudio size={28} /> : <FileVideo size={28} />}
        </div>
      )}
    </div>
  );
}

function ResearchResourceDetail({ item, token }) {
  const [parsedState, setParsedState] = useState({ data: null, message: "", status: "idle" });

  useEffect(() => {
    let canceled = false;
    if (!item?.parsed_data_url || !token) {
      setParsedState({ data: null, message: "", status: item ? "empty" : "idle" });
      return;
    }
    setParsedState({ data: null, message: "Loading", status: "loading" });
    fetchResearchParsedData(token, item.parsed_data_url)
      .then((data) => {
        if (!canceled) setParsedState({ data, message: "", status: "ready" });
      })
      .catch((error) => {
        if (!canceled) setParsedState({ data: null, message: error.message || "Failed", status: "error" });
      });
    return () => {
      canceled = true;
    };
  }, [item?.parsed_data_url, token]);

  if (!item) {
    return (
      <aside className="research-detail">
        <div className="research-empty compact">Select a video</div>
      </aside>
    );
  }

  const timestamp = getResearchItemTimestamp(item);
  return (
    <aside className="research-detail">
      <header>
        <div>
          <h2>{item.file_name || `Asset ${getResearchResourceId(item)}`}</h2>
          <p>{[item.parse_status, formatResearchDateTime(timestamp), formatBytes(item.size_bytes)].filter(Boolean).join(" · ")}</p>
        </div>
        <span>{isResearchAudio(item) ? "Audio" : "Video"}</span>
      </header>
      <ResearchMediaPreview item={item} token={token} />
      <ResearchParsedPanel state={parsedState} />
    </aside>
  );
}

function ResearchMediaPreview({ item, token }) {
  const [mediaUrl, setMediaUrl] = useState("");
  const path = item?.media_url || item?.video_url || "";
  const audio = isResearchAudio(item);

  useEffect(() => {
    let canceled = false;
    setMediaUrl("");
    if (!path || !token) return;
    resolveResearchSignedUrl(token, path)
      .then((nextUrl) => {
        if (!canceled) setMediaUrl(nextUrl);
      })
      .catch(() => {
        if (!canceled) setMediaUrl("");
      });
    return () => {
      canceled = true;
    };
  }, [path, token]);

  if (!path) return <div className="research-preview-empty">No media URL</div>;
  if (!mediaUrl) return <div className="research-preview-empty">Loading preview</div>;
  return audio ? <audio className="research-audio" controls preload="metadata" src={mediaUrl} /> : <video className="research-video" controls preload="metadata" src={mediaUrl} />;
}

function ResearchParsedPanel({ state }) {
  const data = state.data || {};
  const segments = Array.isArray(data.segments) ? data.segments : [];
  const transcript = Array.isArray(data.transcript_chunks) ? data.transcript_chunks : [];
  const keyframes = Array.isArray(data.keyframes) ? data.keyframes : [];

  if (state.status === "loading") return <div className="research-preview-empty">Loading parsed data</div>;
  if (state.status === "error") return <div className="research-preview-empty">{state.message}</div>;
  if (!data || (!data.summary_text && !segments.length && !transcript.length && !keyframes.length)) {
    return <div className="research-preview-empty">No parsed data</div>;
  }

  return (
    <div className="research-parsed">
      <section>
        <h3>Summary</h3>
        <p>{data.summary_text || "No summary"}</p>
      </section>
      <ResearchParsedList title={`Segments (${segments.length})`} items={segments} textKey="content_text" timeKey="start_ms" />
      <ResearchParsedList title={`Transcript (${transcript.length})`} items={transcript} textKey="content_text" timeKey="start_ms" />
      <ResearchParsedList title={`Keyframes (${keyframes.length})`} items={keyframes} textKey="caption_text" fallbackKey="ocr_text" timeKey="timestamp_ms" />
    </div>
  );
}

function ResearchParsedList({ fallbackKey, items, textKey, timeKey, title }) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length ? (
        items.slice(0, 30).map((item, index) => (
          <div className="research-parsed-item" key={`${title}-${index}`}>
            <strong>{formatDurationCompact(Number(item[timeKey] || 0))}</strong>
            <span>{item[textKey] || (fallbackKey ? item[fallbackKey] : "") || item.title || ""}</span>
          </div>
        ))
      ) : (
        <p className="muted">None</p>
      )}
    </section>
  );
}

function ResearchResources({ items, onExportFiltered, onExportSelected, onSelectLoaded, onToggle, selectedIds }) {
  const selected = new Set((selectedIds || []).map(String));
  return (
    <section className="research-panel">
      <div className="research-actions">
        <button className="ghost-button" onClick={onSelectLoaded} type="button">Select loaded</button>
        <button className="primary-button" onClick={onExportSelected} type="button">Export selected</button>
        <button className="ghost-button" onClick={onExportFiltered} type="button">Export filtered</button>
      </div>
      <div className="research-list">
        {items.length === 0 ? (
          <div className="repository-empty">No resources</div>
        ) : (
          items.map((item) => {
            const id = String(item.asset_id || item.id);
            return (
              <article className="research-row" key={id}>
                <input checked={selected.has(id)} onChange={() => onToggle(id)} type="checkbox" />
                <FileVideo size={17} />
                <div>
                  <strong>{item.file_name || `Asset ${id}`}</strong>
                  <span>{[item.media_type, item.parse_status, item.captured_at || formatRepositoryDate(item.timestamp_ms)].filter(Boolean).join(" · ")}</span>
                  {item.summary_text && <p>{item.summary_text}</p>}
                </div>
                <span>{formatBytes(item.size_bytes) || "-"}</span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function ResearchChatsView({
  activeId,
  activeItem,
  hasMore,
  items,
  onExportFiltered,
  onExportSelected,
  onLoadMore,
  onSelectItem,
  onSelectLoaded,
  onToggle,
  selectedIds,
  token
}) {
  const selected = new Set((selectedIds || []).map(String));
  return (
    <section className="research-shell">
      <div className="research-actions">
        <button className="ghost-button" onClick={onSelectLoaded} type="button">Select loaded chats</button>
        <button className="primary-button" onClick={onExportSelected} type="button">Export selected chats</button>
        <button className="ghost-button" onClick={onExportFiltered} type="button">Export filtered chats</button>
      </div>
      <div className="research-workspace chats">
        <div className="research-chat-list">
          {items.length === 0 ? (
            <div className="repository-empty">No matching chat sessions</div>
          ) : (
            <>
              {items.map((item) => {
                const id = getResearchChatId(item);
                return (
                  <ResearchChatCard
                    active={String(activeId) === id}
                    item={item}
                    key={id}
                    onSelect={onSelectItem}
                    onToggle={onToggle}
                    selected={selected.has(id)}
                  />
                );
              })}
              {hasMore && (
                <div className="research-pager">
                  <button className="ghost-button" onClick={onLoadMore} type="button">Show next {RESEARCH_PAGE_SIZE}</button>
                  <span>{items.length} loaded</span>
                </div>
              )}
            </>
          )}
        </div>
        <ResearchChatDetail item={activeItem} token={token} />
      </div>
    </section>
  );
}

function ResearchChatCard({ active, item, onSelect, onToggle, selected }) {
  const id = getResearchChatId(item);
  const feedback = getResearchFeedbackMessages(item.messages || []);
  const dislikeCount = feedback.filter((message) => normalizeResearchFeedbackRating(message.feedback_rating) === "dislike").length;

  function handleClick(event) {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      onToggle(id);
    } else {
      onSelect(id);
    }
  }

  return (
    <article className={`research-chat-card ${active ? "active" : ""} ${selected ? "selected" : ""}`} onClick={handleClick} onDoubleClick={() => onToggle(id)}>
      <input
        checked={selected}
        onChange={() => onToggle(id)}
        onClick={(event) => event.stopPropagation()}
        type="checkbox"
      />
      <div>
        <strong>{item.title || item.latest_question || item.session_code || `Session ${id}`}</strong>
        <span>{[`User ${item.user_id || "-"}`, `${item.message_count || 0} messages`, formatResearchDateTime(item.update_time || item.created_at_ms)].filter(Boolean).join(" · ")}</span>
        <p>{item.latest_question || item.latest_answer || ""}</p>
        <ResearchFeedbackPreview messages={item.messages || []} />
      </div>
      {feedback.length > 0 && (
        <span className={`research-feedback-badge ${dislikeCount ? "dislike" : "like"}`}>
          {dislikeCount ? `${dislikeCount} dislikes` : `${feedback.length} feedback`}
        </span>
      )}
    </article>
  );
}

function ResearchChats({ items, onExportFiltered, onExportSelected, onSelectLoaded, onToggle, selectedIds }) {
  const selected = new Set((selectedIds || []).map(String));
  return (
    <section className="research-panel">
      <div className="research-actions">
        <button className="ghost-button" onClick={onSelectLoaded} type="button">Select loaded chats</button>
        <button className="primary-button" onClick={onExportSelected} type="button">Export selected chats</button>
        <button className="ghost-button" onClick={onExportFiltered} type="button">Export filtered chats</button>
      </div>
      <div className="research-list">
        {items.length === 0 ? (
          <div className="repository-empty">No chats</div>
        ) : (
          items.map((item) => {
            const id = String(item.session_id || item.id);
            return (
              <article className="research-chat-row" key={id}>
                <input checked={selected.has(id)} onChange={() => onToggle(id)} type="checkbox" />
                <div>
                  <strong>{item.title || item.session_code || `Session ${id}`}</strong>
                  <span>{[`User ${item.user_id || "-"}`, `${item.message_count || 0} messages`, formatRepositoryDate(item.update_time)].filter(Boolean).join(" · ")}</span>
                  <p>{item.latest_question || item.latest_answer || ""}</p>
                  <ResearchFeedbackPreview messages={item.messages || []} />
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function ResearchFeedbackPreview({ messages }) {
  const feedback = getResearchFeedbackMessages(messages);
  if (!feedback.length) return null;
  return (
    <div className="research-feedback">
      {feedback.slice(0, 3).map((message) => (
        <span key={message.message_id || message.id}>
          {normalizeResearchFeedbackRating(message.feedback_rating) === "like" ? "Like" : "Dislike"}{message.feedback_text ? `: ${message.feedback_text}` : ""}
        </span>
      ))}
    </div>
  );
}

function ResearchChatDetail({ item, token }) {
  if (!item) {
    return (
      <aside className="research-detail chat-detail">
        <div className="research-empty compact">Select a chat session</div>
      </aside>
    );
  }

  const messages = Array.isArray(item.messages) ? item.messages : [];
  const chatId = item.session_code || getResearchChatId(item);
  return (
    <aside className="research-detail chat-detail">
      <header>
        <div>
          <h2>{item.title || item.latest_question || item.session_code || `Session ${getResearchChatId(item)}`}</h2>
          <p className="research-chat-id" title={String(chatId)}>Chat ID: {chatId}</p>
          <p>{[`User ${item.user_id || "-"}`, `${item.message_count || messages.length} messages`].join(" · ")}</p>
        </div>
      </header>
      <div className="research-chat-messages">
        {messages.length ? (
          messages.map((message) => <ResearchChatMessage key={message.message_id || message.id || `${message.role}-${message.create_time}`} message={message} token={token} />)
        ) : (
          <div className="research-preview-empty">No messages</div>
        )}
      </div>
    </aside>
  );
}

function ResearchChatMessage({ message, token }) {
  const role = String(message.role || "message").toLowerCase();
  const feedbackRating = normalizeResearchFeedbackRating(message.feedback_rating);
  const evidenceCount = Array.isArray(message.evidences) ? message.evidences.length : 0;
  return (
    <div className={`research-chat-message-row ${role}`}>
      <article className={`research-chat-message ${role}`}>
        <p>{message.content || ""}</p>
        {evidenceCount > 0 && <ResearchEvidenceList evidences={message.evidences} token={token} />}
        {feedbackRating && (
          <div className={`research-chat-feedback ${feedbackRating}`}>
            <strong>Feedback: {feedbackRating === "like" ? "Like" : "Dislike"}</strong>
            {message.feedback_text && <span>{message.feedback_text}</span>}
            {message.feedback_at && <small>{formatResearchDateTime(message.feedback_at)}</small>}
          </div>
        )}
      </article>
      {message.create_time && <time className="research-chat-message-time" dateTime={message.create_time}>{formatResearchDateTime(message.create_time)}</time>}
    </div>
  );
}

function ResearchEvidenceList({ evidences, resolveUrl = resolveResearchEvidenceUrl, token }) {
  return (
    <section className="research-evidence-list">
      <div className="research-evidence-list-title">Evidence · {evidences.length}</div>
      {evidences.map((evidence, index) => (
        <ResearchEvidenceCard evidence={evidence} key={evidence.evidence_id || evidence.id || index} resolveUrl={resolveUrl} token={token} />
      ))}
    </section>
  );
}

function ResearchEvidenceCard({ evidence, resolveUrl, token }) {
  const [urls, setUrls] = useState({ cover: "", media: "" });
  const kind = getResearchEvidenceKind(evidence);
  const type = String(evidence?.evidence_type || kind || "text");
  const title = String(evidence?.title || evidence?.description || `${type} evidence`);
  const content = String(evidence?.content_text || "").trim();
  const description = String(evidence?.description || "").trim();
  const timeLabel = getResearchEvidenceTimeLabel(evidence);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      resolveUrl(token, evidence?.media_url),
      resolveUrl(token, evidence?.cover_url)
    ]).then(([media, cover]) => {
      if (!cancelled) setUrls({ media, cover });
    }).catch(() => {
      if (!cancelled) setUrls({ media: "", cover: "" });
    });
    return () => { cancelled = true; };
  }, [evidence?.cover_url, evidence?.media_url, resolveUrl, token]);

  const imageUrl = urls.media || urls.cover;
  return (
    <article className={`research-evidence-card ${kind}`}>
      <header><span>{type}</span><strong title={title}>{title}</strong>{timeLabel && <small>{timeLabel}</small>}</header>
      {kind === "image" && imageUrl && <a href={imageUrl} rel="noreferrer" target="_blank"><img alt={title} loading="lazy" src={imageUrl} /></a>}
      {kind === "video" && urls.media && <video controls playsInline poster={urls.cover || undefined} preload="metadata" src={urls.media} />}
      {kind === "audio" && urls.media && <audio controls preload="metadata" src={urls.media} />}
      {content && <p>{content}</p>}
      {!content && kind === "text" && description && <p>{description}</p>}
      {description && description !== content && description !== title && <div>{description}</div>}
    </article>
  );
}

function ResearchStatisticsView({ data }) {
  const [detailUserId, setDetailUserId] = useState("");
  const [detailPage, setDetailPage] = useState(0);
  const users = Array.isArray(data?.users)
    ? [...data.users].sort((a, b) => Number(b.duration_ms ?? b.durationMs ?? 0) - Number(a.duration_ms ?? a.durationMs ?? 0))
    : [];
  const recentDates = getRecentResearchDateKeys(7);
  const totalDuration = users.reduce((sum, item) => sum + (Number(item.duration_ms ?? item.durationMs ?? 0) || 0), 0);
  const activeUser = users.find((user) => String(user.user_id ?? user.userId) === String(detailUserId));

  return (
    <section className="research-statistics-view">
      <div className="research-stat-cards">
        <div><span>Users</span><strong>{formatResearchNumber(users.length)}</strong></div>
        <div><span>Total duration</span><strong>{formatResearchLongDuration(totalDuration)}</strong></div>
        <div><span>Timezone</span><strong>{data?.timezone || "Asia/Shanghai"}</strong></div>
      </div>
      <div className="research-table-wrap">
        {users.length === 0 ? (
          <div className="repository-empty">No statistics</div>
        ) : (
          <table className="research-stats-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Nickname</th>
                <th>Total duration</th>
                <th>Agent chats</th>
                {recentDates.map((dateKey) => <th key={dateKey}>{shortResearchDateKey(dateKey)}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const daily = new Map((Array.isArray(user.daily) ? user.daily : []).map((item) => [item.date, item]));
                return (
                  <tr key={user.user_id ?? user.userId} onClick={() => { setDetailUserId(String(user.user_id ?? user.userId)); setDetailPage(0); }}>
                    <td>{user.user_id ?? user.userId}</td>
                    <td>{user.nickname || ""}</td>
                    <td>{formatResearchLongDuration(user.duration_ms ?? user.durationMs)}</td>
                    <td>{formatResearchNumber(user.chat_count ?? user.chatCount)}</td>
                    {recentDates.map((dateKey) => {
                      const item = daily.get(dateKey);
                      return <td key={dateKey}>{formatResearchLongDuration(item?.duration_ms ?? item?.durationMs)}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {activeUser && (
        <ResearchStatisticsModal
          onClose={() => setDetailUserId("")}
          onPageChange={setDetailPage}
          page={detailPage}
          user={activeUser}
        />
      )}
    </section>
  );
}

function ResearchStatisticsModal({ onClose, onPageChange, page, user }) {
  const pageSize = 14;
  const daily = (Array.isArray(user.daily) ? user.daily : [])
    .map((item) => ({
      chatCount: Number(item.chat_count ?? item.chatCount ?? 0) || 0,
      date: String(item.date || ""),
      durationMs: Number(item.duration_ms ?? item.durationMs ?? 0) || 0
    }))
    .filter((item) => item.date && (item.durationMs > 0 || item.chatCount > 0))
    .sort((left, right) => right.date.localeCompare(left.date));
  const totalPages = Math.max(1, Math.ceil(daily.length / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const rows = daily.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="research-modal" onClick={onClose}>
      <div className="research-modal-panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>{user.nickname || `User ${user.user_id ?? user.userId}`} daily duration</h2>
          <button className="ghost-button" onClick={onClose} type="button">Close</button>
        </header>
        <div className="research-modal-body">
          {rows.length ? (
            <table className="research-stats-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Agent chats</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.date}>
                    <td>{item.date}</td>
                    <td>{formatResearchLongDuration(item.durationMs)}</td>
                    <td>{formatResearchNumber(item.chatCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="research-preview-empty">No daily duration data</div>
          )}
        </div>
        <footer>
          <button className="ghost-button" disabled={safePage <= 0} onClick={() => onPageChange(safePage - 1)} type="button">Previous</button>
          <span>Page {safePage + 1} / {totalPages}</span>
          <button className="ghost-button" disabled={safePage >= totalPages - 1} onClick={() => onPageChange(safePage + 1)} type="button">Next</button>
        </footer>
      </div>
    </div>
  );
}

function ResearchStatistics({ data }) {
  const users = Array.isArray(data?.users) ? [...data.users].sort((a, b) => Number(b.duration_ms || 0) - Number(a.duration_ms || 0)) : [];
  return (
    <section className="research-panel">
      <div className="research-list">
        {users.length === 0 ? (
          <div className="repository-empty">No statistics</div>
        ) : (
          users.map((user) => (
            <article className="research-stat-row" key={user.user_id}>
              <div>
                <strong>{user.nickname || `User ${user.user_id}`}</strong>
                <span>{user.asset_count || 0} assets · {formatDurationCompact(Number(user.duration_ms || 0)) || "0:00"}</span>
              </div>
              <div className="research-stat-days">
                {(user.daily || []).slice().reverse().map((day) => (
                  <span key={day.date}>{day.date}: {day.asset_count || 0}</span>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function CloudRepository({
  authState,
  cloudRepositoryDateKey,
  cloudRepositoryMediaFilterId,
  cloudRepositoryStatusFilterId,
  cloudSpaceId,
  onDeleteItem,
  onLogin,
  onMediaFilterChange,
  onRefresh,
  onRepositoryDateChange,
  onSpaceChange,
  onStatusFilterChange,
  repositoryState
}) {
  const items = repositoryState.items || [];
  const isLoading = repositoryState.status === "loading";
  const [cloudQuery, setCloudQuery] = useState("");
  const [cloudViewMode, setCloudViewMode] = useState("list");
  const [isCloudSpaceMenuOpen, setCloudSpaceMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState("");
  const [repositoryMenuPosition, setRepositoryMenuPosition] = useState(null);
  const displaySpaceId = repositoryState.spaceId || cloudSpaceId;
  const isRawDataSpace = displaySpaceId === "rawdata";
  const activeMediaFilter = cloudRepositoryMediaFilterId;
  const activeStatusFilter = cloudRepositoryStatusFilterId;
  const visibleMediaFilters = useMemo(() => getCloudMediaFiltersForSpace(displaySpaceId), [displaySpaceId]);
  const visibleStatusFilters = useMemo(() => getCloudStatusFiltersForSpace(displaySpaceId), [displaySpaceId]);
  const statsItems = repositoryState.statsItems || items;
  const stats = useMemo(() => getCloudRepositoryStats(statsItems), [statsItems]);
  const filteredItems = useMemo(
    () => filterCloudRepositoryItems(items, activeMediaFilter, activeStatusFilter, cloudQuery),
    [activeMediaFilter, activeStatusFilter, cloudQuery, items]
  );
  const openMenuItem = useMemo(
    () => filteredItems.find((item) => getRepositoryItemKey(item) === openMenuId) || null,
    [filteredItems, openMenuId]
  );
  const activeMediaFilterLabel = visibleMediaFilters.find((filter) => filter.id === activeMediaFilter)?.label || visibleMediaFilters[0]?.label || CLOUD_FILTERS[0].label;
  const activeStatusFilterLabel = visibleStatusFilters.find((filter) => filter.id === activeStatusFilter)?.label || "";
  const activeFilterLabel = activeStatusFilterLabel ? `${activeMediaFilterLabel} / ${activeStatusFilterLabel}` : activeMediaFilterLabel;
  const activeCloudSpace = CLOUD_SPACES.find((space) => space.id === displaySpaceId) || CLOUD_SPACES[0];
  const storagePercent = Math.min(92, Math.max(4, Math.round((stats.totalBytes / (5 * 1024 * 1024 * 1024)) * 100)));

  function closeRepositoryMenu() {
    setOpenMenuId("");
    setRepositoryMenuPosition(null);
  }

  function toggleRepositoryMenu(item, event) {
    event.stopPropagation();
    const itemId = getRepositoryItemKey(item);
    if (openMenuId === itemId) {
      closeRepositoryMenu();
      return;
    }

    setOpenMenuId(itemId);
    setRepositoryMenuPosition(getRepositoryActionMenuPosition(event.currentTarget));
  }

  useEffect(() => {
    if (!visibleMediaFilters.some((filter) => filter.id === activeMediaFilter)) {
      onMediaFilterChange(getDefaultCloudMediaFilterIdForSpace(displaySpaceId));
    }
    if (!visibleStatusFilters.some((filter) => filter.id === activeStatusFilter)) {
      onStatusFilterChange(getDefaultCloudStatusFilterIdForSpace(displaySpaceId));
    }
    closeRepositoryMenu();
  }, [activeMediaFilter, activeStatusFilter, displaySpaceId, onMediaFilterChange, onStatusFilterChange, visibleMediaFilters, visibleStatusFilters]);

  useEffect(() => {
    if (!openMenuId) {
      return undefined;
    }

    window.addEventListener("resize", closeRepositoryMenu);
    window.addEventListener("scroll", closeRepositoryMenu, true);
    return () => {
      window.removeEventListener("resize", closeRepositoryMenu);
      window.removeEventListener("scroll", closeRepositoryMenu, true);
    };
  }, [openMenuId]);

  return (
    <section className="cloud-page">
      <div className="cloud-drive">
        <aside className="cloud-sidebar">
          <div className="cloud-brand">
            <span className="cloud-brand-icon">
              <Cloud size={18} />
            </span>
            <div>
              <strong>DL Cloud</strong>
              <div className="cloud-space-wrap">
                <button
                  className="cloud-space-button"
                  onClick={() => setCloudSpaceMenuOpen((current) => !current)}
                  title="选择空间"
                  type="button"
                >
                  <span>{activeCloudSpace.label}</span>
                  <ChevronDown size={13} />
                </button>
                {isCloudSpaceMenuOpen && (
                  <div className="cloud-space-menu">
                    {CLOUD_SPACES.map((space) => (
                      <button
                        className={displaySpaceId === space.id ? "active" : ""}
                        key={space.id}
                        onClick={() => {
                          onSpaceChange(space.id);
                          setCloudSpaceMenuOpen(false);
                        }}
                        type="button"
                      >
                        {space.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <nav aria-label="Cloud files" className="cloud-nav">
            <div className="cloud-nav-group">
              <span className="cloud-nav-label">文件类型</span>
              {visibleMediaFilters.map((filter) => (
                <button
                  className={activeMediaFilter === filter.id ? "cloud-nav-item active" : "cloud-nav-item"}
                  key={filter.id}
                  onClick={() => onMediaFilterChange(filter.id)}
                  type="button"
                >
                  <CloudFilterIcon id={filter.id} />
                  <span>{filter.label}</span>
                  <b>{getCloudFilterCount(stats, filter.id)}</b>
                </button>
              ))}
            </div>
            {visibleStatusFilters.length > 0 && (
              <div className="cloud-nav-group">
                <span className="cloud-nav-label">解析状态</span>
                {visibleStatusFilters.map((filter) => (
                  <button
                    className={activeStatusFilter === filter.id ? "cloud-nav-item active" : "cloud-nav-item"}
                    key={filter.id}
                    onClick={() => onStatusFilterChange(filter.id)}
                    type="button"
                  >
                    <CloudFilterIcon id={filter.id} />
                    <span>{filter.label}</span>
                    <b>{getCloudFilterCount(stats, filter.id)}</b>
                  </button>
                ))}
              </div>
            )}
          </nav>

          <div className="cloud-storage">
            <div className="cloud-storage-head">
              <HardDrive size={16} />
              <span>Storage</span>
              <strong>{formatBytes(stats.totalBytes) || "0 B"}</strong>
            </div>
            <div className="cloud-storage-meter">
              <span style={{ width: `${storagePercent}%` }} />
            </div>
            <p>{stats.total} files</p>
          </div>
        </aside>

        <section className="cloud-main">
          {!authState?.token ? (
            <div className="cloud-empty">
              <LockKeyhole size={30} />
              <h1>Cloud</h1>
                  <p>登录 infera-button-demo 账号后查看 {isRawDataSpace ? "rawdata" : "repository"}。</p>
              <button className="primary-button" onClick={onLogin} type="button">
                <UserRound size={16} />
                <span>登录</span>
              </button>
            </div>
          ) : (
            <>
              <header className="cloud-toolbar">
                <div className="cloud-breadcrumb">
                  <span>Cloud</span>
                  <ChevronRight size={14} />
                  <strong>{activeFilterLabel}</strong>
                </div>
                <label className="cloud-search">
                  <Search size={15} />
                  <input
                    autoComplete="off"
                    onChange={(event) => setCloudQuery(event.target.value)}
                    placeholder="搜索文件、设备或摘要"
                    type="search"
                    value={cloudQuery}
                  />
                </label>
                {!isRawDataSpace && (
                  <div className="cloud-date-filter">
                    <button
                      className="cloud-date-step"
                      onClick={() => onRepositoryDateChange(shiftLocalDateKey(cloudRepositoryDateKey, -1))}
                      title="前一天"
                      type="button"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <label>
                      <span>Date</span>
                      <input
                        onChange={(event) => onRepositoryDateChange(event.currentTarget.value || getLocalDateKey())}
                        type="date"
                        value={cloudRepositoryDateKey}
                      />
                    </label>
                    <button
                      className="cloud-date-step"
                      onClick={() => onRepositoryDateChange(shiftLocalDateKey(cloudRepositoryDateKey, 1))}
                      title="后一天"
                      type="button"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
                <button className="secondary-button cloud-refresh" disabled={isLoading} onClick={() => onRefresh(displaySpaceId)} type="button">
                  <RotateCcw size={16} />
                  <span>{isLoading ? "同步中" : "刷新"}</span>
                </button>
              </header>

              <div className="cloud-overview">
                <CloudMetric icon={<FolderOpen size={17} />} label="文件" value={stats.total} />
                <CloudMetric icon={<Video size={17} />} label="视频" value={stats.video} />
                {isRawDataSpace ? (
                  <CloudMetric icon={<Timer size={17} />} label="时长" value={formatDurationCompact(Math.round(stats.totalDurationSeconds * 1000)) || "-"} />
                ) : (
                  <CloudMetric icon={<CheckCircle2 size={17} />} label="已解析" value={stats.parsed} />
                )}
                <CloudMetric icon={<Gauge size={17} />} label="容量" value={formatBytes(stats.totalBytes) || "0 B"} />
              </div>

              {repositoryState.status === "error" && (
                <div className="repository-alert">
                  <TriangleAlert size={16} />
                  <span>{repositoryState.message}</span>
                </div>
              )}

              <section className="repository-panel">
                <div className="repository-panel-head">
                  <div>
                    <h2>Files</h2>
                    <span>
                      {filteredItems.length} of {repositoryState.total || items.length}
                    </span>
                  </div>
                  <div className="cloud-view-toggle">
                    {CLOUD_VIEW_MODES.map((mode) => (
                      <button
                        aria-pressed={cloudViewMode === mode}
                        className={cloudViewMode === mode ? "active" : ""}
                        key={mode}
                        onClick={() => setCloudViewMode(mode)}
                        title={mode === "list" ? "列表" : "网格"}
                        type="button"
                      >
                        {mode === "list" ? <List size={15} /> : <LayoutGrid size={15} />}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoading && items.length === 0 ? (
                  <div className="repository-empty">正在读取 repository...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="repository-empty">
                    <span>没有匹配的文件</span>
                  </div>
                ) : cloudViewMode === "grid" ? (
                  <div className="cloud-file-grid">
                    <div className="repository-list">
                      {filteredItems.map((item) => (
                        <RepositoryItem
                          isRawDataSpace={isRawDataSpace}
                          item={item}
                          key={item.asset_id || item.id || item.media_url}
                          onToggleMenu={(event) => toggleRepositoryMenu(item, event)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="cloud-file-table">
                    <div className={isRawDataSpace ? "repository-table-head rawdata" : "repository-table-head"}>
                      <span>名称</span>
                      {isRawDataSpace ? (
                        <>
                          <span>状态</span>
                          <span>上传时间</span>
                          <span>拍摄时间</span>
                          <span>视频时长</span>
                          <span>文件大小</span>
                        </>
                      ) : (
                        <>
                          <span>类型</span>
                          <span>状态</span>
                          <span>时间</span>
                        </>
                      )}
                      <span />
                    </div>
                    <div className="repository-list">
                      {filteredItems.map((item) => (
                        <RepositoryTableRow
                          isRawDataSpace={isRawDataSpace}
                          item={item}
                          key={getRepositoryItemKey(item)}
                          onToggleMenu={(event) => toggleRepositoryMenu(item, event)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {openMenuItem && repositoryMenuPosition && (
                  <div
                    className="repository-action-menu floating"
                    style={{
                      "--menu-left": `${repositoryMenuPosition.left}px`,
                      "--menu-top": `${repositoryMenuPosition.top}px`
                    }}
                  >
                    <button
                      className="danger"
                      onClick={() => {
                        const item = openMenuItem;
                        closeRepositoryMenu();
                        onDeleteItem(item, displaySpaceId);
                      }}
                      type="button"
                    >
                      删除
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function CloudFilterIcon({ id }) {
  if (id === "video") return <FileVideo size={15} />;
  if (id === "audio") return <FileAudio size={15} />;
  if (id === "parsed") return <CheckCircle2 size={15} />;
  if (id === "processing") return <Clock3 size={15} />;
  if (id === "failed") return <TriangleAlert size={15} />;
  return <Folder size={15} />;
}

function CloudMetric({ icon, label, value }) {
  return (
    <div className="cloud-metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RepositoryItem({ isRawDataSpace, item, onToggleMenu }) {
  return <RepositoryGridCard isRawDataSpace={isRawDataSpace} item={item} onToggleMenu={onToggleMenu} />;
}

function RepositoryGridCard({ isRawDataSpace, item, onToggleMenu }) {
  const title = getRepositoryTitle(item);
  const status = isRawDataSpace ? getRawDataStorageStatus(item) : item.parse_status || "UNKNOWN";

  return (
    <article className="repository-item">
      <div className="repository-card">
        <RepositoryFileIcon item={item} />
        <div className="repository-card-body">
          <h3 title={title}>{title}</h3>
          <span>{formatRepositoryDate(item.captured_at || item.timestamp_ms || item.create_time) || "No date"}</span>
        </div>
        <div className="repository-card-foot">
          <span className={`repository-status ${isRawDataSpace ? "storage " : ""}${String(status).toLowerCase()}`}>
            {isRawDataSpace ? formatRawDataStorageStatus(status) : formatRepositoryStatus(status)}
          </span>
          <button onClick={onToggleMenu} title="更多" type="button">
            <Ellipsis size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

function RepositoryTableRow({ isRawDataSpace, item, onToggleMenu }) {
  const title = getRepositoryTitle(item);
  const status = item.parse_status || "UNKNOWN";
  const rawDataStorageStatus = getRawDataStorageStatus(item);
  const type = item.asset_type || item.media_type || item.file_type || "file";

  return (
    <article className={isRawDataSpace ? "repository-row rawdata" : "repository-row"}>
      <div className="repository-name-cell">
        <RepositoryFileIcon item={item} />
        <div>
          <h3 title={title}>{title}</h3>
          {!isRawDataSpace && <p>{item.summary_text || item.device_id || item.media_url || "No summary"}</p>}
        </div>
      </div>
      {isRawDataSpace ? (
        <>
          <span className={`repository-status storage ${String(rawDataStorageStatus).toLowerCase()}`}>
            {formatRawDataStorageStatus(rawDataStorageStatus)}
          </span>
          <span>{formatRepositoryDate(getRepositoryUploadTime(item)) || "-"}</span>
          <span>{formatRepositoryDate(getRepositoryCapturedTime(item)) || "-"}</span>
          <span>{formatRepositoryDuration(getRepositoryDurationSeconds(item)) || "-"}</span>
          <span>{formatBytes(getRepositorySizeBytes(item)) || "-"}</span>
        </>
      ) : (
        <>
          <span>{type}</span>
          <span className={`repository-status ${String(status).toLowerCase()}`}>{formatRepositoryStatus(status)}</span>
          <span>{formatRepositoryDate(item.captured_at || item.timestamp_ms || item.create_time) || "-"}</span>
        </>
      )}
      <div className="repository-actions">
        <button onClick={onToggleMenu} title="更多" type="button">
          <Ellipsis size={15} />
        </button>
      </div>
    </article>
  );
}

function RepositoryFileIcon({ item }) {
  const type = getRepositoryType(item);
  const hasThumbnail = Boolean(item.thumbnail_url);
  const Icon = type === "audio" ? FileAudio : type === "video" ? FileVideo : Folder;

  return (
    <div className={`repository-thumbnail ${type}`} data-has-thumbnail={hasThumbnail ? "true" : undefined}>
      <Icon size={20} />
    </div>
  );
}

function SplashScreen() {
  return (
    <section aria-label={`${APP_NAME} 启动中`} className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo-frame">
          <img alt="" className="splash-logo" draggable="false" src={appIconUrl} />
        </div>
        <h1>{APP_NAME}</h1>
        <div className="splash-progress" />
      </div>
    </section>
  );
}

function LoginDialog({
  authState,
  form,
  emailCodeCooldown,
  loginMethod,
  loginStatus,
  mode,
  onChange,
  onClose,
  onLoginMethodChange,
  onLogout,
  onModeChange,
  onSendCode,
  onSubmit
}) {
  const isChecking = loginStatus.status === "checking";
  const isSendingCode = loginStatus.status === "sending";
  const isBusy = isChecking || isSendingCode;
  const isRegister = mode === "register";
  const usesEmailCode = isRegister || loginMethod === "code";
  const usesPassword = isRegister || loginMethod === "password";
  const displayName = getAuthDisplayName(authState);
  const accountName = getAuthAccountName(authState);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (!isBusy && event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section aria-modal="true" className="login-dialog" role="dialog">
        <div className="dialog-heading login-heading">
          <UserRound size={18} />
          <div>
            <strong>{isRegister ? "注册" : "登录"}</strong>
            <span>{authState?.token ? displayName || APP_NAME : isRegister ? `创建 ${APP_NAME} 账号` : APP_NAME}</span>
          </div>
        </div>
        <div aria-label="账号操作" className="login-mode-switch" role="tablist">
          <button
            aria-selected={!isRegister}
            className={`login-mode-button ${!isRegister ? "active" : ""}`}
            disabled={isBusy}
            onClick={() => onModeChange("login")}
            role="tab"
            type="button"
          >
            登录
          </button>
          <button
            aria-selected={isRegister}
            className={`login-mode-button ${isRegister ? "active" : ""}`}
            disabled={isBusy}
            onClick={() => onModeChange("register")}
            role="tab"
            type="button"
          >
            注册
          </button>
        </div>
        {!isRegister && (
          <div aria-label="登录方式" className="login-method-switch" role="tablist">
            <button
              aria-selected={loginMethod === "password"}
              className={loginMethod === "password" ? "active" : ""}
              disabled={isBusy}
              onClick={() => onLoginMethodChange("password")}
              role="tab"
              type="button"
            >
              密码登录
            </button>
            <button
              aria-selected={loginMethod === "code"}
              className={loginMethod === "code" ? "active" : ""}
              disabled={isBusy}
              onClick={() => onLoginMethodChange("code")}
              role="tab"
              type="button"
            >
              邮箱验证码登录
            </button>
          </div>
        )}
        {authState?.token && (
          <div className="login-account">
            <div className="login-account-identity">
              <strong>{displayName}</strong>
              {accountName && accountName !== displayName && <span>{accountName}</span>}
            </div>
            <button onClick={onLogout} type="button">
              退出
            </button>
          </div>
        )}
        <form
          className="login-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="login-field">
            <span>{usesEmailCode ? "邮箱" : "账号"}</span>
            <div className="login-input-wrap">
              <Mail size={15} />
              <input
                autoComplete="username"
                disabled={isBusy}
                name="identifier"
                onChange={(event) => onChange({ identifier: event.target.value })}
                placeholder={usesEmailCode ? "邮箱地址" : "邮箱或手机号"}
                type={usesEmailCode ? "email" : "text"}
                value={form.identifier}
              />
            </div>
          </label>
          {usesEmailCode && (
            <div className="login-field">
              <span>邮箱验证码</span>
              <div className="login-code-row">
                <div className="login-input-wrap">
                  <LockKeyhole size={15} />
                  <input
                    aria-label="邮箱验证码"
                    autoComplete="one-time-code"
                    disabled={isBusy}
                    inputMode="numeric"
                    maxLength={16}
                    name="verificationCode"
                    onChange={(event) => onChange({ verificationCode: event.target.value })}
                    placeholder="输入验证码"
                    type="text"
                    value={form.verificationCode}
                  />
                </div>
                <button
                  className="login-code-button"
                  disabled={isBusy || emailCodeCooldown > 0}
                  onClick={onSendCode}
                  type="button"
                >
                  {isSendingCode ? "发送中" : emailCodeCooldown > 0 ? `${emailCodeCooldown}s 后重发` : "发送验证码"}
                </button>
              </div>
            </div>
          )}
          {usesPassword && (
            <label className="login-field">
              <span>密码</span>
              <div className="login-input-wrap">
                <LockKeyhole size={15} />
                <input
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  disabled={isBusy}
                  onChange={(event) => onChange({ password: event.target.value })}
                  placeholder="••••••••"
                  type="password"
                  value={form.password}
                />
              </div>
            </label>
          )}
          {isRegister && (
            <label className="login-field">
              <span>确认密码</span>
              <div className="login-input-wrap">
                <LockKeyhole size={15} />
                <input
                  autoComplete="new-password"
                  disabled={isBusy}
                  onChange={(event) => onChange({ confirmPassword: event.target.value })}
                  placeholder="再次输入密码"
                  type="password"
                  value={form.confirmPassword}
                />
              </div>
            </label>
          )}
          <label className="login-remember">
            <input
              checked={form.remember}
              disabled={isBusy}
              onChange={(event) => onChange({ remember: event.target.checked })}
              type="checkbox"
            />
            <span>记住登录</span>
          </label>
          {loginStatus.message && <div className={`login-status ${loginStatus.status}`}>{loginStatus.message}</div>}
          <div className="dialog-actions login-actions">
            <button className="ghost-button" disabled={isBusy} onClick={onClose} type="button">
              取消
            </button>
            <button className="primary-button" disabled={isBusy} type="submit">
              {isChecking ? (isRegister ? "注册中" : "登录中") : isRegister ? "注册并登录" : loginMethod === "code" ? "验证并登录" : "登录"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AppChrome({
  activeNav,
  authState,
  isFullscreen,
  onInfoClick,
  onLoginClick,
  onNavChange,
  onThemeToggle,
  theme
}) {
  const navRef = useRef(null);
  const navLabelRefs = useRef([]);
  const displayName = getAuthDisplayName(authState);
  const accountName = getAuthAccountName(authState);
  const [navUnderlineStyle, setNavUnderlineStyle] = useState({
    "--nav-underline-left": "0px",
    "--nav-underline-width": "0px"
  });

  useLayoutEffect(() => {
    function updateNavUnderline() {
      const activeIndex = NAV_ITEMS.indexOf(activeNav);
      const nav = navRef.current;
      const label = navLabelRefs.current[activeIndex];
      if (!nav || !label) return;

      const navRect = nav.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      setNavUnderlineStyle({
        "--nav-underline-left": `${labelRect.left - navRect.left}px`,
        "--nav-underline-width": `${labelRect.width}px`
      });
    }

    updateNavUnderline();
    window.addEventListener("resize", updateNavUnderline);
    return () => window.removeEventListener("resize", updateNavUnderline);
  }, [activeNav, isFullscreen]);

  return (
    <section className="app-chrome">
      <div className="chrome-left">
        <button className="profile-button" onClick={onLoginClick} title={displayName || "登录"} type="button">
          {authState?.token ? <span className="profile-initial">{getAuthInitial(accountName)}</span> : <UserRound size={16} />}
        </button>
        <nav aria-label="Primary" className="top-nav" ref={navRef}>
          {NAV_ITEMS.map((item, index) => (
            <button
              aria-current={activeNav === item ? "page" : undefined}
              className={activeNav === item ? "nav-item active" : "nav-item"}
              key={item}
              onClick={() => onNavChange(item)}
              type="button"
            >
              <span className="nav-label" ref={(node) => { navLabelRefs.current[index] = node; }}>
                {item}
              </span>
            </button>
          ))}
          <span className="nav-underline" style={navUnderlineStyle} />
        </nav>
      </div>
      <div className="drag-region" />
      <div className="window-actions">
        <button className="chrome-button" onClick={onInfoClick} title="软件信息" type="button">
          <Info size={14} />
        </button>
        <button className="chrome-button" onClick={onThemeToggle} title={theme === "dark" ? "切换浅色主题" : "切换深色主题"} type="button">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </section>
  );
}

function AppInfoDialog({
  activeEncoder,
  capabilities,
  info,
  onCheckUpdates,
  onClose,
  onOpenUpdate,
  onRevealLog,
  outputDirectory,
  updateState
}) {
  const gpuNames = capabilities?.gpuNames?.length ? capabilities.gpuNames.join(", ") : "未检测到";
  const isCheckingUpdate = updateState?.status === "checking";
  const canOpenUpdate =
    updateState?.status === "available" || updateState?.status === "no_asset" || updateState?.status === "no_release";

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section aria-modal="true" className="app-info-dialog" role="dialog">
        <div className="dialog-heading app-info-heading">
          <Info size={18} />
          <div>
            <strong>软件信息</strong>
            <span>{info.name}</span>
          </div>
        </div>
        <div className="app-info-grid">
          <span>版本</span>
          <strong>{info.version}</strong>
          <span>更新时间</span>
          <strong>{info.updatedAt}</strong>
          <span>处理引擎</span>
          <strong>{info.engine}</strong>
          <span>界面框架</span>
          <strong>{info.stack}</strong>
          <span>当前编码器</span>
          <strong>{activeEncoder}</strong>
          <span>GPU</span>
          <strong>{gpuNames}</strong>
          <span>输出位置</span>
          <strong title={outputDirectory}>{outputDirectory || "-"}</strong>
        </div>
        <div className={`update-status ${updateState?.status || "idle"}`}>
          <span>{updateState?.message || "检查最新安装包"}</span>
        </div>
        <div className="dialog-actions app-info-actions">
          <button className="ghost-button" onClick={onRevealLog} type="button">
            <FolderOpen size={14} />
            定位日志
          </button>
          <button className="ghost-button" disabled={isCheckingUpdate} onClick={onCheckUpdates} type="button">
            <RotateCcw size={14} />
            {isCheckingUpdate ? "检查中" : "检查更新"}
          </button>
          {canOpenUpdate && (
            <button className="primary-button" onClick={() => onOpenUpdate(updateState)} type="button">
              <Download size={14} />
              {updateState.status === "available" ? "下载更新" : "打开发布页"}
            </button>
          )}
          <button className={canOpenUpdate ? "ghost-button" : "primary-button"} onClick={onClose} type="button">
            知道了
          </button>
        </div>
      </section>
    </div>
  );
}

function getUpdateMessage(result) {
  if (result?.status === "available") {
    return `发现新版本 ${result.latestVersion}：${result.assetName || "安装包可下载"}`;
  }

  if (result?.status === "latest") {
    return `当前已是最新版本 ${result.latestVersion || result.currentVersion}`;
  }

  if (result?.status === "no_asset") {
    return `发现新版本 ${result.latestVersion}，但没有匹配当前系统的安装包`;
  }

  if (result?.status === "no_release") {
    return "当前还没有可用发布版本，请稍后再试";
  }

  return "无法读取更新状态";
}

function DeviceStatus({ capabilities, device, encoder, usage }) {
  const cpuUsage = usage?.cpu?.usage;
  const gpuUsage = usage?.gpu?.total;
  const gpuUsageText =
    usage?.gpu?.status === "restricted" && !Number.isFinite(Number(gpuUsage))
      ? "利用率采样受系统限制"
      : `当前使用率 ${percentLabel(gpuUsage)}`;

  if (device === "cpu") {
    return (
      <div className="device-status">
        <Cpu size={16} />
        <div>
          <strong>{capabilities?.cpuModel || "正在检测 CPU"}</strong>
          <span>
            {capabilities
              ? `${capabilities.logicalCores} 线程 · 当前使用率 ${percentLabel(cpuUsage)}`
              : "正在读取处理器信息"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="device-status">
      <Zap size={16} />
      <div>
        <strong>{encoder}</strong>
        <span>
          {encoder !== "libx264" && encoder !== "检测中"
            ? `${capabilities?.gpuNames?.join(", ") || "GPU 已检测"} · ${gpuUsageText}`
            : "未发现硬件编码器，任务会自动回退 CPU"}
        </span>
      </div>
    </div>
  );
}

function UsageCard({ activeEncodingJob, device, usage }) {
  const isCpu = device === "cpu";
  const data = isCpu ? usage?.cpu : usage?.gpu;
  const total = isCpu ? data?.usage : data?.total;
  const hasActiveHardwareEncoding = !isCpu && activeEncodingJob?.hardwareEncoding;
  const isGpuRestricted = !isCpu && data?.status === "restricted";
  const statusLabel = Number.isFinite(Number(data?.total))
    ? "可读取"
    : data?.status === "sampling"
      ? "采样中"
      : data?.status === "restricted"
        ? "系统受限"
        : "不可用";

  return (
    <div className="usage-card">
      <div className="usage-header">
        <Activity size={18} />
        <div>
          <strong>{isCpu ? "CPU 使用情况" : "GPU 使用情况"}</strong>
          <span>
            {isCpu
              ? "系统总负载"
              : hasActiveHardwareEncoding
                ? "硬件编码中"
                : isGpuRestricted
                  ? "硬件编码运行状态"
                  : "总利用率与编码引擎"}
          </span>
        </div>
        <b>{percentLabel(total)}</b>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${clampPercent(total)}%` }} />
      </div>
      {isCpu ? (
        <div className="usage-grid">
          <span>线程</span>
          <strong>{usage?.cpu?.logicalCores || "-"}</strong>
          <span>内存</span>
          <strong>{usage?.cpu?.totalMemoryGb ? `${usage.cpu.totalMemoryGb} GB` : "-"}</strong>
        </div>
      ) : (
        <div className="usage-grid">
          <span>{hasActiveHardwareEncoding ? "编码速度" : "Video Encode"}</span>
          <strong>{hasActiveHardwareEncoding ? formatEncodingSpeed(activeEncodingJob) : percentLabel(data?.videoEncode)}</strong>
          <span>3D</span>
          <strong>{percentLabel(data?.threeD)}</strong>
          <span>{hasActiveHardwareEncoding ? "编码器" : "Compute"}</span>
          <strong>{hasActiveHardwareEncoding ? activeEncodingJob.encoder : percentLabel(data?.compute)}</strong>
          <span>状态</span>
          <strong>{hasActiveHardwareEncoding ? "硬件编码" : statusLabel}</strong>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AutomationOptions({ onChange, options }) {
  const rows = [
    { icon: <Upload size={15} />, id: "autoUpload", label: "自动上传", title: "处理完成后上传降帧视频" },
    { icon: <Archive size={15} />, id: "autoBackup", label: "自动备份", title: "处理完成后备份原视频" },
    { icon: <HardDrive size={15} />, id: "autoClearLocal", label: "自动清除本地文件", title: "上传后清除降帧文件，备份后清除原视频" }
  ];

  return (
    <div className="automation-options">
      {rows.map((row) => (
        <label className="automation-option" key={row.id} title={row.title}>
          <input
            checked={Boolean(options[row.id])}
            onChange={(event) => onChange(row.id, event.target.checked)}
            type="checkbox"
          />
          <span className="automation-check" />
          {row.icon}
          <span>{row.label}</span>
        </label>
      ))}
    </div>
  );
}

function UploadQueueDock({
  canAdd,
  canClearFinished,
  canStart,
  expanded,
  items,
  now,
  onAddBackup,
  onAddUpload,
  onCancel,
  onClearFinished,
  onPauseToggle,
  onRemove,
  onRetry,
  onStart,
  onToggle
}) {
  const active = items.find((item) => item.status === "uploading" || item.status === "processing" || item.status === "paused");
  const queued = items.filter((item) => item.status === "queued").length;
  const failed = items.filter((item) => isTransferErrorStatus(item.status)).length;
  const done = items.filter((item) => item.status === "done").length;

  return (
    <aside className={expanded ? "transfer-dock expanded" : "transfer-dock"}>
      {!expanded ? (
        <button className="transfer-fab" onClick={onToggle} title="上传队列" type="button">
          <Upload size={20} />
          {items.length > 0 && <span>{items.length}</span>}
        </button>
      ) : (
        <div className="transfer-dock-panel">
          <div className="transfer-dock-header">
            <div>
              <p className="eyebrow">Transfer</p>
              <h3>上传队列</h3>
            </div>
            <button className="icon-button" onClick={onToggle} title="收起上传队列" type="button">
              <ChevronDown size={17} />
            </button>
          </div>

          <div className="transfer-dock-actions">
            <button disabled={!canAdd} onClick={onAddUpload} title="添加上传到 Delphi 的视频" type="button">
              <Upload size={16} />
            </button>
            <button disabled={!canAdd} onClick={onAddBackup} title="添加备份视频" type="button">
              <Archive size={16} />
            </button>
            <button disabled={!canClearFinished} onClick={onClearFinished} title="清除已完成上传/备份" type="button">
              <RotateCcw size={16} />
            </button>
            <button disabled={!canStart} onClick={() => onStart()} title="开始上传" type="button">
              <Play size={16} />
            </button>
          </div>

          <div className="transfer-dock-summary">
            <span>{active ? "进行中 1" : "进行中 0"}</span>
            <span>等待 {queued}</span>
            <span>完成 {done}</span>
            <span>失败 {failed}</span>
          </div>

          <div className="transfer-list">
            {items.length === 0 ? (
              <div className="transfer-empty">暂无上传或备份任务</div>
            ) : (
              items.map((item) => (
                <TransferQueueItem
                  item={item}
                  key={item.id}
                  now={now}
                  onCancel={onCancel}
                  onPauseToggle={onPauseToggle}
                  onRemove={() => onRemove(item.id)}
                  onRetry={() => onRetry(item.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function TransferQueueItem({ item, now, onCancel, onPauseToggle, onRemove, onRetry }) {
  const isFailed = isTransferErrorStatus(item.status);
  const canRemove = item.status === "queued" || isFailed;
  const canControlActiveUpload = item.status === "uploading" || item.status === "paused";
  const isPaused = item.status === "paused";
  const label = item.kind === "backup" ? "备份" : "上传";

  return (
    <div className={`transfer-item ${item.status}`}>
      <div className="transfer-item-main">
        <div className="transfer-kind-icon">{item.kind === "backup" ? <Archive size={15} /> : <Upload size={15} />}</div>
        <div>
          <div className="transfer-item-title">
            <strong title={item.uploadPath}>{item.name}</strong>
            <span>{formatJobTransferStatusLabel(item.kind, item.status)}</span>
          </div>
          <div className="upload-progress-track">
            <div className="upload-progress-fill" style={{ width: `${clampPercent(item.percent)}%` }} />
          </div>
          <div className="transfer-item-meta">
            <span>{item.message || `${label}等待`}</span>
            <span>
              {formatUploadBytes(item)} · {formatUploadSpeed(item.speedBytesPerSecond)}
            </span>
          </div>
          <div className="transfer-item-meta">
            <span>
              耗时 <DurationValue value={getUploadItemElapsedMs(item, now)} />
            </span>
            <span>
              预计剩余 <DurationValue value={getUploadItemRemainingMs(item, now)} />
            </span>
          </div>
        </div>
      </div>
      {(canControlActiveUpload || isFailed || canRemove) && (
        <div className="transfer-item-actions">
          {canControlActiveUpload && (
            <>
              <button onClick={onPauseToggle} title={isPaused ? "继续上传" : "暂停上传"} type="button">
                {isPaused ? <Play size={15} /> : <Pause size={15} />}
              </button>
              <button className="danger" onClick={() => onCancel()} title="取消当前上传" type="button">
                <CircleStop size={15} />
              </button>
            </>
          )}
          {isFailed && (
            <button className="transfer-retry-button" onClick={onRetry} title="重试此任务" type="button">
              <RotateCcw size={15} />
            </button>
          )}
          {canRemove && (
            <button className="danger" onClick={onRemove} title="移除任务" type="button">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function createUploadItems(jobs) {
  return jobs.map((job) => ({
    bytesUploaded: 0,
    jobId: job.id,
    message: "等待上传",
    name: job.name,
    path: job.uploadPath || getJobUploadPath(job),
    percent: 0,
    speedBytesPerSecond: 0,
    status: "queued",
    totalBytes: 0
  }));
}

function createTransferTask(job, { auto = false, autoClearLocal = false, kind = "upload" } = {}) {
  const isBackup = kind === "backup";
  const uploadPath = getTransferUploadPath(job, kind);
  if (!uploadPath) {
    return null;
  }

  const createdAt = Date.now();
  const displayName = job.name || job.outputName || getFileNameFromPath(uploadPath);
  const totalBytes = Number(job.sizeBytes || job.size || job.outputSize || 0) || 0;
  return {
    auto,
    autoClearLocal,
    bytesUploaded: 0,
    clearLocalTarget: isBackup ? "source" : "output",
    completedAt: null,
    createdAt,
    destination: isBackup ? "DL Rawdata" : "Delphi Repository",
    duration: job.duration,
    elapsedMs: 0,
    endpoint: isBackup ? RAW_DATA_VIDEO_UPLOAD_PATH : WEB_VIDEO_UPLOAD_PATH,
    id: `${kind}-${job.id || createdAt}-${createdAt}-${Math.random().toString(16).slice(2)}`,
    kind,
    message: "等待上传",
    name: displayName,
    outputPath: isBackup ? "" : uploadPath,
    path: isBackup ? uploadPath : job.path || uploadPath,
    percent: 0,
    sourceJobId: job.id || "",
    sha256: job.sha256 || "",
    speedBytesPerSecond: 0,
    startTimeMs: normalizeTimestamp(job.startTimeMs ?? job.modifiedAtMs),
    status: "queued",
    totalBytes,
    uploadName: isBackup ? getProcessedStyleFileName(job) : getUploadFileName({ ...job, uploadPath }),
    uploadPath
  };
}

function getTransferUploadPath(job, kind = "upload") {
  return kind === "backup" ? job.path : job.uploadPath || getJobUploadPath(job) || job.path;
}

function getManualDelphiUploadValidationError(job) {
  const uploadPath = getTransferUploadPath(job, "upload");
  const fileName = getFileNameFromPath(uploadPath || job?.name);
  const sizeBytes = Number(job?.sizeBytes || job?.size || job?.outputSize || 0);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes >= DELPHI_UPLOAD_MAX_BYTES) {
    return DELPHI_UPLOAD_VALIDATION_MESSAGES.size;
  }

  if (!DELPHI_UPLOAD_FILE_NAME_PATTERN.test(fileName)) {
    return DELPHI_UPLOAD_VALIDATION_MESSAGES.name;
  }

  return "";
}

function getManualDelphiUploadErrorMessage(errors) {
  return errors.includes(DELPHI_UPLOAD_VALIDATION_MESSAGES.size)
    ? DELPHI_UPLOAD_VALIDATION_MESSAGES.size
    : DELPHI_UPLOAD_VALIDATION_MESSAGES.name;
}

function createJobFromTransferTask(task) {
  return {
    duration: task.duration,
    id: task.id,
    modifiedAtMs: task.startTimeMs,
    name: task.name,
    outputPath: task.kind === "backup" ? "" : task.uploadPath,
    path: task.path,
    size: task.totalBytes,
    sizeBytes: task.totalBytes,
    sha256: task.sha256 || "",
    sourceJobId: task.sourceJobId,
    startTimeMs: task.startTimeMs,
    totalBytes: task.totalBytes,
    uploadName: task.uploadName,
    uploadPath: task.uploadPath
  };
}

function getTransferTaskUploadOptions(task, shouldClearLocalOnComplete = null) {
  return {
    autoClearLocal: Boolean(task.autoClearLocal),
    clearLocalTarget: task.clearLocalTarget,
    destination: task.destination,
    endpoint: task.endpoint,
    mode: task.kind === "backup" ? "backup" : "manual",
    shouldClearLocalOnComplete
  };
}

function getPendingAutomationTransferKinds(job) {
  if (job?.status !== "done") {
    return [];
  }

  const kinds = [];
  if (job.autoUploadRequested && !job.uploadedAt && !job.deletedOutputPath) {
    kinds.push("upload");
  }
  if (job.autoBackupRequested && !job.backedUpAt && !job.deletedOriginalPath) {
    kinds.push("backup");
  }
  return kinds;
}

function getNextTransferTask(queue) {
  return sortTransferQueue(queue).find((item) => item.status === "queued") || null;
}

function isTransferStartable(item) {
  return item?.status === "queued" || isTransferRestartable(item);
}

function isTransferRestartable(item) {
  return item?.status === "canceled" || isTransferErrorStatus(item?.status);
}

function sortTransferQueue(queue) {
  const priority = {
    uploading: 0,
    processing: 0,
    paused: 0,
    queued: 1,
    upload_error: 3,
    backup_error: 3,
    canceled: 3,
    done: 4
  };

  return [...queue].sort((a, b) => {
    const aPriority = priority[a.status] ?? 2;
    const bPriority = priority[b.status] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    if (a.status === "queued" && b.status === "queued" && a.kind !== b.kind) {
      return a.kind === "upload" ? -1 : 1;
    }
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

function applyTransferProgress(queue, progress) {
  if (!progress?.jobId || !progress?.uploadId) {
    return queue;
  }

  const status = progress.status || "uploading";
  return queue.map((item) => {
    if (item.id !== progress.jobId) {
      return item;
    }
    if (!item.activeUploadId || item.activeUploadId !== progress.uploadId) {
      return item;
    }
    if (item.status !== "uploading" && item.status !== "processing" && item.status !== "paused") {
      return item;
    }

    const bytesUploaded = Number(progress.bytesUploaded) || item.bytesUploaded;
    const totalBytes = Number(progress.totalBytes) || item.totalBytes;
    return {
      ...item,
      bytesUploaded,
      elapsedMs: status === "paused" ? item.elapsedMs : item.startedAt ? Math.max(Number(item.elapsedMs) || 0, Date.now() - item.startedAt) : item.elapsedMs,
      message: normalizeUploadProgressMessage(progress.message, status) || item.message,
      percent: clampPercent(progress.percent),
      sha256: progress.sha256 || item.sha256 || "",
      speedBytesPerSecond: status === "uploading" ? Number(progress.speedBytesPerSecond) || 0 : 0,
      status,
      totalBytes
    };
  });
}

function getFileNameFromPath(value) {
  return String(value || "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop() || "video";
}

function createTransferFailureSnapshot({ destination, jobs, message, mode, retryOptions, status }) {
  const retryJobs = Array.isArray(jobs) ? jobs : [];
  const now = Date.now();
  return {
    destination,
    items: createUploadItems(retryJobs).map((item) => ({
      ...item,
      completedAt: now,
      elapsedMs: 0,
      estimatedRemainingMs: null,
      message,
      startedAt: now,
      status
    })),
    message,
    mode,
    retryJobs,
    retryOptions,
    status
  };
}

function getUploadDoneMessage(clearResult, operation = "upload") {
  if (clearResult?.deleted) {
    return clearResult.target === "source" ? "备份完成，本地原视频已清除" : "上传完成，本地降帧文件已清除";
  }

  if (clearResult?.error) {
    return `${operation === "backup" ? "备份" : "上传"}完成，本地文件清除失败：${clearResult.error}`;
  }

  return operation === "backup" ? "备份完成" : "上传完成";
}

function getUploadHistoryDoneMessage(clearResult, operation = "upload") {
  const operationLabel = operation === "backup" ? "备份" : "上传";
  if (clearResult?.deleted) {
    return `检测到历史${operationLabel}记录，本地文件已清除`;
  }
  if (clearResult?.error) {
    return `检测到历史${operationLabel}记录，已标记完成；本地文件清除失败：${clearResult.error}`;
  }
  return `检测到历史${operationLabel}记录，已标记完成`;
}

function getTransferSuccessPatch({ clearTarget, cleared, isBackup, result, timestamp, uploadPath }) {
  const patch = isBackup
    ? {
        backedUpAt: timestamp,
        backupResult: result
      }
    : {
        uploadedAt: timestamp,
        uploadResult: result
      };

  if (cleared?.error) {
    if (clearTarget === "source") {
      patch.autoClearOriginalError = cleared.error;
      patch.autoClearOriginalStatus = "error";
    } else {
      patch.autoClearError = cleared.error;
      patch.autoClearStatus = "error";
    }
    return patch;
  }

  if (!cleared?.deleted) {
    return patch;
  }

  if (clearTarget === "source") {
    return {
      ...patch,
      autoClearOriginalStatus: "done",
      autoClearedOriginalAt: timestamp,
      deletedOriginalPath: uploadPath
    };
  }

  return {
    ...patch,
    autoClearStatus: "done",
    autoClearedAt: timestamp,
    deletedOutputPath: uploadPath,
    outputPath: ""
  };
}

function isUploadActive(state) {
  return state?.status === "uploading" || state?.status === "processing" || state?.status === "paused" || state?.status === "canceling";
}

function isUploadPausable(state) {
  return state?.status === "uploading" || state?.status === "paused";
}

function getTransferErrorStatus(mode) {
  return mode === "backup" ? "backup_error" : "upload_error";
}

function isTransferErrorStatus(status) {
  return status === "error" || status === "upload_error" || status === "backup_error";
}

function markUploadItem(state, jobId, patch) {
  return {
    ...state,
    items: state.items.map((item) => (item.jobId === jobId ? { ...item, ...patch } : item))
  };
}

function applyUploadProgress(state, progress) {
  if (!progress?.uploadId || progress.uploadId !== state.uploadId) {
    return state;
  }
  if (!isUploadActive(state)) {
    return state;
  }

  const incomingStatus = progress.status || "uploading";
  const status = state.status === "paused" && incomingStatus === "uploading" ? "paused" : incomingStatus;
  const message =
    normalizeUploadProgressMessage(progress.message, status) ||
    (status === "processing" ? "文件已发送，等待服务器处理" : UPLOAD_STATUS_LABELS[status]);
  const now = Date.now();
  const nextItems = state.items.map((item) => {
    const matches = progress.jobId ? item.jobId === progress.jobId : item.path === progress.filePath;
    if (!matches) {
      return item;
    }
    if (item.status !== "queued" && item.status !== "uploading" && item.status !== "processing" && item.status !== "paused") {
      return item;
    }

    const startedAt = item.startedAt || now;
    const bytesUploaded = Number(progress.bytesUploaded) || item.bytesUploaded;
    const totalBytes = Number(progress.totalBytes) || item.totalBytes;
    const speedBytesPerSecond = status === "uploading" ? Number(progress.speedBytesPerSecond) || 0 : 0;
    const elapsedMs = status === "paused" ? getUploadItemElapsedMs(item, now) : Math.max(getUploadItemElapsedMs(item, now), now - startedAt);

    return {
      ...item,
      bytesUploaded,
      elapsedMs,
      estimatedRemainingMs: getUploadEstimatedRemainingMs({
        bytesUploaded,
        elapsedMs,
        percent: progress.percent,
        speedBytesPerSecond,
        status,
        totalBytes
      }),
      message,
      percent: clampPercent(progress.percent),
      speedBytesPerSecond,
      startedAt,
      status,
      totalBytes
    };
  });

  return {
    ...state,
    message,
    status: getNextUploadStatus(state.status, status),
    visible: state.visible,
    items: nextItems
  };
}

function getNextUploadStatus(currentStatus, progressStatus) {
  if (progressStatus === "canceled") {
    return "canceling";
  }

  if (currentStatus === "paused" && progressStatus === "uploading") {
    return "paused";
  }

  if (progressStatus === "paused" || progressStatus === "uploading" || progressStatus === "processing") {
    return progressStatus;
  }

  return currentStatus;
}

function normalizeUploadProgressMessage(message, status) {
  if (status === "paused") {
    return "上传已暂停";
  }

  if (status === "uploading" && message === "继续上传") {
    return "正在上传";
  }

  return message;
}

function getUploadOverallPercent(state) {
  if (!state.items.length) {
    return 0;
  }

  const total = state.items.reduce((sum, item) => sum + (item.status === "done" ? 100 : clampPercent(item.percent)), 0);
  return clampPercent(total / state.items.length);
}

function formatUploadBytes(item) {
  const uploaded = formatBytes(item.bytesUploaded, { precision: 2 }) || "0.00 B";
  const total = formatBytes(item.totalBytes, { precision: 2 });
  return total ? `${uploaded} / ${total}` : uploaded;
}

function getUploadItemElapsedMs(item, now = Date.now()) {
  if (!item) {
    return 0;
  }

  if (item.status === "queued" || !Number.isFinite(Number(item.startedAt))) {
    return Number(item.elapsedMs) || 0;
  }

  if (item.status === "done" || item.status === "canceled" || isTransferErrorStatus(item.status)) {
    return Number(item.elapsedMs) || Math.max(0, Number(item.completedAt || now) - Number(item.startedAt));
  }

  if (item.status === "paused") {
    return Number(item.elapsedMs) || Math.max(0, now - Number(item.startedAt));
  }

  return Math.max(Number(item.elapsedMs) || 0, now - Number(item.startedAt));
}

function getUploadEstimatedRemainingMs({ bytesUploaded, elapsedMs, percent, speedBytesPerSecond, status, totalBytes }) {
  if (status === "done") {
    return 0;
  }
  if (status === "canceled" || isTransferErrorStatus(status)) {
    return null;
  }

  const uploaded = Number(bytesUploaded);
  const total = Number(totalBytes);
  const speed = Number(speedBytesPerSecond);

  if (Number.isFinite(uploaded) && Number.isFinite(total) && total > uploaded && speed > 0) {
    return Math.max(0, Math.round(((total - uploaded) / speed) * 1000));
  }

  if (status === "processing" && Number.isFinite(uploaded) && Number.isFinite(total) && total > 0 && uploaded >= total) {
    return null;
  }

  const progress = Number(percent);
  if (Number.isFinite(progress) && progress > 0 && progress < 100 && Number.isFinite(Number(elapsedMs))) {
    return Math.max(0, Math.round(Number(elapsedMs) * ((100 - progress) / progress)));
  }

  return null;
}

function getUploadItemRemainingMs(item, now = Date.now()) {
  if (!item) {
    return null;
  }

  if (item.status === "done") {
    return 0;
  }

  const liveElapsedMs = getUploadItemElapsedMs(item, now);
  return getUploadEstimatedRemainingMs({
    bytesUploaded: item.bytesUploaded,
    elapsedMs: liveElapsedMs,
    percent: item.percent,
    speedBytesPerSecond: item.speedBytesPerSecond,
    status: item.status,
    totalBytes: item.totalBytes
  });
}

function getUploadCurrentSpeed(state) {
  if (state.status === "paused" || state.status === "canceled" || state.status === "ready" || isTransferErrorStatus(state.status)) {
    return 0;
  }

  const activeItem = state.items.find((item) => item.status === "uploading" && item.speedBytesPerSecond > 0);
  return activeItem?.speedBytesPerSecond || 0;
}

function formatUploadSpeed(value) {
  return `${formatBytes(value) || "0 B"}/s`;
}

function getActiveEncodingJob(jobs) {
  return (
    jobs.find((job) => job.status === "processing" && job.hardwareEncoding) ||
    jobs.find((job) => job.status === "processing" && (job.encoder || job.encodingFps || job.encodingSpeed)) ||
    null
  );
}

function formatEncodingSpeed(job) {
  const parts = [];
  const fps = Number(job?.encodingFps);
  const speed = Number(job?.encodingSpeed);

  if (Number.isFinite(fps) && fps > 0) {
    parts.push(`${fps.toFixed(fps >= 10 ? 0 : 1)} fps`);
  }

  if (Number.isFinite(speed) && speed > 0) {
    parts.push(`${speed.toFixed(speed >= 10 ? 1 : 2)}x`);
  }

  return parts.length ? parts.join(" · ") : job?.hardwareEncoding ? "硬件编码中" : job?.encoder || "-";
}

function isJobReadyForUpload(job) {
  return job?.status === "done" && Boolean(job.outputPath);
}

function isLowFrameRateJob(job) {
  const frameRate = Number(job?.frameRate);
  return Number.isFinite(frameRate) && frameRate > 0 && frameRate < 10;
}

function getJobUploadPath(job) {
  if (isJobReadyForUpload(job)) {
    return job.outputPath;
  }

  return isLowFrameRateJob(job) ? job.path : "";
}

function canClearFinishedJob(job) {
  return job?.status === "done";
}

function canRemoveJob(job) {
  return job?.status !== "processing" && job?.status !== "paused";
}

function getProcessingOutputActionPath(job) {
  if (job?.status !== "done" || job?.deletedOutputPath) {
    return "";
  }
  return job.outputPath || "";
}

function getProcessingDoneMessage(job = {}) {
  const outputDeleted = Boolean(job.deletedOutputPath);
  const sourceDeleted = Boolean(job.deletedOriginalPath);
  if (outputDeleted && sourceDeleted) {
    return "处理完成，本地压制视频和原视频已清除";
  }
  if (outputDeleted) {
    return "处理完成，本地压制视频已清除";
  }
  if (sourceDeleted) {
    return "处理完成，原视频已清除";
  }
  return "处理完成";
}

function getQueueItemFooterMessage(job) {
  if (job?.status === "done") {
    return job.message || getProcessingDoneMessage(job);
  }
  return job.message || (job.outputPath ? job.outputPath : job.path);
}

function getShellActionErrorMessage(result) {
  const message = typeof result === "string" ? result : result?.opened === false ? result.message : "";
  if (!message) {
    return "";
  }
  return message === "Path does not exist." ? "本地压制视频不存在，可能已被清理" : message;
}

function getUploadFileName(job) {
  if (job?.uploadName) {
    return job.uploadName;
  }

  const fileName = String(job.uploadPath || getJobUploadPath(job) || "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop();
  return fileName || job.name || "video.mp4";
}

function getProcessedStyleFileName(job) {
  const timestamp = Number(job?.startTimeMs ?? job?.modifiedAtMs);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return getUploadFileName({ ...job, uploadPath: job?.path });
  }

  return `${formatTimestampFileName(timestamp)}.mp4`;
}

function formatTimestampFileName(timestamp) {
  const date = new Date(normalizeTimestamp(timestamp));
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
    padDatePart(date.getHours()),
    padDatePart(date.getMinutes()),
    padDatePart(date.getSeconds())
  ].join("_");
}

function isSamePath(left, right) {
  return String(left || "") === String(right || "");
}

function getCloudMediaFiltersForSpace() {
  return CLOUD_FILTERS.filter((filter) => ["all", "video", "audio"].includes(filter.id));
}

function getCloudStatusFiltersForSpace(spaceId) {
  if (spaceId === "rawdata") {
    return [];
  }

  return CLOUD_FILTERS.filter((filter) => ["all_status", "parsed", "processing", "failed"].includes(filter.id));
}

function getDefaultCloudMediaFilterIdForSpace() {
  return CLOUD_REPOSITORY_DEFAULT_MEDIA_FILTER_ID;
}

function getDefaultCloudStatusFilterIdForSpace() {
  return CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID;
}

function getCloudStatusFilterIdForSpace(spaceId, filterId) {
  const visibleFilters = getCloudStatusFiltersForSpace(spaceId);
  if (visibleFilters.length === 0) {
    return getDefaultCloudStatusFilterIdForSpace(spaceId);
  }
  return visibleFilters.some((filter) => filter.id === filterId) ? filterId : getDefaultCloudStatusFilterIdForSpace(spaceId);
}

function getRepositoryItemKey(item) {
  return String(getRawDataId(item) || item.asset_id || item.id || item.media_url || item.file_name || item.name || "repository-item");
}

function getRepositoryStableItemKey(item) {
  return String(getRawDataId(item) || item?.asset_id || item?.id || item?.media_url || item?.file_name || item?.name || "");
}

function getRepositoryActionMenuPosition(anchor) {
  const rect = anchor.getBoundingClientRect();
  const margin = 8;
  const menuWidth = 96;
  const menuHeight = 40;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || menuWidth + margin * 2;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || menuHeight + margin * 2;
  const left = Math.min(viewportWidth - menuWidth - margin, Math.max(margin, rect.right - menuWidth));
  const belowTop = rect.bottom + 5;
  const top =
    belowTop + menuHeight > viewportHeight - margin
      ? Math.max(margin, rect.top - menuHeight - 5)
      : belowTop;

  return { left, top };
}

function getRawDataId(item) {
  return item?.raw_data_id || item?.rawDataId || item?.archive_id || item?.archiveId || item?.id || "";
}

function getRawDataStorageStatus(item) {
  const rawStatus =
    item?.storage_status ??
    item?.storageStatus ??
    item?.save_status ??
    item?.saveStatus ??
    item?.persist_status ??
    item?.persistStatus ??
    item?.upload_status ??
    item?.uploadStatus ??
    item?.archive_status ??
    item?.archiveStatus ??
    item?.status ??
    item?.state;
  const status = String(rawStatus || "").trim().toUpperCase();
  return status || (getRawDataId(item) ? "SAVED" : "UNKNOWN");
}

function formatRawDataStorageStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (["SAVED", "STORED", "COMPLETED", "COMPLETE", "DONE", "READY", "SUCCESS"].includes(normalized)) {
    return "已保存";
  }
  if (["SAVING", "STORING", "UPLOADING", "PENDING", "PROCESSING", "IN_PROGRESS"].includes(normalized)) {
    return "保存中";
  }
  if (["FAILED", "ERROR", "CANCELED", "CANCELLED"].includes(normalized)) {
    return "保存失败";
  }
  return normalized || "未知";
}

function getRepositoryTitle(item) {
  return item.file_name || item.name || `Asset ${item.asset_id || item.id || "-"}`;
}

function getRepositoryType(item) {
  const type = String(item.asset_type || item.media_type || item.file_type || "").toLowerCase();
  const name = String(item.file_name || item.name || item.media_url || "").toLowerCase();
  if (type.includes("audio") || type === "vad") return "audio";
  if (type.includes("video") || type === "stream" || type === "composed_frames") return "video";
  if (/\.(mp4|mov|mkv|avi|webm|m4v|wmv)(?:$|\?)/.test(name) || getRawDataId(item)) return "video";
  return "file";
}

function isRepositoryParsed(item) {
  return ["PARSED", "FALLBACK_PARSED", "PARTIAL_PARSED"].includes(getRepositoryParseStatus(item));
}

function isRepositoryProcessing(item) {
  return ["PENDING", "QUEUED", "PREVIEW_READY", "POSTPROCESSING", "SPLITTING", "PROCESSING", "PARSING", "RUNNING", "REINDEX_REQUIRED"].includes(
    getRepositoryParseStatus(item)
  );
}

function isRepositoryParseFailed(item) {
  return ["FAIL", "FAILED", "ERROR", "PARSE_FAILED", "PROCESSING_FAILED"].includes(getRepositoryParseStatus(item));
}

function getRepositoryParseStatus(item) {
  return String(item.parse_status || item.parseStatus || item.job_status || item.jobStatus || "").trim().toUpperCase() || "UNKNOWN";
}

function getCloudRepositoryStats(items) {
  const safeItems = Array.isArray(items) ? items : [];

  return safeItems.reduce(
    (stats, item) => {
      const type = getRepositoryType(item);
      const sizeBytes = getRepositorySizeBytes(item);
      const durationSeconds = getRepositoryDurationSeconds(item);

      return {
        total: stats.total + 1,
        video: stats.video + (type === "video" ? 1 : 0),
        audio: stats.audio + (type === "audio" ? 1 : 0),
        parsed: stats.parsed + (isRepositoryParsed(item) ? 1 : 0),
        processing: stats.processing + (isRepositoryProcessing(item) ? 1 : 0),
        failed: stats.failed + (isRepositoryParseFailed(item) ? 1 : 0),
        totalBytes: stats.totalBytes + (Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0),
        totalDurationSeconds: stats.totalDurationSeconds + (Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0)
      };
    },
    { total: 0, video: 0, audio: 0, parsed: 0, processing: 0, failed: 0, totalBytes: 0, totalDurationSeconds: 0 }
  );
}

function getCloudFilterCount(stats, filterId) {
  if (filterId === "video") return stats.video;
  if (filterId === "audio") return stats.audio;
  if (filterId === "parsed") return stats.parsed;
  if (filterId === "processing") return stats.processing;
  if (filterId === "failed") return stats.failed;
  return stats.total;
}

function filterCloudRepositoryItems(items, mediaFilterId, statusFilterId, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const safeItems = Array.isArray(items) ? items : [];

  return safeItems.filter((item) => {
    const type = getRepositoryType(item);
    const matchesMedia =
      mediaFilterId === "all" ||
      (mediaFilterId === "video" && type === "video") ||
      (mediaFilterId === "audio" && type === "audio");
    const matchesStatus =
      statusFilterId === "all_status" ||
      (statusFilterId === "parsed" && isRepositoryParsed(item)) ||
      (statusFilterId === "processing" && isRepositoryProcessing(item)) ||
      (statusFilterId === "failed" && isRepositoryParseFailed(item));

    if (!matchesMedia || !matchesStatus) return false;
    if (!normalizedQuery) return true;

    return [
      item.file_name,
      item.name,
      item.device_id,
      item.source_kind,
      item.asset_type,
      item.media_type,
      item.parse_status,
      getRawDataStorageStatus(item),
      item.summary_text,
      getRawDataId(item)
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  });
}

function normalizeResearchItems(payload) {
  if (Array.isArray(payload)) return payload;
  return [payload?.items, payload?.users, payload?.data, payload?.list].find(Array.isArray) || [];
}

function toggleId(ids, id) {
  const normalizedId = String(id);
  const current = (ids || []).map(String);
  return current.includes(normalizedId) ? current.filter((item) => item !== normalizedId) : [...current, normalizedId];
}

function isResearchPermissionDenied(error) {
  const message = String(error?.message || "");
  return Number(error?.status || error?.statusCode) === 403 || message.includes("403") || /research access denied/i.test(message);
}

function getResearchErrorMessage(error) {
  const message = String(error?.message || "");
  if (isResearchPermissionDenied(error)) {
    return "当前账号没有 Research 访问权限，请确认已授予 research.access";
  }
  if (message.includes("401") || message.toLowerCase().includes("research admin login required")) {
    return "当前账号没有 Research 访问权限，请确认已授予 research.access";
  }
  return message || "无法读取 Research 数据";
}

function formatResearchDownloadExpiry(expiresAt) {
  const remainingMs = Number(expiresAt) - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "下载链接可能已过期";
  return `下载链接约 ${Math.max(1, Math.ceil(remainingMs / 60000))} 分钟内有效`;
}

async function saveResearchDownload(result, fallbackName) {
  if (result?.download_url) {
    const anchor = document.createElement("a");
    anchor.href = result.download_url;
    anchor.download = result.filename || fallbackName;
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  const contentType = result?.content_type || "application/zip";
  const filename = result?.filename || fallbackName;
  let blob = result?.blob;
  if (!blob && result?.base64) {
    const binary = window.atob(result.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    blob = new Blob([bytes], { type: contentType });
  }
  if (!blob) {
    throw new Error("导出响应缺少下载内容");
  }
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function getAuthDisplayName(authState) {
  if (!authState?.token) return "";
  return authState.displayName || authState.nickname || authState.email || authState.phone || (authState.userId ? `User ${authState.userId}` : "已登录");
}

function getAuthAccountName(authState) {
  if (!authState?.token) return "";
  const emailName = authState.email ? String(authState.email).split("@")[0] : "";
  return authState.accountName || emailName || authState.phone || authState.userId || getAuthDisplayName(authState);
}

function getAuthInitial(accountName) {
  const normalized = String(accountName || "").trim();
  if (!normalized) return "";
  const firstWord = normalized.split(/\s+/).find(Boolean) || normalized;
  return Array.from(firstWord)[0]?.toLocaleUpperCase() || "";
}

function formatBytes(value, options = {}) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = Number.isFinite(Number(options.precision)) ? Number(options.precision) : size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function formatRepositoryDuration(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return "";
  return formatDurationCompact(Number(value) * 1000);
}

function getRepositorySizeBytes(item) {
  const value = Number(item?.size_bytes ?? item?.file_size ?? item?.fileSize ?? item?.bytes ?? item?.metadata?.size_bytes);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getRepositoryDurationSeconds(item) {
  const content = getRepositoryContentSource(item);
  const rawValue = [
    ["seconds", item?.duration_seconds],
    ["seconds", item?.durationSeconds],
    ["seconds", item?.duration_s],
    ["seconds", item?.video_duration_seconds],
    ["seconds", item?.videoDurationSeconds],
    ["auto", item?.video_duration],
    ["auto", item?.videoDuration],
    ["auto", item?.duration],
    ["auto", item?.file_duration],
    ["auto", item?.media_duration],
    ["milliseconds", item?.duration_ms],
    ["milliseconds", item?.durationMs],
    ["milliseconds", item?.video_duration_ms],
    ["milliseconds", item?.videoDurationMs],
    ["seconds", item?.metadata?.duration_seconds],
    ["seconds", item?.metadata?.durationSeconds],
    ["seconds", item?.metadata?.video_duration_seconds],
    ["seconds", item?.metadata?.videoDurationSeconds],
    ["auto", item?.metadata?.video_duration],
    ["auto", item?.metadata?.videoDuration],
    ["auto", item?.metadata?.duration],
    ["milliseconds", item?.metadata?.duration_ms],
    ["milliseconds", item?.metadata?.durationMs],
    ["seconds", content?.duration_seconds],
    ["seconds", content?.durationSeconds],
    ["seconds", content?.video_duration_seconds],
    ["seconds", content?.videoDurationSeconds],
    ["auto", content?.duration],
    ["auto", content?.video_duration],
    ["auto", content?.videoDuration],
    ["milliseconds", content?.duration_ms],
    ["milliseconds", content?.durationMs],
    ["seconds", content?.metadata?.duration_seconds],
    ["auto", content?.metadata?.duration],
    ["milliseconds", content?.metadata?.duration_ms]
  ].find(([, candidate]) => Number.isFinite(Number(candidate)) && Number(candidate) > 0);

  if (!rawValue) {
    return 0;
  }

  const [unit, rawDuration] = rawValue;
  const value = Number(rawDuration);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return unit === "milliseconds" || (unit === "auto" && value > 10000) ? value / 1000 : value;
}

function getRepositoryUploadTime(item) {
  return item?.uploaded_at || item?.upload_time || item?.uploadTime || item?.created_at || item?.create_time || item?.timestamp_ms;
}

function getRepositoryCapturedTime(item) {
  const fileNameTimestamp = parseRepositoryCapturedTimestampFromName(item);
  if (fileNameTimestamp) {
    return fileNameTimestamp;
  }

  return (
    item?.captured_at ||
    item?.capturedAt ||
    item?.shooting_time ||
    item?.shootingTime ||
    item?.shot_at ||
    item?.shotAt ||
    item?.recorded_at ||
    item?.recordedAt ||
    item?.recording_time ||
    item?.recordingTime ||
    item?.start_timestamp_ms ||
    item?.startTimestampMs ||
    item?.start_time_ms ||
    item?.startTimeMs
  );
}

function getRepositoryContentSource(item) {
  if (Array.isArray(item?.content)) {
    return item.content.find((entry) => entry && typeof entry === "object") || {};
  }

  return item?.content && typeof item.content === "object" ? item.content : {};
}

function parseRepositoryCapturedTimestampFromName(item) {
  const candidates = [
    item?.file_name,
    item?.filename,
    item?.name,
    item?.media_url,
    item?.url,
    item?.path,
    item?.file_path,
    item?.source_path,
    item?.metadata?.file_name,
    item?.metadata?.name,
    item?.metadata?.source_path
  ];

  for (const candidate of candidates) {
    const timestamp = parseTimestampFromFileName(candidate);
    if (timestamp) {
      return timestamp;
    }
  }

  return "";
}

function parseTimestampFromFileName(value) {
  const name = String(value || "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop();
  if (!name) return "";

  const dateTimeMatch = name.match(/(20\d{2})[-_.]?([01]\d)[-_.]?([0-3]\d)[^\d]?([0-2]\d)[-_.:]?([0-5]\d)[-_.:]?([0-5]\d)/);
  if (dateTimeMatch) {
    return buildLocalTimestamp(dateTimeMatch.slice(1, 7).map(Number));
  }

  const dateMatch = name.match(/(20\d{2})[-_.]?([01]\d)[-_.]?([0-3]\d)/);
  if (dateMatch) {
    return buildLocalTimestamp([...dateMatch.slice(1, 4).map(Number), 0, 0, 0]);
  }

  return "";
}

function buildLocalTimestamp([year, month, day, hour, minute, second]) {
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return "";
  }

  return date.getTime();
}

function formatRepositoryDate(value) {
  if (!value) return "";
  const timestamp = typeof value === "number" || /^\d+$/.test(String(value)) ? Number(value) : Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  return formatDateTime(timestamp);
}

function formatRepositoryStatus(value) {
  const status = String(value || "UNKNOWN").toUpperCase();
  const labels = {
    PARSED: "已解析",
    PENDING: "等待解析",
    PROCESSING: "解析中",
    PREVIEW_READY: "预览就绪",
    FAILED: "失败",
    ERROR: "失败",
    UNKNOWN: "未知"
  };
  return labels[status] || status;
}

function StartTimeDialog({ editor, onCancel, onChange, onParseFileName, onSave }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <form
        className="time-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="dialog-heading">
          <CalendarClock size={18} />
          <strong>开始时间</strong>
        </div>
        <div className="dialog-fields">
          <label className="single-time-field">
            <span>时间</span>
            <input
              autoComplete="off"
              autoFocus
              className="text-input"
              onChange={(event) => onChange({ value: event.target.value, error: "" })}
              placeholder="2026-06-20 14:30:00"
              required
              type="text"
              value={editor.value}
            />
          </label>
          {editor.error && <span className="dialog-error">{editor.error}</span>}
        </div>
        <div className="dialog-actions">
          <button className="ghost-button file-name-parse-button" onClick={onParseFileName} title={editor.fileName} type="button">
            <FileSearch size={15} />
            <span>通过文件名解析</span>
          </button>
          <div className="dialog-confirm-actions">
            <button className="ghost-button" onClick={onCancel} type="button">
              取消
            </button>
            <button className="primary-button" type="submit">
              确定
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function QueueItem({ job, now, onOpen, onRemove, onReveal, removeDisabled }) {
  const elapsedMs = getElapsedMs(job, now);
  const remainingMs = getEstimatedRemainingMs(job, elapsedMs);
  const durationMs = Math.max(0, Math.round((Number(job.duration) || 0) * 1000));
  const currentVideoMs = Math.max(0, Math.round((Number(job.currentTime) || 0) * 1000));
  const startTimeMs = normalizeTimestamp(job.startTimeMs ?? job.modifiedAtMs);
  const outputActionPath = getProcessingOutputActionPath(job);

  return (
    <article className={`queue-item ${job.status}`}>
      <div className="file-icon">
        <Video size={18} />
      </div>
      <div className="file-body">
        <div className="file-row">
          <div className="file-title">
            <h3 title={job.path}>{job.name}</h3>
            <div className="file-meta-row">
              <p>{job.sizeLabel || job.path}</p>
              <span className="start-time-info">
                <CalendarClock size={12} />
                <span className="start-time-label">开始时间</span>
                <span className="start-time-value">{formatDateTime(startTimeMs)}</span>
              </span>
              <span className="frame-rate-chip" title="源视频帧率">
                <Gauge size={12} />
                <span>{job.frameRateLabel || "fps --"}</span>
              </span>
              {job.status === "processing" && (job.encoder || job.encodingFps || job.encodingSpeed) && (
                <span className="encoding-stats-chip" title="实际编码速度">
                  <Zap size={12} />
                  <span>{formatEncodingSpeed(job)}</span>
                </span>
              )}
            </div>
          </div>
          <span className="status-badge">{STATUS_LABELS[job.status] || job.status}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${job.progress || 0}%` }} />
        </div>
        <div className="time-row">
          <span>
            <Timer size={13} />
            视频时间 <DurationValue referenceValue={durationMs} value={currentVideoMs} />
            <span className="time-separator">/</span>
            <DurationValue referenceValue={durationMs} value={durationMs} />
            <span className="time-separator">·</span>
            预计剩余 <DurationValue value={remainingMs} />
          </span>
          <span className="elapsed-chip">
            耗时 <DurationValue value={elapsedMs} />
          </span>
        </div>
        <div className="file-footer">
          <span>{getQueueItemFooterMessage(job)}</span>
          <div className="item-actions">
            {outputActionPath && (
              <>
                <button onClick={onOpen} type="button">
                  打开
                </button>
                <button onClick={onReveal} type="button">
                  定位
                </button>
              </>
            )}
            <button disabled={removeDisabled} onClick={onRemove} type="button">
              移除
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function formatJobTransferStatusLabel(kind, status) {
  if (status === "uploading" || status === "processing") {
    return kind === "backup" ? "备份中" : "上传中";
  }
  const action = kind === "backup" ? "备份" : "上传";
  if (status === "done") return `${action}完成`;
  if (status === "queued") return `${action}排队`;
  if (status === "paused") return `${action}暂停`;
  if (status === "canceling") return `${action}取消中`;
  if (status === "canceled") return `${action}取消`;
  if (status === "error" || status === "upload_error" || status === "backup_error") return `${action}失败`;
  return `${action}${status}`;
}

function DurationValue({ value, referenceValue = value }) {
  const label = formatDurationCompact(value, referenceValue);

  if (!label) {
    return <span className="duration-value">--</span>;
  }

  return <span className="duration-value">{label}</span>;
}

function clampPercent(value) {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(value)));
}

function percentLabel(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }

  return `${Math.round(Number(value) * 10) / 10}%`;
}

function getElapsedMs(job, now) {
  if (job.status === "processing" && Number.isFinite(Number(job.startedAt))) {
    return Math.max(Number(job.elapsedMs) || 0, now - Number(job.startedAt) - (Number(job.pausedMs) || 0));
  }

  if (Number.isFinite(Number(job.elapsedMs))) {
    return Number(job.elapsedMs);
  }

  return Math.max(0, Math.round((Number(job.elapsedSeconds) || 0) * 1000));
}

function getEstimatedRemainingMs(job, elapsedMs) {
  if (job.status === "done") {
    return 0;
  }

  if (Number.isFinite(Number(job.currentTime)) && Number.isFinite(Number(job.duration))) {
    const currentTime = Number(job.currentTime);
    const duration = Number(job.duration);
    if (currentTime > 0 && duration > currentTime) {
      return Math.max(0, Math.round(elapsedMs * ((duration - currentTime) / currentTime)));
    }

    if (duration > 0 && currentTime >= duration) {
      return 0;
    }
  }

  if (Number.isFinite(Number(job.estimatedRemainingMs))) {
    return Number(job.estimatedRemainingMs);
  }

  if (Number(job.progress) > 0) {
    return Math.max(0, Math.round(elapsedMs * ((100 - Number(job.progress)) / Number(job.progress))));
  }

  return null;
}

function formatDurationCompact(value, referenceValue = value) {
  if (!Number.isFinite(Number(value)) || Number(value) < 0) {
    return null;
  }

  const totalMs = Math.max(0, Math.round(Number(value)));
  const totalSeconds = Math.round(totalMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const referenceMs = Math.max(0, Math.round(Number(referenceValue) || totalMs));
  const referenceSeconds = Math.floor(referenceMs / 1000);
  const showHours = referenceSeconds >= 3600 || hours > 0;

  if (showHours) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${totalMinutes}:${String(seconds).padStart(2, "0")}`;
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function normalizeTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
}

function getDateParts(timestamp) {
  const date = new Date(normalizeTimestamp(timestamp));
  return {
    year: String(date.getFullYear()),
    month: padDatePart(date.getMonth() + 1),
    day: padDatePart(date.getDate()),
    hour: padDatePart(date.getHours()),
    minute: padDatePart(date.getMinutes()),
    second: padDatePart(date.getSeconds())
  };
}

function formatDateTime(timestamp) {
  const parts = getDateParts(timestamp);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function parseDateTimeParts(parts) {
  const [year, month, day, hour, minute, second] = parts.map((part) => Number(part));
  const date = new Date(year, month - 1, day, hour, minute, second, 0);

  if (
    !parts.every((part) => /^\d+$/.test(String(part))) ||
    year < 1970 ||
    year > 2099 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return NaN;
  }

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return NaN;
  }

  return Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

function parseCompactDateTime(value) {
  const text = String(value ?? "");
  const matches = text.matchAll(/(?:19|20)\d{12}/g);

  for (const match of matches) {
    const compact = match[0];
    const timestamp = parseDateTimeParts([
      compact.slice(0, 4),
      compact.slice(4, 6),
      compact.slice(6, 8),
      compact.slice(8, 10),
      compact.slice(10, 12),
      compact.slice(12, 14)
    ]);

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return NaN;
}

function parseYmd(value) {
  const text = String(value ?? "");
  if (!/^(?:19|20)\d{6}$/.test(text)) return null;
  return [text.slice(0, 4), text.slice(4, 6), text.slice(6, 8)];
}

function parseHms(value) {
  const text = String(value ?? "");
  if (!/^\d{6}$/.test(text)) return null;
  return [text.slice(0, 2), text.slice(2, 4), text.slice(4, 6)];
}

function parseDateTimeFromGroups(groups, index) {
  const current = groups[index]?.value || "";
  const compactTimestamp = parseCompactDateTime(current);
  if (Number.isFinite(compactTimestamp)) return compactTimestamp;

  const ymd = parseYmd(current);
  const next = groups[index + 1]?.value;
  const nextHms = parseHms(next);
  if (ymd && nextHms) return parseDateTimeParts([...ymd, ...nextHms]);

  if (ymd && groups[index + 1] && groups[index + 2] && groups[index + 3]) {
    return parseDateTimeParts([ymd[0], ymd[1], ymd[2], groups[index + 1].value, groups[index + 2].value, groups[index + 3].value]);
  }

  if (/^(?:19|20)\d{2}$/.test(current) && groups[index + 1] && groups[index + 2] && groups[index + 3]) {
    const hms = parseHms(groups[index + 3].value);
    if (hms) {
      return parseDateTimeParts([current, groups[index + 1].value, groups[index + 2].value, ...hms]);
    }
  }

  if (/^(?:19|20)\d{2}$/.test(current) && groups[index + 1] && groups[index + 2] && groups[index + 3] && groups[index + 4] && groups[index + 5]) {
    return parseDateTimeParts([
      current,
      groups[index + 1].value,
      groups[index + 2].value,
      groups[index + 3].value,
      groups[index + 4].value,
      groups[index + 5].value
    ]);
  }

  return NaN;
}

function parseDateTimeFromText(value) {
  const text = String(value ?? "").trim();
  if (!text) return NaN;

  const groups = [];
  const digitPattern = /\d+/g;
  let match;

  while ((match = digitPattern.exec(text))) {
    groups.push({ value: match[0], index: match.index });
  }

  for (let index = 0; index < groups.length; index += 1) {
    const timestamp = parseDateTimeFromGroups(groups, index);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return NaN;
}

export default App;
