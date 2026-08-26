const fs = require("fs");
const path = require("path");

const DEFAULT_MAX_UPLOAD_HISTORY_ENTRIES = 5000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function normalizeHistoryText(value) {
  return String(value || "").trim();
}

function normalizeHistorySha256(value) {
  const normalized = normalizeHistoryText(value).toLowerCase().replace(/^sha256:/, "");
  return SHA256_PATTERN.test(normalized) ? normalized : "";
}

function normalizeHistoryPath(value, platform = process.platform) {
  const raw = normalizeHistoryText(value);
  if (!raw) return "";
  const resolved = path.resolve(raw).replace(/[\\/]+$/, "");
  return platform === "win32" ? resolved.toLowerCase() : resolved;
}

function normalizePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function summarizeUploadResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return {};
  }

  const summary = {};
  for (const key of [
    "asset_id",
    "asset_type",
    "id",
    "original_filename",
    "raw_data_id",
    "source_kind",
    "status",
    "upload_group"
  ]) {
    if (result[key] !== undefined && result[key] !== null) {
      summary[key] = result[key];
    }
  }
  return summary;
}

function createUploadHistoryStore(filePath, { maxEntries = DEFAULT_MAX_UPLOAD_HISTORY_ENTRIES, platform = process.platform } = {}) {
  let loaded = false;
  let records = [];

  function load() {
    if (loaded) return records;
    loaded = true;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      records = Array.isArray(parsed?.records) ? parsed.records.filter((entry) => entry && typeof entry === "object") : [];
    } catch {
      records = [];
    }
    return records;
  }

  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const serialized = JSON.stringify(
      { version: 1, records: records.slice(0, Math.max(1, Number(maxEntries) || DEFAULT_MAX_UPLOAD_HISTORY_ENTRIES)) },
      null,
      2
    );
    const temporaryPath = `${filePath}.tmp`;
    fs.writeFileSync(temporaryPath, serialized, "utf8");
    try {
      fs.renameSync(temporaryPath, filePath);
    } catch {
      fs.writeFileSync(filePath, serialized, "utf8");
      fs.rmSync(temporaryPath, { force: true });
    }
  }

  function findCompleted({ filePath: candidatePath, kind, sha256, sizeBytes, startTimestampMs, userKey } = {}) {
    const normalizedKind = normalizeHistoryText(kind);
    const normalizedUserKey = normalizeHistoryText(userKey);
    if (!normalizedKind || !normalizedUserKey) return null;

    const normalizedSha256 = normalizeHistorySha256(sha256);
    const normalizedSizeBytes = normalizePositiveNumber(sizeBytes);
    const normalizedStartTimestampMs = normalizePositiveNumber(startTimestampMs);
    const normalizedFilePath = normalizeHistoryPath(candidatePath, platform);

    return (
      load().find((entry) => {
        if (normalizeHistoryText(entry.kind) !== normalizedKind || normalizeHistoryText(entry.userKey) !== normalizedUserKey) {
          return false;
        }
        if (normalizedSha256) {
          return (
            normalizeHistorySha256(entry.sha256) === normalizedSha256 &&
            (!normalizedSizeBytes || !normalizePositiveNumber(entry.sizeBytes) || normalizePositiveNumber(entry.sizeBytes) === normalizedSizeBytes)
          );
        }
        if (!normalizedFilePath || normalizeHistoryPath(entry.filePath, platform) !== normalizedFilePath) {
          return false;
        }
        if (normalizedSizeBytes && normalizePositiveNumber(entry.sizeBytes) && normalizePositiveNumber(entry.sizeBytes) !== normalizedSizeBytes) {
          return false;
        }
        return !(
          normalizedStartTimestampMs &&
          normalizePositiveNumber(entry.startTimestampMs) &&
          normalizePositiveNumber(entry.startTimestampMs) !== normalizedStartTimestampMs
        );
      }) || null
    );
  }

  function recordSuccess({ fileName, filePath: completedFilePath, kind, result, sha256, sizeBytes, startTimestampMs, userKey } = {}) {
    const normalizedKind = normalizeHistoryText(kind);
    const normalizedUserKey = normalizeHistoryText(userKey);
    const normalizedSha256 = normalizeHistorySha256(sha256);
    if (!normalizedKind || !normalizedUserKey || !normalizedSha256) {
      return null;
    }

    const entry = {
      completedAt: new Date().toISOString(),
      fileName: normalizeHistoryText(fileName),
      filePath: normalizeHistoryText(completedFilePath),
      kind: normalizedKind,
      result: summarizeUploadResult(result),
      sha256: normalizedSha256,
      sizeBytes: normalizePositiveNumber(sizeBytes),
      startTimestampMs: normalizePositiveNumber(startTimestampMs),
      userKey: normalizedUserKey
    };
    const existing = findCompleted(entry);
    records = [entry, ...load().filter((item) => item !== existing)].slice(
      0,
      Math.max(1, Number(maxEntries) || DEFAULT_MAX_UPLOAD_HISTORY_ENTRIES)
    );
    persist();
    return entry;
  }

  return { findCompleted, recordSuccess };
}

function createUploadHistoryDuplicateResult(entry) {
  return {
    ...(entry?.result && typeof entry.result === "object" ? entry.result : {}),
    duplicate: true,
    upload_history_completed_at: entry?.completedAt || "",
    upload_history_duplicate: true
  };
}

module.exports = {
  createUploadHistoryDuplicateResult,
  createUploadHistoryStore,
  normalizeHistoryPath,
  normalizeHistorySha256
};
