import {
  Activity,
  Archive,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
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
  Square,
  SquareCheck,
  Sun,
  Timer,
  TriangleAlert,
  Upload,
  UserRound,
  Video,
  X,
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
const INFERA_API_BASE_URL = import.meta.env.VITE_INFERA_API_BASE_URL || "https://api.infera.cn/api/infera";
const WEB_VIDEO_UPLOAD_PATH = "/memory/assets/web-video/events";
const RAW_DATA_LIST_PATH = "/memory/raw-data";
const RAW_DATA_VIDEO_UPLOAD_PATH = "/memory/raw-data/videos";
const NAV_ITEMS = ["Editor", "Cloud", "Delphi", "Engine"];
const ENGINE_PASSWORD = "111111";
const DEFAULT_AUTOMATION_OPTIONS = {
  autoUpload: false,
  autoBackup: false,
  autoClearLocal: false
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
  { id: "parsed", label: "已解析" },
  { id: "processing", label: "处理中" }
];
const CLOUD_VIEW_MODES = ["list", "grid"];
const CLOUD_SPACES = [
  { id: "repository", label: "DL Repository" },
  { id: "rawdata", label: "DL Rawdata" }
];
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
  updatedAt: "2026-07-01",
  engine: "FFmpeg / FFprobe",
  stack: "Electron + React"
};

