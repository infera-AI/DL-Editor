const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const https = require("https");
const os = require("os");
const path = require("path");
const { Readable } = require("stream");
const { getMuxOriginalAudioArgs, getOutputStreamArgs } = require("./ffmpegArgs.cjs");
const { parseMacGpuUsageFromIoreg } = require("./gpuUsage.cjs");
const { deriveStartTimeMs } = require("./mediaStartTime.cjs");
const { checkForUpdate } = require("./updateChecker.cjs");
const {
  getFilterThreadCount,
  getSegmentCount,
  getSegmentedJobConcurrency,
  getVideoConcurrency
} = require("./gpuScheduler.cjs");
const { buildVideoFilters } = require("./videoFilters.cjs");

const APP_NAME = "DL Studio";
const INFERA_API_BASE_URL = process.env.INFERA_API_BASE_URL || process.env.VITE_INFERA_API_BASE_URL || "https://api.infera.cn/api/infera";
const DL_ENGINE_API_BASE_URL = process.env.DL_ENGINE_API_BASE_URL || process.env.VITE_DL_ENGINE_API_BASE_URL || "http://127.0.0.1:8787";
const DL_ENGINE_TENANT_ID = process.env.DL_ENGINE_TENANT_ID || process.env.DL_LOCAL_QUERY_TENANT_ID || "ae0f6251-9fda-7320-b9a4-d1b5f43fcff7";
const DL_ENGINE_USER_ID = process.env.DL_ENGINE_USER_ID || process.env.DL_LOCAL_QUERY_USER_ID || "b67b45aa-16ed-7546-8460-c28c228ca30e";
const DL_ENGINE_AUTH_TOKEN = process.env.DL_ENGINE_AUTH_TOKEN || "";
const TITLE_BAR_HEIGHT = 42;
const ZOOM_MIN = -3;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.5;

let mainWindow;
const activeProcesses = new Set();
const activeUploadRequests = new Map();
const jobSnapshots = new Map();
let cancelRequested = false;
let pauseRequested = false;
let pauseStartedAt = null;
let pauseIntervals = [];
let queueBusy = false;
let cachedCapabilities = null;
let cpuUsageSnapshot = null;
let latestUsage = null;
let usageMonitor = null;
let gpuSampleInFlight = false;
let researchAdminCookieHeader = "";
let engineMediaProxyServer = null;
let engineMediaProxyUrl = "";
let engineMediaProxyStartPromise = null;
const activeEngineQaStreams = new Map();

const VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "avi", "webm", "m4v", "wmv"];
const WEB_VIDEO_UPLOAD_PATH = "/memory/assets/web-video/events";
const VIDEO_MIME_TYPES = {
  avi: "video/x-msvideo",
  m4v: "video/x-m4v",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  mp4: "video/mp4",
  webm: "video/webm",
  wmv: "video/x-ms-wmv"
};

app.setName(APP_NAME);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resolveInferaUrl(value) {
  if (!value) {
    throw new Error("Missing infera request path.");
  }

  const rawPath = String(value);
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const normalizedBase = INFERA_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = rawPath.replace(/^\/+/, "");
  return new URL(normalizedPath, `${normalizedBase}/`).toString();
}

function resolveInferaAdminUrl(value) {
  if (!value) {
    throw new Error("Missing infera admin request path.");
  }

  const rawPath = String(value);
  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const apiUrl = new URL(INFERA_API_BASE_URL);
  const normalizedPath = rawPath.replace(/^\/+/, "");
  return new URL(normalizedPath, `${apiUrl.origin}/`).toString();
}

function resolveEngineUrl(value) {
  if (!value) {
    throw new Error("Missing DL Engine request path.");
  }

  const rawPath = String(value);
  const baseUrl = new URL(DL_ENGINE_API_BASE_URL);
  if (/^https?:\/\//i.test(rawPath)) {
    const requestUrl = new URL(rawPath);
    if (requestUrl.origin !== baseUrl.origin) {
      throw new Error("DL Engine request must target the configured local engine origin.");
    }
    return requestUrl.toString();
  }

  const normalizedBase = DL_ENGINE_API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = rawPath.replace(/^\/+/, "");
  return new URL(normalizedPath, `${normalizedBase}/`).toString();
}

function getEngineAuthorization() {
  if (DL_ENGINE_AUTH_TOKEN) {
    return DL_ENGINE_AUTH_TOKEN.startsWith("Bearer ") ? DL_ENGINE_AUTH_TOKEN : `Bearer ${DL_ENGINE_AUTH_TOKEN}`;
  }

  return `Bearer dev:${DL_ENGINE_TENANT_ID}:${DL_ENGINE_USER_ID}`;
}

function compactProxyHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function sendEngineMediaProxyError(response, status, message) {
  if (response.headersSent) {
    response.destroy();
    return;
  }

  response.writeHead(status, {
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify({ message }));
}

async function handleEngineMediaProxyRequest(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,HEAD,OPTIONS",
      "access-control-allow-headers": "range",
      "cache-control": "no-store"
    });
    response.end();
    return;
  }

  if (!["GET", "HEAD"].includes(request.method || "")) {
    sendEngineMediaProxyError(response, 405, "Method not allowed.");
    return;
  }

  const url = new URL(request.url || "/", "http://127.0.0.1");
  const mediaMatch = url.pathname.match(/^\/engine-media\/assets\/([^/]+)\/media$/);
  if (!mediaMatch) {
    sendEngineMediaProxyError(response, 404, "Not found.");
    return;
  }

  const assetId = decodeURIComponent(mediaMatch[1]);
  if (!/^[A-Za-z0-9_-]+(?:-[A-Za-z0-9_-]+)*$/.test(assetId)) {
    sendEngineMediaProxyError(response, 400, "Invalid asset id.");
    return;
  }

  const enginePath = `/v1/assets/${encodeURIComponent(assetId)}/media?expires_seconds=${encodeURIComponent(url.searchParams.get("expires_seconds") || "600")}`;
  let engineResponse;
  try {
    engineResponse = await fetch(resolveEngineUrl(enginePath), {
      headers: compactProxyHeaders({
        Accept: request.headers.accept || "video/*,application/octet-stream",
        Authorization: getEngineAuthorization(),
        Range: request.headers.range || undefined,
        "x-trace-id": `dl-studio-engine-media-${Date.now()}-${crypto.randomUUID()}`
      }),
      method: request.method === "HEAD" ? "GET" : request.method,
      redirect: "follow"
    });
  } catch (error) {
    sendEngineMediaProxyError(response, 502, error.message || "DL Engine media request failed.");
    return;
  }

  response.writeHead(
    engineResponse.status,
    compactProxyHeaders({
      "access-control-allow-origin": "*",
      "accept-ranges": engineResponse.headers.get("accept-ranges") || "bytes",
      "cache-control": "no-store",
      "content-length": engineResponse.headers.get("content-length"),
      "content-range": engineResponse.headers.get("content-range"),
      "content-type": engineResponse.headers.get("content-type") || "application/octet-stream"
    })
  );

  if (request.method === "HEAD" || !engineResponse.body) {
    response.end();
    return;
  }

  Readable.fromWeb(engineResponse.body)
    .on("error", () => response.destroy())
    .pipe(response);
}

function startEngineMediaProxy() {
  if (engineMediaProxyUrl) {
    return Promise.resolve(engineMediaProxyUrl);
  }
  if (engineMediaProxyStartPromise) {
    return engineMediaProxyStartPromise;
  }

  engineMediaProxyStartPromise = new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      handleEngineMediaProxyRequest(request, response).catch((error) => {
        sendEngineMediaProxyError(response, 500, error.message || "DL Engine media proxy failed.");
      });
    });

    server.once("error", (error) => {
      engineMediaProxyStartPromise = null;
      reject(error);
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      engineMediaProxyServer = server;
      engineMediaProxyUrl = `http://127.0.0.1:${address.port}`;
      resolve(engineMediaProxyUrl);
    });
  });

  return engineMediaProxyStartPromise;
}

function stopEngineMediaProxy() {
  if (!engineMediaProxyServer) {
    return;
  }

  engineMediaProxyServer.close();
  engineMediaProxyServer = null;
  engineMediaProxyUrl = "";
  engineMediaProxyStartPromise = null;
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const rawHeader = headers.get("set-cookie");
  if (!rawHeader) {
    return [];
  }

  return rawHeader.split(/,(?=[^;,]+=)/).map((value) => value.trim()).filter(Boolean);
}

