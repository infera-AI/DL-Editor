import { formatGuessValue, toGuessClaimValue } from "./guess-value.js";

function getGuessStatusLabel(status) {
  if (status === "pending") return "待反馈";
  if (status === "confirmed" || status === "corrected") return "已确认";
  if (status === "unsure") return "不确定";
  return status || "";
}

function getGuessStatusRank(status) {
  if (status === "pending") return 0;
  if (status === "confirmed" || status === "corrected") return 1;
  if (status === "unsure") return 2;
  return 3;
}

function getGuessTimestamp(guess) {
  const value = guess?.asked_at_ms ?? guess?.create_time ?? guess?.update_time ?? guess?.answered_at_ms;
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatGuessDate(guess) {
  const timestamp = getGuessTimestamp(guess);
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return year === new Date().getFullYear() ? `${month}月${day}日` : `${year}年${month}月${day}日`;
}

function sortGuessItems(items) {
  return [...items].sort((left, right) => {
    const rank = getGuessStatusRank(left.status) - getGuessStatusRank(right.status);
    if (rank !== 0) return rank;
    return getGuessTimestamp(right) - getGuessTimestamp(left) || Number(right.id || 0) - Number(left.id || 0);
  });
}

function getLocalDayStartMs(daysAgo = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.getTime();
}

function getGuessTimeRange(timeFilter, from, to) {
  if (timeFilter === "today") {
    return { start: getLocalDayStartMs(0), end: getLocalDayStartMs(-1) - 1 };
  }
  if (timeFilter === "7d") {
    return { start: getLocalDayStartMs(6), end: getLocalDayStartMs(-1) - 1 };
  }
  if (timeFilter === "30d") {
    return { start: getLocalDayStartMs(29), end: getLocalDayStartMs(-1) - 1 };
  }
  if (timeFilter === "custom") {
    const start = from ? new Date(`${from}T00:00:00`).getTime() : 0;
    const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
    return {
      start: Number.isFinite(start) ? start : 0,
      end: Number.isFinite(end) ? end : Number.POSITIVE_INFINITY
    };
  }
  return null;
}

function matchesGuessStatusFilter(guess, statusFilter) {
  if (!statusFilter || statusFilter === "all") return true;
  if (statusFilter === "confirmed") return guess.status === "confirmed" || guess.status === "corrected";
  return guess.status === statusFilter;
}

function matchesGuessTimeFilter(guess, timeFilter, from, to) {
  const range = getGuessTimeRange(timeFilter, from, to);
  if (!range) return true;
  const timestamp = getGuessTimestamp(guess);
  if (!timestamp) return false;
  return timestamp >= range.start && timestamp <= range.end;
}

function filterGuessItems(items, { status, time, from, to } = {}) {
  return items.filter((item) => matchesGuessStatusFilter(item, status) && matchesGuessTimeFilter(item, time, from, to));
}

function getGuessPreview(guess, item) {
  const value = item && !item.error ? item.value : guess?.corrected_value || guess?.proposed_value;
  return formatGuessValue(toGuessClaimValue(value) || value);
}

function selectGuessAfterRemoval(remaining, removedId, previous) {
  const index = previous.findIndex((row) => row.id === removedId);
  const candidate = previous[index + 1] || previous[index - 1];
  if (candidate && remaining.some((row) => row.id === candidate.id)) return candidate.id;
  return remaining[0]?.id ?? null;
}

export { getGuessStatusLabel, getGuessStatusRank, getGuessTimestamp, formatGuessDate, sortGuessItems, getLocalDayStartMs, getGuessTimeRange, matchesGuessStatusFilter, matchesGuessTimeFilter, filterGuessItems, getGuessPreview, selectGuessAfterRemoval };
