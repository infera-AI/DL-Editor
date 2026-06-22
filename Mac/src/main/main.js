const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { getMuxOriginalAudioArgs, getOutputStreamArgs } = require("./ffmpegArgs.cjs");
const { parseMacGpuUsageFromIoreg } = require("./gpuUsage.cjs");
const {
  getFilterThreadCount,
  getSegmentCount,
  getSegmentedJobConcurrency,
  getVideoConcurrency
} = require("./gpuScheduler.cjs");
const { buildVideoFilters } = require("./videoFilters.cjs");

let mainWindow;
const activeProcesses = new Set();
const jobSnapshots = new Map();
let cancelRequested = false;
let pauseRequested = false;
let pauseStartedAt = null;
let pauseIntervals = [];
let queueBusy = false;
let cachedCapabilities = null;
let cpuUsageSnapshot = null;
let latestUsage = null;
let usageMonitor = null;
let gpuSampleInFlight = false;

const VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "avi", "webm", "m4v", "wmv"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getAppIconPath() {
  const iconPath = path.join(__dirname, "../../build/icon.png");
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#f7f7f5",
    icon: getAppIconPath(),
    title: "DL Editor",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send("window:maximized-change", true);
  });

  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send("window:maximized-change", false);
  });
}

function getBundledBinary(name) {
  if (app.isPackaged) {
    if (name === "ffprobe") {
      const probeName = process.arch === "arm64" ? "ffprobe-arm64" : "ffprobe-x64";
      return path.join(process.resourcesPath, "bin", probeName);
    }

    return path.join(process.resourcesPath, "bin", name);
  }

  if (name === "ffmpeg") {
    return require("ffmpeg-static");
  }

  return require("ffprobe-static").path;
}