async function persistResearchAdminCookie(response, requestUrl) {
  const setCookieHeaders = getSetCookieHeaders(response.headers);
  if (setCookieHeaders.length === 0) {
    return;
  }

  const url = new URL(requestUrl);
  const cookiePairs = [];
  for (const header of setCookieHeaders) {
    const [pair, ...attributes] = header.split(";").map((part) => part.trim());
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const name = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);
    const lowerAttributes = attributes.map((part) => part.toLowerCase());
    const isExpired = lowerAttributes.some((part) => part === "max-age=0" || part.startsWith("expires=thu, 01 jan 1970"));
    if (isExpired || value === "") {
      if (name === "infera-research-admin") {
        researchAdminCookieHeader = "";
      }
      try {
        await mainWindow?.webContents.session.cookies.remove(url.origin, name);
      } catch {
        // Ignore cookie removal failures; the next admin call will still use the in-memory header.
      }
      continue;
    }

    const maxAgeAttribute = attributes.find((part) => part.toLowerCase().startsWith("max-age="));
    const maxAgeSeconds = Number(maxAgeAttribute?.split("=")[1]);
    cookiePairs.push(`${name}=${value}`);
    try {
      await mainWindow?.webContents.session.cookies.set({
        url: url.origin,
        name,
        value,
        path: "/",
        httpOnly: lowerAttributes.includes("httponly"),
        secure: url.protocol === "https:",
        sameSite: "lax",
        expirationDate: Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0 ? Math.floor(Date.now() / 1000) + maxAgeSeconds : undefined
      });
    } catch {
      // The stored header is enough for IPC admin requests even if session cookie persistence fails.
    }
  }

  if (cookiePairs.length > 0) {
    researchAdminCookieHeader = cookiePairs.join("; ");
  }
}

function getResponseFilename(response, fallback = "research-videos.zip") {
  const disposition = response.headers.get("content-disposition") || "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

function isAllowedUpdateUrl(value) {
  const url = String(value || "");
  const normalizedBase = INFERA_API_BASE_URL.replace(/\/+$/, "");
  const clientReleaseBase = `${normalizedBase}/client/releases`;
  return (
    url === clientReleaseBase ||
    url.startsWith(`${clientReleaseBase}/`) ||
    /^https:\/\/github\.com\/infera-AI\/DL-Editor\/releases(?:\/|$)/.test(url)
  );
}

async function requestInfera(payload = {}) {
  const method = String(payload.method || "GET").toUpperCase();
  const isAdminRequest = Boolean(payload.admin);
  const responseType = payload.responseType || "json";
  const headers = { Accept: payload.accept || (responseType === "download" ? "application/json, application/zip" : "application/json") };
  let body;

  if (payload.form !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(payload.form).toString();
  } else if (payload.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload.body);
  }
  if (payload.token) {
    headers.Authorization = `Bearer ${payload.token}`;
  }
  if (isAdminRequest && researchAdminCookieHeader) {
    headers.Cookie = researchAdminCookieHeader;
  }

  const requestUrl = isAdminRequest ? resolveInferaAdminUrl(payload.path) : resolveInferaUrl(payload.path);

  const response = await fetch(requestUrl, {
    method,
    headers,
    body,
    redirect: payload.redirect || "follow"
  });

  if (isAdminRequest) {
    await persistResearchAdminCookie(response, requestUrl);
  }

  if (responseType === "text") {
    const text = await response.text();
    if (response.status >= 400) {
      throw new Error(text || `请求失败 (${response.status})`);
    }
    return { status: response.status, redirected: response.redirected, text };
  }

  if (responseType === "download") {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const result = await response.json();
      if (!response.ok) {
        const detail = result?.message || result?.detail || `请求失败 (${response.status})`;
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      return result;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!response.ok) {
      throw new Error(`请求失败 (${response.status})`);
    }
    return {
      delivery: "direct",
      filename: getResponseFilename(response),
      content_type: contentType || "application/zip",
      base64: buffer.toString("base64"),
      size_bytes: buffer.length
    };
  }

  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    const detail = result?.message || result?.detail || `请求失败 (${response.status})`;
    if (isAdminRequest && response.status === 404) {
      throw new Error(`Research admin endpoint not found: ${new URL(requestUrl).pathname}`);
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return result;
}

async function requestEngine(payload = {}) {
  const method = String(payload.method || "GET").toUpperCase();
  const responseType = payload.responseType || "json";
  const headers = {
    Accept: payload.accept || "application/json",
    Authorization: getEngineAuthorization(),
    "x-trace-id": payload.traceId || `dl-studio-engine-${Date.now()}-${crypto.randomUUID()}`
  };
  let body;

  if (payload.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload.body);
  }

  const response = await fetch(resolveEngineUrl(payload.path), {
    method,
    headers,
    body,
    redirect: payload.redirect || "follow"
  });

  if (responseType === "text") {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `DL Engine 请求失败 (${response.status})`);
    }
    return { status: response.status, text };
  }

  const text = await response.text();
  let result = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = null;
  }

  if (!response.ok) {
    const detail = result?.message || result?.detail || result?.title || text || `DL Engine 请求失败 (${response.status})`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return result;
}

