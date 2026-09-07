import { CLOUD_FILTERS, CLOUD_REPOSITORY_DEFAULT_MEDIA_FILTER_ID, CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID } from "./cloud.constants.js";
import { getRepositoryDurationSeconds, getRepositorySizeBytes } from "./repository-format.js";

function getCloudMediaFiltersForSpace() {
  return CLOUD_FILTERS.filter((filter) => ["all", "video", "audio"].includes(filter.id));
}

function getCloudStatusFiltersForSpace(spaceId) {
  if (spaceId === "rawdata") {
    return [];
  }

  return CLOUD_FILTERS.filter((filter) => ["all_status", "parsed", "processing", "failed"].includes(filter.id));
}

function getDefaultCloudMediaFilterIdForSpace() {
  return CLOUD_REPOSITORY_DEFAULT_MEDIA_FILTER_ID;
}

function getDefaultCloudStatusFilterIdForSpace() {
  return CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID;
}

function getCloudStatusFilterIdForSpace(spaceId, filterId) {
  const visibleFilters = getCloudStatusFiltersForSpace(spaceId);
  if (visibleFilters.length === 0) {
    return getDefaultCloudStatusFilterIdForSpace(spaceId);
  }
  return visibleFilters.some((filter) => filter.id === filterId) ? filterId : getDefaultCloudStatusFilterIdForSpace(spaceId);
}

function getRepositoryItemKey(item) {
  return String(getRawDataId(item) || item.asset_id || item.id || item.media_url || item.file_name || item.name || "repository-item");
}

function getRepositoryStableItemKey(item) {
  return String(getRawDataId(item) || item?.asset_id || item?.id || item?.media_url || item?.file_name || item?.name || "");
}

function getRepositoryActionMenuPosition(anchor) {
  const rect = anchor.getBoundingClientRect();
  const margin = 8;
  const menuWidth = 96;
  const menuHeight = 40;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || menuWidth + margin * 2;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || menuHeight + margin * 2;
  const left = Math.min(viewportWidth - menuWidth - margin, Math.max(margin, rect.right - menuWidth));
  const belowTop = rect.bottom + 5;
  const top =
    belowTop + menuHeight > viewportHeight - margin
      ? Math.max(margin, rect.top - menuHeight - 5)
      : belowTop;

  return { left, top };
}

function getRawDataId(item) {
  return item?.raw_data_id || item?.rawDataId || item?.archive_id || item?.archiveId || item?.id || "";
}

function getRawDataStorageStatus(item) {
  const rawStatus =
    item?.storage_status ??
    item?.storageStatus ??
    item?.save_status ??
    item?.saveStatus ??
    item?.persist_status ??
    item?.persistStatus ??
    item?.upload_status ??
    item?.uploadStatus ??
    item?.archive_status ??
    item?.archiveStatus ??
    item?.status ??
    item?.state;
  const status = String(rawStatus || "").trim().toUpperCase();
  return status || (getRawDataId(item) ? "SAVED" : "UNKNOWN");
}

function formatRawDataStorageStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (["SAVED", "STORED", "COMPLETED", "COMPLETE", "DONE", "READY", "SUCCESS"].includes(normalized)) {
    return "已保存";
  }
  if (["SAVING", "STORING", "UPLOADING", "PENDING", "PROCESSING", "IN_PROGRESS"].includes(normalized)) {
    return "保存中";
  }
  if (["FAILED", "ERROR", "CANCELED", "CANCELLED"].includes(normalized)) {
    return "保存失败";
  }
  return normalized || "未知";
}

function getRepositoryTitle(item) {
  return item.file_name || item.name || `Asset ${item.asset_id || item.id || "-"}`;
}

function getRepositoryType(item) {
  const type = String(item.asset_type || item.media_type || item.file_type || "").toLowerCase();
  const name = String(item.file_name || item.name || item.media_url || "").toLowerCase();
  if (type.includes("audio") || type === "vad") return "audio";
  if (type.includes("video") || type === "stream" || type === "composed_frames") return "video";
  if (/\.(mp4|mov|mkv|avi|webm|m4v|wmv)(?:$|\?)/.test(name) || getRawDataId(item)) return "video";
  return "file";
}

