import { formatResearchNumber } from "../research.utils.js";

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

export { ResearchExportAllModal };