function runBinary(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      ...options
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      activeProcesses.delete(child);
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(stderr.trim() || stdout.trim() || `Process exited with code ${code}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

function getPausedMsSince(startedAt, now = Date.now()) {
  let pausedMs = 0;
  const intervals = pauseStartedAt ? [...pauseIntervals, { start: pauseStartedAt, end: now }] : pauseIntervals;

  for (const interval of intervals) {
    const overlapStart = Math.max(Number(startedAt) || 0, interval.start);
    const overlapEnd = Math.min(now, interval.end);
    if (overlapEnd > overlapStart) {
      pausedMs += overlapEnd - overlapStart;
    }
  }

  return pausedMs;
}

function closeActivePauseInterval() {
  if (!pauseStartedAt) {
    return;
  }

  pauseIntervals.push({ start: pauseStartedAt, end: Date.now() });
  pauseStartedAt = null;
}

async function waitWhilePaused() {
  while (pauseRequested && !cancelRequested) {
    await sleep(120);
  }
}

async function setProcessPaused(processHandle, paused) {
  if (!processHandle?.pid || processHandle.exitCode !== null) {
    return false;
  }

  if (process.platform === "win32") {
    return false;
  }

  processHandle.kill(paused ? "SIGSTOP" : "SIGCONT");
  return true;
}

function trackProcess(child) {
  activeProcesses.add(child);
  child.once("error", () => activeProcesses.delete(child));
  child.once("close", () => activeProcesses.delete(child));
  if (pauseRequested) {
    setProcessPaused(child, true).catch(() => undefined);
  }
}

async function setActiveProcessesPaused(paused) {
  const results = await Promise.all(
    [...activeProcesses].map((processHandle) =>
      setProcessPaused(processHandle, paused)
        .then((changed) => ({ changed, failed: false }))
        .catch((error) => ({ changed: false, failed: true, error }))
    )
  );

  return {
    total: results.length,
    changed: results.filter((result) => result.changed).length,
    failed: results.filter((result) => result.failed).length
  };
}

function parseEncoders(output) {
  const encoders = new Set();
  const candidates = ["h264_videotoolbox", "hevc_videotoolbox", "h264_nvenc", "hevc_nvenc", "h264_qsv", "hevc_qsv"];

  for (const encoder of candidates) {
    if (output.includes(encoder)) {
      encoders.add(encoder);
    }
  }

  return [...encoders];
}

async function getGpuNames() {
  if (process.platform !== "darwin") {
    return [];
  }

  try {
    const result = await runBinary("system_profiler", ["SPDisplaysDataType"]);
    const names = result.stdout
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*(?:Chipset Model|Graphics\/Displays):\s*(.+)$/)?.[1]?.trim())
      .filter(Boolean);

    if (names.length > 0) {
      return [...new Set(names)];
    }

    const cpu = await runBinary("sysctl", ["-n", "machdep.cpu.brand_string"]);
    return [cpu.stdout.trim()].filter(Boolean);
  } catch {
    return [];
  }
}

function pickEncoder(encoders, gpuNames) {
  const gpuText = gpuNames.join(" ").toLowerCase();

  if (encoders.includes("h264_videotoolbox") && /apple|m1|m2|m3|m4|m5|intel|amd|radeon/.test(gpuText)) {
    return "h264_videotoolbox";
  }

  if (encoders.includes("h264_nvenc") && /nvidia|geforce|rtx|gtx|quadro/.test(gpuText)) {
    return "h264_nvenc";
  }

  if (encoders.includes("h264_qsv") && /intel|iris|uhd/.test(gpuText)) {
    return "h264_qsv";
  }

  return "libx264";
}

function createCpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
  }

  return { idle, total };
}

function sampleCpuUsage() {
  const current = createCpuSnapshot();

  if (!cpuUsageSnapshot) {
    cpuUsageSnapshot = current;
    return 0;
  }

  const idleDelta = current.idle - cpuUsageSnapshot.idle;
  const totalDelta = current.total - cpuUsageSnapshot.total;
  cpuUsageSnapshot = current;

  if (totalDelta <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 1000) / 10));
}

function emptyGpuUsage(status = "unavailable") {
  return {
    status,
    total: null,
    videoEncode: null,
    threeD: null,
    compute: null,
    rawTotal: null
  };
}

function roundPercent(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function summarizeGpuCounters(samples) {
  let rawTotal = 0;
  let videoEncode = 0;
  let threeD = 0;
  let compute = 0;

  for (const sample of samples) {
    const pathText = String(sample.Path || sample.path || "").toLowerCase();
    const value = Number(sample.CookedValue ?? sample.cookedValue ?? 0);

    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    rawTotal += value;

    if (pathText.includes("engtype_videoencode")) {
      videoEncode += value;
    } else if (pathText.includes("engtype_3d")) {
      threeD += value;
    } else if (pathText.includes("engtype_compute")) {
      compute += value;
    }
  }

  return {
    status: "ok",
    total: roundPercent(rawTotal),
    videoEncode: roundPercent(videoEncode),
    threeD: roundPercent(threeD),
    compute: roundPercent(compute),
    rawTotal: Math.round(rawTotal * 10) / 10
  };
}

async function sampleGpuUsage() {
  if (process.platform !== "darwin") {
    return emptyGpuUsage();
  }

  const acceleratorClasses = ["IOAccelerator", "AGXAccelerator", "IOGraphicsAccelerator2"];

  for (const acceleratorClass of acceleratorClasses) {
    try {
      const result = await runBinary("ioreg", ["-r", "-d", "1", "-w", "0", "-c", acceleratorClass]);
      const usage = parseMacGpuUsageFromIoreg(result.stdout);

      if (usage.status === "ok") {
        return usage;
      }
    } catch {
      // Try the next accelerator class. macOS exposes different classes across GPU families.
    }
  }

  return emptyGpuUsage("restricted");
}

async function buildUsageSnapshot() {
  const capabilities = await getCapabilities();
  const cpu = {
    status: "ok",
    usage: sampleCpuUsage(),
    model: capabilities.cpuModel,
    logicalCores: capabilities.logicalCores,
    totalMemoryGb: capabilities.totalMemoryGb
  };
  let gpu = latestUsage?.gpu || emptyGpuUsage("sampling");

  if (!gpuSampleInFlight) {
    gpuSampleInFlight = true;
    sampleGpuUsage()
      .then((sample) => {
        gpu = sample;
      })
      .catch(() => {
        gpu = emptyGpuUsage();
      })
      .finally(() => {
        gpuSampleInFlight = false;
        latestUsage = {
          ...latestUsage,
          gpu,
          updatedAt: Date.now()
        };
        mainWindow?.webContents.send("system:usage-update", latestUsage);
      });
  }

  latestUsage = {
    cpu,
    gpu,
    updatedAt: Date.now()
  };

  return latestUsage;
}

function startUsageMonitor() {
  if (usageMonitor) {
    return;
  }

  usageMonitor = setInterval(() => {
    buildUsageSnapshot()
      .then((usage) => {
        mainWindow?.webContents.send("system:usage-update", usage);
      })
      .catch(() => undefined);
  }, 1000);
  usageMonitor.unref?.();

  buildUsageSnapshot()
    .then((usage) => {
      mainWindow?.webContents.send("system:usage-update", usage);
    })
    .catch(() => undefined);
}

async function getCapabilities() {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const ffmpegPath = getBundledBinary("ffmpeg");
  let hardwareEncoders = [];
  const gpuNames = await getGpuNames();

  try {
    const result = await runBinary(ffmpegPath, ["-hide_banner", "-encoders"]);
    hardwareEncoders = parseEncoders(`${result.stdout}\n${result.stderr}`);
  } catch {
    hardwareEncoders = [];
  }

  const cpus = os.cpus();
  cachedCapabilities = {
    platform: os.platform(),
    cpuModel: cpus[0]?.model || "Unknown CPU",
    logicalCores: cpus.length || 1,
    totalMemoryGb: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10,
    gpuNames,
    hardwareEncoders,
    selectedEncoder: pickEncoder(hardwareEncoders, gpuNames),
    selectedGpuEncoder: pickEncoder(hardwareEncoders, gpuNames),
    cpuEncoder: "libx264",
    ffmpegReady: fs.existsSync(ffmpegPath),
    outputDirectory: getDefaultOutputDirectory()
  };

  return cachedCapabilities;
}

function getDefaultOutputDirectory() {
  return path.join(app.getPath("videos"), "DL Editor Outputs");
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function getFileMetadata(filePath) {
  const stats = fs.statSync(filePath);
  const modifiedAtMs = Number.isFinite(stats.mtimeMs) ? stats.mtimeMs : Date.now();

  return {
    id: crypto.randomUUID(),
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    sizeLabel: formatBytes(stats.size),
    modifiedAt: new Date(modifiedAtMs).toISOString(),
    modifiedAtMs,
    startTimeMs: modifiedAtMs,
    status: "queued",
    progress: 0
  };
}

function normalizeNumber(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }
  return number;
}

function normalizeOptions(options) {
  const fps = normalizeNumber(options?.fps, 5);
  const width = normalizeNumber(options?.width, 1280);
  const height = normalizeNumber(options?.height, 720);
  const useSourceResolution = options?.resolutionMode === "source";
  const processingDevice = options?.processingDevice === "cpu" ? "cpu" : "gpu";

  return {
    fps: Math.max(1, Math.min(240, Math.round(fps))),
    width: Math.max(2, Math.min(7680, Math.round(width / 2) * 2)),
    height: Math.max(2, Math.min(4320, Math.round(height / 2) * 2)),
    resolutionMode: useSourceResolution ? "source" : "target",
    processingDevice
  };
}

function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, " ").trim();
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function normalizeTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
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

function createOutputPath(job, outputDirectory, reservedPaths = new Set()) {
  const baseName = sanitizeName(formatTimestampFileName(job.startTimeMs ?? job.modifiedAtMs));
  let candidate = path.join(outputDirectory, `${baseName}.mp4`);
  let index = 2;

  while (fs.existsSync(candidate) || reservedPaths.has(candidate)) {
    candidate = path.join(outputDirectory, `${baseName}_${index}.mp4`);
    index += 1;
  }

  reservedPaths.add(candidate);
  return candidate;
}

async function probeMediaInfo(inputPath) {
  const ffprobePath = getBundledBinary("ffprobe");
  const { stdout } = await runBinary(ffprobePath, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,avg_frame_rate,r_frame_rate:format=duration",
    "-of",
    "json",
    inputPath
  ]);

  const parsed = JSON.parse(stdout || "{}");
  const stream = Array.isArray(parsed.streams) ? parsed.streams[0] || {} : {};
  const duration = Number(parsed.format?.duration);
  const width = Number(stream.width);
  const height = Number(stream.height);

  return {
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null,
    avgFrameRate: stream.avg_frame_rate || null,
    rFrameRate: stream.r_frame_rate || null
  };
}

function getEncoderArgs(encoder, logicalCores) {
  if (encoder === "h264_videotoolbox") {
    return [
      "-c:v",
      "h264_videotoolbox",
      "-realtime",
      "1",
      "-prio_speed",
      "1",
      "-allow_sw",
      "0",
      "-b:v",
      "3500k",
      "-pix_fmt",
      "nv12"
    ];
  }

  if (encoder === "h264_nvenc") {
    return ["-c:v", "h264_nvenc", "-preset", "p1", "-tune", "ull", "-cq", "26", "-pix_fmt", "yuv420p"];
  }

  if (encoder === "h264_qsv") {
    return ["-c:v", "h264_qsv", "-preset", "veryfast", "-global_quality", "26", "-look_ahead", "0", "-pix_fmt", "nv12"];
  }

  return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-threads", String(Math.max(1, logicalCores - 1))];
}

function buildFfmpegArgs({ inputPath, outputPath, options, encoder, logicalCores, mediaInfo }) {
  const useGpuPath = options.processingDevice === "gpu" && encoder !== "libx264";
  const decoderArgs = useGpuPath ? ["-hwaccel", encoder === "h264_videotoolbox" ? "videotoolbox" : "auto"] : [];
  const seekArgs = Number.isFinite(options.segmentStart) && options.segmentStart > 0 ? ["-ss", options.segmentStart.toFixed(3)] : [];
  const durationArgs =
    Number.isFinite(options.segmentDuration) && options.segmentDuration > 0 ? ["-t", options.segmentDuration.toFixed(3)] : [];
  const filterThreads = Number.isFinite(Number(options.filterThreads))
    ? Number(options.filterThreads)
    : Math.max(1, Math.min(logicalCores || 1, 8));
  const videoFilters = buildVideoFilters(options, mediaInfo);
  const filterArgs = videoFilters ? ["-vf", videoFilters] : [];
  const fastStartArgs = options.fastStart === false ? [] : ["-movflags", "+faststart"];

  return [
    "-y",
    "-hide_banner",
    "-progress",
    "pipe:1",
    "-nostats",
    "-filter_threads",
    String(Math.max(1, Math.round(filterThreads))),
    ...decoderArgs,
    ...seekArgs,
    "-i",
    inputPath,
    ...durationArgs,
    ...getOutputStreamArgs({ videoOnly: options.videoOnly }),
    ...filterArgs,
    ...getEncoderArgs(encoder, logicalCores),
    "-avoid_negative_ts",
    "make_zero",
    ...fastStartArgs,
    outputPath
  ];
}

function parseProgressLine(line, duration) {
  const [key, value] = line.trim().split("=");
  if (!key || value === undefined || !duration) {
    return null;
  }

  if (key === "out_time_ms" || key === "out_time_us") {
    const seconds = Number(value) / 1000000;
    if (!Number.isFinite(seconds)) {
      return null;
    }

    return {
      currentTime: Math.round(seconds * 10) / 10,
      progress: Math.max(0, Math.min(99, Math.round((seconds / duration) * 100)))
    };
  }

  if (key === "out_time") {
    const match = value.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    if (!Number.isFinite(seconds)) {
      return null;
    }

    return {
      currentTime: Math.round(seconds * 10) / 10,
      progress: Math.max(0, Math.min(99, Math.round((seconds / duration) * 100)))
    };
  }

  return null;
}

function buildTimingPayload(startedAt, duration, currentTime) {
  const pausedMs = getPausedMsSince(startedAt);
  const elapsedMs = Math.max(0, Date.now() - startedAt - pausedMs);
  const safeCurrentTime = Number(currentTime) || 0;
  let estimatedRemainingMs = null;

  if (duration > 0 && safeCurrentTime > 0 && safeCurrentTime < duration) {
    estimatedRemainingMs = Math.max(0, Math.round(elapsedMs * ((duration - safeCurrentTime) / safeCurrentTime)));
  } else if (safeCurrentTime >= duration && duration > 0) {
    estimatedRemainingMs = 0;
  }

  return {
    elapsedMs,
    elapsedSeconds: Math.round((elapsedMs / 1000) * 10) / 10,
    pausedMs,
    estimatedRemainingMs
  };
}

function emitJobUpdate(payload) {
  if (payload?.id) {
    jobSnapshots.set(payload.id, { ...(jobSnapshots.get(payload.id) || {}), ...payload });
  }
  mainWindow?.webContents.send("transcode:job-update", payload);
}

function emitBatchUpdate(payload) {
  mainWindow?.webContents.send("transcode:batch-update", payload);
}

function emitPauseJobState(status, message) {
  for (const [id, snapshot] of jobSnapshots.entries()) {
    if (snapshot.status !== "processing" && snapshot.status !== "paused") {
      continue;
    }

    const timing = Number.isFinite(Number(snapshot.startedAt))
      ? buildTimingPayload(snapshot.startedAt, Number(snapshot.duration) || 0, Number(snapshot.currentTime) || 0)
      : {};

    emitJobUpdate({
      ...snapshot,
      ...timing,
      id,
      status,
      message
    });
  }
}

function getActiveJobStatus() {
  return pauseRequested ? "paused" : "processing";
}

function getActiveJobMessage(message) {
  return pauseRequested ? "Paused" : message;
}

async function runFfmpegJob(job, options, outputPath, duration, capabilities, encoder, startedAt, mediaInfo) {
  await waitWhilePaused();

  const ffmpegPath = getBundledBinary("ffmpeg");
  const args = buildFfmpegArgs({
    inputPath: job.path,
    outputPath,
    options,
    encoder,
    logicalCores: capabilities.logicalCores,
    mediaInfo
  });

  emitJobUpdate({
    id: job.id,
    status: "processing",
    progress: 0,
    duration,
    currentTime: 0,
    elapsedMs: 0,
    elapsedSeconds: 0,
    pausedMs: 0,
    estimatedRemainingMs: null,
    startedAt,
    outputPath,
    message: `Using ${encoder}`
  });

  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    trackProcess(child);
    let stdoutBuffer = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const progressInfo = parseProgressLine(line, duration);
        if (progressInfo !== null) {
          const timing = buildTimingPayload(startedAt, duration, progressInfo.currentTime);

          emitJobUpdate({
            id: job.id,
            status: getActiveJobStatus(),
            progress: progressInfo.progress,
            duration,
            currentTime: progressInfo.currentTime,
            ...timing,
            startedAt,
            outputPath,
            message: getActiveJobMessage(`Using ${encoder}`)
          });
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      activeProcesses.delete(child);

      if (cancelRequested) {
        reject(new Error("Canceled by user."));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}`));
    });
  });
}

