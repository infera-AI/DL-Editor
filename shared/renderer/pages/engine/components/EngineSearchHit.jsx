import { formatEngineTimeRange, getEngineEvidenceCountLabel, getEngineRawRefFromReferences, getEngineSourceLabel } from "../engine.utils.js";
import { EngineMediaPreview } from "./EngineMediaPreview.jsx";

function EngineSearchHit({ hit, mediaProxyUrl, support }) {
  const evidenceRefs = hit.evidence_refs || [];
  const rawRef = getEngineRawRefFromReferences(evidenceRefs);
  const timeRange = formatEngineTimeRange(hit.time_range);
  const matchedFields = (hit.matched_fields || []).slice(0, 3).join(" / ");

  return (
    <article className="engine-hit">
      <div className="engine-hit-title-row">
        <strong>{hit.title || hit.id}</strong>
        <span>{Number(hit.score || 0).toFixed(3)}</span>
      </div>
      <div className="engine-meta-row">
        <span>{getEngineSourceLabel(hit.type)}</span>
        {support && <span>{support}</span>}
        {timeRange && <span>{timeRange}</span>}
        <span>{getEngineEvidenceCountLabel(evidenceRefs.length)}</span>
        {matchedFields && <span>{matchedFields}</span>}
      </div>
      {hit.snippet && <p>{hit.snippet}</p>}
      <EngineMediaPreview mediaProxyUrl={mediaProxyUrl} rawRef={rawRef} />
    </article>
  );
}

export { EngineSearchHit };
