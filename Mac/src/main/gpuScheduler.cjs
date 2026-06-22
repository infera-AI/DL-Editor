function isExtremeGpuMode(options, encoder) {
  return options?.processingDevice === "gpu" && encoder === "h264_videotoolbox";
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

  if (encoder === "h264_videotoolbox") {
    const minimumWorkers = cores >= 4 ? 4 : Math.max(2, cores);
    return Math.max(minimumWorkers, Math.min(8, Math.round(cores * 0.75)));
  }

  if (encoder === "h264_nvenc") {
    return 3;
  }

  return Math.max(2, Math.min(3, Math.floor(cores / 4) || 2));
}

function getSegmentedJobConcurrency(encoder, capabilities = {}, options = {}) {
  if (encoder === "libx264") {
    return 1;
  }

  if (encoder !== "h264_videotoolbox") {
    return getTotalFfmpegConcurrency(encoder, capabilities);
  }

  const totalConcurrency = getTotalFfmpegConcurrency(encoder, capabilities);
  const videoConcurrency = Math.max(1, Math.round(Number(options.videoConcurrency) || 1));

  return Math.max(2, Math.min(totalConcurrency, Math.ceil(totalConcurrency / videoConcurrency)));
}

function getVideoConcurrency(options, encoder, jobCount) {
  if (!isExtremeGpuMode(options, encoder)) {
    return 1;
  }

  return Math.max(1, Math.min(2, Number(jobCount) || 1));
}

function getFilterThreadCount(encoder, capabilities = {}, options = {}) {
  const cores = getCoreCount(capabilities);

  if (encoder !== "h264_videotoolbox") {
    return Math.max(1, Math.min(cores, 8));
  }

  const activeWorkers = Math.max(1, Math.round(Number(options.activeWorkers) || 1));
  return Math.max(1, Math.min(2, Math.floor(cores / activeWorkers) || 1));
}

function getSegmentCount(duration, concurrency, encoder) {
  if (!Number.isFinite(duration) || duration < 60 || concurrency <= 1) {
    return 1;
  }

  const targetSegmentSeconds = encoder === "h264_videotoolbox" ? (duration >= 3600 ? 90 : 60) : duration >= 3600 ? 240 : 180;
  const minimumSegments = Math.max(2, concurrency);
  const maximumSegments = encoder === "h264_videotoolbox" ? 240 : 96;

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