async function transcodeJob(job, options, outputDirectory, capabilities, reservedOutputPaths) {
  const outputPath = createOutputPath(job, outputDirectory, reservedOutputPaths);
  const mediaInfo = await probeMediaInfo(job.path);
  const duration = mediaInfo.duration;
  const encoder = options.processingDevice === "cpu" ? "libx264" : capabilities.selectedGpuEncoder;
  const startedAt = Date.now();

  try {
    const segmented = options.enableSegmentation
      ? await transcodeSegmentedJob(job, options, outputPath, duration, capabilities, encoder, startedAt, mediaInfo)
      : false;

    if (!segmented) {
      await runFfmpegJob(job, options, outputPath, duration, capabilities, encoder, startedAt, mediaInfo);
    }
  } catch (error) {
    if (cancelRequested || encoder === "libx264" || options.processingDevice === "cpu") {
      throw error;
    }

    if (fs.existsSync(outputPath)) {
      fs.rmSync(outputPath, { force: true });
    }

    emitJobUpdate({
      id: job.id,
      status: "processing",
      progress: 0,
      duration,
      outputPath,
      startedAt,
      ...buildTimingPayload(startedAt, duration, 0),
      estimatedRemainingMs: null,
      message: `${encoder} unavailable, retrying CPU`
    });

    await runFfmpegJob(job, options, outputPath, duration, capabilities, "libx264", startedAt, mediaInfo);
  }

  emitJobUpdate({
    id: job.id,
    status: "done",
    progress: 100,
    duration,
    currentTime: Math.round(duration * 10) / 10,
    ...buildTimingPayload(startedAt, duration, duration),
    estimatedRemainingMs: 0,
    outputPath,
    message: "Complete"
  });
}

