import { formatEngineJson, getEngineIndexResultKey, getEngineIndexResults, getEnginePlanSummary } from "../engine.utils.js";
import { EngineIndexResult } from "./EngineIndexResult.jsx";
import { RotateCcw, TriangleAlert } from "lucide-react";

function EngineTestView({ engineIndexState, engineMediaProxyUrl, onRefresh, useVespa }) {
  const response = engineIndexState.response || null;
  const results = getEngineIndexResults(response);
  const isLoading = engineIndexState.status === "loading";
  const planSummary = getEnginePlanSummary(response?.debug?.query_plan || response?.plan);
  const rawJson = response ? formatEngineJson(response) : "";
  const counts = Array.isArray(response?.counts) ? response.counts : [];
  const sourceLabel = response?.db_path ? "SQLite records" : "Search API";

  return (
    <section className="engine-test-view">
      <header className="engine-panel-head">
        <div>
          <strong>Index Content</strong>
          <span>
            {useVespa ? "Vespa hybrid" : "Local multi-index"} · {results.length} results
            {engineIndexState.loadedAt ? ` · ${engineIndexState.loadedAt}` : ""}
          </span>
        </div>
        <button className="secondary-button engine-test-refresh" disabled={isLoading} onClick={onRefresh} type="button">
          <RotateCcw size={15} />
          <span>{isLoading ? "Loading" : "Refresh"}</span>
        </button>
      </header>

      <div className="engine-test-body">
        {isLoading ? (
          <div className="engine-empty-state">Loading index content</div>
        ) : engineIndexState.status === "error" ? (
          <div className="engine-test-alert">
            <TriangleAlert size={16} />
            <span>{engineIndexState.message}</span>
          </div>
        ) : !response ? (
          <div className="engine-empty-state">No index response</div>
        ) : (
          <>
            <div className="engine-index-summary">
              <div>
                <span>Source</span>
                <strong>{sourceLabel}</strong>
              </div>
              <div>
                <span>Records</span>
                <strong>{results.length}</strong>
              </div>
              <div>
                <span>Kinds</span>
                <strong>{counts.length || "-"}</strong>
              </div>
            </div>
            {response?.db_path && <p className="engine-plan-line">{response.db_path}</p>}
            {counts.length > 0 && (
              <div className="engine-index-counts">
                {counts.map((item) => (
                  <span key={item.kind}>
                    {item.kind}: {item.count}
                  </span>
                ))}
              </div>
            )}
            {planSummary && <p className="engine-plan-line">{planSummary}</p>}
            <div className="engine-index-list">
              {results.length === 0 ? (
                <div className="engine-empty-state">No index content returned</div>
              ) : (
                results.map((hit, index) => (
                  <EngineIndexResult hit={hit} index={index} key={getEngineIndexResultKey(hit, index)} mediaProxyUrl={engineMediaProxyUrl} />
                ))
              )}
            </div>
            <details className="engine-index-raw">
              <summary>Raw index response</summary>
              <pre>{rawJson}</pre>
            </details>
          </>
        )}
      </div>
    </section>
  );
}

export { EngineTestView };
