

function formatBytes(value, options = {}) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = Number.isFinite(Number(options.precision)) ? Number(options.precision) : size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function clampPercent(value) {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(value)));
}

function percentLabel(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }

  return `${Math.round(Number(value) * 10) / 10}%`;
}

function formatDurationCompact(value, referenceValue = value) {
  if (!Number.isFinite(Number(value)) || Number(value) < 0) {
    return null;
  }

  const totalMs = Math.max(0, Math.round(Number(value)));
  const totalSeconds = Math.round(totalMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const referenceMs = Math.max(0, Math.round(Number(referenceValue) || totalMs));
  const referenceSeconds = Math.floor(referenceMs / 1000);
  const showHours = referenceSeconds >= 3600 || hours > 0;

  if (showHours) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${totalMinutes}:${String(seconds).padStart(2, "0")}`;
}

export { formatBytes, clampPercent, percentLabel, formatDurationCompact };
