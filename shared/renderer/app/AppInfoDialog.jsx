import { Download, FolderOpen, Info, RotateCcw } from "lucide-react";

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

export { AppInfoDialog };
