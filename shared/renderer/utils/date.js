

function parseLocalDateBoundary(dateKey, endOfDay = false) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return NaN;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
  return date.getTime();
}

function getLocalDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function shiftLocalDateKey(dateKey, offsetDays) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return getLocalDateKey();
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + offsetDays);
  return getLocalDateKey(date);
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

function parseTimestampFromFileName(value) {
  const name = String(value || "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop();
  if (!name) return "";

  const dateTimeMatch = name.match(/(20\d{2})[-_.]?([01]\d)[-_.]?([0-3]\d)[^\d]?([0-2]\d)[-_.:]?([0-5]\d)[-_.:]?([0-5]\d)/);
  if (dateTimeMatch) {
    return buildLocalTimestamp(dateTimeMatch.slice(1, 7).map(Number));
  }

  const dateMatch = name.match(/(20\d{2})[-_.]?([01]\d)[-_.]?([0-3]\d)/);
  if (dateMatch) {
    return buildLocalTimestamp([...dateMatch.slice(1, 4).map(Number), 0, 0, 0]);
  }

  return "";
}

function buildLocalTimestamp([year, month, day, hour, minute, second]) {
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return "";
  }

  return date.getTime();
}

function formatRepositoryDate(value) {
  if (!value) return "";
  const timestamp = typeof value === "number" || /^\d+$/.test(String(value)) ? Number(value) : Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  return formatDateTime(timestamp);
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function normalizeTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
}

function getDateParts(timestamp) {
  const date = new Date(normalizeTimestamp(timestamp));
  return {
    year: String(date.getFullYear()),
    month: padDatePart(date.getMonth() + 1),
    day: padDatePart(date.getDate()),
    hour: padDatePart(date.getHours()),
    minute: padDatePart(date.getMinutes()),
    second: padDatePart(date.getSeconds())
  };
}

function formatDateTime(timestamp) {
  const parts = getDateParts(timestamp);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function parseDateTimeParts(parts) {
  const [year, month, day, hour, minute, second] = parts.map((part) => Number(part));
  const date = new Date(year, month - 1, day, hour, minute, second, 0);

  if (
    !parts.every((part) => /^\d+$/.test(String(part))) ||
    year < 1970 ||
    year > 2099 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return NaN;
  }

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return NaN;
  }

  return Number.isFinite(date.getTime()) ? date.getTime() : NaN;
}

function parseCompactDateTime(value) {
  const text = String(value ?? "");
  const matches = text.matchAll(/(?:19|20)\d{12}/g);

  for (const match of matches) {
    const compact = match[0];
    const timestamp = parseDateTimeParts([
      compact.slice(0, 4),
      compact.slice(4, 6),
      compact.slice(6, 8),
      compact.slice(8, 10),
      compact.slice(10, 12),
      compact.slice(12, 14)
    ]);

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return NaN;
}

function parseYmd(value) {
  const text = String(value ?? "");
  if (!/^(?:19|20)\d{6}$/.test(text)) return null;
  return [text.slice(0, 4), text.slice(4, 6), text.slice(6, 8)];
}

function parseHms(value) {
  const text = String(value ?? "");
  if (!/^\d{6}$/.test(text)) return null;
  return [text.slice(0, 2), text.slice(2, 4), text.slice(4, 6)];
}

function parseDateTimeFromGroups(groups, index) {
  const current = groups[index]?.value || "";
  const compactTimestamp = parseCompactDateTime(current);
  if (Number.isFinite(compactTimestamp)) return compactTimestamp;

  const ymd = parseYmd(current);
  const next = groups[index + 1]?.value;
  const nextHms = parseHms(next);
  if (ymd && nextHms) return parseDateTimeParts([...ymd, ...nextHms]);

  if (ymd && groups[index + 1] && groups[index + 2] && groups[index + 3]) {
    return parseDateTimeParts([ymd[0], ymd[1], ymd[2], groups[index + 1].value, groups[index + 2].value, groups[index + 3].value]);
  }

  if (/^(?:19|20)\d{2}$/.test(current) && groups[index + 1] && groups[index + 2] && groups[index + 3]) {
    const hms = parseHms(groups[index + 3].value);
    if (hms) {
      return parseDateTimeParts([current, groups[index + 1].value, groups[index + 2].value, ...hms]);
    }
  }

  if (/^(?:19|20)\d{2}$/.test(current) && groups[index + 1] && groups[index + 2] && groups[index + 3] && groups[index + 4] && groups[index + 5]) {
    return parseDateTimeParts([
      current,
      groups[index + 1].value,
      groups[index + 2].value,
      groups[index + 3].value,
      groups[index + 4].value,
      groups[index + 5].value
    ]);
  }

  return NaN;
}

function parseDateTimeFromText(value) {
  const text = String(value ?? "").trim();
  if (!text) return NaN;

  const groups = [];
  const digitPattern = /\d+/g;
  let match;

  while ((match = digitPattern.exec(text))) {
    groups.push({ value: match[0], index: match.index });
  }

  for (let index = 0; index < groups.length; index += 1) {
    const timestamp = parseDateTimeFromGroups(groups, index);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return NaN;
}

export { parseLocalDateBoundary, getLocalDateKey, shiftLocalDateKey, formatTimestampFileName, parseTimestampFromFileName, buildLocalTimestamp, formatRepositoryDate, padDatePart, normalizeTimestamp, getDateParts, formatDateTime, parseDateTimeParts, parseCompactDateTime, parseYmd, parseHms, parseDateTimeFromGroups, parseDateTimeFromText };
