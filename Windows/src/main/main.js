const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

let mainWindow;
const activeProcesses = new Set();
let cancelRequested = false;
let queueBusy = false;
let cachedCapabilities = null;
let cpuUsageSnapshot = null;
let latestUsage = null;
let usageMonitor = null;
let gpuSampleInFlight = false;

const VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "avi", "webm", "m4v", "wmv"];

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
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

function getBundledBinary(name) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bin", `${name}.exe`);
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

function parseEncoders(output) {
  const encoders = new Set();
  const candidates = ["h264_nvenc", "hevc_nvenc", "h264_qsv", "hevc_qsv", "h264_amf", "hevc_amf", "h264_mf"];

  for (const encoder of candidates) {
    if (output.includes(encoder)) {
      encoders.add(encoder);
    }
  }

  return [...encoders];
}

async function getGpuNames() {
  if (process.platform !== "win32") {
    return [];
  }

  try {
    const result = await runBinary("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }"
    ]);

    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function pickEncoder(encoders, gpuNames) {
  const gpuText = gpuNames.join(" ").toLowerCase();

  if (encoders.includes("h264_nvenc") && /nvidia|geforce|rtx|gtx|quadro/.test(gpuText)) {
    return "h264_nvenc";
  }

  if (encoders.includes("h264_qsv") && /intel|iris|uhd/.test(gpuText)) {
    return "h264_qsv";
  }

  if (encoders.includes("h264_amf") && /amd|radeon/.test(gpuText)) {
    return "h264_amf";
  }

  if (encoders.includes("h264_mf") && /qualcomm|adreno|nvidia|geforce|intel|iris|uhd|amd|radeon/.test(gpuText)) {
    return "h264_mf";
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
  if (process.platform !== "win32") {
    return emptyGpuUsage();
  }

  try {
    const script = [
      "$samples = (Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction Stop).CounterSamples",
      "$samples | Select-Object Path,CookedValue | ConvertTo-Json -Compress"
    ].join("; ");
    const result = await runBinary("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script
    ]);
    const parsed = JSON.parse(result.stdout.trim() || "[]");
    const samples = Array.isArray(parsed) ? parsed : [parsed];

    return summarizeGpuCounters(samples);
  } catch {
    return emptyGpuUsage();
  }
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
  return {
    id: crypto.randomUUID(),
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    sizeLabel: formatBytes(stats.size),
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

function createOutputPath(inputPath, outputDirectory, options, reservedPaths = new Set()) {
  const parsed = path.parse(inputPath);
  const targetLabel = options.resolutionMode === "source" ? "source" : `${options.width}x${options.height}`;
  const baseName = sanitizeName(`${parsed.name}-${targetLabel}-${options.fps}fps`);
  let candidate = path.join(outputDirectory, `${baseName}.mp4`);
  let index = 2;

  while (fs.existsSync(candidate) || reservedPaths.has(candidate)) {
    candidate = path.join(outputDirectory, `${baseName}-${index}.mp4`);
    index += 1;
  }

  reservedPaths.add(candidate);
  return candidate;
}

async function probeDuration(inputPath) {
  const ffprobePath = getBundledBinary("ffprobe");
  const { stdout } = await runBinary(ffprobePath, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputPath
  ]);

  const duration = Number(stdout.trim());
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function buildVideoFilters(options) {
  const filters = [`fps=${options.fps}`];

  if (options.resolutionMode !== "source") {
    filters.push(
      `scale=w='min(${options.width},iw)':h='min(${options.height},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`
    );
  }

  return filters.join(",");
}

function getEncoderArgs(encoder, logicalCores) {
  if (encoder === "h264_nvenc") {
    return ["-c:v", "h264_nvenc", "-preset", "p1", "-tune", "ull", "-cq", "26", "-pix_fmt", "yuv420p"];
  }

  if (encoder === "h264_qsv") {
    return ["-c:v", "h264_qsv", "-preset", "veryfast", "-global_quality", "26", "-look_ahead", "0", "-pix_fmt", "nv12"];
  }

  if (encoder === "h264_amf") {
    return ["-c:v", "h264_amf", "-quality", "speed", "-rc", "cqp", "-qp_i", "23", "-qp_p", "23", "-qp_b", "25"];
  }

  if (encoder === "h264_mf") {
    return ["-c:v", "h264_mf", "-rate_control", "quality", "-quality", "65", "-hw_encoding", "1", "-pix_fmt", "nv12"];
  }

  return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-threads", String(Math.max(1, logicalCores - 1))];
}

function buildFfmpegArgs({ inputPath, outputPath, options, encoder, logicalCores }) {
  const useGpuPath = options.processingDevice === "gpu" && encoder !== "libx264";
  const decoderArgs = useGpuPath ? ["-hwaccel", "auto"] : [];
  const seekArgs = Number.isFinite(options.segmentStart) && options.segmentStart > 0 ? ["-ss", options.segmentStart.toFixed(3)] : [];
  const durationArgs =
    Number.isFinite(options.segmentDuration) && options.segmentDuration > 0 ? ["-t", options.segmentDuration.toFixed(3)] : [];

  return [
    "-y",
    "-hide_banner",
    "-progress",
    "pipe:1",
    "-nostats",
    "-filter_threads",
    String(Math.max(1, Math.min(logicalCores || 1, 8))),
    ...decoderArgs,
    ...seekArgs,
    "-i",
    inputPath,
    ...durationArgs,
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-vf",
    buildVideoFilters(options),
    ...getEncoderArgs(encoder, logicalCores),
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-avoid_negative_ts",
    "make_zero",
    "-movflags",
    "+faststart",
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
  const elapsedMs = Math.max(0, Date.now() - startedAt);
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
    estimatedRemainingMs
  };
}

function emitJobUpdate(payload) {
  mainWindow?.webContents.send("transcode:job-update", payload);
}

function emitBatchUpdate(payload) {
  mainWindow?.webContents.send("transcode:batch-update", payload);
}

async function runFfmpegJob(job, options, outputPath, duration, capabilities, encoder, startedAt) {
  const ffmpegPath = getBundledBinary("ffmpeg");
  const args = buildFfmpegArgs({
    inputPath: job.path,
    outputPath,
    options,
    encoder,
    logicalCores: capabilities.logicalCores
  });

  emitJobUpdate({
    id: job.id,
    status: "processing",
    progress: 0,
    duration,
    currentTime: 0,
    elapsedMs: 0,
    elapsedSeconds: 0,
    estimatedRemainingMs: null,
    startedAt,
    outputPath,
    message: `Using ${encoder}`
  });

  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    activeProcesses.add(child);
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
            status: "processing",
            progress: progressInfo.progress,
            duration,
            currentTime: progressInfo.currentTime,
            ...timing,
            startedAt,
            outputPath,
            message: `Using ${encoder}`
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
  const outputPath = createOutputPath(job.path, outputDirectory, options, reservedOutputPaths);
  const duration = await probeDuration(job.path);
  const encoder = options.processingDevice === "cpu" ? "libx264" : capabilities.selectedGpuEncoder;
  const startedAt = Date.now();

  try {
    const segmented = options.enableSegmentation
      ? await transcodeSegmentedJob(job, options, outputPath, duration, capabilities, encoder, startedAt)
      : false;

    if (!segmented) {
      await runFfmpegJob(job, options, outputPath, duration, capabilities, encoder, startedAt);
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
      elapsedMs: Date.now() - startedAt,
      estimatedRemainingMs: null,
      message: `${encoder} unavailable, retrying CPU`
    });

    await runFfmpegJob(job, options, outputPath, duration, capabilities, "libx264", startedAt);
  }

  emitJobUpdate({
    id: job.id,
    status: "done",
    progress: 100,
    duration,
    currentTime: Math.round(duration * 10) / 10,
    elapsedMs: Date.now() - startedAt,
    elapsedSeconds: Math.round(((Date.now() - startedAt) / 1000) * 10) / 10,
    estimatedRemainingMs: 0,
    outputPath,
    message: "Complete"
  });
}

function getSegmentedJobConcurrency(encoder, capabilities) {
  if (encoder === "libx264") {
    return 1;
  }

  const cores = capabilities.logicalCores || 1;

  if (encoder === "h264_mf") {
    return Math.max(2, Math.min(4, Math.floor(cores / 3) || 2));
  }

  if (encoder === "h264_nvenc") {
    return 3;
  }

  return Math.max(2, Math.min(3, Math.floor(cores / 4) || 2));
}

function getSegmentCount(duration, concurrency) {
  if (!Number.isFinite(duration) || duration < 120 || concurrency <= 1) {
    return 1;
  }

  const targetSegmentSeconds = duration >= 3600 ? 240 : 180;
  const minimumSegments = Math.max(2, concurrency);
  return Math.max(minimumSegments, Math.min(96, Math.ceil(duration / targetSegmentSeconds)));
}

function escapeConcatPath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

function runTrackedProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    activeProcesses.add(child);
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

async function runFfmpegSegment({ job, options, segment, capabilities, encoder, startedAt, onProgress }) {
  const ffmpegPath = getBundledBinary("ffmpeg");
  const args = buildFfmpegArgs({
    inputPath: job.path,
    outputPath: segment.outputPath,
    options: {
      ...options,
      segmentStart: segment.start,
      segmentDuration: segment.duration
    },
    encoder,
    logicalCores: capabilities.logicalCores
  });

  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    activeProcesses.add(child);
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
    "-movflags",
    "+faststart",
    outputPath
  ]);
}

