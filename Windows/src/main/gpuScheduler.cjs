const GPU_ENCODERS = new Set(["h264_nvenc", "h264_qsv", "h264_amf", "h264_mf"]);

function isExtremeGpuMode(options, encoder) {
  return options?.processingDevice === "gpu" && GPU_ENCODERS.has(encoder);
}

function getCoreCount(capabilities = {}) {
  const cores = Number(capabilities.logicalCores);
  return Number.isFinite(cores) && cores > 0 ? Math.round(cores) : 1;
}

function getTotalFfmpegConcurrency(encoder, capabilities = {}) {
  if (encoder === "libx264") {
    return 1;
  }

  const cores = getCoreCount(capabilities);

  if (encoder === "h264_nvenc") {
    return Math.max(3, Math.min(8, Math.round(cores * 0.6)));
  }

  if (encoder === "h264_qsv" || encoder === "h264_amf") {
    return Math.max(2, Math.min(4, Math.round(cores * 0.4)));
  }

  if (encoder === "h264_mf") {
    return Math.max(2, Math.min(3, Math.floor(cores / 3) || 2));
  }

  return Math.max(2, Math.min(3, Math.floor(cores / 4) || 2));
}

function getVideoConcurrency(options, encoder, jobCount) {
  if (!isExtremeGpuMode(options, encoder)) {
    return 1;
  }

  const maxVideoConcurrency = encoder === "h264_mf" ? 1 : 2;
  return Math.max(1, Math.min(maxVideoConcurrency, Number(jobCount) || 1));
}

function getSegmentedJobConcurrency(encoder, capabilities = {}, options = {}) {
  if (encoder === "libx264") {
    return 1;
  }

  const totalConcurrency = getTotalFfmpegConcurrency(encoder, capabilities);
  const videoConcurrency = Math.max(1, Math.round(Number(options.videoConcurrency) || 1));

  return Math.max(2, Math.min(totalConcurrency, Math.floor(totalConcurrency / videoConcurrency) || 2));
}

function getFilterThreadCount(encoder, capabilities = {}, options = {}) {
  const cores = getCoreCount(capabilities);

  if (!GPU_ENCODERS.has(encoder)) {
    return Math.max(1, Math.min(cores, 8));
  }

  const activeWorkers = Math.max(1, Math.round(Number(options.activeWorkers) || 1));
  return Math.max(1, Math.min(2, Math.floor(cores / activeWorkers) || 1));
}

function getSegmentCount(duration, concurrency, encoder) {
  if (!Number.isFinite(duration) || duration < 60 || concurrency <= 1) {
    return 1;
  }

  const targetSegmentSeconds = encoder === "h264_nvenc" ? (duration >= 3600 ? 90 : 60) : duration >= 3600 ? 120 : 90;
  const minimumSegments = Math.max(2, concurrency);
  const maximumSegments = encoder === "h264_nvenc" ? 240 : 160;

  return Math.max(minimumSegments, Math.min(maximumSegments, Math.ceil(duration / targetSegmentSeconds)));
}

module.exports = {
  getFilterThreadCount,
  getSegmentCount,
  getSegmentedJobConcurrency,
  getTotalFfmpegConcurrency,
  getVideoConcurrency,
  isExtremeGpuMode
};
