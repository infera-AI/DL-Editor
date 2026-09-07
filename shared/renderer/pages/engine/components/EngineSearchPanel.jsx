import { getEngineEntryStatusLabel, getEngineStatusLabel } from "../engine.utils.js";
import { EngineSearchEntryBody } from "./EngineSearchEntryBody.jsx";

function EngineSearchPanel({ engineMediaProxyUrl, engineStatus, entries, useVespa }) {
  return (
    <section className="engine-presenter">
      <div className="engine-panel-head">
        <div>
          <strong>Search</strong>
          <span>{useVespa ? "Vespa hybrid" : "Local multi-index"}</span>
        </div>
        <span className={`engine-status-pill ${engineStatus.status}`}>{getEngineStatusLabel(engineStatus.status)}</span>
      </div>
      <div className="engine-result-list">
        {entries.length === 0 ? (
          <div className="engine-empty-state">等待检索</div>
        ) : (
          entries.map((entry) => (
            <article className={`engine-result-item ${entry.status}`} key={entry.id}>
              <div>
                <strong>{entry.prompt}</strong>
                <span>
                  {entry.scopeTitle} · {entry.versionMode || entry.version} · {entry.time}
                </span>
                <EngineSearchEntryBody entry={entry} mediaProxyUrl={engineMediaProxyUrl} />
              </div>
              <b>{getEngineEntryStatusLabel(entry)}</b>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export { EngineSearchPanel };
