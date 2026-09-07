import { getEngineStatusLabel } from "../engine.utils.js";
import { EngineQueryEntryBody } from "./EngineQueryEntryBody.jsx";
import { Sparkles } from "lucide-react";

function EngineQueryPanel({ engineMediaProxyUrl, engineStatus, entries, useVespa }) {
  return (
    <section className="engine-presenter">
      <div className="engine-panel-head">
        <div>
          <strong>Query</strong>
          <span>{useVespa ? "Vespa hybrid" : "Local multi-index"}</span>
        </div>
        <span className={`engine-status-pill ${engineStatus.status}`}>{getEngineStatusLabel(engineStatus.status)}</span>
      </div>
      <div className="engine-qa-stream">
        {entries.length === 0 ? (
          <div className="engine-empty-state">等待 query</div>
        ) : (
          entries.map((entry) => (
            <article className="engine-qa-pair" key={entry.id}>
              <div className="engine-question">
                <strong>{entry.prompt}</strong>
                <span>
                  {entry.versionMode || entry.version} · {entry.time}
                </span>
              </div>
              <div className="engine-answer">
                <Sparkles size={15} />
                <EngineQueryEntryBody entry={entry} mediaProxyUrl={engineMediaProxyUrl} />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export { EngineQueryPanel };
