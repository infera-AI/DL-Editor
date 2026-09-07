import { dlEditor } from "../../services/desktop.js";
import { createInferaHttpError, inferaAuthController, isInferaUnauthorizedError, refreshInferaAuth, requestInfera, resolveInferaUrl } from "../../services/infera.js";
import { consumeInferaSseResponse } from "../../services/sse.js";
import { createQueryModeLoader, normalizeConversationQueryMode } from "./conversation-modes.mjs";

const fetchConversationQueryModes = createQueryModeLoader((path, options) => requestInfera(path, options));

function buildConversationPath(path, queryMode) {
  const mode = normalizeConversationQueryMode(queryMode);
  return `${path}${String(path).includes("?") ? "&" : "?"}query_mode=${encodeURIComponent(mode)}`;
}

async function fetchConversationSessions(token, queryMode) {
  return requestInfera(buildConversationPath("/conversation/sessions", queryMode), { token });
}

async function fetchConversationSession(token, sessionCode, queryMode) {
  return requestInfera(
    buildConversationPath(`/conversation/sessions/${encodeURIComponent(sessionCode)}`, queryMode),
    { token }
  );
}

function createConversationStreamId(queryMode) {
  return `conversation-${normalizeConversationQueryMode(queryMode)}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createConversationRequestId(queryMode) {
  return `${normalizeConversationQueryMode(queryMode)}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function streamConversationInput(token, sessionCode, queryMode, body, onEvent) {
  const mode = normalizeConversationQueryMode(queryMode);
  const path = `/conversation/sessions/${encodeURIComponent(sessionCode || "new")}/input/mode/${mode}/stream`;
  const attempt = async (accessToken) => {
    let streamError = null;
    const handleEvent = (message) => {
      const eventName = message?.event || "message";
      const data = message?.data || {};
      if (eventName === "error" || eventName === "stream_error") {
        streamError = new Error(data.message || "对话请求失败");
        streamError.code = data.code || "";
        streamError.retryable = Boolean(data.retryable);
        return;
      }
      onEvent(message);
    };

    if (
      typeof dlEditor.streamConversation === "function" &&
      typeof dlEditor.onConversationStreamEvent === "function"
    ) {
      const streamId = createConversationStreamId(mode);
      const unsubscribe = dlEditor.onConversationStreamEvent(streamId, handleEvent);
      try {
        await dlEditor.streamConversation({ streamId, path, token: accessToken, body });
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

export { fetchConversationQueryModes, buildConversationPath, fetchConversationSessions, fetchConversationSession, createConversationStreamId, createConversationRequestId, streamConversationInput };
