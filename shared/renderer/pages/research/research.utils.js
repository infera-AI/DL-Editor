import { formatRepositoryDate, getLocalDateKey } from "../../utils/date.js";

function hasResearchAccess(user) {
  return (Array.isArray(user?.permissions) ? user.permissions : []).some((permission) => {
    const key = String(permission?.permissionKey || permission?.permission_key || "").trim().toLowerCase();
    return key === "research.access" && permission?.enabled === true;
  });
}

function getResearchResourceId(item) {
  return String(item?.asset_id || item?.id || "");
}

function getResearchChatId(item) {
  return String(item?.session_id || item?.id || "");
}

function getResearchItemTimestamp(item) {
  return Number(item?.timestamp_ms || item?.start_timestamp_ms || item?.["captured_at_ms"] || item?.created_at_ms || 0) || 0;
}

function isResearchAudio(item) {
  const type = String(item?.asset_type || item?.media_type || item?.mime || "").toLowerCase();
  return type.includes("audio");
}

function groupResearchResources(items) {
  const groups = new Map();
  for (const item of items || []) {
    const timestampMs = getResearchItemTimestamp(item);
    const fallbackDate = timestampMs ? getLocalDateKey(new Date(timestampMs)) : "unknown";
    const key = item.captured_date_key || fallbackDate;
    if (!groups.has(key)) {
      groups.set(key, {
        dateKey: key,
        dateLabel: item.captured_date_label || (key === "unknown" ? "Unknown date" : key),
        items: []
      });
    }
    groups.get(key).items.push(item);
  }
  return Array.from(groups.values()).sort((left, right) => String(right.dateKey).localeCompare(String(left.dateKey)));
}

function getResearchFeedbackMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).filter((message) => message.feedback_rating || message.feedback_text);
}

function normalizeResearchFeedbackRating(value) {
  const rating = String(value || "").toLowerCase();
  if (rating === "up" || rating === "like" || rating === "thumbs_up") return "like";
  if (rating === "down" || rating === "dislike" || rating === "thumbs_down") return "dislike";
  return rating;
}

function formatResearchDateTime(value) {
  const timestamp = Number(value || 0);
  if (!timestamp) return "";
  return formatRepositoryDate(timestamp);
}

function formatResearchShortTime(value) {
  const timestamp = Number(value || 0);
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatResearchLongDuration(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

function formatResearchNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function getRecentResearchDateKeys(days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return getLocalDateKey(date);
  });
}

function shortResearchDateKey(value) {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? `${parts[1]}-${parts[2]}` : value;
}

function getResearchUserLabel(user) {
  const userId = user?.user_id || user?.id || "-";
  const name = String(user?.nickname || user?.name || "").trim() || `User ${userId}`;
  const parsedCount = user?.parsed_asset_count ?? user?.parsed_video_count ?? 0;
  return `${name} (ID ${userId} · parsed ${formatResearchNumber(parsedCount)} · chats ${formatResearchNumber(user?.chat_session_count || 0)})`;
}

function normalizeResearchItems(payload) {
  if (Array.isArray(payload)) return payload;
  return [payload?.items, payload?.users, payload?.data, payload?.list].find(Array.isArray) || [];
}

function isResearchPermissionDenied(error) {
  const message = String(error?.message || "");
  return Number(error?.status || error?.statusCode) === 403 || message.includes("403") || /research access denied/i.test(message);
}

function getResearchErrorMessage(error) {
  const message = String(error?.message || "");
  if (isResearchPermissionDenied(error)) {
    return "当前账号没有 Research 访问权限，请确认已授予 research.access";
  }
  if (message.includes("401") || message.toLowerCase().includes("research admin login required")) {
    return "当前账号没有 Research 访问权限，请确认已授予 research.access";
  }
  return message || "无法读取 Research 数据";
}

function formatResearchDownloadExpiry(expiresAt) {
  const remainingMs = Number(expiresAt) - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "下载链接可能已过期";
  return `下载链接约 ${Math.max(1, Math.ceil(remainingMs / 60000))} 分钟内有效`;
}

export { hasResearchAccess, getResearchResourceId, getResearchChatId, getResearchItemTimestamp, isResearchAudio, groupResearchResources, getResearchFeedbackMessages, normalizeResearchFeedbackRating, formatResearchDateTime, formatResearchShortTime, formatResearchLongDuration, formatResearchNumber, getRecentResearchDateKeys, shortResearchDateKey, getResearchUserLabel, normalizeResearchItems, isResearchPermissionDenied, getResearchErrorMessage, formatResearchDownloadExpiry };