function parseEngineSseMessage(rawMessage) {
  let eventName = "message";
  const dataLines = [];
  for (const rawLine of String(rawMessage || "").split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) {
      continue;
    }
    const separator = rawLine.indexOf(":");
    const field = separator >= 0 ? rawLine.slice(0, separator) : rawLine;
    const value = separator >= 0 ? rawLine.slice(separator + 1).replace(/^ /, "") : "";
    if (field === "event") {
      eventName = value || "message";
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  const dataText = dataLines.join("\n");
  let data = dataText;
  if (dataText) {
    try {
      data = JSON.parse(dataText);
    } catch {
      data = dataText;
    }
  }
  return { event: eventName, data };
}

function drainEngineSseBuffer(buffer) {
  const messages = [];
  let remaining = buffer;
  while (remaining) {
    const match = remaining.match(/\r?\n\r?\n/);
    if (!match || match.index === undefined) {
      break;
    }
    messages.push(remaining.slice(0, match.index));
    remaining = remaining.slice(match.index + match[0].length);
  }
  return { messages, remaining };
}

async function streamEngineQa(event, payload = {}) {
  const streamId = String(payload.streamId || "");
  if (!/^[A-Za-z0-9_.:-]{8,120}$/.test(streamId)) {
    throw new Error("Invalid DL Engine QA stream id.");
  }

  const sender = event.sender;
  const channel = `engine:qa-stream:event:${streamId}`;
  const controller = new AbortController();
  activeEngineQaStreams.set(streamId, controller);

  const emit = (message) => {
    if (!sender.isDestroyed()) {
      sender.send(channel, message);
    }
  };

  try {
    const response = await fetch(resolveEngineUrl("/v1/qa"), {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        Authorization: getEngineAuthorization(),
        "Content-Type": "application/json",
        "x-trace-id": payload.traceId || `dl-studio-engine-qa-${Date.now()}-${crypto.randomUUID()}`
      },
      body: JSON.stringify({ ...(payload.body || {}), response_mode: "sse" }),
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `DL Engine QA stream failed (${response.status})`);
    }

    if (!response.body) {
      throw new Error("DL Engine QA stream returned no body.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const drained = drainEngineSseBuffer(buffer);
      buffer = drained.remaining;
      for (const rawMessage of drained.messages) {
        emit(parseEngineSseMessage(rawMessage));
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      emit(parseEngineSseMessage(buffer));
    }
    emit({ event: "stream_closed", data: { ok: true } });
    return { ok: true };
  } catch (error) {
    if (error?.name === "AbortError") {
      emit({ event: "stream_cancelled", data: { message: "cancelled" } });
      return { ok: false, cancelled: true };
    }
    emit({ event: "stream_error", data: { message: error.message || "DL Engine QA stream failed." } });
    throw error;
  } finally {
    activeEngineQaStreams.delete(streamId);
  }
}

function cancelEngineQaStream(streamId) {
  const controller = activeEngineQaStreams.get(String(streamId || ""));
  if (!controller) {
    return { cancelled: false };
  }
  controller.abort();
  activeEngineQaStreams.delete(String(streamId || ""));
  return { cancelled: true };
}

function cancelAllEngineQaStreams() {
  for (const controller of activeEngineQaStreams.values()) {
    controller.abort();
  }
  activeEngineQaStreams.clear();
}

function parseJsonSafely(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizeErrorText(value) {
  return String(value || "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getUploadHttpErrorMessage(statusCode, responseText) {
  if (statusCode === 413) {
    return "上传文件超过服务器允许大小（413 Request Entity Too Large）。当前请求被 nginx 拦截，需要服务器调大 client_max_body_size，或提供分片/直传上传接口。";
  }

  const payload = parseJsonSafely(responseText);
  const detail = payload?.message || payload?.detail || responseText || `上传失败 (${statusCode})`;
  const normalizedDetail = typeof detail === "string" ? normalizeErrorText(detail) : JSON.stringify(detail);
  return normalizedDetail || `上传失败 (${statusCode})`;
}

function parseRawSseEventBlock(block) {
  let eventName = "message";
  const dataLines = [];

  for (const line of String(block || "").split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim() || "message";
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  const rawData = dataLines.join("\n");
  return {
    event: eventName,
    payload: parseJsonSafely(rawData) ?? rawData
  };
}

function parseInferaUploadEvents(responseText) {
  const parsedJson = parseJsonSafely(responseText);
  if (parsedJson && typeof parsedJson === "object" && "success" in parsedJson) {
    if (parsedJson.success === false) {
      throw new Error(parsedJson.message || "上传失败");
    }

    return parsedJson.result ?? parsedJson;
  }

  const blocks = String(responseText || "").split(/\r?\n\r?\n/).map((block) => block.trim()).filter(Boolean);
  let lastPayload = null;

  for (const block of blocks) {
    const parsed = parseRawSseEventBlock(block);
    if (!parsed) {
      continue;
    }

    lastPayload = parsed.payload;
    if (parsed.event === "error") {
      const detail = parsed.payload?.message || parsed.payload?.detail || parsed.payload;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }

    if (parsed.event === "preview_ready" || parsed.event === "done") {
      const envelope = parsed.payload;
      if (envelope && typeof envelope === "object" && "success" in envelope) {
        if (envelope.success === false) {
          throw new Error(envelope.message || "上传失败");
        }

        return envelope.result ?? {};
      }

      return envelope ?? {};
    }
  }

  return lastPayload ?? {};
}

function getVideoMimeType(filePath) {
  const extension = path.extname(filePath).replace(".", "").toLowerCase();
  return VIDEO_MIME_TYPES[extension] || "video/mp4";
}

function escapeMultipartValue(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ");
}

function buildMultipartField(boundary, name, value) {
  return Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${escapeMultipartValue(name)}"\r\n\r\n${String(value)}\r\n`
  );
}

function normalizeUploadTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp >= 0 ? Math.round(timestamp) : Date.now();
}

function normalizeUploadDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration * 1000) / 1000 : "";
}

function emitUploadProgress(sender, payload) {
  if (!sender || sender.isDestroyed?.()) {
    return;
  }

  sender.send("infera:upload-progress", payload);
}

function uploadMultipart({ fields, filePath, fileName, jobId, sender, token, uploadId, url }) {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    const boundary = `----dl-studio-${crypto.randomBytes(12).toString("hex")}`;
    const fieldParts = Object.entries(fields).map(([name, value]) => buildMultipartField(boundary, name, value));
    const fileHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${escapeMultipartValue(fileName)}"\r\nContent-Type: ${getVideoMimeType(filePath)}\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const contentLength =
      fieldParts.reduce((total, part) => total + part.length, 0) + fileHeader.length + stats.size + footer.length;
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;
    let settled = false;
    let bytesUploaded = 0;
    const uploadStartedAt = Date.now();
    const uploadRecord = {
      canceled: false,
      paused: false,
      pausedAt: null,
      pausedMs: 0,
      request: null,
      sendProgress: null,
      stream: null,
      cancel: null
    };

    const settle = (callback, value) => {
      if (settled) {
        return;
      }

      settled = true;
      if (uploadId) {
        activeUploadRequests.delete(uploadId);
      }
      callback(value);
    };

    const sendProgress = (status, extra = {}) => {
      const currentPausedMs = uploadRecord.paused && uploadRecord.pausedAt ? Date.now() - uploadRecord.pausedAt : 0;
      const elapsedSeconds = Math.max(0.001, (Date.now() - uploadStartedAt - uploadRecord.pausedMs - currentPausedMs) / 1000);
      emitUploadProgress(sender, {
        bytesUploaded,
        filePath,
        jobId,
        percent: stats.size > 0 ? Math.min(100, Math.round((bytesUploaded / stats.size) * 100)) : 100,
        speedBytesPerSecond: status === "paused" ? 0 : Math.round(bytesUploaded / elapsedSeconds),
        status,
        totalBytes: stats.size,
        uploadId,
        ...extra
      });
    };
    uploadRecord.sendProgress = sendProgress;

    const request = transport.request(
      target,
      {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Length": contentLength,
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        }
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = new Error(getUploadHttpErrorMessage(response.statusCode, text));
            settle(reject, error);
            uploadRecord.stream?.destroy();
            request.destroy();
            return;
          }

          try {
            settle(resolve, parseInferaUploadEvents(text));
          } catch (error) {
            settle(reject, error);
          }
        });
      }
    );

    uploadRecord.request = request;
    uploadRecord.cancel = () => {
      if (uploadRecord.canceled) {
        return;
      }

      uploadRecord.canceled = true;
      sendProgress("canceled", { message: "上传已取消" });
      uploadRecord.stream?.destroy(new Error("上传已取消"));
      request.destroy(new Error("上传已取消"));
    };
    uploadRecord.pause = () => {
      if (uploadRecord.canceled || uploadRecord.paused) {
        return;
      }

      uploadRecord.paused = true;
      uploadRecord.pausedAt = Date.now();
      uploadRecord.stream?.pause();
      sendProgress("paused", { message: "上传已暂停", speedBytesPerSecond: 0 });
    };
    uploadRecord.resume = () => {
      if (uploadRecord.canceled || !uploadRecord.paused) {
        return;
      }

      uploadRecord.paused = false;
      if (uploadRecord.pausedAt) {
        uploadRecord.pausedMs += Date.now() - uploadRecord.pausedAt;
      }
      uploadRecord.pausedAt = null;
      uploadRecord.stream?.resume();
      sendProgress("uploading", { message: "继续上传" });
    };

    if (uploadId) {
      activeUploadRequests.set(uploadId, uploadRecord);
    }

    request.on("error", (error) => {
      settle(reject, uploadRecord.canceled ? new Error("上传已取消") : error);
    });
    for (const part of fieldParts) {
      request.write(part);
    }
    request.write(fileHeader);

    sendProgress("uploading");
    uploadRecord.stream = fs.createReadStream(filePath);
    uploadRecord.stream
      .on("data", (chunk) => {
        bytesUploaded += chunk.length;
        sendProgress("uploading");
      })
      .on("error", (error) => {
        request.destroy(error);
        settle(reject, uploadRecord.canceled ? new Error("上传已取消") : error);
      })
      .on("end", () => {
        bytesUploaded = stats.size;
        sendProgress("processing", { percent: 100 });
        request.end(footer);
      })
      .pipe(request, { end: false });
  });
}

async function uploadInferaVideo(payload = {}, sender) {
  const filePath = String(payload.path || payload.filePath || "");
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("找不到要上传的视频文件");
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    throw new Error("只能上传文件");
  }

  if (!payload.token) {
    throw new Error("请先登录后上传");
  }

  const uploadId = String(payload.uploadId || crypto.randomUUID());
  const fields = {
    start_timestamp_ms: normalizeUploadTimestamp(payload.startTimestampMs ?? payload.start_timestamp_ms)
  };
  const durationSeconds = normalizeUploadDuration(payload.durationSeconds ?? payload.duration_seconds);
  if (durationSeconds) {
    fields.duration_seconds = durationSeconds;
  }

  return uploadMultipart({
    fields,
    fileName: payload.fileName || path.basename(filePath),
    filePath,
    jobId: payload.jobId,
    sender,
    token: payload.token,
    uploadId,
    url: resolveInferaUrl(payload.uploadPath || WEB_VIDEO_UPLOAD_PATH)
  });
}

function cancelInferaUpload(uploadId) {
  const id = String(uploadId || "");
  const upload = activeUploadRequests.get(id);
  if (!upload) {
    return { canceled: false };
  }

  upload.cancel?.();
  return { canceled: true };
}