const dlEditor = window.dlEditor || {
  platform: navigator.platform?.toLowerCase().includes("win") ? "win32" : navigator.platform?.toLowerCase().includes("mac") ? "darwin" : "browser",
  selectVideos: async () => [],
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
  checkForUpdates: async () => ({ status: "latest", currentVersion: packageJson.version, latestVersion: packageJson.version }),
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

function inferIdentifierType(identifier) {
  const value = String(identifier || "").trim();
  if (EMAIL_IDENTIFIER_PATTERN.test(value)) return "email";
  if (PHONE_IDENTIFIER_PATTERN.test(value)) return "phone";
  return "";
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

  const normalizedBase = INFERA_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = rawPath.replace(/^\/+/, "");
  try {
    return new URL(normalizedPath, `${normalizedBase}/`).toString();
  } catch {
    return rawPath;
  }
}

async function requestInfera(path, { method = "GET", token, body, signal } = {}) {
  if (typeof dlEditor.requestInfera === "function") {
    return unwrapInferaResult(await dlEditor.requestInfera({ path, method, token, body }));
  }

  const headers = { Accept: "application/json" };
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
    signal
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.detail || `请求失败 (${response.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return unwrapInferaResult(payload);
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
  return requestInfera("/auth/login", {
    method: "POST",
    body: {
      type: inferIdentifierType(identifier),
      identifier: String(identifier || "").trim(),
      password
    }
  });
}

async function fetchCloudRepository(token, spaceId = CLOUD_SPACES[0].id) {
  const result = await requestInfera(spaceId === "rawdata" ? RAW_DATA_LIST_PATH : "/device/files?limit=50&include_page=true", { token });
  const items = normalizeCloudItems(result);

  return {
    items,
    total: Number.isFinite(Number(result?.total)) ? Number(result.total) : items.length,
    hasMore: Boolean(result?.has_more),
    nextCursor: result?.next_cursor || null
  };
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
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "", remember: true });
  const [loginStatus, setLoginStatus] = useState({ status: "idle", message: "" });
  const [cloudSpaceId, setCloudSpaceId] = useState(CLOUD_SPACES[0].id);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState(() => new Set());
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
  const [autoUploadNotice, setAutoUploadNotice] = useState({
    visible: false,
    message: ""
  });
  const uploadCancelRequestedRef = useRef(false);
  const uploadPauseRequestedRef = useRef(false);
  const uploadPauseWaitersRef = useRef([]);
  const jobsRef = useRef(jobs);
  const uploadStateRef = useRef(uploadState);
  const authStateRef = useRef(authState);
  const automationOptionsRef = useRef(automationOptions);
  const autoUploadQueueRef = useRef([]);
  const autoQueuedJobIdsRef = useRef(new Set());
  const autoUploadRunningRef = useRef(false);
  const automationDrainTimerRef = useRef(null);
  const autoLoginPromptedRef = useRef(false);
  const [repositoryState, setRepositoryState] = useState({
    status: "idle",
    spaceId: cloudSpaceId,
    items: [],
    total: 0,
    hasMore: false,
    nextCursor: null,
    message: ""
  });
  const [startTimeEditor, setStartTimeEditor] = useState(null);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [updateState, setUpdateState] = useState({ status: "idle", message: "" });

  const isRunning = batchState.status === "started";
  const isPaused = isRunning && Boolean(batchState.paused);
  const pendingJobs = jobs.filter((job) => job.status !== "done");
  const hasProcessingJobs = jobs.some((job) => job.status === "processing" || job.status === "paused");
  const activeEncodingJob = getActiveEncodingJob(jobs);
  const selectedJobs = useMemo(() => jobs.filter((job) => selectedJobIds.has(job.id)), [jobs, selectedJobIds]);
  const allJobsSelected = jobs.length > 0 && selectedJobIds.size === jobs.length;
  const canBackupSelection = selectedJobs.length > 0 && selectedJobs.every(isJobBackupable) && !isRunning && !isUploadActive(uploadState);
  const canUploadSelection =
    selectedJobs.length > 0 &&
    selectedJobs.every(isJobUploadable) &&
    !isRunning &&
    !isUploadActive(uploadState);
  const canClearFinished = jobs.some((job) => canClearFinishedJob(job, automationOptions));

  useEffect(() => {
    dlEditor.getCapabilities().then((data) => {
      setCapabilities(data);
      setOutputDirectory(data.outputDirectory);
    });

    dlEditor.getUsage().then(setSystemUsage).catch(() => undefined);

    const offJob = dlEditor.onJobUpdate((update) => {
      setJobs((current) => current.map((job) => (job.id === update.id ? { ...job, ...update } : job)));
    });

    const offBatch = dlEditor.onBatchUpdate((update) => {
      setBatchState((current) => ({ ...current, ...update }));
      if (update.status === "finished") {
        setNotice(`已完成 ${update.completed} 个视频，输出到 ${update.outputDirectory}`);
      } else if (update.status === "canceled") {
        setNotice("批量处理已取消");
      } else if (update.status === "error") {
        setNotice(update.message || "批量处理失败");
      } else if (update.status === "started" && update.paused) {
        setJobs((current) =>
          current.map((job) => (job.status === "processing" ? { ...job, status: "paused", message: job.message || "Paused" } : job))
        );
        setNotice("处理已暂停");
      } else if (update.status === "started" && update.resumed) {
        setJobs((current) =>
          current.map((job) => (job.status === "paused" ? { ...job, status: "processing", message: job.message || "Resumed" } : job))
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
    });
    dlEditor.isWindowFullscreen().then(setIsFullscreen).catch(() => undefined);

    return () => {
      offJob();
      offBatch();
      offUsage();
      offFullscreen();
      offUpload();
      if (automationDrainTimerRef.current) {
        window.clearTimeout(automationDrainTimerRef.current);
        automationDrainTimerRef.current = null;
      }
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
      drainAutomationQueue();
    }
  }, [authState]);

  useEffect(() => {
    automationOptionsRef.current = automationOptions;
    window.localStorage?.setItem(AUTOMATION_STORAGE_KEY, JSON.stringify(automationOptions));
  }, [automationOptions]);

  useEffect(() => {
    uploadStateRef.current = uploadState;
    if (!isUploadActive(uploadState)) {
      drainAutomationQueue();
    }
  }, [uploadState]);

  useEffect(() => {
    jobsRef.current = jobs;

    if (!jobs.length) {
      setSelectionMode(false);
    }

    const knownIds = new Set(jobs.map((job) => job.id));
    for (const id of autoQueuedJobIdsRef.current) {
      const job = jobs.find((item) => item.id === id);
      if (!job || job.status !== "done") {
        autoQueuedJobIdsRef.current.delete(id);
      }
    }
    autoUploadQueueRef.current = autoUploadQueueRef.current.filter((job) => knownIds.has(job.id));

    setSelectedJobIds((current) => {
      const next = new Set([...current].filter((id) => knownIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [jobs]);

  useEffect(() => {
    if (!automationOptions.autoUpload && !automationOptions.autoBackup) {
      return;
    }

    const readyJobs = jobs.filter((job) => hasPendingAutomationActions(job, automationOptions) && !autoQueuedJobIdsRef.current.has(job.id));
    if (!readyJobs.length) {
      return;
    }

    if (!authState?.token) {
      if (!autoLoginPromptedRef.current) {
        autoLoginPromptedRef.current = true;
        setShowLogin(true);
        setNotice("自动上传/备份需要先登录");
      }
      return;
    }

    enqueueAutomationJobs(readyJobs);
  }, [automationOptions.autoUpload, automationOptions.autoBackup, authState?.token, jobs]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeNav !== "Cloud") {
      return;
    }

    if (!authState?.token) {
      setRepositoryState({
        status: "auth",
        spaceId: cloudSpaceId,
        items: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
        message: "请先登录后查看 Cloud repository"
      });
      return;
    }

    loadCloudRepository(authState, cloudSpaceId);
  }, [activeNav, authState?.token, cloudSpaceId]);

  useEffect(() => {
    if (!hasProcessingJobs && !isUploadActive(uploadState)) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 80);

    return () => window.clearInterval(timer);
  }, [hasProcessingJobs, uploadState.status]);

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
    const selected = await dlEditor.selectVideos();
    if (!selected.length) return;

    setJobs((current) => {
      const known = new Set(current.map((job) => job.path));
      const fresh = selected.filter((job) => !known.has(job.path));
      return [...current, ...fresh];
    });
    setNotice(`已加入 ${selected.length} 个视频`);
  }

  function toggleSelectionMode() {
    if (!jobs.length) return;

    setSelectionMode((current) => {
      const next = !current;
      if (!next) {
        setSelectedJobIds(new Set());
      }
      return next;
    });
  }

  function toggleJobSelection(jobId) {
    setSelectedJobIds((current) => {
      const next = new Set(current);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }

  function toggleAllSelectedJobs() {
    setSelectedJobIds((current) => {
      if (jobs.length > 0 && current.size === jobs.length) {
        return new Set();
      }

      return new Set(jobs.map((job) => job.id));
    });
  }

  async function backupSelectedJobs() {
    if (!canBackupSelection) return;

    const jobsToBackup = selectedJobs.map(prepareBackupJob);

    try {
      await uploadJobsToRepository(jobsToBackup, {
        destination: "DL Rawdata",
        endpoint: RAW_DATA_VIDEO_UPLOAD_PATH,
        mode: "backup"
      });
    } catch {
      // Upload state and notice are already updated by uploadJobsToRepository.
    }
  }

  function updateAutomationOption(key, value) {
    setAutomationOptions((current) => ({ ...current, [key]: Boolean(value) }));
    if (key === "autoBackup" && value) {
      setNotice("自动备份已开启，处理完成后会备份原视频");
    }
  }

  function enqueueAutomationJobs(nextJobs) {
    const freshJobs = nextJobs.filter((job) => {
      if (!job?.id || autoQueuedJobIdsRef.current.has(job.id)) {
        return false;
      }

      autoQueuedJobIdsRef.current.add(job.id);
      return true;
    });

    if (!freshJobs.length) {
      return;
    }

    markQueuedAutomationJobs(freshJobs);
    autoUploadQueueRef.current.push(...freshJobs);
    scheduleAutomationDrain();
  }

  function markQueuedAutomationJobs(nextJobs) {
    const queuedJobIds = new Set(nextJobs.map((job) => job?.id).filter(Boolean));
    if (!queuedJobIds.size) {
      return;
    }

    const options = automationOptionsRef.current;
    setJobs((current) =>
      current.map((job) => {
        if (!queuedJobIds.has(job.id)) {
          return job;
        }

        const uploadQueued = Boolean(options.autoUpload && shouldAutoUploadJob(job));
        const backupQueued = Boolean(options.autoBackup && shouldAutoBackupJob(job));
        if (!uploadQueued && !backupQueued) {
          return job;
        }

        return {
          ...job,
          ...(uploadQueued ? { autoUploadStatus: "queued" } : {}),
          ...(backupQueued ? { autoBackupStatus: "queued" } : {}),
          message: getAutomationQueueMessage({ backupQueued, uploadQueued })
        };
      })
    );
  }

  function scheduleAutomationDrain(delay = 0) {
    if (automationDrainTimerRef.current) {
      return;
    }

    automationDrainTimerRef.current = window.setTimeout(() => {
      automationDrainTimerRef.current = null;
      drainAutomationQueue();
    }, delay);
  }

  function getFreshAutomationJobs(queuedJobs) {
    const options = automationOptionsRef.current;
    return queuedJobs
      .map((queuedJob) => jobsRef.current.find((job) => job.id === queuedJob.id) || queuedJob)
      .filter((job) => hasPendingAutomationActions(job, options));
  }

  async function drainAutomationQueue() {
    if (!autoUploadQueueRef.current.length) {
      return;
    }

    if (autoUploadRunningRef.current || isUploadActive(uploadStateRef.current)) {
      scheduleAutomationDrain(300);
      return;
    }

    const auth = authStateRef.current;
    if (!auth?.token) {
      if (!autoLoginPromptedRef.current) {
        autoLoginPromptedRef.current = true;
        setShowLogin(true);
        setNotice("自动上传/备份需要先登录");
      }
      return;
    }

    autoUploadRunningRef.current = true;
    try {
      while (autoUploadQueueRef.current.length > 0) {
        if (isUploadActive(uploadStateRef.current)) {
          break;
        }

        const queuedJobs = autoUploadQueueRef.current.splice(0, autoUploadQueueRef.current.length);
        const jobsToProcess = getFreshAutomationJobs(queuedJobs);
        try {
          if (jobsToProcess.length > 0) {
            await runAutomationTransfers(jobsToProcess);
          }
        } finally {
          for (const job of queuedJobs) {
            autoQueuedJobIdsRef.current.delete(job.id);
          }
        }
      }
    } catch {
      // Upload state and notice are already updated by uploadJobsToRepository.
    } finally {
      autoUploadRunningRef.current = false;
      if (autoUploadQueueRef.current.length > 0) {
        scheduleAutomationDrain(isUploadActive(uploadStateRef.current) ? 300 : 0);
      }
    }
  }

  async function runAutomationTransfers(candidateJobs) {
    const options = automationOptionsRef.current;
    const uploadJobs = options.autoUpload ? candidateJobs.filter((job) => shouldAutoUploadJob(job)) : [];
    const backupJobs = options.autoBackup ? candidateJobs.filter((job) => shouldAutoBackupJob(job)).map(prepareBackupJob) : [];
    let uploadFailureSnapshot = null;
    let backupFailed = false;

    if (uploadJobs.length > 0) {
      const uploadOptions = {
        autoClearLocal: options.autoClearLocal,
        clearLocalTarget: "output",
        destination: "Delphi Repository",
        endpoint: WEB_VIDEO_UPLOAD_PATH,
        mode: "auto-upload"
      };
      try {
        await uploadJobsToRepository(uploadJobs, uploadOptions);
      } catch (error) {
        uploadFailureSnapshot = error?.transferFailureSnapshot || null;
        // Keep the automation worker alive so backup can still run for the same finished jobs.
      }
    }

    if (backupJobs.length > 0) {
      try {
        await uploadJobsToRepository(backupJobs, {
          autoClearLocal: options.autoClearLocal,
          clearLocalTarget: "source",
          destination: "DL Rawdata",
          endpoint: RAW_DATA_VIDEO_UPLOAD_PATH,
          mode: "auto-backup"
        });
      } catch {
        backupFailed = true;
        // Errors are already reflected in the upload panel and job status.
      }
    }

    if (uploadFailureSnapshot && backupJobs.length > 0 && !backupFailed) {
      restoreTransferFailureSnapshot(uploadFailureSnapshot);
    }
  }

  function restoreTransferFailureSnapshot(snapshot) {
    if (!snapshot?.retryJobs?.length) {
      return;
    }

    setUploadState({
      status: snapshot.status,
      visible: true,
      expanded: false,
      uploadId: "",
      destination: snapshot.destination,
      mode: snapshot.mode,
      items: snapshot.items,
      retryJobs: snapshot.retryJobs,
      retryOptions: snapshot.retryOptions,
      message: snapshot.message
    });
    setNotice(snapshot.message);
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
      mode = "manual"
    } = {}
  ) {
    const auth = authStateRef.current;
    const isAutoUpload = mode === "auto" || mode === "auto-upload";
    const isAutoBackup = mode === "auto-backup";
    const isAutomatic = isAutoUpload || isAutoBackup;
    const isBackup = mode === "backup" || isAutoBackup;
    const actionLabel = isAutoBackup ? "自动备份" : isAutoUpload ? "自动上传" : isBackup ? "备份" : "上传";

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

    const uploadKind = isAutoBackup ? "auto-backup" : isAutoUpload ? "auto-upload" : isBackup ? "backup" : "upload";
    const uploadId = `${uploadKind}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const retryOptions = { autoClearLocal, clearLocalTarget, destination, endpoint, mode };
    uploadCancelRequestedRef.current = false;
    uploadPauseRequestedRef.current = false;
    wakeUploadPauseWaiters();
    if (isAutomatic) {
      const attemptedAt = new Date().toISOString();
      setJobs((current) =>
        current.map((job) =>
          jobsToUpload.some((item) => item.id === job.id)
            ? {
                ...job,
                ...(isAutoBackup
                  ? { autoBackupAttemptedAt: attemptedAt, autoBackupStatus: "queued" }
                  : { autoUploadAttemptedAt: attemptedAt, autoUploadStatus: "queued" }),
                message: getAutomationQueueMessage({
                  backupQueued: isAutoBackup,
                  uploadQueued: isAutoUpload
                })
              }
            : job
        )
      );
    }

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
      message: `${isAutomatic ? actionLabel : `准备${actionLabel}`} ${jobsToUpload.length} 个视频`
    });
    setNotice(`${isAutomatic ? actionLabel : `正在${actionLabel}`} ${jobsToUpload.length} 个视频到 ${destination}`);
    if (isAutomatic) {
      setAutoUploadNotice({
        visible: true,
        message: `${actionLabel} ${jobsToUpload.length} 个视频到 ${destination}`
      });
    }

    let completed = 0;
    let activeJobId = "";
    try {
      for (const job of jobsToUpload) {
        activeJobId = job.id;
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
        if (isAutomatic) {
          setJobs((current) =>
            current.map((item) =>
              item.id === job.id
                ? {
                    ...item,
                    ...(isAutoBackup ? { autoBackupStatus: "uploading" } : { autoUploadStatus: "uploading" }),
                    message: getAutomationActiveMessage({ isAutoBackup, isAutoUpload })
                  }
                : item
            )
          );
        }
        const result = await dlEditor.uploadInferaVideo({
          durationSeconds: job.duration,
          durationMs: Math.max(0, Math.round((Number(job.duration) || 0) * 1000)) || undefined,
          jobId: job.id,
          path: job.uploadPath,
          fileName: job.uploadName,
          startTimestampMs: normalizeTimestamp(job.startTimeMs ?? job.modifiedAtMs),
          token: auth.token,
          uploadId,
          uploadPath: endpoint
        });
        const cleared =
          isAutomatic && autoClearLocal ? await clearUploadedLocalFile(job, clearLocalTarget || (isAutoBackup ? "source" : "output")) : { deleted: false };
        completed += 1;
        const uploadedAt = new Date().toISOString();
        const doneMessage = getUploadDoneMessage(cleared, isBackup ? "backup" : "upload");
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
          current.map((item) =>
            item.id === job.id
              ? {
                  ...item,
                  ...getTransferSuccessPatch({
                    clearTarget: clearLocalTarget || (isAutoBackup ? "source" : "output"),
                    cleared,
                    isAutoBackup,
                    isAutoUpload,
                    isBackup,
                    result,
                    timestamp: uploadedAt,
                    uploadPath: job.uploadPath
                  }),
                  message: doneMessage,
                }
              : item
          )
        );
      }

      setUploadState((current) => ({
        ...current,
        status: "ready",
        visible: current.visible,
        retryJobs: [],
        retryOptions: null,
        message: `${isAutomatic ? `${actionLabel}完成` : `已${actionLabel}`} ${completed} 个视频`
      }));
      setNotice(`${isAutomatic ? `${actionLabel}完成` : `已${actionLabel}`} ${completed} 个视频到 ${destination}`);
      return { completed };
    } catch (error) {
      const message = error.message || "上传失败";
      const canceled = message.includes("取消");
      const doneField = isAutoBackup ? "backedUpAt" : "uploadedAt";
      const transferErrorStatus = getTransferErrorStatus(mode);
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
      if (isAutomatic) {
        setJobs((current) =>
          current.map((job) =>
            jobsToUpload.some((item) => item.id === job.id) && (!activeJobId || job.id === activeJobId || !job[doneField])
              ? {
                  ...job,
                  ...(isAutoBackup
                    ? { autoBackupStatus: canceled ? "canceled" : "backup_error" }
                    : { autoUploadStatus: canceled ? "canceled" : "upload_error" }),
                  message
                }
              : job
          )
        );
      }
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

  async function uploadSelectedJobs() {
    if (!canUploadSelection) return;

    try {
      await uploadJobsToRepository(selectedJobs);
    } catch {
      // Upload state and notice are already updated by uploadJobsToRepository.
    }
  }

  async function retryFailedUpload() {
    const retryJobs = uploadState.retryJobs || [];
    if (!isTransferErrorStatus(uploadState.status) || !retryJobs.length) return;

    try {
      await uploadJobsToRepository(retryJobs, uploadState.retryOptions || {});
    } catch {
      // Upload state and notice are already updated by uploadJobsToRepository.
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

  async function closeUploadPanel() {
    if (isUploadActive(uploadState)) {
      await cancelCurrentUpload({ hide: true });
      return;
    }

    setUploadState((current) => ({ ...current, visible: false }));
  }

  function toggleUploadDetails() {
    setUploadState((current) => ({ ...current, expanded: !current.expanded, visible: true }));
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
        autoBackupAttemptedAt: job.status === "done" ? job.autoBackupAttemptedAt : undefined,
        autoBackupStatus: job.status === "done" ? job.autoBackupStatus : undefined,
        autoUploadAttemptedAt: job.status === "done" ? job.autoUploadAttemptedAt : undefined,
        autoUploadStatus: job.status === "done" ? job.autoUploadStatus : undefined,
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
          return { ...job, status: "processing", message: "Resumed" };
        }

        if (!shouldResume && job.status === "processing") {
          return { ...job, status: "paused", message: "Paused" };
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
    const options = automationOptionsRef.current;
    setJobs((current) => current.filter((job) => !canClearFinishedJob(job, options)));
  }

  function removeJob(id) {
    const options = automationOptionsRef.current;
    const currentUploadState = uploadStateRef.current;
    setJobs((current) => current.filter((job) => job.id !== id || !canRemoveJob(job, options, currentUploadState)));
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

  function changeCloudSpace(nextSpaceId) {
    setCloudSpaceId(nextSpaceId);
    setRepositoryState({
      status: authStateRef.current?.token ? "loading" : "auth",
      spaceId: nextSpaceId,
      items: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      message: authStateRef.current?.token ? "" : "请先登录后查看 Cloud repository"
    });
  }

  async function submitLogin() {
    const identifier = loginForm.identifier.trim();
    if (!identifier || !loginForm.password) {
      setLoginStatus({ status: "error", message: "请输入账号和密码" });
      return;
    }

    setLoginStatus({ status: "checking", message: "正在验证 infera-button-demo 账号..." });
    try {
      const result = await loginToInfera({ identifier, password: loginForm.password });
      const nextAuth = normalizeAuthPayload(result, identifier);
      if (!nextAuth.token) {
        throw new Error("登录响应缺少 token");
      }

      if (loginForm.remember) {
        window.localStorage?.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
      } else {
        window.localStorage?.removeItem(AUTH_STORAGE_KEY);
      }

      setAuthState(nextAuth);
      setLoginStatus({ status: "idle", message: "" });
      setLoginForm((current) => ({ ...current, identifier, password: "" }));
      setShowLogin(false);

      if (activeNav === "Cloud") {
        loadCloudRepository(nextAuth, cloudSpaceId);
      }
    } catch (error) {
      setLoginStatus({
        status: "error",
        message: error.message || "登录验证失败"
      });
    }
  }

  function logout() {
    window.localStorage?.removeItem(AUTH_STORAGE_KEY);
    setAuthState(null);
    setLoginStatus({ status: "idle", message: "" });
    setRepositoryState({
      status: "auth",
      spaceId: cloudSpaceId,
      items: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      message: "请先登录后查看 Cloud repository"
    });
  }

  async function loadCloudRepository(authOverride = authState, spaceIdOverride = cloudSpaceId) {
    const token = authOverride?.token;
    if (!token) {
      setRepositoryState({
        status: "auth",
        spaceId: spaceIdOverride,
        items: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
        message: "请先登录后查看 Cloud repository"
      });
      return;
    }

    setRepositoryState((current) => ({
      ...current,
      items: current.spaceId === spaceIdOverride ? current.items : [],
      spaceId: spaceIdOverride,
      status: "loading",
      message: ""
    }));

    try {
      const repository = await fetchCloudRepository(token, spaceIdOverride);
      setRepositoryState((current) =>
        current.spaceId === spaceIdOverride
          ? {
              status: "ready",
              spaceId: spaceIdOverride,
              items: repository.items,
              total: repository.total,
              hasMore: repository.hasMore,
              nextCursor: repository.nextCursor,
              message: ""
            }
          : current
      );
    } catch (error) {
      setRepositoryState((current) =>
        current.spaceId === spaceIdOverride
          ? {
              ...current,
              spaceId: spaceIdOverride,
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
    setRepositoryState((current) => ({ ...current, spaceId: spaceIdOverride, status: "loading", message: "" }));
    try {
      await deleteRawDataArchive(authState.token, item);
      setNotice(`已删除 ${title}`);
      await loadCloudRepository(authState, spaceIdOverride);
    } catch (error) {
      setRepositoryState((current) => ({
        ...current,
        spaceId: spaceIdOverride,
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
              {selectionMode && (
                <>
                  <button className="icon-button" disabled={!jobs.length} onClick={toggleAllSelectedJobs} title={allJobsSelected ? "取消全选" : "全选视频"} type="button">
                    <CheckCheck size={18} />
                  </button>
                  <span className="selection-count">
                    {selectedJobs.length}/{jobs.length}
                  </span>
                </>
              )}
              <button
                className={selectionMode ? "icon-button active" : "icon-button"}
                disabled={!jobs.length}
                onClick={toggleSelectionMode}
                title="选择视频"
                type="button"
              >
                <SquareCheck size={18} />
              </button>
              <button className="icon-button" disabled={!canBackupSelection} onClick={backupSelectedJobs} title="备份所选视频" type="button">
                <Archive size={18} />
              </button>
              <button className="icon-button" disabled={!canUploadSelection} onClick={uploadSelectedJobs} title="上传到 Delphi Repository" type="button">
                <Upload size={18} />
              </button>
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

          {autoUploadNotice.visible && (
            <AutoUploadNotice
              message={autoUploadNotice.message}
              onClose={() => setAutoUploadNotice((current) => ({ ...current, visible: false }))}
            />
          )}

          {uploadState.visible && (
            <UploadProgressPanel
              now={clockNow}
              onClose={closeUploadPanel}
              onPauseToggle={toggleCurrentUploadPaused}
              onRetry={retryFailedUpload}
              onToggleDetails={toggleUploadDetails}
              state={uploadState}
            />
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
                  disabled={isRunning}
                  job={job}
                  key={job.id}
                  now={clockNow}
                  onEditStartTime={() => openStartTimeEditor(job)}
                  onOpen={() => job.outputPath && dlEditor.openPath(job.outputPath)}
                  onRemove={() => removeJob(job.id)}
                  onReveal={() => job.outputPath && dlEditor.revealPath(job.outputPath)}
                  onToggleSelection={() => toggleJobSelection(job.id)}
                  removeDisabled={isRunning || !canRemoveJob(job, automationOptions, uploadState)}
                  selected={selectedJobIds.has(job.id)}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          )}
        </section>
        </section>
      ) : activeNav === "Cloud" ? (
        <CloudRepository
          authState={authState}
          cloudSpaceId={cloudSpaceId}
          onDeleteItem={deleteCloudRepositoryItem}
          onLogin={() => setShowLogin(true)}
          onRefresh={(spaceId = cloudSpaceId) => loadCloudRepository(authState, spaceId)}
          onSpaceChange={changeCloudSpace}
          repositoryState={repositoryState}
        />
      ) : activeNav === "Engine" ? (
        engineUnlocked ? (
          <PlaceholderPage title="DL Engine" />
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
          outputDirectory={outputDirectory}
          updateState={updateState}
        />
      )}
      {showLogin && (
        <LoginDialog
          authState={authState}
          form={loginForm}
          loginStatus={loginStatus}
          onChange={(changes) => setLoginForm((current) => ({ ...current, ...changes }))}
          onClose={() => setShowLogin(false)}
          onLogout={logout}
          onSubmit={submitLogin}
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

function EngineGate({ error, onChange, onSubmit, value }) {
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
            <strong>DL Engine</strong>
            <span>Engine</span>
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

function AutoUploadNotice({ message, onClose }) {
  return (
    <div className="auto-upload-notice">
      <div>
        <Upload size={16} />
        <span>{message}</span>
      </div>
      <button onClick={onClose} title="关闭卡片" type="button">
        <X size={15} />
      </button>
    </div>
  );
}

function CloudRepository({ authState, cloudSpaceId, onDeleteItem, onLogin, onRefresh, onSpaceChange, repositoryState }) {
  const items = repositoryState.items || [];
  const isLoading = repositoryState.status === "loading";
  const [cloudQuery, setCloudQuery] = useState("");
  const [cloudViewMode, setCloudViewMode] = useState("list");
  const [activeCloudFilter, setActiveCloudFilter] = useState("all");
  const [isCloudSpaceMenuOpen, setCloudSpaceMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState("");
  const [repositoryMenuPosition, setRepositoryMenuPosition] = useState(null);
  const displaySpaceId = repositoryState.spaceId || cloudSpaceId;
  const isRawDataSpace = displaySpaceId === "rawdata";
  const visibleFilters = useMemo(() => getCloudFiltersForSpace(displaySpaceId), [displaySpaceId]);
  const stats = useMemo(() => getCloudRepositoryStats(items), [items]);
  const filteredItems = useMemo(
    () => filterCloudRepositoryItems(items, activeCloudFilter, cloudQuery),
    [activeCloudFilter, cloudQuery, items]
  );
  const openMenuItem = useMemo(
    () => filteredItems.find((item) => getRepositoryItemKey(item) === openMenuId) || null,
    [filteredItems, openMenuId]
  );
  const activeFilterLabel = visibleFilters.find((filter) => filter.id === activeCloudFilter)?.label || visibleFilters[0]?.label || CLOUD_FILTERS[0].label;
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
    if (!visibleFilters.some((filter) => filter.id === activeCloudFilter)) {
      setActiveCloudFilter("all");
    }
    closeRepositoryMenu();
  }, [activeCloudFilter, displaySpaceId, visibleFilters]);

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
            {visibleFilters.map((filter) => (
              <button
                className={activeCloudFilter === filter.id ? "cloud-nav-item active" : "cloud-nav-item"}
                key={filter.id}
                onClick={() => setActiveCloudFilter(filter.id)}
                type="button"
              >
                <CloudFilterIcon id={filter.id} />
                <span>{filter.label}</span>
                <b>{getCloudFilterCount(stats, filter.id)}</b>
              </button>
            ))}
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
                  <div className="repository-empty">没有匹配的文件</div>
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

function LoginDialog({ authState, form, loginStatus, onChange, onClose, onLogout, onSubmit }) {
  const isChecking = loginStatus.status === "checking";
  const displayName = getAuthDisplayName(authState);
  const accountName = getAuthAccountName(authState);

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
      <section aria-modal="true" className="login-dialog" role="dialog">
        <div className="dialog-heading login-heading">
          <UserRound size={18} />
          <div>
            <strong>登录</strong>
            <span>{displayName || APP_NAME}</span>
          </div>
        </div>
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
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="login-field">
            <span>账号</span>
            <div className="login-input-wrap">
              <Mail size={15} />
              <input
                autoComplete="username"
                disabled={isChecking}
                name="identifier"
                onChange={(event) => onChange({ identifier: event.target.value })}
                placeholder="邮箱或手机号"
                type="text"
                value={form.identifier}
              />
            </div>
          </label>
          <label className="login-field">
            <span>密码</span>
            <div className="login-input-wrap">
              <LockKeyhole size={15} />
              <input
                autoComplete="current-password"
                disabled={isChecking}
                onChange={(event) => onChange({ password: event.target.value })}
                placeholder="••••••••"
                type="password"
                value={form.password}
              />
            </div>
          </label>
          <label className="login-remember">
            <input
              checked={form.remember}
              disabled={isChecking}
              onChange={(event) => onChange({ remember: event.target.checked })}
              type="checkbox"
            />
            <span>记住登录</span>
          </label>
          {loginStatus.message && <div className={`login-status ${loginStatus.status}`}>{loginStatus.message}</div>}
          <div className="dialog-actions login-actions">
            <button className="ghost-button" disabled={isChecking} onClick={onClose} type="button">
              取消
            </button>
            <button className="primary-button" disabled={isChecking} type="submit">
              {isChecking ? "验证中" : "登录"}
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

function AppInfoDialog({ activeEncoder, capabilities, info, onCheckUpdates, onClose, onOpenUpdate, outputDirectory, updateState }) {
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
      ? "利用率受 macOS 限制"
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
        ? "macOS 受限"
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
                ? "VideoToolbox 硬件编码中"
                : isGpuRestricted
                  ? "硬件编码运行状态"
                  : "总利用率与编码引擎"}
          </span>
        </div>
        <b>{hasActiveHardwareEncoding ? "编码中" : percentLabel(total)}</b>
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

function UploadProgressPanel({ now, onClose, onPauseToggle, onRetry, onToggleDetails, state }) {
  const total = state.items.length;
  const completed = state.items.filter((item) => item.status === "done").length;
  const active = isUploadActive(state);
  const paused = state.status === "paused";
  const canPause = isUploadPausable(state);
  const canRetry = isTransferErrorStatus(state.status) && (state.retryJobs || []).length > 0;
  const overallPercent = getUploadOverallPercent(state);
  const statusLabel = UPLOAD_STATUS_LABELS[state.status] || (state.status === "ready" ? "完成" : "上传");
  const destination = state.destination || "Delphi Repository";
  const title =
    state.mode === "auto-backup"
      ? `自动备份到 ${destination}`
      : state.mode === "auto" || state.mode === "auto-upload"
        ? `自动上传到 ${destination}`
        : state.mode === "backup"
          ? `${destination} 备份`
          : `${destination} 上传`;

  return (
    <section className={`upload-panel ${state.status}`}>
      <div className="upload-panel-main">
        <div className="upload-icon">
          <Upload size={16} />
        </div>
        <div className="upload-panel-body">
          <div className="upload-title-row">
            <strong>{title}</strong>
            <span>
              {completed}/{total || 0} · {Math.round(overallPercent)}% · {formatUploadSpeed(getUploadCurrentSpeed(state))}
            </span>
          </div>
          <div className="upload-progress-track">
            <div className="upload-progress-fill" style={{ width: `${overallPercent}%` }} />
          </div>
          <p>{state.message || statusLabel}</p>
        </div>
        <div className="upload-actions">
          {canRetry ? (
            <button onClick={onRetry} title="重传" type="button">
              <RotateCcw size={15} />
            </button>
          ) : (
            <button disabled={!canPause} onClick={onPauseToggle} title={paused ? "继续上传" : "暂停上传"} type="button">
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          )}
          <button onClick={onClose} title={active ? "关闭并取消上传" : "关闭卡片"} type="button">
            <X size={15} />
          </button>
          <button
            aria-expanded={state.expanded}
            className={state.expanded ? "expanded" : ""}
            onClick={onToggleDetails}
            title={state.expanded ? "收起视频进度" : "展开视频进度"}
            type="button"
          >
            <ChevronDown size={15} />
          </button>
        </div>
      </div>
      {state.expanded && (
        <div className="upload-detail-list">
          {state.items.map((item) => (
            <div className="upload-detail-item" key={item.jobId}>
              <div className="upload-detail-top">
                <span title={item.path}>{item.name}</span>
                <strong>{UPLOAD_STATUS_LABELS[item.status] || item.status}</strong>
              </div>
              <div className="upload-progress-track">
                <div className="upload-progress-fill" style={{ width: `${clampPercent(item.percent)}%` }} />
              </div>
              <div className="upload-detail-meta">
                <span>{item.message || UPLOAD_STATUS_LABELS[item.status] || ""}</span>
                <span>
                  {formatUploadBytes(item)} · {formatUploadSpeed(item.speedBytesPerSecond)}
                </span>
              </div>
              <div className="upload-detail-time">
                <span>
                  耗时 <DurationValue value={getUploadItemElapsedMs(item, now)} />
                </span>
                <span>
                  预计剩余 <DurationValue value={getUploadItemRemainingMs(item, now)} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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

function getTransferSuccessPatch({ clearTarget, cleared, isAutoBackup, isAutoUpload, isBackup, result, timestamp, uploadPath }) {
  const patch = isBackup
    ? {
        backedUpAt: timestamp,
        backupResult: result
      }
    : {
        uploadedAt: timestamp,
        uploadResult: result
      };

  if (isAutoUpload) {
    patch.autoUploadStatus = "done";
  }
  if (isAutoBackup) {
    patch.autoBackupStatus = "done";
  }

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
  return state?.status === "uploading" || state?.status === "paused" || state?.status === "canceling";
}

function isUploadPausable(state) {
  return state?.status === "uploading" || state?.status === "paused";
}

function getTransferErrorStatus(mode) {
  return mode === "backup" || mode === "auto-backup" ? "backup_error" : "upload_error";
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
    status: getNextUploadPanelStatus(state.status, status),
    visible: state.visible,
    items: nextItems
  };
}

function getNextUploadPanelStatus(currentStatus, progressStatus) {
  if (progressStatus === "canceled") {
    return "canceling";
  }

  if (currentStatus === "paused" && progressStatus === "uploading") {
    return "paused";
  }

  if (progressStatus === "paused" || progressStatus === "uploading") {
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

function isJobUploadable(job) {
  return Boolean(getJobUploadPath(job));
}

function isJobBackupable(job) {
  return Boolean(job?.path) && !job.deletedOriginalPath;
}

function shouldAutoUploadJob(job) {
  return job?.status === "done" && Boolean(job.outputPath) && !job.uploadedAt && !job.autoUploadAttemptedAt;
}

function shouldAutoBackupJob(job) {
  return job?.status === "done" && Boolean(job.path) && !job.backedUpAt && !job.autoBackupAttemptedAt && !job.deletedOriginalPath;
}

function hasPendingAutomationActions(job, options) {
  return Boolean((options?.autoUpload && shouldAutoUploadJob(job)) || (options?.autoBackup && shouldAutoBackupJob(job)));
}

function canClearFinishedJob(job, options) {
  if (job?.status !== "done") {
    return false;
  }

  return !hasPendingAutomationActions(job, options) && !hasIncompleteTransferStatus(job);
}

function canRemoveJob(job, options, uploadState) {
  return !hasPendingAutomationActions(job, options) && !hasActiveTransferStatus(job) && !hasActiveUploadItem(job?.id, uploadState);
}

function hasIncompleteTransferStatus(job) {
  const uploadStatus = normalizeJobTransferStatus("upload", job?.autoUploadStatus || "");
  const backupStatus = normalizeJobTransferStatus("backup", job?.autoBackupStatus || "");
  return Boolean((uploadStatus && uploadStatus !== "done") || (backupStatus && backupStatus !== "done"));
}

function hasActiveTransferStatus(job) {
  const uploadStatus = normalizeJobTransferStatus("upload", job?.autoUploadStatus || "");
  const backupStatus = normalizeJobTransferStatus("backup", job?.autoBackupStatus || "");
  return isActiveTransferStatus(uploadStatus) || isActiveTransferStatus(backupStatus);
}

function isActiveTransferStatus(status) {
  return status === "queued" || status === "uploading" || status === "processing" || status === "paused" || status === "canceling";
}

function hasActiveUploadItem(jobId, uploadState) {
  if (!jobId || !Array.isArray(uploadState?.items)) {
    return false;
  }

  return uploadState.items.some((item) => item.jobId === jobId && isActiveTransferStatus(normalizeJobTransferStatus("upload", item.status)));
}

function getAutomationQueueMessage({ backupQueued, uploadQueued }) {
  if (uploadQueued && backupQueued) {
    return "等待自动上传/备份";
  }
  if (uploadQueued) {
    return "等待自动上传";
  }
  if (backupQueued) {
    return "等待自动备份";
  }
  return "";
}

function getAutomationActiveMessage({ isAutoBackup, isAutoUpload }) {
  if (isAutoBackup) {
    return "正在自动备份";
  }
  if (isAutoUpload) {
    return "正在自动上传";
  }
  return "正在上传";
}

function prepareBackupJob(job) {
  return {
    ...job,
    uploadPath: job.path,
    uploadName: getProcessedStyleFileName(job)
  };
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

function getCloudFiltersForSpace(spaceId) {
  if (spaceId === "rawdata") {
    return CLOUD_FILTERS.filter((filter) => filter.id !== "parsed" && filter.id !== "processing");
  }

  return CLOUD_FILTERS;
}

function getRepositoryItemKey(item) {
  return String(getRawDataId(item) || item.asset_id || item.id || item.media_url || item.file_name || item.name || "repository-item");
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
  return String(item.parse_status || "").toUpperCase() === "PARSED";
}

function isRepositoryProcessing(item) {
  const status = String(item.parse_status || "").toUpperCase();
  return ["PENDING", "PROCESSING", "PREVIEW_READY"].includes(status);
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
        totalBytes: stats.totalBytes + (Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0),
        totalDurationSeconds: stats.totalDurationSeconds + (Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0)
      };
    },
    { total: 0, video: 0, audio: 0, parsed: 0, processing: 0, totalBytes: 0, totalDurationSeconds: 0 }
  );
}

function getCloudFilterCount(stats, filterId) {
  if (filterId === "video") return stats.video;
  if (filterId === "audio") return stats.audio;
  if (filterId === "parsed") return stats.parsed;
  if (filterId === "processing") return stats.processing;
  return stats.total;
}

function filterCloudRepositoryItems(items, filterId, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const safeItems = Array.isArray(items) ? items : [];

  return safeItems.filter((item) => {
    const type = getRepositoryType(item);
    const matchesFilter =
      filterId === "all" ||
      (filterId === "video" && type === "video") ||
      (filterId === "audio" && type === "audio") ||
      (filterId === "parsed" && isRepositoryParsed(item)) ||
      (filterId === "processing" && isRepositoryProcessing(item));

    if (!matchesFilter) return false;
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

function QueueItem({ disabled, job, now, onEditStartTime, onOpen, onRemove, onReveal, onToggleSelection, removeDisabled, selected, selectionMode }) {
  const elapsedMs = getElapsedMs(job, now);
  const remainingMs = getEstimatedRemainingMs(job, elapsedMs);
  const durationMs = Math.max(0, Math.round((Number(job.duration) || 0) * 1000));
  const currentVideoMs = Math.max(0, Math.round((Number(job.currentTime) || 0) * 1000));
  const startTimeMs = normalizeTimestamp(job.startTimeMs ?? job.modifiedAtMs);

  return (
    <article className={`queue-item ${job.status}${selectionMode ? " selection-open" : ""}`}>
      {selectionMode && (
        <button
          aria-pressed={selected}
          className="queue-select-box"
          onClick={onToggleSelection}
          title={selected ? "取消选择" : "选择视频"}
          type="button"
        >
          {selected ? <SquareCheck size={17} /> : <Square size={17} />}
        </button>
      )}
      <div className="file-icon">
        <Video size={18} />
      </div>
      <div className="file-body">
        <div className="file-row">
          <div className="file-title">
            <h3 title={job.path}>{job.name}</h3>
            <div className="file-meta-row">
              <p>{job.sizeLabel || job.path}</p>
              <button className="start-time-button" disabled={disabled} onClick={onEditStartTime} type="button">
                <CalendarClock size={12} />
                <span className="start-time-label">开始时间</span>
                <span className="start-time-value">{formatDateTime(startTimeMs)}</span>
              </button>
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
              <TransferStatusChips job={job} />
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
          <span>{job.message || (job.outputPath ? job.outputPath : job.path)}</span>
          <div className="item-actions">
            {job.outputPath && job.status === "done" && (
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

function TransferStatusChips({ job }) {
  const chips = getJobTransferChips(job);
  if (!chips.length) {
    return null;
  }

  return (
    <span className="transfer-status-chips">
      {chips.map((chip) => (
        <span className={`transfer-status-chip ${chip.status}`} key={chip.key}>
          {chip.label}
        </span>
      ))}
    </span>
  );
}

function getJobTransferChips(job) {
  const chips = [];
  const uploadStatus = normalizeJobTransferStatus("upload", job?.autoUploadStatus || (job?.uploadedAt ? "done" : ""));
  const backupStatus = normalizeJobTransferStatus("backup", job?.autoBackupStatus || (job?.backedUpAt ? "done" : ""));

  if (uploadStatus) {
    chips.push({ key: "upload", label: formatJobTransferStatusLabel("upload", uploadStatus), status: uploadStatus });
  }
  if (backupStatus) {
    chips.push({ key: "backup", label: formatJobTransferStatusLabel("backup", backupStatus), status: backupStatus });
  }

  return chips;
}

function normalizeJobTransferStatus(kind, status) {
  const value = String(status || "").trim().toLowerCase();
  if (!value) {
    return "";
  }
  if (value === "error") {
    return kind === "backup" ? "backup_error" : "upload_error";
  }
  return value;
}

function formatJobTransferStatusLabel(kind, status) {
  if (status === "uploading" || status === "processing") {
    return kind === "backup" ? "备份中" : "上传中";
  }
  const action = kind === "backup" ? "备份" : "上传";
  if (status === "done") return `${action}完成`;
  if (status === "queued") return `${action}排队`;
  if (status === "canceled") return `${action}取消`;
  if (status === "upload_error" || status === "backup_error") return `${action}失败`;
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
