function getOutputStreamArgs({ videoOnly = false } = {}) {
  if (videoOnly) {
    return ["-map", "0:v:0"];
  }

  return ["-map", "0:v:0", "-map", "0:a?", "-c:a", "aac", "-b:a", "160k"];
}

function getMuxOriginalAudioArgs({ videoPath, sourcePath, outputPath, audioMode = "copy" }) {
  const audioArgs = audioMode === "aac" ? ["-c:a", "aac", "-b:a", "160k"] : ["-c:a", "copy"];

  return [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    videoPath,
    "-i",
    sourcePath,
    "-map",
    "0:v:0",
    "-map",
    "1:a?",
    "-c:v",
    "copy",
    ...audioArgs,
    "-shortest",
    "-movflags",
    "+faststart",
    outputPath
  ];
}

module.exports = {
  getMuxOriginalAudioArgs,
  getOutputStreamArgs
};
