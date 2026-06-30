function getDecoderArgs({ useGpuPath = false, videoFilters = "" } = {}) {
  if (!useGpuPath) {
    return [];
  }

  // Software fps/scale filters force frame copies after hw decode; keep decode on CPU in those cases.
  if (String(videoFilters || "").trim()) {
    return [];
  }

  return ["-hwaccel", "auto"];
}

module.exports = {
  getDecoderArgs
};