function pauseInferaUpload(uploadId) {
  const id = String(uploadId || "");
  const upload = activeUploadRequests.get(id);
  if (!upload) {
    return { paused: false };
  }

  upload.pause?.();
  return { paused: true };
}

function resumeInferaUpload(uploadId) {
  const id = String(uploadId || "");
  const upload = activeUploadRequests.get(id);
  if (!upload) {
    return { resumed: false };
  }

  upload.resume?.();
  return { resumed: true };
}

function clampZoomLevel(level) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, level));
}

function setWindowZoomLevel(delta) {
  if (!mainWindow) {
    return;
  }

  const currentLevel = mainWindow.webContents.getZoomLevel();
  mainWindow.webContents.setZoomLevel(clampZoomLevel(currentLevel + delta));
}

function resetWindowZoomLevel() {
  mainWindow?.webContents.setZoomLevel(0);
}

function isZoomShortcut(input) {
  if (input.type !== "keyDown") {
    return false;
  }

  return process.platform === "darwin"
    ? input.alt && !input.control && !input.meta
    : input.control && !input.alt && !input.meta;
}

function registerWindowShortcuts(window) {
  window.webContents.on("before-input-event", (event, input) => {
    if (!isZoomShortcut(input)) {
      return;
    }

    const key = String(input.key || "").toLowerCase();
    if (key === "-" || key === "_" || key === "−" || key === "–" || key === "—") {
      event.preventDefault();
      setWindowZoomLevel(-ZOOM_STEP);
      return;
    }

    if (key === "=" || key === "+") {
      event.preventDefault();
      setWindowZoomLevel(ZOOM_STEP);
      return;
    }

    if (key === "0") {
      event.preventDefault();
      resetWindowZoomLevel();
    }
  });
}

function emitFullscreenState() {
  mainWindow?.webContents.send("window:fullscreen-change", Boolean(mainWindow?.isFullScreen()));
}

function getNativeTitleBarOptions() {
  if (process.platform === "darwin") {
    return {
      titleBarStyle: "hiddenInset",
      trafficLightPosition: { x: 14, y: 13 }
    };
  }

  return {
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#f7f7f5",
      height: TITLE_BAR_HEIGHT,
      symbolColor: "#4f5a56"
    }
  };
}

function setTitleBarTheme(theme) {
  if (!mainWindow || process.platform === "darwin" || typeof mainWindow.setTitleBarOverlay !== "function") {
    return { applied: false };
  }

  const isDark = theme === "dark";
  mainWindow.setTitleBarOverlay({
    color: isDark ? "#111413" : "#f7f7f5",
    height: TITLE_BAR_HEIGHT,
    symbolColor: isDark ? "#d8dfdc" : "#4f5a56"
  });
  return { applied: true };
}

