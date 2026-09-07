// Mode IDs are protocol values, not a frontend-maintained enumeration.
export function normalizeConversationQueryMode(value) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9_-]{0,15}$/.test(value)) {
    throw new Error("无效的问答模式");
  }
  return value;
}

export const LEGACY_QUERY_MODES = {
  default_mode: "agent",
  modes: [
    { mode: "plain", label: "Plain", description: "直接检索记忆上下文并生成回答。",
      enabled: true, capabilities: { stream: true },
      parameters: { thinking_level: { supported: true, default: 0 }, top_k: { supported: true, default: 3 } } },
    { mode: "agent", label: "Agent", description: "由 DL Engine Agent 检索记忆并生成回答。",
      enabled: true, capabilities: { stream: true },
      parameters: { thinking_level: { supported: false }, top_k: { supported: true, default: 3 } } }
  ]
};

export function normalizeQueryModeCatalog(result) {
  if (!result || !Array.isArray(result.modes)) throw new Error("模式列表格式无效");
  const seen = new Set();
  const modes = result.modes.map((item) => {
    const mode = normalizeConversationQueryMode(item?.mode);
    if (seen.has(mode)) throw new Error("模式列表包含重复标识");
    seen.add(mode);
    return {
      mode, label: String(item.label || mode), description: String(item.description || ""),
      enabled: item.enabled === true,
      capabilities: { stream: item.capabilities?.stream === true },
      parameters: item.parameters && typeof item.parameters === "object" ? item.parameters : {}
    };
  });
  return { default_mode: normalizeConversationQueryMode(result.default_mode), modes };
}

export function canUseQueryMode(item) {
  return Boolean(item?.enabled && item?.capabilities?.stream);
}

export function conversationModeParameters(item, thinkingLevel) {
  const result = {};
  if (item?.parameters?.thinking_level?.supported === true) {
    result.thinking_level = Number(thinkingLevel) || 0;
  }
  if (item?.parameters?.top_k?.supported === true) {
    result.top_k = Number(item.parameters.top_k.default) || 3;
  }
  return result;
}

export function normalizeConversationSessions(result, queryMode) {
  const items = Array.isArray(result) ? result
    : Array.isArray(result?.items) ? result.items
      : Array.isArray(result?.sessions) ? result.sessions : [];
  const mode = normalizeConversationQueryMode(queryMode);
  return items.filter((item) => item?.query_mode === mode);
}

export function queryModeHttpStatus(error) {
  return Number(error?.status || error?.statusCode || String(error?.message || "").match(/请求失败 \((\d{3})\)/)?.[1] || 0);
}

export function createQueryModeLoader(request) {
  // In-memory only, scoped to the authenticated token and bounded across logins.
  const cache = new Map();
  return async (token) => {
    try {
      const catalog = normalizeQueryModeCatalog(await request("/conversation/query-modes", { token }));
      cache.set(token, catalog);
      if (cache.size > 8) cache.delete(cache.keys().next().value);
      return { catalog, warning: "" };
    } catch (error) {
      const status = queryModeHttpStatus(error);
      if (status === 401 || status === 403) throw error;
      if (status === 404) {
        cache.delete(token);
        return { catalog: LEGACY_QUERY_MODES, warning: "当前后端尚未提供模式列表，仅显示兼容模式。" };
      }
      if (cache.has(token)) {
        return { catalog: cache.get(token), warning: "模式列表刷新失败，暂用上次结果，请重试。" };
      }
      throw error;
    }
  };
}
