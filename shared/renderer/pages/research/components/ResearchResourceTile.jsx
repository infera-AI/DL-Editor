import { formatDurationCompact } from "../../../utils/format.js";
import { formatResearchShortTime, getResearchItemTimestamp, getResearchResourceId } from "../research.utils.js";
import { ResearchThumbnail } from "./ResearchThumbnail.jsx";

function ResearchResourceTile({ active, item, onSelect, onToggle, selected, token }) {
  const id = getResearchResourceId(item);
  const timestamp = getResearchItemTimestamp(item);
  function handleClick(event) {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      onToggle(id);
    } else {
      onSelect(id);
    }
  }
  return (
    <article
      className={`research-tile ${active ? "active" : ""} ${selected ? "selected" : ""}`}
      onClick={handleClick}
      onDoubleClick={() => onToggle(id)}
      title={item.file_name || `Asset ${id}`}
    >
      <ResearchThumbnail item={item} token={token} />
      <span className="research-tile-duration">{formatDurationCompact(Number(item.duration_ms || 0)) || "0:00"}</span>
      <span className="research-tile-time">{formatResearchShortTime(timestamp)}</span>
      <span className="research-tile-status">{item.parse_status || "-"}</span>
      <span className="research-tile-check">{selected ? "✓" : ""}</span>
    </article>
  );
}

export { ResearchResourceTile };