function escapeConcatPath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

function runTrackedProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    trackProcess(child);
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      activeProcesses.delete(child);
      reject(error);
    });

    child.on("close", (code) => {
      activeProcesses.delete(child);

      if (cancelRequested) {
        reject(new Error("Canceled by user."));
      } else if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `Process exited with code ${code}`));
      }
    });
  });
}

async function runFfmpegSegment({ job, options, segment, capabilities, encoder, startedAt, mediaInfo, onProgress }) {
  await waitWhilePaused();

  const ffmpegPath = getBundledBinary("ffmpeg");
  const args = buildFfmpegArgs({
    inputPath: job.path,
    outputPath: segment.outputPath,
    options: {
      ...options,
      segmentStart: segment.start,
      segmentDuration: segment.duration,
      videoOnly: true,
      fastStart: false
    },
    encoder,
    logicalCores: capabilities.logicalCores,
    mediaInfo
  });

  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    trackProcess(child);
    let stdoutBuffer = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const progressInfo = parseProgressLine(line, segment.duration);
        if (progressInfo !== null) {
          onProgress(segment.index, Math.min(segment.duration, progressInfo.currentTime), startedAt);
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      activeProcesses.delete(child);
      reject(error);
    });

    child.on("close", (code) => {
      activeProcesses.delete(child);

      if (cancelRequested) {
        reject(new Error("Canceled by user."));
        return;
      }

      if (code === 0) {
        onProgress(segment.index, segment.duration, startedAt);
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `FFmpeg segment exited with code ${code}`));
    });
  });
}

