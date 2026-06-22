import {
  Activity,
  CalendarClock,
  CheckCircle2,
  CircleStop,
  Clock3,
  Cpu,
  FileSearch,
  FolderOpen,
  Gauge,
  ListVideo,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Sun,
  Timer,
  TriangleAlert,
  Video,
  X,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  error: "失败",
  canceled: "取消",
  paused: "暂停"
};

const dlEditor = window.dlEditor || {
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
    outputDirectory: "Videos/DL Editor Outputs"
  }),
  getUsage: async () => ({
    cpu: { status: "ok", usage: 0 },
    gpu: { status: "unavailable", total: null, videoEncode: null, threeD: null, compute: null }
  }),
  startBatch: async () => ({ started: true }),
  pauseBatch: async () => ({ paused: true }),
  resumeBatch: async () => ({ paused: false }),
  cancelBatch: async () => ({ cancelRequested: true }),
  openPath: async () => undefined,
  revealPath: async () => undefined,
  minimizeWindow: async () => undefined,
  toggleMaximizeWindow: async () => false,
  closeWindow: async () => undefined,
  isWindowMaximized: async () => false,
  onJobUpdate: () => () => undefined,
  onBatchUpdate: () => () => undefined,
  onSystemUsageUpdate: () => () => undefined,
  onWindowMaximizedChange: () => () => undefined
};

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
    const saved = window.localStorage?.getItem("dl-editor-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const [startTimeEditor, setStartTimeEditor] = useState(null);

  const isRunning = batchState.status === "started";
  const isPaused = isRunning && Boolean(batchState.paused);
  const pendingJobs = jobs.filter((job) => job.status !== "done");
  const hasProcessingJobs = jobs.some((job) => job.status === "processing" || job.status === "paused");

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
        const modeLabel =
          update.processingDevice === "cpu"
            ? "CPU"
            : `GPU 极速，视频并发：${update.videoConcurrency || 1}，分段并发：${update.concurrency || 1}`;
        setNotice(
          `开始处理 ${update.total} 个视频，模式：${modeLabel}，编码器：${update.encoder}`
        );
      }
    });

    const offUsage = dlEditor.onSystemUsageUpdate(setSystemUsage);
    const offMaximized = dlEditor.onWindowMaximizedChange(setIsMaximized);
    dlEditor.isWindowMaximized().then(setIsMaximized).catch(() => undefined);

    return () => {
      offJob();
      offBatch();
      offUsage();
      offMaximized();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage?.setItem("dl-editor-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!hasProcessingJobs) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 80);

    return () => window.clearInterval(timer);
  }, [hasProcessingJobs]);

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
        outputPath: job.status === "done" ? job.outputPath : ""
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
    setJobs((current) => current.filter((job) => job.status !== "done"));
  }

  function removeJob(id) {
    setJobs((current) => current.filter((job) => job.id !== id));
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

  return (
    <main className="app-shell">
      <AppChrome
        isMaximized={isMaximized}
        onClose={() => dlEditor.closeWindow()}
        onMinimize={() => dlEditor.minimizeWindow()}
        onThemeToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onToggleMaximize={() => dlEditor.toggleMaximizeWindow().then(setIsMaximized).catch(() => undefined)}
        theme={theme}
      />

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

          <UsageCard device={processingDevice} usage={systemUsage} />

          <div className="actions">
            <button className="primary-button" disabled={!canStart} onClick={startBatch} type="button">
              <Play size={17} />
              <span>开始处理</span>
            </button>
            <button className="ghost-button action-button" disabled={!isRunning || pauseTransitioning} onClick={togglePause} type="button">
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              <span>{isPaused ? "继续" : "暂停"}</span>
            </button>
            <button className="ghost-button" disabled={!isRunning} onClick={cancelBatch} type="button">
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
              <button className="icon-button" disabled={isRunning} onClick={clearFinished} title="清除已完成" type="button">
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
            <Metric icon={<TriangleAlert size={16} />} label="失败" value={totals.errors} />
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
                  disabled={isRunning}
                  job={job}
                  key={job.id}
                  now={clockNow}
                  onEditStartTime={() => openStartTimeEditor(job)}
                  onOpen={() => job.outputPath && dlEditor.openPath(job.outputPath)}
                  onRemove={() => removeJob(job.id)}
                  onReveal={() => job.outputPath && dlEditor.revealPath(job.outputPath)}
                />
              ))}
            </div>
          )}
        </section>
      </section>
      {startTimeEditor && (
        <StartTimeDialog
          editor={startTimeEditor}
          onCancel={() => setStartTimeEditor(null)}
          onChange={(changes) => setStartTimeEditor((current) => (current ? { ...current, ...changes } : current))}
          onParseFileName={parseStartTimeFromFileName}
          onSave={saveStartTime}
        />
      )}
    </main>
  );
}

