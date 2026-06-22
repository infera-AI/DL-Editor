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

function readCounter(counters, ...names) {
  for (const name of names) {
    const value = counters.get(name.toLowerCase());
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function parsePerformanceStatistics(body) {
  const counters = new Map();
  const counterPattern = /"([^"]+)"\s*=\s*(-?\d+(?:\.\d+)?)/g;
  let match;

  while ((match = counterPattern.exec(body))) {
    counters.set(match[1].trim().toLowerCase(), Number(match[2]));
  }

  return counters;
}

function usageFromCounters(counters) {
  const renderer = readCounter(counters, "Renderer Utilization %", "3D Utilization %");
  const tiler = readCounter(counters, "Tiler Utilization %");
  const compute = readCounter(counters, "Compute Utilization %");
  const videoEncode = readCounter(counters, "Video Encode Utilization %", "VideoEncode Utilization %");
  const total =
    readCounter(counters, "Device Utilization %", "GPU Utilization %") ??
    Math.max(renderer ?? 0, tiler ?? 0, compute ?? 0, videoEncode ?? 0);

  if (!Number.isFinite(total)) {
    return null;
  }

  return {
    status: "ok",
    total: roundPercent(total),
    videoEncode: roundPercent(videoEncode),
    threeD: roundPercent(renderer),
    compute: roundPercent(compute ?? tiler),
    rawTotal: Math.round(total * 10) / 10,
    source: "ioreg"
  };
}

function parseMacGpuUsageFromIoreg(output) {
  const statisticsPattern = /"PerformanceStatistics"\s*=\s*\{([^}]*)\}/g;
  let match;
  let busiest = null;

  while ((match = statisticsPattern.exec(output))) {
    const usage = usageFromCounters(parsePerformanceStatistics(match[1]));
    if (!usage) {
      continue;
    }

    if (!busiest || Number(usage.total) > Number(busiest.total)) {
      busiest = usage;
    }
  }

  return busiest || emptyGpuUsage();
}

module.exports = {
  emptyGpuUsage,
  parseMacGpuUsageFromIoreg,
  roundPercent
};
