import { getEnginePlanSummary, getEngineSearchSupport } from "../engine.utils.js";
import { EngineSearchHit } from "./EngineSearchHit.jsx";

function EngineSearchEntryBody({ entry, mediaProxyUrl }) {
  if (entry.status === "loading") {
    return <p className="engine-entry-message">正在执行多索引检索...</p>;
  }

  if (entry.status === "error") {
    return <p className="engine-entry-message error">{entry.error}</p>;
  }

  const results = entry.response?.results || [];
  const planSummary = getEnginePlanSummary(entry.response?.debug?.query_plan);
  if (results.length === 0) {
    return (
      <div className="engine-hit-stack">
        {planSummary && <p className="engine-plan-line">{planSummary}</p>}
        <p className="engine-entry-message">没有找到可引用证据。</p>
      </div>
    );
  }

  return (
    <div className="engine-hit-stack">
      {planSummary && <p className="engine-plan-line">{planSummary}</p>}
      {results.map((hit, index) => (
        <EngineSearchHit hit={hit} key={hit.id || `${entry.id}-${index}`} mediaProxyUrl={mediaProxyUrl} support={getEngineSearchSupport(entry.response, index)} />
      ))}
    </div>
  );
}

export { EngineSearchEntryBody };
