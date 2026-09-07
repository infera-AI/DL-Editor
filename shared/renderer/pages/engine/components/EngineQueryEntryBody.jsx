import { getEngineEvidenceStatusLabel, getEngineLlmStatusLabel, getEnginePlannerStatusLabel, getEngineQueryStageLabel, getEngineReasoningStepLabel, getEngineSupportLabel } from "../engine-progress.js";
import { formatEngineTimeRange, getEngineConfidenceLabel, getEngineEvidenceCountLabel, getEnginePlanSummary, getEngineRawRefFromReferences, getEngineSourceLabel } from "../engine.utils.js";
import { EngineMediaPreview } from "./EngineMediaPreview.jsx";

function EngineQueryEntryBody({ entry, mediaProxyUrl }) {
  const response = entry.response || {};
  const displayAnswer = response.final_answer || response.answer || response.stream_answer || "";
  const citations = response.citations || [];
  const evidenceReasoning = response.evidence_reasoning || [];
  const retrievalResults = response.retrieval_results || [];
  const plannerProgress = response.planner_progress || [];
  const plannerStatus = response.planner_status || null;
  const evidenceProgress = response.evidence_progress || [];
  const evidenceStatus = response.evidence_status || null;
  const llmThinking = response.llm_thinking || "";
  const llmStatus = response.llm_status || null;
  const planSummary = getEnginePlanSummary(response.plan);

  if (
    entry.status === "loading" &&
    !displayAnswer &&
    !citations.length &&
    !evidenceReasoning.length &&
    !plannerProgress.length &&
    !evidenceProgress.length
  ) {
    return <span>正在构建 evidence pack...</span>;
  }

  if (entry.status === "error") {
    return <span className="engine-error-text">{entry.error}</span>;
  }

  return (
    <div className="engine-answer-content">
      <div className="engine-meta-row">
        <span>{getEngineConfidenceLabel(response.confidence)}</span>
        <span>{getEngineEvidenceCountLabel(citations.length)}</span>
        <span>{getEngineQueryStageLabel(entry.streamStage)}</span>
        {entry.elapsedMs && <span>{entry.elapsedMs} ms</span>}
      </div>
      {planSummary && <p className="engine-plan-line">{planSummary}</p>}
      {(plannerStatus || plannerProgress.length > 0) && (
        <div className="engine-planner-progress">
          <div>
            <strong>Query planner process</strong>
            <span>{getEnginePlannerStatusLabel(plannerStatus || plannerProgress[plannerProgress.length - 1])}</span>
          </div>
          <ol>
            {plannerProgress.slice(-8).map((item, index) => (
              <li key={`${item.stage || "planner"}-${item.elapsed_ms || index}-${index}`}>
                <span>{item.stage || "planner"}</span>
                <p>{getEnginePlannerStatusLabel(item)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {(evidenceStatus || evidenceProgress.length > 0) && (
        <div className="engine-evidence-progress">
          <div>
            <strong>EvidencePack process</strong>
            <span>{getEngineEvidenceStatusLabel(evidenceStatus || evidenceProgress[evidenceProgress.length - 1])}</span>
          </div>
          <ol>
            {evidenceProgress.slice(-8).map((item, index) => (
              <li key={`${item.stage || "stage"}-${item.elapsed_ms || index}-${index}`}>
                <span>{item.stage || "stage"}</span>
                <p>{getEngineEvidenceStatusLabel(item)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p>{displayAnswer || "正在等待 grounded answer..."}</p>
      {(llmThinking || llmStatus) && (
        <div className="engine-thinking-panel">
          <div>
            <strong>LLM thinking</strong>
            <span>{getEngineLlmStatusLabel(llmStatus)}</span>
          </div>
          {llmThinking && <p>{llmThinking}</p>}
        </div>
      )}
      {response.refinement_error && <p className="engine-entry-message error">{response.refinement_error}</p>}
      {evidenceReasoning.length > 0 && (
        <div className="engine-reasoning-list">
          {evidenceReasoning.map((step, index) => (
            <article className="engine-reasoning-step" key={`${step.step || "step"}-${index}`}>
              <div>
                <strong>{getEngineReasoningStepLabel(step.step)}</strong>
                <span>{getEngineSupportLabel(step.support)}</span>
              </div>
              <p>{step.claim}</p>
              {step.reason && <small>{step.reason}</small>}
            </article>
          ))}
        </div>
      )}
      {retrievalResults.length > 0 && (
        <div className="engine-retrieval-result-list">
          {retrievalResults.map((result, index) => (
            <div className="engine-retrieval-result" key={result.id || index}>
              <strong>{result.title || `${getEngineSourceLabel(result.type)} ${index + 1}`}</strong>
              <span>
                {getEngineSourceLabel(result.type)} · score {Number(result.score || 0).toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      )}
      {citations.length > 0 && (
        <div className="engine-citation-list">
          {citations.map((citation, index) => (
            <div className="engine-citation" key={citation.source_id || citation.span_id || index}>
              <strong>{citation.label || citation.source_id || `证据 ${index + 1}`}</strong>
              <span>
                {getEngineSourceLabel(citation.source_type)} · {formatEngineTimeRange(citation.time_range) || "无时间范围"}
              </span>
              <EngineMediaPreview mediaProxyUrl={mediaProxyUrl} rawRef={getEngineRawRefFromReferences([citation])} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { EngineQueryEntryBody };