async function transcodeSegmentedJob(job, options, outputPath, duration, capabilities, encoder, startedAt) {
  const concurrency = getSegmentedJobConcurrency(encoder, capabilities);
  const segmentCount = getSegmentCount(duration, concurrency);

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
      status: "processing",
      progress: Math.max(0, Math.min(99, Math.round((currentTime / duration) * 100))),
      duration,
      currentTime: Math.round(currentTime * 10) / 10,
      ...timing,
      startedAt,
      outputPath,
      message
    });
  }

  emitAggregate(`GPU segmented x${Math.min(concurrency, segmentCount)}`);

  async function worker() {
    while (!cancelRequested) {
      const segment = segments[nextIndex];
      nextIndex += 1;

      if (!segment) {
        return;
      }

      await runFfmpegSegment({
        job,
        options,
        segment,
        capabilities,
        encoder,
        startedAt,
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

    emitAggregate("Merging GPU segments");
    await concatSegments(segments, outputPath);
    return true;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function processBatch(jobs, rawOptions, rawOutputDirectory) {
  queueBusy = true;
  cancelRequested = false;

  const options = normalizeOptions(rawOptions);
  const runtimeOptions = {
    ...options,
    enableSegmentation: options.processingDevice === "gpu"
  };
  const outputDirectory = rawOutputDirectory || getDefaultOutputDirectory();
  ensureDirectory(outputDirectory);

  const capabilities = await getCapabilities();
  const activeEncoder = runtimeOptions.processingDevice === "cpu" ? "libx264" : capabilities.selectedGpuEncoder;
  const segmentConcurrency = runtimeOptions.enableSegmentation ? getSegmentedJobConcurrency(activeEncoder, capabilities) : 1;
  const videoConcurrency = 1;
  const reservedOutputPaths = new Set();
  emitBatchUpdate({
    status: "started",
    total: jobs.length,
    outputDirectory,
    encoder: activeEncoder,
    processingDevice: runtimeOptions.processingDevice,
    concurrency: segmentConcurrency,
    videoConcurrency
  });

  let completed = 0;
  let failed = 0;
  const settledJobs = new Set();

  for (const job of jobs) {
    if (cancelRequested) {
      break;
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

  if (cancelRequested) {
    for (const job of jobs) {
      if (!settledJobs.has(job.id)) {
        emitJobUpdate({ id: job.id, status: "canceled", progress: 0, message: "Canceled" });
      }
    }
  }

  queueBusy = false;

  emitBatchUpdate({
    status: cancelRequested ? "canceled" : "finished",
    total: jobs.length,
    completed,
    failed,
    outputDirectory,
    encoder: activeEncoder,
    processingDevice: runtimeOptions.processingDevice,
    concurrency: segmentConcurrency,
    videoConcurrency
  });
}

app.whenReady().then(() => {
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
    emitBatchUpdate({ status: "error", message: error.message || "Batch failed" });
  });

  return { started: true };
});

ipcMain.handle("transcode:cancel-batch", async () => {
  cancelRequested = true;

  for (const processHandle of activeProcesses) {
    processHandle.kill("SIGTERM");
  }

  return { cancelRequested: true };
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