function getAppIconPath() {
  const iconPath = path.join(__dirname, "../../build/icon.png");
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: "#f7f7f5",
    icon: getAppIconPath(),
    title: APP_NAME,
    ...getNativeTitleBarOptions(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  registerWindowShortcuts(mainWindow);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  mainWindow.on("enter-full-screen", () => {
    emitFullscreenState();
  });

  mainWindow.on("leave-full-screen", () => {
    emitFullscreenState();
  });
}

function getBundledBinary(name) {
  if (app.isPackaged) {
    if (name === "ffprobe") {
      const probeName = process.arch === "arm64" ? "ffprobe-arm64" : "ffprobe-x64";
      return path.join(process.resourcesPath, "bin", probeName);
    }

    return path.join(process.resourcesPath, "bin", name);
  }

  if (name === "ffmpeg") {
    return require("ffmpeg-static");
  }

  if (process.arch === "arm64") {
    return require("@ffprobe-installer/ffprobe").path;
  }

  return require("ffprobe-static").path;
}

function runBinary(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      ...options
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      activeProcesses.delete(child);
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(stderr.trim() || stdout.trim() || `Process exited with code ${code}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

function getPausedMsSince(startedAt, now = Date.now()) {
  let pausedMs = 0;
  const intervals = pauseStartedAt ? [...pauseIntervals, { start: pauseStartedAt, end: now }] : pauseIntervals;

  for (const interval of intervals) {
    const overlapStart = Math.max(Number(startedAt) || 0, interval.start);
    const overlapEnd = Math.min(now, interval.end);
    if (overlapEnd > overlapStart) {
      pausedMs += overlapEnd - overlapStart;
    }
  }

  return pausedMs;
}

function closeActivePauseInterval() {
  if (!pauseStartedAt) {
    return;
  }

  pauseIntervals.push({ start: pauseStartedAt, end: Date.now() });
  pauseStartedAt = null;
}

async function waitWhilePaused() {
  while (pauseRequested && !cancelRequested) {
    await sleep(120);
  }
}

async function setProcessPaused(processHandle, paused) {
  if (!processHandle?.pid || processHandle.exitCode !== null) {
    return false;
  }

  if (process.platform === "win32") {
    return false;
  }

  processHandle.kill(paused ? "SIGSTOP" : "SIGCONT");
  return true;
}

function trackProcess(child) {
  activeProcesses.add(child);
  child.once("error", () => activeProcesses.delete(child));
  child.once("close", () => activeProcesses.delete(child));
  if (pauseRequested) {
    setProcessPaused(child, true).catch(() => undefined);
  }
}

async function setActiveProcessesPaused(paused) {
  const results = await Promise.all(
    [...activeProcesses].map((processHandle) =>
      setProcessPaused(processHandle, paused)
        .then((changed) => ({ changed, failed: false }))
        .catch((error) => ({ changed: false, failed: true, error }))
    )
  );

  return {
    total: results.length,
    changed: results.filter((result) => result.changed).length,
    failed: results.filter((result) => result.failed).length
  };
}

function parseEncoders(output) {
  const encoders = new Set();
  const candidates = ["h264_videotoolbox", "hevc_videotoolbox", "h264_nvenc", "hevc_nvenc", "h264_qsv", "hevc_qsv"];

  for (const encoder of candidates) {
    if (output.includes(encoder)) {
      encoders.add(encoder);
    }
  }

  return [...encoders];
}

async function getGpuNames() {
  if (process.platform !== "darwin") {
    return [];
  }

  try {
    const result = await runBinary("system_profiler", ["SPDisplaysDataType"]);
    const names = result.stdout
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*(?:Chipset Model|Graphics\/Displays):\s*(.+)$/)?.[1]?.trim())
      .filter(Boolean);

    if (names.length > 0) {
      return [...new Set(names)];
    }

    const cpu = await runBinary("sysctl", ["-n", "machdep.cpu.brand_string"]);
    return [cpu.stdout.trim()].filter(Boolean);
  } catch {
    return [];
  }
}

function pickEncoder(encoders, gpuNames) {
  const gpuText = gpuNames.join(" ").toLowerCase();

  if (encoders.includes("h264_videotoolbox") && /apple|m1|m2|m3|m4|m5|intel|amd|radeon/.test(gpuText)) {
    return "h264_videotoolbox";
  }

  if (encoders.includes("h264_nvenc") && /nvidia|geforce|rtx|gtx|quadro/.test(gpuText)) {
    return "h264_nvenc";
  }

  if (encoders.includes("h264_qsv") && /intel|iris|uhd/.test(gpuText)) {
    return "h264_qsv";
  }

  return "libx264";
}

function createCpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
  }

  return { idle, total };
}

function sampleCpuUsage() {
  const current = createCpuSnapshot();

  if (!cpuUsageSnapshot) {
    cpuUsageSnapshot = current;
    return 0;
  }

  const idleDelta = current.idle - cpuUsageSnapshot.idle;
  const totalDelta = current.total - cpuUsageSnapshot.total;
  cpuUsageSnapshot = current;

  if (totalDelta <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 1000) / 10));
}

function emptyGpuUsage(status = "unavailable") {
  return {
    status,
    total: null,
    videoEncode: null,
    threeD: null,
    compute: null,
    rawTotal: null
  };
}

function roundPercent(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

function summarizeGpuCounters(samples) {
  let rawTotal = 0;
  let videoEncode = 0;
  let threeD = 0;
  let compute = 0;

  for (const sample of samples) {
    const pathText = String(sample.Path || sample.path || "").toLowerCase();
    const value = Number(sample.CookedValue ?? sample.cookedValue ?? 0);

    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    rawTotal += value;

    if (pathText.includes("engtype_videoencode")) {
      videoEncode += value;
    } else if (pathText.includes("engtype_3d")) {
      threeD += value;
    } else if (pathText.includes("engtype_compute")) {
      compute += value;
    }
  }

  return {
    status: "ok",
    total: roundPercent(rawTotal),
    videoEncode: roundPercent(videoEncode),
    threeD: roundPercent(threeD),
    compute: roundPercent(compute),
    rawTotal: Math.round(rawTotal * 10) / 10
  };
}

async function sampleGpuUsage() {
  if (process.platform !== "darwin") {
    return emptyGpuUsage();
  }

  const acceleratorClasses = ["IOAccelerator", "AGXAccelerator", "IOGraphicsAccelerator2"];

  for (const acceleratorClass of acceleratorClasses) {
    try {
      const result = await runBinary("ioreg", ["-r", "-d", "1", "-w", "0", "-c", acceleratorClass]);
      const usage = parseMacGpuUsageFromIoreg(result.stdout);

      if (usage.status === "ok") {
        return usage;
      }
    } catch {
      // Try the next accelerator class. macOS exposes different classes across GPU families.
    }
  }

  return emptyGpuUsage("restricted");
}

async function buildUsageSnapshot() {
  const capabilities = await getCapabilities();
  const cpu = {
    status: "ok",
    usage: sampleCpuUsage(),
    model: capabilities.cpuModel,
    logicalCores: capabilities.logicalCores,
    totalMemoryGb: capabilities.totalMemoryGb
  };
  let gpu = latestUsage?.gpu || emptyGpuUsage("sampling");

  if (!gpuSampleInFlight) {
    gpuSampleInFlight = true;
    sampleGpuUsage()
      .then((sample) => {
        gpu = sample;
      })
      .catch(() => {
        gpu = emptyGpuUsage();
      })
      .finally(() => {
        gpuSampleInFlight = false;
        latestUsage = {
          ...latestUsage,
          gpu,
          updatedAt: Date.now()
        };
        mainWindow?.webContents.send("system:usage-update", latestUsage);
      });
  }

  latestUsage = {
    cpu,
    gpu,
    updatedAt: Date.now()
  };

  return latestUsage;
}

function startUsageMonitor() {
  if (usageMonitor) {
    return;
  }

  usageMonitor = setInterval(() => {
    buildUsageSnapshot()
      .then((usage) => {
        mainWindow?.webContents.send("system:usage-update", usage);
      })
      .catch(() => undefined);
  }, 1000);
  usageMonitor.unref?.();

  buildUsageSnapshot()
    .then((usage) => {
      mainWindow?.webContents.send("system:usage-update", usage);
    })
    .catch(() => undefined);
}

async function getCapabilities() {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const ffmpegPath = getBundledBinary("ffmpeg");
  let hardwareEncoders = [];
  const gpuNames = await getGpuNames();

  try {
    const result = await runBinary(ffmpegPath, ["-hide_banner", "-encoders"]);
    hardwareEncoders = parseEncoders(`${result.stdout}\n${result.stderr}`);
  } catch {
    hardwareEncoders = [];
  }

  const cpus = os.cpus();
  cachedCapabilities = {
    platform: os.platform(),
    cpuModel: cpus[0]?.model || "Unknown CPU",
    logicalCores: cpus.length || 1,
    totalMemoryGb: Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10,
    gpuNames,
    hardwareEncoders,
    selectedEncoder: pickEncoder(hardwareEncoders, gpuNames),
    selectedGpuEncoder: pickEncoder(hardwareEncoders, gpuNames),
    cpuEncoder: "libx264",
    ffmpegReady: fs.existsSync(ffmpegPath),
    outputDirectory: getDefaultOutputDirectory()
  };

  return cachedCapabilities;
}

function getDefaultOutputDirectory() {
  return path.join(app.getPath("videos"), "DL Studio Outputs");
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function parseFrameRate(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "0/0") {
    return null;
  }

  if (raw.includes("/")) {
    const [numerator, denominator] = raw.split("/").map(Number);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
      return null;
    }

    const frameRate = numerator / denominator;
    return Number.isFinite(frameRate) && frameRate > 0 ? Math.round(frameRate * 100) / 100 : null;
  }

  const frameRate = Number(raw);
  return Number.isFinite(frameRate) && frameRate > 0 ? Math.round(frameRate * 100) / 100 : null;
}

function formatFrameRateLabel(value) {
  const frameRate = Number(value);
  if (!Number.isFinite(frameRate) || frameRate <= 0) {
    return "";
  }

  const precision = frameRate < 10 ? 2 : frameRate % 1 === 0 ? 0 : 1;
  return `${frameRate.toFixed(precision)} fps`;
}

async function getFileMetadata(filePath) {
  const stats = fs.statSync(filePath);
  const modifiedAtMs = Number.isFinite(stats.mtimeMs) ? stats.mtimeMs : Date.now();
  let mediaInfo = null;

  try {
    mediaInfo = await probeMediaInfo(filePath);
  } catch {
    mediaInfo = null;
  }
  const frameRate = parseFrameRate(mediaInfo?.avgFrameRate || mediaInfo?.rFrameRate);

  return {
    id: crypto.randomUUID(),
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    sizeLabel: formatBytes(stats.size),
    modifiedAt: new Date(modifiedAtMs).toISOString(),
    modifiedAtMs,
    startTimeMs: deriveStartTimeMs({ mediaInfo, modifiedAtMs }),
    duration: mediaInfo?.duration || 0,
    frameRate,
    frameRateLabel: formatFrameRateLabel(frameRate),
    status: "queued",
    progress: 0
  };
}

function normalizeNumber(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }
  return number;
}

function normalizeOptions(options) {
  const fps = normalizeNumber(options?.fps, 5);
  const width = normalizeNumber(options?.width, 1280);
  const height = normalizeNumber(options?.height, 720);
  const useSourceResolution = options?.resolutionMode === "source";
  const processingDevice = options?.processingDevice === "cpu" ? "cpu" : "gpu";

  return {
    fps: Math.max(1, Math.min(240, Math.round(fps))),
    width: Math.max(2, Math.min(7680, Math.round(width / 2) * 2)),
    height: Math.max(2, Math.min(4320, Math.round(height / 2) * 2)),
    resolutionMode: useSourceResolution ? "source" : "target",
    processingDevice
  };
}

function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, " ").trim();
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function normalizeTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
}

function formatTimestampFileName(timestamp) {
  const date = new Date(normalizeTimestamp(timestamp));
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
    padDatePart(date.getHours()),
    padDatePart(date.getMinutes()),
    padDatePart(date.getSeconds())
  ].join("_");
}

function createOutputPath(job, outputDirectory, reservedPaths = new Set()) {
  const baseName = sanitizeName(formatTimestampFileName(job.startTimeMs ?? job.modifiedAtMs));
  let candidate = path.join(outputDirectory, `${baseName}.mp4`);
  let index = 2;

  while (fs.existsSync(candidate) || reservedPaths.has(candidate)) {
    candidate = path.join(outputDirectory, `${baseName}_${index}.mp4`);
    index += 1;
  }

  reservedPaths.add(candidate);
  return candidate;
}

async function probeMediaInfo(inputPath) {
  const ffprobePath = getBundledBinary("ffprobe");
  const { stdout } = await runBinary(ffprobePath, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,avg_frame_rate,r_frame_rate:stream_tags:format=duration:format_tags",
    "-of",
    "json",
    inputPath
  ]);

  const parsed = JSON.parse(stdout || "{}");
  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
  const format = parsed.format || {};
  const stream = streams[0] || {};
  const duration = Number(format.duration);
  const width = Number(stream.width);
  const height = Number(stream.height);

  return {
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null,
    avgFrameRate: stream.avg_frame_rate || null,
    rFrameRate: stream.r_frame_rate || null,
    format,
    streams
  };
}

function getEncoderArgs(encoder, logicalCores) {
  if (encoder === "h264_videotoolbox") {
    return [
      "-c:v",
      "h264_videotoolbox",
      "-realtime",
      "1",
      "-prio_speed",
      "1",
      "-allow_sw",
      "0",
      "-b:v",
      "3500k",
      "-pix_fmt",
      "nv12"
    ];
  }

  if (encoder === "h264_nvenc") {
    return ["-c:v", "h264_nvenc", "-preset", "p1", "-tune", "ull", "-cq", "26", "-pix_fmt", "yuv420p"];
  }

  if (encoder === "h264_qsv") {
    return ["-c:v", "h264_qsv", "-preset", "veryfast", "-global_quality", "26", "-look_ahead", "0", "-pix_fmt", "nv12"];
  }

  return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-threads", String(Math.max(1, logicalCores - 1))];
}

function buildFfmpegArgs({ inputPath, outputPath, options, encoder, logicalCores, mediaInfo }) {
  const useGpuPath = options.processingDevice === "gpu" && encoder !== "libx264";
  const decoderArgs = useGpuPath ? ["-hwaccel", encoder === "h264_videotoolbox" ? "videotoolbox" : "auto"] : [];
  const seekArgs = Number.isFinite(options.segmentStart) && options.segmentStart > 0 ? ["-ss", options.segmentStart.toFixed(3)] : [];
  const durationArgs =
    Number.isFinite(options.segmentDuration) && options.segmentDuration > 0 ? ["-t", options.segmentDuration.toFixed(3)] : [];
  const filterThreads = Number.isFinite(Number(options.filterThreads))
    ? Number(options.filterThreads)
    : Math.max(1, Math.min(logicalCores || 1, 8));
  const videoFilters = buildVideoFilters(options, mediaInfo);
  const filterArgs = videoFilters ? ["-vf", videoFilters] : [];
  const fastStartArgs = options.fastStart === false ? [] : ["-movflags", "+faststart"];

  return [
    "-y",
    "-hide_banner",
    "-progress",
    "pipe:1",
    "-nostats",
    "-filter_threads",
    String(Math.max(1, Math.round(filterThreads))),
    ...decoderArgs,
    ...seekArgs,
    "-i",
    inputPath,
    ...durationArgs,
    ...getOutputStreamArgs({ videoOnly: options.videoOnly }),
    ...filterArgs,
    ...getEncoderArgs(encoder, logicalCores),
    "-avoid_negative_ts",
    "make_zero",
    ...fastStartArgs,
    outputPath
  ];
}

function parseProgressLine(line, duration) {
  const [key, value] = line.trim().split("=");
  if (!key || value === undefined || !duration) {
    return null;
  }

  if (key === "out_time_ms" || key === "out_time_us") {
    const seconds = Number(value) / 1000000;
    if (!Number.isFinite(seconds)) {
      return null;
    }

    return {
      currentTime: Math.round(seconds * 10) / 10,
      progress: Math.max(0, Math.min(99, Math.round((seconds / duration) * 100)))
    };
  }

  if (key === "out_time") {
    const match = value.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    if (!Number.isFinite(seconds)) {
      return null;
    }

    return {
      currentTime: Math.round(seconds * 10) / 10,
      progress: Math.max(0, Math.min(99, Math.round((seconds / duration) * 100)))
    };
  }

  return null;
}

function roundEncodingMetric(value, precision = 1) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  const factor = 10 ** precision;
  return Math.round(number * factor) / factor;
}

function parseEncodingProgressLine(line) {
  const [key, value] = line.trim().split("=");
  if (!key || value === undefined) {
    return null;
  }

  if (key === "fps") {
    return { encodingFps: roundEncodingMetric(value) };
  }

  if (key === "speed") {
    return { encodingSpeed: roundEncodingMetric(String(value).replace(/x$/i, ""), 2) };
  }

  return null;
}

function getEncodingPayload(encoder, stats = {}) {
  return {
    encoder,
    encodingFps: Number.isFinite(Number(stats.encodingFps)) ? Number(stats.encodingFps) : null,
    encodingSpeed: Number.isFinite(Number(stats.encodingSpeed)) ? Number(stats.encodingSpeed) : null,
    hardwareEncoding: encoder !== "libx264"
  };
}

function buildTimingPayload(startedAt, duration, currentTime) {
  const pausedMs = getPausedMsSince(startedAt);
  const elapsedMs = Math.max(0, Date.now() - startedAt - pausedMs);
  const safeCurrentTime = Number(currentTime) || 0;
  let estimatedRemainingMs = null;

  if (duration > 0 && safeCurrentTime > 0 && safeCurrentTime < duration) {
    estimatedRemainingMs = Math.max(0, Math.round(elapsedMs * ((duration - safeCurrentTime) / safeCurrentTime)));
  } else if (safeCurrentTime >= duration && duration > 0) {
    estimatedRemainingMs = 0;
  }

  return {
    elapsedMs,
    elapsedSeconds: Math.round((elapsedMs / 1000) * 10) / 10,
    pausedMs,
    estimatedRemainingMs
  };
}

function emitJobUpdate(payload) {
  if (payload?.id) {
    jobSnapshots.set(payload.id, { ...(jobSnapshots.get(payload.id) || {}), ...payload });
  }
  mainWindow?.webContents.send("transcode:job-update", payload);
}

function emitBatchUpdate(payload) {
  mainWindow?.webContents.send("transcode:batch-update", payload);
}

function emitPauseJobState(status, message) {
  for (const [id, snapshot] of jobSnapshots.entries()) {
    if (snapshot.status !== "processing" && snapshot.status !== "paused") {
      continue;
    }

    const timing = Number.isFinite(Number(snapshot.startedAt))
      ? buildTimingPayload(snapshot.startedAt, Number(snapshot.duration) || 0, Number(snapshot.currentTime) || 0)
      : {};

    emitJobUpdate({
      ...snapshot,
      ...timing,
      id,
      status,
      message
    });
  }
}

function getActiveJobStatus() {
  return pauseRequested ? "paused" : "processing";
}

function getActiveJobMessage(message) {
  return pauseRequested ? "Paused" : message;
}

async function runFfmpegJob(job, options, outputPath, duration, capabilities, encoder, startedAt, mediaInfo) {
  await waitWhilePaused();

  const ffmpegPath = getBundledBinary("ffmpeg");
  const args = buildFfmpegArgs({
    inputPath: job.path,
    outputPath,
    options,
    encoder,
    logicalCores: capabilities.logicalCores,
    mediaInfo
  });

  emitJobUpdate({
    id: job.id,
    status: "processing",
    progress: 0,
    duration,
    currentTime: 0,
    elapsedMs: 0,
    elapsedSeconds: 0,
    pausedMs: 0,
    estimatedRemainingMs: null,
    startedAt,
    outputPath,
    ...getEncodingPayload(encoder),
    message: `Using ${encoder}`
  });

  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    trackProcess(child);
    let stdoutBuffer = "";
    let stderr = "";
    const encodingStats = {};

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const encodingInfo = parseEncodingProgressLine(line);
        if (encodingInfo) {
          Object.assign(encodingStats, encodingInfo);
        }

        const progressInfo = parseProgressLine(line, duration);
        if (progressInfo !== null) {
          const timing = buildTimingPayload(startedAt, duration, progressInfo.currentTime);

          emitJobUpdate({
            id: job.id,
            status: getActiveJobStatus(),
            progress: progressInfo.progress,
            duration,
            currentTime: progressInfo.currentTime,
            ...timing,
            startedAt,
            outputPath,
            ...getEncodingPayload(encoder, encodingStats),
            message: getActiveJobMessage(`Using ${encoder}`)
          });
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      activeProcesses.delete(child);

      if (cancelRequested) {
        reject(new Error("Canceled by user."));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}`));
    });
  });
}

