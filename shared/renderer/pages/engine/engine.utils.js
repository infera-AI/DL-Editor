import { formatDurationCompact } from "../../utils/format.js";

function getEngineErrorMessage(error) {
  const message = String(error?.message || error || "").trim();
  if (/fetch failed|ECONNREFUSED|Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return "DL Engine API 未连接";
  }
  return message || "DL Engine 请求失败";
}

function getEngineStatusLabel(status) {
  if (status === "online") return "Online";
  if (status === "checking") return "Checking";
  if (status === "offline") return "Offline";
  return "Engine";
}

function getEngineStatusDetail(engineStatus) {
  if (engineStatus.status === "online") {
    const health = engineStatus.health || {};
    return [health.pipeline_version, health.storage, health.vespa_search].filter(Boolean).join(" · ") || "Ready";
  }
  return engineStatus.message || "Waiting";
}

function formatEngineTimeRange(range) {
  if (!range?.start) {
    return "";
  }

  const options = {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  };
  const start = new Date(range.start).toLocaleString("zh-CN", options);
  const end = range.end ? new Date(range.end).toLocaleString("zh-CN", options) : "";
  return end ? `${start} - ${end}` : start;
}

function getEngineSourceLabel(type) {
  const labels = {
    event: "记忆事件",
    memory_event: "记忆事件",
    span: "证据片段",
    evidence_span: "证据片段",
    summary: "记忆摘要",
    memory_summary: "记忆摘要",
    timeseries: "时序信号",
    signal_episode: "信号片段"
  };
  return labels[type] || type || "证据";
}

function getEngineConfidenceLabel(value) {
  const labels = {
    high: "高置信度",
    medium: "中等置信度",
    low: "低置信度",
    not_found: "未找到"
  };
  return labels[value] || value || "未知";
}

function getEngineEvidenceCountLabel(count) {
  return `${Number(count || 0)} 条证据`;
}

function getEngineSearchSupport(response, index) {
  return response?.debug?.result_support?.[index]?.support || "";
}

function getEnginePlanSummary(plan) {
  if (!plan) {
    return "";
  }

  const compiled = plan.aggregation?.compiled_query;
  const intent = compiled?.intent || plan.intent || "";
  const sources = (plan.sources || []).map(getEngineSourceLabel).filter(Boolean).slice(0, 4);
  const passes = (compiled?.retrieval_passes || []).map((item) => item.name).filter(Boolean).slice(0, 4);
  return [intent, sources.join(" / "), passes.join(" / ")].filter(Boolean).join(" · ");
}

function getEngineEntryStatusLabel(entry) {
  if (entry.status === "loading") return "Running";
  if (entry.status === "error") return "Error";
  if (entry.kind === "query") return getEngineConfidenceLabel(entry.response?.confidence);
  return `${entry.response?.results?.length || 0} hits`;
}

function getEngineIndexResults(response) {
  if (Array.isArray(response?.results)) {
    return response.results;
  }
  if (Array.isArray(response?.items)) {
    return response.items;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
}

function getEngineIndexResultKey(hit, index) {
  return hit?.id || hit?.source_id || hit?.span_id || hit?.asset_id || `${index}-index-result`;
}

function getEngineIndexContentText(hit) {
  return (
    hit?.content_text ||
    hit?.text ||
    hit?.summary_text ||
    hit?.summary ||
    hit?.description ||
    hit?.caption_text ||
    hit?.ocr_text ||
    ""
  );
}

function formatEngineJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value || "");
  }
}

function getEngineRawRefFromReferences(references) {
  for (const reference of references || []) {
    const rawRef = (reference?.raw_refs || []).find((item) => item?.asset_id);
    if (rawRef) {
      return rawRef;
    }
  }
  return null;
}

function getEngineMediaSeconds(value) {
  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds / 1000 : 0;
}

function formatEngineMediaOffset(value) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0s";
  }
  return formatDurationCompact(milliseconds) || `${Math.round(milliseconds / 1000)}s`;
}

function getEngineMediaSegmentLabel(rawRef) {
  if (!rawRef?.asset_id) {
    return "";
  }
  const start = formatEngineMediaOffset(rawRef.start_offset_ms);
  const endValue = Number(rawRef.end_offset_ms);
  const startValue = Number(rawRef.start_offset_ms);
  if (!Number.isFinite(endValue) || endValue <= startValue) {
    return `${start} 开始`;
  }
  return `${start} - ${formatEngineMediaOffset(endValue)}`;
}

function buildEngineMediaUrl(rawRef, mediaProxyUrl) {
  if (!rawRef?.asset_id || !mediaProxyUrl) {
    return "";
  }

  const normalizedBase = String(mediaProxyUrl).replace(/\/+$/, "");
  const start = getEngineMediaSeconds(rawRef.start_offset_ms);
  const end = getEngineMediaSeconds(rawRef.end_offset_ms);
  const mediaUrl = `${normalizedBase}/engine-media/assets/${encodeURIComponent(rawRef.asset_id)}/media?expires_seconds=600`;
  if (end > start) {
    return `${mediaUrl}#t=${start.toFixed(3)},${end.toFixed(3)}`;
  }
  if (start > 0) {
    return `${mediaUrl}#t=${start.toFixed(3)}`;
  }
  return mediaUrl;
}

export { getEngineErrorMessage, getEngineStatusLabel, getEngineStatusDetail, formatEngineTimeRange, getEngineSourceLabel, getEngineConfidenceLabel, getEngineEvidenceCountLabel, getEngineSearchSupport, getEnginePlanSummary, getEngineEntryStatusLabel, getEngineIndexResults, getEngineIndexResultKey, getEngineIndexContentText, formatEngineJson, getEngineRawRefFromReferences, getEngineMediaSeconds, formatEngineMediaOffset, getEngineMediaSegmentLabel, buildEngineMediaUrl };
