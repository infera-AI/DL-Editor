

function getEngineQueryStageLabel(stage) {
  switch (stage) {
    case "planner":
      return "Query planner running";
    case "evidence":
      return "EvidencePack 构建中";
    case "grounded":
      return "Grounded answer 已生成";
    case "reasoning":
      return "Evidence reasoning 已生成";
    case "retrieval":
      return "Retrieval results 已生成";
    case "llm_waiting":
      return "LLM refinement waiting for tokens";
    case "llm_thinking":
      return "LLM thinking streaming";
    case "llm":
      return "LLM refinement 流式生成中";
    case "llm_error":
      return "LLM refinement 不可用，保留 grounded answer";
    case "done_refined":
      return "最终回答已由 LLM refinement 改写并通过证据校验";
    case "done_grounded":
      return "最终回答来自 grounded answer";
    default:
      return "正在构建 evidence pack";
  }
}

function getEngineLlmStatusLabel(status) {
  const stage = status?.stage || "";
  switch (stage) {
    case "refinement_started":
      return "LLM refinement started";
    case "waiting_for_llm_delta":
      return `Waiting for LLM stream${status.elapsed_ms ? ` · ${status.elapsed_ms} ms` : ""}`;
    case "thinking":
      return `Thinking${status.elapsed_ms ? ` · ${status.elapsed_ms} ms` : ""}`;
    case "refinement_finished":
      return `LLM refinement finished${status.elapsed_ms ? ` · ${status.elapsed_ms} ms` : ""}`;
    default:
      return "LLM refinement running";
  }
}

function getEnginePlannerStatusLabel(status) {
  if (!status) {
    return "Query planner queued";
  }
  const details = [];
  if (status.intent) {
    details.push(status.intent);
  }
  if (status.compiled_intent && status.compiled_intent !== status.intent) {
    details.push(`compiled ${status.compiled_intent}`);
  }
  if (status.answer_shape) {
    details.push(status.answer_shape);
  }
  if (status.operator) {
    details.push(status.operator);
  }
  if (status.ranking_profile) {
    details.push(status.ranking_profile);
  }
  if (status.model) {
    details.push(status.model);
  }
  if (status.fallback) {
    details.push(`fallback ${status.fallback}`);
  }
  if (status.fallback_intent) {
    details.push(`baseline ${status.fallback_intent}`);
  }
  if (typeof status.concept_count === "number") {
    details.push(`${status.concept_count} concepts`);
  }
  if (typeof status.candidate_budget === "number") {
    details.push(`${status.candidate_budget} candidates`);
  }
  if (Array.isArray(status.hard_constraints)) {
    details.push(`${status.hard_constraints.length} constraints`);
  }
  if (Array.isArray(status.retrieval_passes)) {
    details.push(`${status.retrieval_passes.length} passes`);
  }
  if (typeof status.elapsed_ms === "number") {
    details.push(`${status.elapsed_ms} ms`);
  }
  if (status.rationale) {
    details.push(status.rationale);
  }
  if (status.reason) {
    details.push(status.reason);
  }
  return [status.message || status.stage || "Query planner", details.join(" 路 ")].filter(Boolean).join(" 路 ");
}

function getEngineEvidenceStatusLabel(status) {
  if (!status) {
    return "EvidencePack build queued";
  }
  const details = [];
  if (status.pass) {
    details.push(`pass ${status.pass}${status.max_passes ? `/${status.max_passes}` : ""}`);
  }
  if (typeof status.candidate_count === "number") {
    details.push(`${status.candidate_count} candidates`);
  }
  if (typeof status.accumulated_candidate_count === "number") {
    details.push(`${status.accumulated_candidate_count} fused`);
  }
  if (typeof status.item_count === "number") {
    details.push(`${status.item_count} evidence items`);
  }
  if (typeof status.direct_support_count === "number") {
    details.push(`${status.direct_support_count} direct`);
  }
  if (typeof status.elapsed_ms === "number") {
    details.push(`${status.elapsed_ms} ms`);
  }
  return [status.message || status.stage || "EvidencePack build", details.join(" · ")].filter(Boolean).join(" · ");
}

function getEngineReasoningStepLabel(step) {
  switch (step) {
    case "retrieval":
      return "Retrieval";
    case "support_check":
      return "Support";
    case "synthesis":
      return "Synthesis";
    case "gap":
      return "Gap";
    default:
      return "Reasoning";
  }
}

function getEngineSupportLabel(support) {
  switch (support) {
    case "direct":
      return "direct";
    case "inference":
      return "inference";
    case "near":
      return "near";
    case "missing":
      return "missing";
    case "not_found":
      return "not found";
    default:
      return "support";
  }
}

export { getEngineQueryStageLabel, getEngineLlmStatusLabel, getEnginePlannerStatusLabel, getEngineEvidenceStatusLabel, getEngineReasoningStepLabel, getEngineSupportLabel };