async function transcodeJob(job, options, outputDirectory, capabilities, reservedOutputPaths) {
  const outputPath = createOutputPath(job, outputDirectory, reservedOutputPaths);
  const mediaInfo = await probeMediaInfo(job.path);
  const duration = mediaInfo.duration;
  const encoder = options.processingDevice === "cpu" ? "libx264" : capabilities.selectedGpuEncoder;
  let completedEncoder = encoder;
  const startedAt = Date.now();

  try {
    const segmented = options.enableSegmentation
      ? await transcodeSegmentedJob(job, options, outputPath, duration, capabilities, encoder, startedAt, mediaInfo)
      : false;

    if (!segmented) {
      await runFfmpegJob(job, options, outputPath, duration, capabilities, encoder, startedAt, mediaInfo);
    }
  } catch (error) {
    if (cancelRequested || encoder === "libx264" || options.processingDevice === "cpu") {
      throw error;
    }

    if (fs.existsSync(outputPath)) {
      fs.rmSync(outputPath, { force: true });
    }

    emitJobUpdate({
      id: job.id,
      status: "processing",
      progress: 0,
      duration,
      outputPath,
      startedAt,
      ...buildTimingPayload(startedAt, duration, 0),
      estimatedRemainingMs: null,
      ...getEncodingPayload("libx264"),
      message: `${encoder} unavailable, retrying CPU`
    });

    completedEncoder = "libx264";
    await runFfmpegJob(job, options, outputPath, duration, capabilities, "libx264", startedAt, mediaInfo);
  }

  emitJobUpdate({
    id: job.id,
    status: "done",
    progress: 100,
    duration,
    currentTime: Math.round(duration * 10) / 10,
    ...buildTimingPayload(startedAt, duration, duration),
    estimatedRemainingMs: 0,
    outputPath,
    ...getEncodingPayload(completedEncoder),
    message: "Complete"
  });
}

