import { getResearchDownloadFilename } from "../utils/download.js";
import { normalizeAuthPayload } from "./auth-payload.js";
import { dlEditor } from "./desktop.js";

const INFERA_API_BASE_URL = import.meta.env.VITE_INFERA_API_BASE_URL || "https://api.infera.cn/api/infera";

const INFERA_AUTH_EXPIRED_MESSAGE = "登录已过期，请重新登录";

let inferaAuthController = null;

let inferaRefreshPromise = null;

function unwrapInferaResult(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if (payload.success === false) {
    throw new Error(payload.message || "请求失败");
  }

  if ("result" in payload) {
    return payload.result;
  }

  if ("data" in payload) {
    return payload.data;
  }

  return payload;
}

function resolveInferaUrl(value) {
  if (!value) return "";
  const rawPath = String(value);
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  if (/^\/?admin\//i.test(rawPath)) {
    try {
      const apiUrl = new URL(INFERA_API_BASE_URL);
      return new URL(rawPath.replace(/^\/+/, ""), `${apiUrl.origin}/`).toString();
    } catch {
      return rawPath;
    }
  }

  const normalizedBase = INFERA_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = rawPath.replace(/^\/+/, "");
  try {
    return new URL(normalizedPath, `${normalizedBase}/`).toString();
  } catch {
    return rawPath;
  }
}

function createInferaHttpError(status, detail) {
  const statusCode = Number(status) || 0;
  const normalizedDetail = typeof detail === "string" ? detail.trim() : detail ? JSON.stringify(detail) : "";
  const message = normalizedDetail.includes(`(${statusCode})`)
    ? normalizedDetail
    : `请求失败 (${statusCode})${normalizedDetail ? `：${normalizedDetail}` : ""}`;
  const error = new Error(message);
  error.status = statusCode;
  return error;
}

function isInferaUnauthorizedError(error) {
  return Number(error?.status || error?.statusCode) === 401 || /\(401\)/.test(String(error?.message || ""));
}

function isInferaAuthEndpoint(path) {
  return /^\/?auth\/(?:login(?:\/email)?|register(?:\/email)?|refresh)\/?(?:\?|$)/i.test(String(path || ""));
}

function setInferaAuthController(controller) {
  inferaAuthController = controller;
  return () => {
    if (inferaAuthController === controller) {
      inferaAuthController = null;
    }
  };
}

function expireInferaAuth() {
  const error = new Error(INFERA_AUTH_EXPIRED_MESSAGE);
  error.status = 401;
  inferaAuthController?.onExpired?.(error);
  return error;
}

function mergeRefreshedInferaAuth(currentAuth, result) {
  const refreshed = normalizeAuthPayload(result, currentAuth?.accountName || "");
  if (!refreshed.token || !refreshed.refreshToken) {
    throw createInferaHttpError(401, "刷新响应缺少 token");
  }
  return {
    ...currentAuth,
    ...refreshed,
    accountName: refreshed.accountName || currentAuth?.accountName || "",
    displayName: refreshed.displayName || currentAuth?.displayName || "",
    phone: refreshed.phone || currentAuth?.phone || "",
    email: refreshed.email || currentAuth?.email || "",
    nickname: refreshed.nickname || currentAuth?.nickname || "",
    avatar: refreshed.avatar || currentAuth?.avatar || ""
  };
}

async function refreshInferaAuth() {
  if (inferaRefreshPromise) {
    return inferaRefreshPromise;
  }

  const currentAuth = inferaAuthController?.getAuth?.();
  if (!currentAuth?.refreshToken) {
    throw expireInferaAuth();
  }

  const operation = (async () => {
    try {
      const result = await requestInferaRaw("/auth/refresh", {
        method: "POST",
        body: { refreshToken: currentAuth.refreshToken }
      });
      const nextAuth = mergeRefreshedInferaAuth(currentAuth, result);
      inferaAuthController?.onRefreshed?.(nextAuth, currentAuth);
      return nextAuth;
    } catch (error) {
      if (isInferaUnauthorizedError(error)) {
        throw expireInferaAuth();
      }
      const refreshError = new Error(`登录状态刷新失败：${error.message || "请检查网络后重试"}`);
      inferaAuthController?.onRefreshError?.(refreshError);
      throw refreshError;
    }
  })();

  inferaRefreshPromise = operation;
  try {
    return await operation;
  } finally {
    if (inferaRefreshPromise === operation) {
      inferaRefreshPromise = null;
    }
  }
}

