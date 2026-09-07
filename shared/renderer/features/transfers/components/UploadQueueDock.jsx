import { isTransferErrorStatus } from "../transfer-status.js";
import { TransferQueueItem } from "./TransferQueueItem.jsx";
import { Archive, ChevronDown, Play, RotateCcw, Upload } from "lucide-react";

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

export { UploadQueueDock };
