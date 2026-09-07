import { formatEngineJson, formatEngineTimeRange, getEngineEvidenceCountLabel, getEngineIndexContentText, getEngineRawRefFromReferences, getEngineSourceLabel } from "../engine.utils.js";
import { EngineMediaPreview } from "./EngineMediaPreview.jsx";

function EngineIndexResult({ hit, index, mediaProxyUrl }) {
  const evidenceRefs = hit?.evidence_refs || hit?.references || [];
  const rawRef = getEngineRawRefFromReferences(evidenceRefs);
  const timeRange = formatEngineTimeRange(hit?.time_range);
  const matchedFields = Array.isArray(hit?.matched_fields) ? hit.matched_fields.join(" / ") : "";
  const contentText = getEngineIndexContentText(hit);

  return (
    <article className="engine-index-result">
      <div className="engine-hit-title-row">
        <strong>{hit?.title || hit?.label || hit?.id || `Index ${index + 1}`}</strong>
        <span>{Number(hit?.score || 0).toFixed(3)}</span>
      </div>
      <div className="engine-meta-row">
        <span>{getEngineSourceLabel(hit?.type || hit?.source_type)}</span>
        {hit?.id && <span>{hit.id}</span>}
        {timeRange && <span>{timeRange}</span>}
        <span>{getEngineEvidenceCountLabel(evidenceRefs.length)}</span>
        {matchedFields && <span>{matchedFields}</span>}
      </div>
      {hit?.snippet && <p>{hit.snippet}</p>}
      {contentText && contentText !== hit?.snippet && <p>{contentText}</p>}
      <EngineMediaPreview mediaProxyUrl={mediaProxyUrl} rawRef={rawRef} />
      <details className="engine-index-result-raw">
        <summary>JSON</summary>
        <pre>{formatEngineJson(hit)}</pre>
      </details>
    </article>
  );
}

export { EngineIndexResult };
