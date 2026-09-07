import { parseTimestampFromFileName } from "../../utils/date.js";
import { formatDurationCompact } from "../../utils/format.js";

function formatRepositoryDuration(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return "";
  return formatDurationCompact(Number(value) * 1000);
}

function getRepositorySizeBytes(item) {
  const value = Number(item?.size_bytes ?? item?.file_size ?? item?.fileSize ?? item?.bytes ?? item?.metadata?.size_bytes);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getRepositoryDurationSeconds(item) {
  const content = getRepositoryContentSource(item);
  const rawValue = [
    ["seconds", item?.duration_seconds],
    ["seconds", item?.durationSeconds],
    ["seconds", item?.duration_s],
    ["seconds", item?.video_duration_seconds],
    ["seconds", item?.videoDurationSeconds],
    ["auto", item?.video_duration],
    ["auto", item?.videoDuration],
    ["auto", item?.duration],
    ["auto", item?.file_duration],
    ["auto", item?.media_duration],
    ["milliseconds", item?.duration_ms],
    ["milliseconds", item?.durationMs],
    ["milliseconds", item?.video_duration_ms],
    ["milliseconds", item?.videoDurationMs],
    ["seconds", item?.metadata?.duration_seconds],
    ["seconds", item?.metadata?.durationSeconds],
    ["seconds", item?.metadata?.video_duration_seconds],
    ["seconds", item?.metadata?.videoDurationSeconds],
    ["auto", item?.metadata?.video_duration],
    ["auto", item?.metadata?.videoDuration],
    ["auto", item?.metadata?.duration],
    ["milliseconds", item?.metadata?.duration_ms],
    ["milliseconds", item?.metadata?.durationMs],
    ["seconds", content?.duration_seconds],
    ["seconds", content?.durationSeconds],
    ["seconds", content?.video_duration_seconds],
    ["seconds", content?.videoDurationSeconds],
    ["auto", content?.duration],
    ["auto", content?.video_duration],
    ["auto", content?.videoDuration],
    ["milliseconds", content?.duration_ms],
    ["milliseconds", content?.durationMs],
    ["seconds", content?.metadata?.duration_seconds],
    ["auto", content?.metadata?.duration],
    ["milliseconds", content?.metadata?.duration_ms]
  ].find(([, candidate]) => Number.isFinite(Number(candidate)) && Number(candidate) > 0);

  if (!rawValue) {
    return 0;
  }

  const [unit, rawDuration] = rawValue;
  const value = Number(rawDuration);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return unit === "milliseconds" || (unit === "auto" && value > 10000) ? value / 1000 : value;
}

function getRepositoryUploadTime(item) {
  return item?.uploaded_at || item?.upload_time || item?.uploadTime || item?.created_at || item?.create_time || item?.timestamp_ms;
}

function getRepositoryCapturedTime(item) {
  const fileNameTimestamp = parseRepositoryCapturedTimestampFromName(item);
  if (fileNameTimestamp) {
    return fileNameTimestamp;
  }

  return (
    item?.captured_at ||
    item?.capturedAt ||
    item?.shooting_time ||
    item?.shootingTime ||
    item?.shot_at ||
    item?.shotAt ||
    item?.recorded_at ||
    item?.recordedAt ||
    item?.recording_time ||
    item?.recordingTime ||
    item?.start_timestamp_ms ||
    item?.startTimestampMs ||
    item?.start_time_ms ||
    item?.startTimeMs
  );
}

function getRepositoryContentSource(item) {
  if (Array.isArray(item?.content)) {
    return item.content.find((entry) => entry && typeof entry === "object") || {};
  }

  return item?.content && typeof item.content === "object" ? item.content : {};
}

function parseRepositoryCapturedTimestampFromName(item) {
  const candidates = [
    item?.file_name,
    item?.filename,
    item?.name,
    item?.media_url,
    item?.url,
    item?.path,
    item?.file_path,
    item?.source_path,
    item?.metadata?.file_name,
    item?.metadata?.name,
    item?.metadata?.source_path
  ];

  for (const candidate of candidates) {
    const timestamp = parseTimestampFromFileName(candidate);
    if (timestamp) {
      return timestamp;
    }
  }

  return "";
}

function formatRepositoryStatus(value) {
  const status = String(value || "UNKNOWN").toUpperCase();
  const labels = {
    PARSED: "已解析",
    PENDING: "等待解析",
    PROCESSING: "解析中",
    PREVIEW_READY: "预览就绪",
    FAILED: "失败",
    ERROR: "失败",
    UNKNOWN: "未知"
  };
  return labels[status] || status;
}

export { formatRepositoryDuration, getRepositorySizeBytes, getRepositoryDurationSeconds, getRepositoryUploadTime, getRepositoryCapturedTime, getRepositoryContentSource, parseRepositoryCapturedTimestampFromName, formatRepositoryStatus };
