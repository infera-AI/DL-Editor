import { DurationValue } from "../../../components/DurationValue.jsx";
import { clampPercent } from "../../../utils/format.js";
import { formatUploadBytes, formatUploadSpeed, getUploadItemElapsedMs, getUploadItemRemainingMs } from "../transfer-progress.js";
import { formatJobTransferStatusLabel, isTransferErrorStatus } from "../transfer-status.js";
import { Archive, CircleStop, Pause, Play, RotateCcw, Trash2, Upload } from "lucide-react";

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

export { TransferQueueItem };