async function concatSegments(segments, outputPath) {
  await waitWhilePaused();

  const ffmpegPath = getBundledBinary("ffmpeg");
  const listPath = path.join(path.dirname(segments[0].outputPath), "concat-list.txt");
  const content = segments.map((segment) => `file '${escapeConcatPath(segment.outputPath)}'`).join(os.EOL);
  fs.writeFileSync(listPath, content, "utf8");

  await runTrackedProcess(ffmpegPath, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    outputPath
  ]);
}

async function muxOriginalAudio(videoPath, sourcePath, outputPath) {
  await waitWhilePaused();

  const ffmpegPath = getBundledBinary("ffmpeg");
  try {
    await runTrackedProcess(ffmpegPath, getMuxOriginalAudioArgs({ videoPath, sourcePath, outputPath, audioMode: "copy" }));
  } catch (error) {
    if (cancelRequested) {
      throw error;
    }

    await waitWhilePaused();
    await runTrackedProcess(ffmpegPath, getMuxOriginalAudioArgs({ videoPath, sourcePath, outputPath, audioMode: "aac" }));
  }
}

async function transcodeSegmentedJob(job, options, outputPath, duration, capabilities, encoder, startedAt, mediaInfo) {
  const concurrency =
    options.segmentConcurrency || getSegmentedJobConcurrency(encoder, capabilities, { videoConcurrency: options.videoConcurrency || 1 });
  const segmentCount = getSegmentCount(duration, concurrency, encoder);

  if (segmentCount <= 1) {
    return false;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dl-editor-segments-"));
  const segmentDuration = duration / segmentCount;
  const segments = Array.from({ length: segmentCount }, (_item, index) => {
    const start = index * segmentDuration;
    const end = index === segmentCount - 1 ? duration : (index + 1) * segmentDuration;

    return {
      index,
      start,
      duration: Math.max(0.1, end - start),
      outputPath: path.join(tempDir, `segment-${String(index).padStart(3, "0")}.mp4`)
    };
  });
  const progressBySegment = new Array(segmentCount).fill(0);
  let nextIndex = 0;
  let completedSegments = 0;

  function emitAggregate(message) {
    const currentTime = Math.min(
      duration,
      progressBySegment.reduce((sum, value) => sum + value, 0)
    );
    const timing = buildTimingPayload(startedAt, duration, currentTime);

    emitJobUpdate({
      id: job.id,
      status: getActiveJobStatus(),
      progress: Math.max(0, Math.min(99, Math.round((currentTime / duration) * 100))),
      duration,
      currentTime: Math.round(currentTime * 10) / 10,
      ...timing,
      startedAt,
      outputPath,
      message: getActiveJobMessage(message)
    });
  }

  emitAggregate(`GPU segmented x${Math.min(concurrency, segmentCount)}`);

  async function worker() {
    while (!cancelRequested) {
      await waitWhilePaused();

      const segment = segments[nextIndex];
      nextIndex += 1;

      if (!segment) {
        return;
      }

      await runFfmpegSegment({
        job,
        options: {
          ...options,
          videoOnly: true
        },
        segment,
        capabilities,
        encoder,
        startedAt,
        mediaInfo,
        onProgress: (index, current) => {
          progressBySegment[index] = current;
          emitAggregate(`GPU segmented x${Math.min(concurrency, segmentCount)} · ${completedSegments}/${segmentCount}`);
        }
      });

      completedSegments += 1;
      progressBySegment[segment.index] = segment.duration;
      emitAggregate(`GPU segmented x${Math.min(concurrency, segmentCount)} · ${completedSegments}/${segmentCount}`);
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, segmentCount) }, () => worker()));

    if (cancelRequested) {
      throw new Error("Canceled by user.");
    }

    const mergedVideoPath = path.join(tempDir, "merged-video.mp4");
    emitAggregate("Merging GPU video segments");
    await concatSegments(segments, mergedVideoPath);
    emitAggregate("Muxing audio");
    await muxOriginalAudio(mergedVideoPath, job.path, outputPath);
    return true;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function processBatch(jobs, rawOptions, rawOutputDirectory) {
  queueBusy = true;
  cancelRequested = false;
  pauseRequested = false;
  pauseStartedAt = null;
  pauseIntervals = [];
  jobSnapshots.clear();

  const options = normalizeOptions(rawOptions);
  const outputDirectory = rawOutputDirectory || getDefaultOutputDirectory();
  ensureDirectory(outputDirectory);

  const capabilities = await getCapabilities();
  const activeEncoder = options.processingDevice === "cpu" ? "libx264" : capabilities.selectedGpuEncoder;
  const enableSegmentation = options.processingDevice === "gpu";
  const videoConcurrency = getVideoConcurrency(options, activeEncoder, jobs.length);
  const segmentConcurrency = enableSegmentation
    ? getSegmentedJobConcurrency(activeEncoder, capabilities, { videoConcurrency })
    : 1;
  const activeFfmpegWorkers = Math.max(1, videoConcurrency * segmentConcurrency);
  const filterThreads = getFilterThreadCount(activeEncoder, capabilities, { activeWorkers: activeFfmpegWorkers });
  const runtimeOptions = {
    ...options,
    enableSegmentation,
    segmentConcurrency,
    videoConcurrency,
    filterThreads
  };
  const reservedOutputPaths = new Set();
  emitBatchUpdate({
    status: "started",
    paused: false,
    total: jobs.length,
    outputDirectory,
    encoder: activeEncoder,
    processingDevice: runtimeOptions.processingDevice,
    concurrency: segmentConcurrency,
    videoConcurrency,
    filterThreads
  });

  let completed = 0;
  let failed = 0;
  const settledJobs = new Set();
  let nextJobIndex = 0;

  async function processNextJob() {
    while (!cancelRequested) {
      await waitWhilePaused();

      const job = jobs[nextJobIndex];
      nextJobIndex += 1;

      if (!job) {
        return;
      }

      try {
        await transcodeJob(job, runtimeOptions, outputDirectory, capabilities, reservedOutputPaths);
        completed += 1;
        settledJobs.add(job.id);
      } catch (error) {
        settledJobs.add(job.id);
        if (cancelRequested) {
          emitJobUpdate({ id: job.id, status: "canceled", progress: 0, message: "Canceled" });
        } else {
          failed += 1;
          emitJobUpdate({
            id: job.id,
            status: "error",
            progress: 0,
            message: error.message || "Failed to process video"
          });
        }
      }
    }
  }

  await Promise.all(Array.from({ length: videoConcurrency }, () => processNextJob()));

  if (cancelRequested) {
    for (const job of jobs) {
      if (!settledJobs.has(job.id)) {
        emitJobUpdate({ id: job.id, status: "canceled", progress: 0, message: "Canceled" });
      }
    }
  }

  queueBusy = false;
  pauseRequested = false;
  pauseStartedAt = null;

  emitBatchUpdate({
    status: cancelRequested ? "canceled" : "finished",
    paused: false,
    total: jobs.length,
    completed,
    failed,
    outputDirectory,
    encoder: activeEncoder,
    processingDevice: runtimeOptions.processingDevice,
    concurrency: segmentConcurrency,
    videoConcurrency,
    filterThreads
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  startUsageMonitor();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      startUsageMonitor();
    }
  });
});

