const TIMESTAMP_TAG_PRIORITY = [
  "com.apple.quicktime.creationdate",
  "creation_time",
  "date",
  "encoded_date",
  "tagged_date"
];

function normalizeTimestampMs(value, fallback = Date.now()) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : fallback;
}

function parseMediaTimestampMs(value) {
  if (value == null) return NaN;

  const text = String(value).trim().replace(/^UTC\s+/i, "");
  if (!text) return NaN;

  const match = text.match(
    /(\d{4})[-:](\d{2})[-:](\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:\s*(Z|[+-]\d{2}:?\d{2}))?/i
  );

  if (match) {
    const [, yearText, monthText, dayText, hourText, minuteText, secondText, zoneText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);

    if (zoneText) {
      const zone = zoneText.toUpperCase() === "Z" ? "Z" : zoneText.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
      const timestamp = Date.parse(`${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}${zone}`);
      return Number.isFinite(timestamp) ? timestamp : NaN;
    }

    const date = new Date(year, month - 1, day, hour, minute, second, 0);
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

  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : NaN;
}

function findTagValue(tags, targetName) {
  if (!tags || typeof tags !== "object") return null;

  const target = targetName.toLowerCase();
  for (const [key, value] of Object.entries(tags)) {
    if (String(key).toLowerCase() === target) {
      return value;
    }
  }

  return null;
}

function getTagGroups(mediaInfo) {
  const groups = [];
  if (mediaInfo?.format?.tags) {
    groups.push(mediaInfo.format.tags);
  }

  if (Array.isArray(mediaInfo?.streams)) {
    for (const stream of mediaInfo.streams) {
      if (stream?.tags) {
        groups.push(stream.tags);
      }
    }
  }

  return groups;
}

function findMediaTimestampMs(mediaInfo) {
  for (const tags of getTagGroups(mediaInfo)) {
    for (const tagName of TIMESTAMP_TAG_PRIORITY) {
      const timestamp = parseMediaTimestampMs(findTagValue(tags, tagName));
      if (Number.isFinite(timestamp)) {
        return timestamp;
      }
    }
  }

  return NaN;
}

function deriveStartTimeMs({ mediaInfo, modifiedAtMs }) {
  const mediaTimestampMs = findMediaTimestampMs(mediaInfo);
  if (Number.isFinite(mediaTimestampMs)) {
    return mediaTimestampMs;
  }

  const fallbackTimestampMs = normalizeTimestampMs(modifiedAtMs);
  const durationSeconds = Number(mediaInfo?.duration);
  if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return Math.max(0, fallbackTimestampMs - durationSeconds * 1000);
  }

  return fallbackTimestampMs;
}

module.exports = {
  deriveStartTimeMs,
  findMediaTimestampMs,
  parseMediaTimestampMs
};
