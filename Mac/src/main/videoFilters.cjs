function parseFrameRate(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const text = value.trim();
  const ratio = text.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);

  if (ratio) {
    const numerator = Number(ratio[1]);
    const denominator = Number(ratio[2]);

    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0 || numerator <= 0) {
      return null;
    }

    return numerator / denominator;
  }

  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function getSourceFrameRate(mediaInfo = {}) {
  return parseFrameRate(mediaInfo.avgFrameRate) ?? parseFrameRate(mediaInfo.rFrameRate);
}

function shouldApplyFps(options, mediaInfo = {}) {
  const targetFps = Number(options?.fps);

  if (!Number.isFinite(targetFps) || targetFps <= 0) {
    return false;
  }

  const sourceFps = getSourceFrameRate(mediaInfo);
  return !sourceFps || sourceFps > targetFps + 0.01;
}

function shouldApplyScale(options, mediaInfo = {}) {
  if (options?.resolutionMode === "source") {
    return false;
  }

  const targetWidth = Number(options?.width);
  const targetHeight = Number(options?.height);

  if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight) || targetWidth <= 0 || targetHeight <= 0) {
    return false;
  }

  const sourceWidth = Number(mediaInfo.width);
  const sourceHeight = Number(mediaInfo.height);

  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
    return true;
  }

  return sourceWidth > targetWidth || sourceHeight > targetHeight;
}

function buildVideoFilters(options, mediaInfo = {}) {
  const filters = [];

  if (shouldApplyFps(options, mediaInfo)) {
    filters.push(`fps=${options.fps}`);
  }

  if (shouldApplyScale(options, mediaInfo)) {
    filters.push(
      `scale=w='min(${options.width},iw)':h='min(${options.height},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2:flags=fast_bilinear`
    );
  }

  return filters.join(",");
}

module.exports = {
  buildVideoFilters,
  parseFrameRate,
  shouldApplyFps,
  shouldApplyScale
};
