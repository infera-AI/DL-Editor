import { CLOUD_REPOSITORY_PAGE_SIZE } from "./cloud.constants.js";

function buildCloudRepositoryPagePath(endpoint, { cursor = null, dateKey = "", filterId = "all", offset = 0 } = {}) {
  const params = new URLSearchParams({
    include_page: "true",
    limit: String(CLOUD_REPOSITORY_PAGE_SIZE),
    page_mode: "cursor"
  });

  if (cursor) {
    params.set("cursor", cursor);
  } else if (offset > 0) {
    params.set("offset", String(offset));
  }

  const dayRange = endpoint === "/device/files" ? getCloudRepositoryDateRange(dateKey) : null;
  if (dayRange) {
    params.set("start_timestamp_ms", String(dayRange.startTimestampMs));
    params.set("end_timestamp_ms", String(dayRange.endTimestampMs));
  }

  const parseStatus = endpoint === "/device/files" ? getCloudRepositoryParseStatusParam(filterId) : "";
  if (parseStatus) {
    params.set("parse_status", parseStatus);
  }

  return `${endpoint}?${params.toString()}`;
}

function getCloudRepositoryParseStatusParam(filterId) {
  if (filterId === "parsed") {
    return "PARSED,FALLBACK_PARSED,PARTIAL_PARSED";
  }
  if (filterId === "processing") {
    return "PENDING,QUEUED,PREVIEW_READY,POSTPROCESSING,SPLITTING,PROCESSING,PARSING,RUNNING,REINDEX_REQUIRED";
  }
  if (filterId === "failed") {
    return "FAIL,FAILED,ERROR,PARSE_FAILED,PROCESSING_FAILED";
  }
  return "";
}

function getCloudRepositoryDateRange(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (!Number.isFinite(start.getTime()) || start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) {
    return null;
  }

  return {
    startTimestampMs: start.getTime(),
    endTimestampMs: start.getTime() + 24 * 60 * 60 * 1000
  };
}

function normalizeCloudItems(result) {
  if (Array.isArray(result)) {
    return result;
  }

  const candidates = [result?.items, result?.archives, result?.raw_data, result?.rawData, result?.records, result?.list, result?.data];
  return candidates.find(Array.isArray) || [];
}

export { buildCloudRepositoryPagePath, getCloudRepositoryParseStatusParam, getCloudRepositoryDateRange, normalizeCloudItems };
