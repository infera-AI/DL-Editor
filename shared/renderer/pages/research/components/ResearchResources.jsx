import { formatRepositoryDate } from "../../../utils/date.js";
import { formatBytes } from "../../../utils/format.js";
import { FileVideo } from "lucide-react";

function ResearchResources({ items, onExportFiltered, onExportSelected, onSelectLoaded, onToggle, selectedIds }) {
  const selected = new Set((selectedIds || []).map(String));
  return (
    <section className="research-panel">
      <div className="research-actions">
        <button className="ghost-button" onClick={onSelectLoaded} type="button">Select loaded</button>
        <button className="primary-button" onClick={onExportSelected} type="button">Export selected</button>
        <button className="ghost-button" onClick={onExportFiltered} type="button">Export filtered</button>
      </div>
      <div className="research-list">
        {items.length === 0 ? (
          <div className="repository-empty">No resources</div>
        ) : (
          items.map((item) => {
            const id = String(item.asset_id || item.id);
            return (
              <article className="research-row" key={id}>
                <input checked={selected.has(id)} onChange={() => onToggle(id)} type="checkbox" />
                <FileVideo size={17} />
                <div>
                  <strong>{item.file_name || `Asset ${id}`}</strong>
                  <span>{[item.media_type, item.parse_status, item.captured_at || formatRepositoryDate(item.timestamp_ms)].filter(Boolean).join(" · ")}</span>
                  {item.summary_text && <p>{item.summary_text}</p>}
                </div>
                <span>{formatBytes(item.size_bytes) || "-"}</span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export { ResearchResources };
