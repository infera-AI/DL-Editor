import { formatDurationCompact } from "../../../utils/format.js";

function ResearchParsedList({ fallbackKey, items, textKey, timeKey, title }) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length ? (
        items.slice(0, 30).map((item, index) => (
          <div className="research-parsed-item" key={`${title}-${index}`}>
            <strong>{formatDurationCompact(Number(item[timeKey] || 0))}</strong>
            <span>{item[textKey] || (fallbackKey ? item[fallbackKey] : "") || item.title || ""}</span>
          </div>
        ))
      ) : (
        <p className="muted">None</p>
      )}
    </section>
  );
}

export { ResearchParsedList };