function isRepositoryParsed(item) {
  return ["PARSED", "FALLBACK_PARSED", "PARTIAL_PARSED"].includes(getRepositoryParseStatus(item));
}

function isRepositoryProcessing(item) {
  return ["PENDING", "QUEUED", "PREVIEW_READY", "POSTPROCESSING", "SPLITTING", "PROCESSING", "PARSING", "RUNNING", "REINDEX_REQUIRED"].includes(
    getRepositoryParseStatus(item)
  );
}

function isRepositoryParseFailed(item) {
  return ["FAIL", "FAILED", "ERROR", "PARSE_FAILED", "PROCESSING_FAILED"].includes(getRepositoryParseStatus(item));
}

function getRepositoryParseStatus(item) {
  return String(item.parse_status || item.parseStatus || item.job_status || item.jobStatus || "").trim().toUpperCase() || "UNKNOWN";
}

function getCloudRepositoryStats(items) {
  const safeItems = Array.isArray(items) ? items : [];

  return safeItems.reduce(
    (stats, item) => {
      const type = getRepositoryType(item);
      const sizeBytes = getRepositorySizeBytes(item);
      const durationSeconds = getRepositoryDurationSeconds(item);

      return {
        total: stats.total + 1,
        video: stats.video + (type === "video" ? 1 : 0),
        audio: stats.audio + (type === "audio" ? 1 : 0),
        parsed: stats.parsed + (isRepositoryParsed(item) ? 1 : 0),
        processing: stats.processing + (isRepositoryProcessing(item) ? 1 : 0),
        failed: stats.failed + (isRepositoryParseFailed(item) ? 1 : 0),
        totalBytes: stats.totalBytes + (Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0),
        totalDurationSeconds: stats.totalDurationSeconds + (Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0)
      };
    },
    { total: 0, video: 0, audio: 0, parsed: 0, processing: 0, failed: 0, totalBytes: 0, totalDurationSeconds: 0 }
  );
}

function getCloudFilterCount(stats, filterId) {
  if (filterId === "video") return stats.video;
  if (filterId === "audio") return stats.audio;
  if (filterId === "parsed") return stats.parsed;
  if (filterId === "processing") return stats.processing;
  if (filterId === "failed") return stats.failed;
  return stats.total;
}

function filterCloudRepositoryItems(items, mediaFilterId, statusFilterId, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const safeItems = Array.isArray(items) ? items : [];

  return safeItems.filter((item) => {
    const type = getRepositoryType(item);
    const matchesMedia =
      mediaFilterId === "all" ||
      (mediaFilterId === "video" && type === "video") ||
      (mediaFilterId === "audio" && type === "audio");
    const matchesStatus =
      statusFilterId === "all_status" ||
      (statusFilterId === "parsed" && isRepositoryParsed(item)) ||
      (statusFilterId === "processing" && isRepositoryProcessing(item)) ||
      (statusFilterId === "failed" && isRepositoryParseFailed(item));

    if (!matchesMedia || !matchesStatus) return false;
    if (!normalizedQuery) return true;

    return [
      item.file_name,
      item.name,
      item.device_id,
      item.source_kind,
      item.asset_type,
      item.media_type,
      item.parse_status,
      getRawDataStorageStatus(item),
      item.summary_text,
      getRawDataId(item)
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  });
}

export { getCloudMediaFiltersForSpace, getCloudStatusFiltersForSpace, getDefaultCloudMediaFilterIdForSpace, getDefaultCloudStatusFilterIdForSpace, getCloudStatusFilterIdForSpace, getRepositoryItemKey, getRepositoryStableItemKey, getRepositoryActionMenuPosition, getRawDataId, getRawDataStorageStatus, formatRawDataStorageStatus, getRepositoryTitle, getRepositoryType, isRepositoryParsed, isRepositoryProcessing, isRepositoryParseFailed, getRepositoryParseStatus, getCloudRepositoryStats, getCloudFilterCount, filterCloudRepositoryItems };