function escapeConcatPath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

function runTrackedProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    trackProcess(child);
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      activeProcesses.delete(child);
      reject(error);
    });

    child.on("close", (code) => {
      activeProcesses.delete(child);

      if (cancelRequested) {
        reject(new Error("Canceled by user."));
      } else if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr.trim() || stdout.trim() || `Process exited with code ${code}`));
      }
    });
  });
}

async function runFfmpegSegment({ job, options, segment, capabilities, encoder, startedAt, mediaInfo, onProgress }) {
  await waitWhilePaused();

  const ffmpegPath = getBundledBinary("ffmpeg");
  const args = buildFfmpegArgs({
    inputPath: job.path,
    outputPath: segment.outputPath,
    options: {
      ...options,
      segmentStart: segment.start,
      segmentDuration: segment.duration,
      videoOnly: true,
      fastStart: false
    },
    encoder,
    logicalCores: capabilities.logicalCores,
    mediaInfo
  });

  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    trackProcess(child);
    let stdoutBuffer = "";
    let stderr = "";
    const encodingStats = {};

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const encodingInfo = parseEncodingProgressLine(line);
        if (encodingInfo) {
          Object.assign(encodingStats, encodingInfo);
        }

        const progressInfo = parseProgressLine(line, segment.duration);
        if (progressInfo !== null) {
          onProgress(segment.index, Math.min(segment.duration, progressInfo.currentTime), startedAt, encodingStats);
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      activeProcesses.delete(child);
      reject(error);
    });

    child.on("close", (code) => {
      activeProcesses.delete(child);

      if (cancelRequested) {
        reject(new Error("Canceled by user."));
        return;
      }

      if (code === 0) {
        onProgress(segment.index, segment.duration, startedAt, encodingStats);
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `FFmpeg segment exited with code ${code}`));
    });
  });
}

async function concatSegments(segments, outputPath) {
  await waitWhilePaused();

  const ffmpegPath = getBundledBinary("ffmpeg");
  const listPath = path.join(path.dirname(segments[0].outputPath), "concat-list.txt");
  const content = segments.map((segment) => `file '${escapeConcatPath(segment.outputPath)}'`).join(os.EOL);
  fs.writeFileSync(listPath, content, "utf8");

  await runTrackedProcess(ffmpegPath, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    outputPath
  ]);
}

async function muxOriginalAudio(videoPath, sourcePath, outputPath) {
  await waitWhilePaused();

  const ffmpegPath = getBundledBinary("ffmpeg");
  try {
    await runTrackedProcess(ffmpegPath, getMuxOriginalAudioArgs({ videoPath, sourcePath, outputPath, audioMode: "copy" }));
  } catch (error) {
    if (cancelRequested) {
      throw error;
    }

    await waitWhilePaused();
    await runTrackedProcess(ffmpegPath, getMuxOriginalAudioArgs({ videoPath, sourcePath, outputPath, audioMode: "aac" }));
  }
}

async function transcodeSegmentedJob(job, options, outputPath, duration, capabilities, encoder, startedAt, mediaInfo) {
  const concurrency =
    options.segmentConcurrency || getSegmentedJobConcurrency(encoder, capabilities, { videoConcurrency: options.videoConcurrency || 1 });
  const segmentCount = getSegmentCount(duration, concurrency, encoder);

  if (segmentCount <= 1) {
    return false;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dl-studio-segments-"));
  const segmentDuration = duration / segmentCount;
  const segments = Array.from({ length: segmentCount }, (_item, index) => {
    const start = index * segmentDuration;
    const end = index === segmentCount - 1 ? duration : (index + 1) * segmentDuration;

    return {
      index,
      start,
      duration: Math.max(0.1, end - start),
      outputPath: path.join(tempDir, `segment-${String(index).padStart(3, "0")}.mp4`)
    };
  });
  const progressBySegment = new Array(segmentCount).fill(0);
  const encodingStatsBySegment = new Map();
  let nextIndex = 0;
  let completedSegments = 0;

  function getAggregateEncodingStats() {
    const stats = [...encodingStatsBySegment.values()].filter(Boolean);
    const encodingFps = stats.reduce((sum, item) => sum + (Number(item.encodingFps) || 0), 0);
    const encodingSpeed = stats.reduce((sum, item) => sum + (Number(item.encodingSpeed) || 0), 0);
    return {
      encodingFps: roundEncodingMetric(encodingFps),
      encodingSpeed: roundEncodingMetric(encodingSpeed, 2)
    };
  }

  function emitAggregate(message) {
    const currentTime = Math.min(
      duration,
      progressBySegment.reduce((sum, value) => sum + value, 0)
    );
    const timing = buildTimingPayload(startedAt, duration, currentTime);

    emitJobUpdate({
      id: job.id,
      status: getActiveJobStatus(),
      progress: Math.max(0, Math.min(99, Math.round((currentTime / duration) * 100))),
      duration,
      currentTime: Math.round(currentTime * 10) / 10,
      ...timing,
      startedAt,
      outputPath,
      ...getEncodingPayload(encoder, getAggregateEncodingStats()),
      message: getActiveJobMessage(message)
    });
  }

  emitAggregate(`GPU segmented x${Math.min(concurrency, segmentCount)}`);

  async function worker() {
    while (!cancelRequested) {
      await waitWhilePaused();

      const segment = segments[nextIndex];
      nextIndex += 1;

      if (!segment) {
        return;
      }

      await runFfmpegSegment({
        job,
        options: {
          ...options,
          videoOnly: true
        },
        segment,
        capabilities,
        encoder,
        startedAt,
        mediaInfo,
        onProgress: (index, current, _startedAt, stats) => {
          progressBySegment[index] = current;
          if (stats) {
            encodingStatsBySegment.set(index, stats);
          }
          emitAggregate(`GPU segmented x${Math.min(concurrency, segmentCount)} · ${completedSegments}/${segmentCount}`);
        }
      });

      completedSegments += 1;
      progressBySegment[segment.index] = segment.duration;
      emitAggregate(`GPU segmented x${Math.min(concurrency, segmentCount)} · ${completedSegments}/${segmentCount}`);
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, segmentCount) }, () => worker()));

    if (cancelRequested) {
      throw new Error("Canceled by user.");
    }

    const mergedVideoPath = path.join(tempDir, "merged-video.mp4");
    emitAggregate("Merging GPU video segments");
    await concatSegments(segments, mergedVideoPath);
    emitAggregate("Muxing audio");
    await muxOriginalAudio(mergedVideoPath, job.path, outputPath);
    return true;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function processBatch(jobs, rawOptions, rawOutputDirectory) {
  queueBusy = true;
  cancelRequested = false;
  pauseRequested = false;
  pauseStartedAt = null;
  pauseIntervals = [];
  jobSnapshots.clear();

  const options = normalizeOptions(rawOptions);
  const outputDirectory = rawOutputDirectory || getDefaultOutputDirectory();
  ensureDirectory(outputDirectory);

  const capabilities = await getCapabilities();
  const activeEncoder = options.processingDevice === "cpu" ? "libx264" : capabilities.selectedGpuEncoder;
  const enableSegmentation = options.processingDevice === "gpu";
  const videoConcurrency = getVideoConcurrency(options, activeEncoder, jobs.length);
  const segmentConcurrency = enableSegmentation
    ? getSegmentedJobConcurrency(activeEncoder, capabilities, { videoConcurrency })
    : 1;
  const activeFfmpegWorkers = Math.max(1, videoConcurrency * segmentConcurrency);
  const filterThreads = getFilterThreadCount(activeEncoder, capabilities, { activeWorkers: activeFfmpegWorkers });
  const runtimeOptions = {
    ...options,
    enableSegmentation,
    segmentConcurrency,
    videoConcurrency,
    filterThreads
  };
  const reservedOutputPaths = new Set();
  emitBatchUpdate({
    status: "started",
    paused: false,
    total: jobs.length,
    outputDirectory,
    encoder: activeEncoder,
    processingDevice: runtimeOptions.processingDevice,
    concurrency: segmentConcurrency,
    videoConcurrency,
    filterThreads
  });

  let completed = 0;
  let failed = 0;
  const settledJobs = new Set();
  let nextJobIndex = 0;

  async function processNextJob() {
    while (!cancelRequested) {
      await waitWhilePaused();

      const job = jobs[nextJobIndex];
      nextJobIndex += 1;

      if (!job) {
        return;
      }

      try {
        await transcodeJob(job, runtimeOptions, outputDirectory, capabilities, reservedOutputPaths);
        completed += 1;
        settledJobs.add(job.id);
      } catch (error) {
        settledJobs.add(job.id);
        if (cancelRequested) {
          emitJobUpdate({ id: job.id, status: "canceled", progress: 0, message: "Canceled" });
        } else {
          failed += 1;
          emitJobUpdate({
            id: job.id,
            status: "error",
            progress: 0,
            message: error.message || "Failed to process video"
          });
        }
      }
    }
  }

  await Promise.all(Array.from({ length: videoConcurrency }, () => processNextJob()));

  if (cancelRequested) {
    for (const job of jobs) {
      if (!settledJobs.has(job.id)) {
        emitJobUpdate({ id: job.id, status: "canceled", progress: 0, message: "Canceled" });
      }
    }
  }

  queueBusy = false;
  pauseRequested = false;
  pauseStartedAt = null;

  emitBatchUpdate({
    status: cancelRequested ? "canceled" : "finished",
    paused: false,
    total: jobs.length,
    completed,
    failed,
    outputDirectory,
    encoder: activeEncoder,
    processingDevice: runtimeOptions.processingDevice,
    concurrency: segmentConcurrency,
    videoConcurrency,
    filterThreads
  });
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await startEngineMediaProxy().catch((error) => {
    console.error(`Failed to start DL Engine media proxy: ${error.message || error}`);
  });
  createWindow();
  startUsageMonitor();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      startUsageMonitor();
    }
  });
});

