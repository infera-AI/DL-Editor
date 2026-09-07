import { dlEditor } from "../../services/desktop.js";

const DL_ENGINE_API_BASE_URL = import.meta.env.VITE_DL_ENGINE_API_BASE_URL || "http://127.0.0.1:8787";

function resolveEngineUrl(value) {
  if (!value) return "";
  const rawPath = String(value);
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const normalizedBase = DL_ENGINE_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = rawPath.replace(/^\/+/, "");
  try {
    return new URL(normalizedPath, `${normalizedBase}/`).toString();
  } catch {
    return rawPath;
  }
}

async function requestEngine(path, { method = "GET", body, signal } = {}) {
  if (typeof dlEditor.requestEngine === "function") {
    return dlEditor.requestEngine({ path, method, body });
  }

  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(resolveEngineUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.detail || payload?.title || text || `DL Engine 请求失败 (${response.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return payload;
}

function createEngineQaStreamId() {
  return `qa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function streamEngineQa(body, onEvent) {
  if (
    typeof dlEditor.streamEngineQa === "function" &&
    typeof dlEditor.onEngineQaStreamEvent === "function"
  ) {
    const streamId = createEngineQaStreamId();
    const unsubscribe = dlEditor.onEngineQaStreamEvent(streamId, onEvent);
    try {
      await dlEditor.streamEngineQa({ streamId, body });
    } finally {
      unsubscribe?.();
    }
    return;
  }

  const response = await requestEngine("/v1/qa", {
    method: "POST",
    body: { ...body, response_mode: "json" }
  });
  onEvent({
    event: "answer_start",
    data: {
      index_watermark: response?.index_watermark,
      plan: response?.plan,
      query_id: response?.query_id
    }
  });
  onEvent({ event: "search.plan", data: response?.plan || null });
  onEvent({ event: "citations", data: response?.citations || [] });
  onEvent({ event: "evidence_reasoning", data: response?.evidence_reasoning || [] });
  onEvent({ event: "retrieval_results", data: response?.retrieval_results || [] });
  onEvent({
    event: "done",
    data: {
      answer: response?.answer || "",
      confidence: response?.confidence,
      evidence_reasoning: response?.evidence_reasoning || [],
      retrieval_results: response?.retrieval_results || [],
      refined: response?.refined || false
    }
  });
}

function mergeEngineQaResponse(currentResponse, patch) {
  return { ...(currentResponse || {}), ...patch };
}

function nonEmptyEngineAnswer(value) {
  return typeof value === "string" && value.trim() ? value : "";
}

export { DL_ENGINE_API_BASE_URL, resolveEngineUrl, requestEngine, createEngineQaStreamId, streamEngineQa, mergeEngineQaResponse, nonEmptyEngineAnswer };