function AppChrome({ isMaximized, onClose, onMinimize, onThemeToggle, onToggleMaximize, theme }) {
  return (
    <section className="app-chrome">
      <div className="drag-region" />
      <div className="window-actions">
        <button className="chrome-button" onClick={onThemeToggle} title={theme === "dark" ? "切换浅色主题" : "切换深色主题"} type="button">
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button className="chrome-button" onClick={onMinimize} title="最小化" type="button">
          <Minus size={15} />
        </button>
        <button className="chrome-button" onClick={onToggleMaximize} title={isMaximized ? "还原" : "最大化"} type="button">
          {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button className="chrome-button close" onClick={onClose} title="关闭" type="button">
          <X size={15} />
        </button>
      </div>
    </section>
  );
}

function DeviceStatus({ capabilities, device, encoder, usage }) {
  const cpuUsage = usage?.cpu?.usage;
  const gpuUsage = usage?.gpu?.total;

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
            ? `${capabilities?.gpuNames?.join(", ") || "GPU 已检测"} · 当前使用率 ${percentLabel(gpuUsage)}`
            : "未发现硬件编码器，任务会自动回退 CPU"}
        </span>
      </div>
    </div>
  );
}

function UsageCard({ device, usage }) {
  const isCpu = device === "cpu";
  const data = isCpu ? usage?.cpu : usage?.gpu;
  const total = isCpu ? data?.usage : data?.total;

  return (
    <div className="usage-card">
      <div className="usage-header">
        <Activity size={18} />
        <div>
          <strong>{isCpu ? "CPU 使用情况" : "GPU 使用情况"}</strong>
          <span>{isCpu ? "系统总负载" : "总利用率与编码引擎"}</span>
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
          <span>Video Encode</span>
          <strong>{percentLabel(data?.videoEncode)}</strong>
          <span>3D</span>
          <strong>{percentLabel(data?.threeD)}</strong>
          <span>Compute</span>
          <strong>{percentLabel(data?.compute)}</strong>
          <span>状态</span>
          <strong>{Number.isFinite(Number(data?.total)) ? "可读取" : data?.status === "sampling" ? "采样中" : "不可用"}</strong>
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

function QueueItem({ disabled, job, now, onEditStartTime, onOpen, onRemove, onReveal }) {
  const elapsedMs = getElapsedMs(job, now);
  const remainingMs = getEstimatedRemainingMs(job, elapsedMs);
  const durationMs = Math.max(0, Math.round((Number(job.duration) || 0) * 1000));
  const currentVideoMs = Math.max(0, Math.round((Number(job.currentTime) || 0) * 1000));
  const startTimeMs = normalizeTimestamp(job.startTimeMs ?? job.modifiedAtMs);

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
              <button className="start-time-button" disabled={disabled} onClick={onEditStartTime} type="button">
                <CalendarClock size={12} />
                <span className="start-time-label">开始时间</span>
                <span className="start-time-value">{formatDateTime(startTimeMs)}</span>
              </button>
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
            <button disabled={disabled} onClick={onRemove} type="button">
              移除
            </button>
          </div>
        </div>
      </div>
    </article>
  );
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