app.on("before-quit", () => {
  cancelAllEngineQaStreams();
  stopEngineMediaProxy();
});

app.on("window-all-closed", () => {
  if (usageMonitor) {
    clearInterval(usageMonitor);
    usageMonitor = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("window:toggle-fullscreen", () => {
  if (!mainWindow) {
    return false;
  }

  const shouldEnterFullscreen = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(shouldEnterFullscreen);
  return shouldEnterFullscreen;
});

ipcMain.handle("window:close", () => {
  mainWindow?.close();
});

ipcMain.handle("window:is-fullscreen", () => Boolean(mainWindow?.isFullScreen()));
ipcMain.handle("window:set-title-bar-theme", (_event, theme) => setTitleBarTheme(theme));

ipcMain.handle("videos:select", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select videos",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Video files", extensions: VIDEO_EXTENSIONS },
      { name: "All files", extensions: ["*"] }
    ]
  });

  if (result.canceled) {
    return [];
  }

  return Promise.all(result.filePaths.map(getFileMetadata));
});

ipcMain.handle("output:select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose output folder",
    defaultPath: getDefaultOutputDirectory(),
    properties: ["openDirectory", "createDirectory"]
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("system:get-capabilities", async () => getCapabilities());
ipcMain.handle("system:get-usage", async () => latestUsage || buildUsageSnapshot());

ipcMain.handle("updates:check", async () =>
  checkForUpdate({
    currentVersion: app.getVersion(),
    platform: process.platform
  })
);

ipcMain.handle("infera:request", async (_event, payload) => requestInfera(payload));
ipcMain.handle("infera:upload-video", async (event, payload) => uploadInferaVideo(payload, event.sender));
ipcMain.handle("infera:cancel-upload", async (_event, uploadId) => cancelInferaUpload(uploadId));
ipcMain.handle("infera:pause-upload", async (_event, uploadId) => pauseInferaUpload(uploadId));
ipcMain.handle("infera:resume-upload", async (_event, uploadId) => resumeInferaUpload(uploadId));
ipcMain.handle("engine:request", async (_event, payload) => requestEngine(payload));
ipcMain.handle("engine:qa-stream", async (event, payload) => streamEngineQa(event, payload));
ipcMain.handle("engine:qa-stream:cancel", async (_event, streamId) => cancelEngineQaStream(streamId));
ipcMain.handle("engine:get-media-proxy-url", async () => startEngineMediaProxy());

ipcMain.handle("files:delete-local-file", async (_event, targetPath) => {
  const filePath = String(targetPath || "");
  if (!filePath) {
    throw new Error("Missing local file path.");
  }

  let stats;
  try {
    stats = await fs.promises.stat(filePath);
  } catch {
    return { deleted: false, missing: true, path: filePath };
  }

  if (!stats.isFile()) {
    throw new Error("Only local files can be cleared.");
  }

  await shell.trashItem(filePath);
  return { deleted: true, path: filePath };
});

ipcMain.handle("transcode:start-batch", async (_event, payload) => {
  if (queueBusy) {
    throw new Error("A batch is already running.");
  }

  const jobs = Array.isArray(payload?.jobs) ? payload.jobs.filter((job) => fs.existsSync(job.path)) : [];
  if (jobs.length === 0) {
    throw new Error("No valid videos selected.");
  }

  processBatch(jobs, payload?.options, payload?.outputDirectory).catch((error) => {
    queueBusy = false;
    pauseRequested = false;
    pauseStartedAt = null;
    emitBatchUpdate({ status: "error", paused: false, message: error.message || "Batch failed" });
  });

  return { started: true };
});

ipcMain.handle("transcode:cancel-batch", async () => {
  cancelRequested = true;
  pauseRequested = false;
  closeActivePauseInterval();
  await setActiveProcessesPaused(false);

  for (const processHandle of activeProcesses) {
    processHandle.kill("SIGTERM");
  }

  return { cancelRequested: true };
});

ipcMain.handle("transcode:pause-batch", async () => {
  if (!queueBusy || pauseRequested) {
    return { paused: pauseRequested };
  }

  pauseRequested = true;
  pauseStartedAt = Date.now();
  emitPauseJobState("paused", "Paused");
  emitBatchUpdate({ status: "started", paused: true, message: "Paused" });

  const pauseResult = await setActiveProcessesPaused(true);
  if (pauseResult.failed > 0) {
    pauseRequested = false;
    closeActivePauseInterval();
    emitPauseJobState("processing", "Pause failed");
    emitBatchUpdate({ status: "started", paused: false, message: "Pause failed" });
    throw new Error("无法暂停当前 FFmpeg 进程");
  }

  return { paused: true, pauseResult };
});

ipcMain.handle("transcode:resume-batch", async () => {
  if (!queueBusy || !pauseRequested) {
    return { paused: pauseRequested };
  }

  closeActivePauseInterval();
  pauseRequested = false;
  emitPauseJobState("processing", "Resumed");
  emitBatchUpdate({ status: "started", paused: false, resumed: true, message: "Resumed" });

  const resumeResult = await setActiveProcessesPaused(false);
  if (resumeResult.failed > 0) {
    pauseRequested = true;
    pauseStartedAt = Date.now();
    emitPauseJobState("paused", "Resume failed");
    emitBatchUpdate({ status: "started", paused: true, message: "Resume failed" });
    throw new Error("无法恢复当前 FFmpeg 进程");
  }

  return { paused: false, resumeResult };
});

ipcMain.handle("shell:reveal-path", async (_event, targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) {
    shell.showItemInFolder(targetPath);
  }
});

ipcMain.handle("shell:open-path", async (_event, targetPath) => {
  if (targetPath && fs.existsSync(targetPath)) {
    return shell.openPath(targetPath);
  }
  return "Path does not exist.";
});

ipcMain.handle("shell:open-external", async (_event, targetUrl) => {
  const url = String(targetUrl || "");
  if (!isAllowedUpdateUrl(url)) {
    throw new Error("Unsupported update URL.");
  }

  await shell.openExternal(url);
  return { opened: true };
});