async function requestInfera(path, options = {}) {
  const currentAuth = inferaAuthController?.getAuth?.();
  const suppliedToken = options.token;
  const effectiveToken = suppliedToken && currentAuth?.token ? currentAuth.token : suppliedToken;

  try {
    return await requestInferaRaw(path, { ...options, token: effectiveToken });
  } catch (error) {
    if (!suppliedToken || isInferaAuthEndpoint(path) || !isInferaUnauthorizedError(error)) {
      throw error;
    }

    const nextAuth = await refreshInferaAuth();
    try {
      return await requestInferaRaw(path, { ...options, token: nextAuth.token });
    } catch (retryError) {
      if (isInferaUnauthorizedError(retryError)) {
        throw expireInferaAuth();
      }
      throw retryError;
    }
  }
}

function mergeInferaRequestHeaders(headers, extraHeaders) {
  if (!extraHeaders || typeof extraHeaders !== "object") {
    return headers;
  }

  for (const [key, value] of Object.entries(extraHeaders)) {
    if (value === undefined || value === null || value === "") continue;
    const name = String(key);
    if (/^(authorization|accept|content-type)$/i.test(name) && headers[name]) continue;
    headers[name] = String(value);
  }
  return headers;
}

async function requestInferaRaw(path, { accept, method = "GET", token, body, responseType = "json", signal, headers: extraHeaders } = {}) {
  if (typeof dlEditor.requestInfera === "function") {
    const result = await dlEditor.requestInfera({ accept, path, method, token, body, responseType, headers: extraHeaders });
    return responseType === "download" ? result : unwrapInferaResult(result);
  }

  const headers = mergeInferaRequestHeaders(
    { Accept: accept || (responseType === "download" ? "application/json, application/zip" : "application/json") },
    extraHeaders
  );
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(resolveInferaUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: responseType === "redirect" ? "manual" : "follow",
    signal
  });

  if (responseType === "redirect") {
    if (!response.ok && (response.status < 300 || response.status >= 400)) {
      let detail = "";
      try {
        const text = await response.text();
        const payload = text ? JSON.parse(text) : null;
        detail = payload?.message || payload?.detail || text;
      } catch {
        detail = "";
      }
      throw createInferaHttpError(response.status, detail);
    }
    const location = response.headers.get("location");
    if (location) {
      return { url: new URL(location, resolveInferaUrl(path)).toString() };
    }
    if (response.redirected || response.url) {
      return { url: response.url };
    }
    return { url: resolveInferaUrl(path) };
  }

  if (responseType === "download") {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (!response.ok) {
        const detail = payload?.message || payload?.detail || `请求失败 (${response.status})`;
        throw createInferaHttpError(response.status, detail);
      }
      return payload;
    }
    const blob = await response.blob();
    if (!response.ok) {
      throw createInferaHttpError(response.status, "");
    }
    return {
      blob,
      content_type: contentType || "application/zip",
      delivery: "direct",
      filename: getResearchDownloadFilename(response.headers.get("content-disposition")),
      size_bytes: blob.size
    };
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.detail || `请求失败 (${response.status})`;
    throw createInferaHttpError(response.status, detail);
  }

  return unwrapInferaResult(payload);
}

export { INFERA_API_BASE_URL, INFERA_AUTH_EXPIRED_MESSAGE, inferaAuthController, inferaRefreshPromise, unwrapInferaResult, resolveInferaUrl, createInferaHttpError, isInferaUnauthorizedError, isInferaAuthEndpoint, setInferaAuthController, expireInferaAuth, mergeRefreshedInferaAuth, refreshInferaAuth, requestInfera, mergeInferaRequestHeaders, requestInferaRaw };