app.on("window-all-closed", () => {
  if (usageMonitor) {
    clearInterval(usageMonitor);
    usageMonitor = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("window:toggle-maximize", () => {
  if (!mainWindow) {
    return false;
  }

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  }

  mainWindow.maximize();
  return true;
});

ipcMain.handle("window:close", () => {
  mainWindow?.close();
});

ipcMain.handle("window:is-maximized", () => Boolean(mainWindow?.isMaximized()));

ipcMain.handle("videos:select", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select videos",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Video files", extensions: VIDEO_EXTENSIONS },
      { name: "All files", extensions: ["*"] }
    ]
  });

  if (result.canceled) {
    return [];
  }

  return result.filePaths.map(getFileMetadata);
});

ipcMain.handle("output:select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose output folder",
    defaultPath: getDefaultOutputDirectory(),
    properties: ["openDirectory", "createDirectory"]
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("system:get-capabilities", async () => getCapabilities());
ipcMain.handle("system:get-usage", async () => latestUsage || buildUsageSnapshot());

ipcMain.handle("transcode:start-batch", async (_event, payload) => {
  if (queueBusy) {
    throw new Error("A batch is already running.");
  }

  const jobs = Array.isArray(payload?.jobs) ? payload.jobs.filter((job) => fs.existsSync(job.path)) : [];
  if (jobs.length === 0) {
    throw new Error("No valid videos selected.");
  }

  processBatch(jobs, payload?.options, payload?.outputDirectory).catch((error) => {
    queueBusy = false;
    pauseRequested = false;
    pauseStartedAt = null;
    emitBatchUpdate({ status: "error", paused: false, message: error.message || "Batch failed" });
  });

  return { started: true };
});

ipcMain.handle("transcode:cancel-batch", async () => {
  cancelRequested = true;
  pauseRequested = false;
  closeActivePauseInterval();
  await setActiveProcessesPaused(false);

  for (const processHandle of activeProcesses) {
    processHandle.kill("SIGTERM");
  }

  return { cancelRequested: true };
});

ipcMain.handle("transcode:pause-batch", async () => {
  if (!queueBusy || pauseRequested) {
    return { paused: pauseRequested };
  }

  pauseRequested = true;
  pauseStartedAt = Date.now();
  emitPauseJobState("paused", "Paused");
  emitBatchUpdate({ status: "started", paused: true, message: "Paused" });

  const pauseResult = await setActiveProcessesPaused(true);
  if (pauseResult.failed > 0) {
    pauseRequested = false;
    closeActivePauseInterval();
    emitPauseJobState("processing", "Pause failed");
    emitBatchUpdate({ status: "started", paused: false, message: "Pause failed" });
    throw new Error("无法暂停当前 FFmpeg 进程");
  }

  return { paused: true, pauseResult };
});

ipcMain.handle("transcode:resume-batch", async () => {
  if (!queueBusy || !pauseRequested) {
    return { paused: pauseRequested };
  }

  closeActivePauseInterval();
  pauseRequested = false;
  emitPauseJobState("processing", "Resumed");
  emitBatchUpdate({ status: "started", paused: false, resumed: true, message: "Resumed" });

  const resumeResult = await setActiveProcessesPaused(false);
  if (resumeResult.failed > 0) {
    pauseRequested = true;
    pauseStartedAt = Date.now();
    emitPauseJobState("paused", "Resume failed");
    emitBatchUpdate({ status: "started", paused: true, message: "Resume failed" });
    throw new Error("无法恢复当前 FFmpeg 进程");
  }

  return { paused: false, resumeResult };
});

ipcMain.handle("shell:reveal-path", async (_event, targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) {
    shell.showItemInFolder(targetPath);
  }
});

ipcMain.handle("shell:open-path", async (_event, targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) {
    return shell.openPath(targetPath);
  }
  return "Path does not exist.";
});
