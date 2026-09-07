import { DurationValue } from "../../../components/DurationValue.jsx";
import { formatDateTime, normalizeTimestamp } from "../../../utils/date.js";
import { STATUS_LABELS } from "../editor.constants.js";
import { formatEncodingSpeed, getElapsedMs, getEstimatedRemainingMs, getProcessingOutputActionPath, getQueueItemFooterMessage } from "../editor.utils.js";
import { CalendarClock, Gauge, Timer, Video, Zap } from "lucide-react";

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

export { QueueItem };
