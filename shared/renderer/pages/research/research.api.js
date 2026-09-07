import { dlEditor } from "../../services/desktop.js";
import { createInferaHttpError, inferaAuthController, isInferaUnauthorizedError, refreshInferaAuth, requestInfera, resolveInferaUrl } from "../../services/infera.js";
import { buildResearchPath } from "../../services/research-path.js";
import { consumeInferaSseResponse } from "../../services/sse.js";
import { parseLocalDateBoundary } from "../../utils/date.js";
import { RESEARCH_PAGE_SIZE } from "./research.constants.js";

function getResearchDateRangeParams(filters = {}) {
  const params = {};
  if (filters.from) {
    const start = parseLocalDateBoundary(filters.from, false);
    if (Number.isFinite(start)) {
      params.start_ms = start;
      params.date_start_ms = start;
    }
  }
  if (filters.to) {
    const end = parseLocalDateBoundary(filters.to, true);
    if (Number.isFinite(end)) {
      params.end_ms = end;
      params.date_end_ms = end;
    }
  }
  return params;
}

function getResearchListParams(filters = {}, options = {}) {
  const dateParams = getResearchDateRangeParams(filters);
  return {
    limit: options.limit || RESEARCH_PAGE_SIZE,
    offset: options.offset || 0,
    user_id: filters.userId || "",
    parse_status: options.includeStatus ? filters.status || "" : "",
    start_ms: dateParams.start_ms,
    end_ms: dateParams.end_ms,
    date_start_ms: dateParams.date_start_ms,
    date_end_ms: dateParams.date_end_ms
  };
}

async function fetchResearchUsers(token) {
  return requestInfera(buildResearchPath("/users"), { token });
}

async function fetchResearchResources(token, filters, options = {}) {
  const params = getResearchListParams(filters, { includeStatus: true, limit: options.limit, offset: options.offset });
  delete params.start_ms;
  delete params.end_ms;
  return requestInfera(buildResearchPath("/assets/videos", params), { token });
}

async function fetchResearchChats(token, filters, options = {}) {
  const params = getResearchListParams(filters, { limit: options.limit, offset: options.offset });
  delete params.parse_status;
  delete params.date_start_ms;
  delete params.date_end_ms;
  return requestInfera(buildResearchPath("/chats", params), { token });
}

async function fetchResearchStatistics(token) {
  return requestInfera(buildResearchPath("/upload-duration-stats", { timezone: "Asia/Shanghai" }), { token });
}

async function exportResearchResources(token, payload) {
  return requestInfera(buildResearchPath("/assets/videos/export"), {
    method: "POST",
    token,
    body: payload,
    responseType: "download"
  });
}

async function exportResearchChats(token, payload) {
  return requestInfera(buildResearchPath("/chats/export"), {
    method: "POST",
    token,
    body: payload,
    responseType: "download"
  });
}

async function fetchResearchExportCount(token, filters, maxAssets = 2000) {
  const params = getResearchListParams(filters, { includeStatus: true });
  delete params.limit;
  delete params.offset;
  delete params.start_ms;
  delete params.end_ms;
  params.max_assets = maxAssets;
  return requestInfera(buildResearchPath("/assets/videos/export-count", params), { token });
}

async function createResearchDailyExport(token, payload) {
  return requestInfera(buildResearchPath("/assets/videos/daily-exports"), {
    method: "POST",
    token,
    body: payload
  });
}

async function fetchResearchDailyExport(token, jobId) {
  return requestInfera(buildResearchPath(`/assets/videos/daily-exports/${encodeURIComponent(jobId)}`), { token });
}

async function fetchResearchSimulationSessions(token, subjectUserId) {
  return requestInfera(buildResearchPath(`/simulations/users/${encodeURIComponent(subjectUserId)}/sessions`), { token });
}

async function fetchResearchSimulationSession(token, subjectUserId, sessionCode) {
  return requestInfera(
    buildResearchPath(`/simulations/users/${encodeURIComponent(subjectUserId)}/sessions/${encodeURIComponent(sessionCode)}`),
    { token }
  );
}

function createResearchSimulationStreamId() {
  return `research-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function streamResearchSimulationInput(token, subjectUserId, sessionCode, body, onEvent) {
  const path = buildResearchPath(
    `/simulations/users/${encodeURIComponent(subjectUserId)}/sessions/${encodeURIComponent(sessionCode || "new")}/input/stream`
  );
  const attempt = async (accessToken) => {
    let streamError = null;
    const handleEvent = (message) => {
      const eventName = message?.event || "message";
      const data = message?.data || {};
      if (eventName === "error" || eventName === "stream_error") {
        streamError = new Error(data.message || "Unable to complete the Research simulation");
        return;
      }
      onEvent(message);
    };
    if (
      typeof dlEditor.streamResearchSimulation === "function" &&
      typeof dlEditor.onResearchSimulationStreamEvent === "function"
    ) {
      const streamId = createResearchSimulationStreamId();
      const unsubscribe = dlEditor.onResearchSimulationStreamEvent(streamId, handleEvent);
      try {
        await dlEditor.streamResearchSimulation({ streamId, path, token: accessToken, body });
      } finally {
        unsubscribe?.();
      }
      if (streamError) throw streamError;
      return;
    }

    const response = await fetch(resolveInferaUrl(path), {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const payload = JSON.parse(text);
        detail = payload?.message || payload?.detail || text;
      } catch {}
      throw createInferaHttpError(response.status, detail);
    }
    await consumeInferaSseResponse(response, handleEvent);
    if (streamError) throw streamError;
  };

  const currentAuth = inferaAuthController?.getAuth?.();
  const effectiveToken = currentAuth?.token || token;
  try {
    await attempt(effectiveToken);
  } catch (error) {
    if (!isInferaUnauthorizedError(error)) throw error;
    const nextAuth = await refreshInferaAuth();
    await attempt(nextAuth.token);
  }
}

async function fetchResearchParsedData(token, path) {
  if (!path) return null;
  return requestInfera(path, { token });
}

export { getResearchDateRangeParams, getResearchListParams, fetchResearchUsers, fetchResearchResources, fetchResearchChats, fetchResearchStatistics, exportResearchResources, exportResearchChats, fetchResearchExportCount, createResearchDailyExport, fetchResearchDailyExport, fetchResearchSimulationSessions, fetchResearchSimulationSession, createResearchSimulationStreamId, streamResearchSimulationInput, fetchResearchParsedData };
