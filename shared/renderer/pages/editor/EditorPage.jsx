import { useApplicationContext } from "../../app/ApplicationContext.jsx";
import { Metric } from "../../components/Metric.jsx";
import { AutomationOptions } from "../../features/transfers/components/AutomationOptions.jsx";
import { UploadQueueDock } from "../../features/transfers/components/UploadQueueDock.jsx";
import { DeviceStatus } from "./components/DeviceStatus.jsx";
import { QueueItem } from "./components/QueueItem.jsx";
import { UsageCard } from "./components/UsageCard.jsx";
import { FPS_PRESETS, RESOLUTION_PRESETS } from "./editor.constants.js";
import { canRemoveJob } from "./editor.utils.js";
import {
  CheckCircle2,
  CircleStop,
  Clock3,
  FolderOpen,
  Gauge,
  ListVideo,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  TriangleAlert,
  Video,
} from "lucide-react";

function EditorPage() {
  const {
    fpsPreset,
    setFpsPreset,
    setCustomFps,
    customFps,
    resolutionPreset,
    useSourceResolution,
    setUseSourceResolution,
    setResolutionPreset,
    setCustomWidth,
    customWidth,
    setCustomHeight,
    customHeight,
    processingDevice,
    setProcessingDevice,
    capabilities,
    activeEncoder,
    systemUsage,
    chooseOutputDirectory,
    outputDirectory,
    isGpuModeAvailable,
    activeEncodingJob,
    automationOptions,
    updateAutomationOption,
    canStart,
    startBatch,
    isRunning,
    pauseTransitioning,
    togglePause,
    isPaused,
    cancelBatch,
    canClearFinished,
    clearFinished,
    addVideos,
    totals,
    notice,
    jobs,
    clockNow,
    openProcessingOutput,
    removeJob,
    canAddTransfer,
    canClearFinishedTransfers,
    canStartTransfers,
    transferDockExpanded,
    transferQueueSorted,
    addTransferFiles,
    cancelCurrentUpload,
    clearFinishedTransfers,
    toggleCurrentUploadPaused,
    removeTransferTask,
    retryTransferTask,
    startTransferQueue,
    setTransferDockExpanded,
  } = useApplicationContext();

  return (
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
                className={
                  resolutionPreset === preset.label && !useSourceResolution
                    ? "segment active"
                    : "segment"
                }
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
              className={
                resolutionPreset === "custom" && !useSourceResolution
                  ? "segment active"
                  : "segment"
              }
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
              className={
                processingDevice === "gpu" ? "segment active" : "segment"
              }
              onClick={() => setProcessingDevice("gpu")}
              type="button"
            >
              GPU
            </button>
            <button
              className={
                processingDevice === "cpu" ? "segment active" : "segment"
              }
              onClick={() => setProcessingDevice("cpu")}
              type="button"
            >
              CPU
            </button>
          </div>
          <DeviceStatus
            capabilities={capabilities}
            device={processingDevice}
            encoder={activeEncoder}
            usage={systemUsage}
          />
        </div>

        <div className="field-group">
          <label>输出位置</label>
          <button
            className="path-button"
            onClick={chooseOutputDirectory}
            title="选择输出文件夹"
            type="button"
          >
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

        <UsageCard
          activeEncodingJob={activeEncodingJob}
          device={processingDevice}
          usage={systemUsage}
        />

        <AutomationOptions
          options={automationOptions}
          onChange={updateAutomationOption}
        />
      </aside>

      <section className="queue-panel">
        <div className="queue-toolbar">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>处理队列</h2>
          </div>
          <div className="toolbar-actions">
            <div className="actions queue-batch-actions">
              <button
                className="primary-button"
                disabled={!canStart}
                onClick={startBatch}
                type="button"
              >
                <Play size={17} />
                <span>开始处理</span>
              </button>
              <button
                className="ghost-button action-button"
                disabled={!isRunning || pauseTransitioning}
                onClick={togglePause}
                type="button"
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
                <span>{isPaused ? "继续" : "暂停"}</span>
              </button>
              <button
                className="ghost-button danger-button"
                disabled={!isRunning}
                onClick={cancelBatch}
                type="button"
              >
                <CircleStop size={17} />
                <span>取消</span>
              </button>
            </div>
            <button
              className="icon-button"
              disabled={isRunning || !canClearFinished}
              onClick={clearFinished}
              title="清除已完成"
              type="button"
            >
              <RotateCcw size={18} />
            </button>
            <button
              className="secondary-button"
              disabled={isRunning}
              onClick={addVideos}
              type="button"
            >
              <Plus size={18} />
              <span>添加视频</span>
            </button>
          </div>
        </div>

        <div className="summary-strip">
          <Metric
            icon={<ListVideo size={16} />}
            label="总数"
            value={totals.total}
          />
          <Metric
            icon={<Clock3 size={16} />}
            label="处理中"
            value={totals.active}
          />
          <Metric
            icon={<CheckCircle2 size={16} />}
            label="完成"
            value={totals.done}
          />
          <Metric
            icon={<TriangleAlert size={16} />}
            label="压制失败"
            value={totals.errors}
          />
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
  );
}

export { EditorPage };
