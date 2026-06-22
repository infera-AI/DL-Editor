const assert = require("assert");

const { getMuxOriginalAudioArgs, getOutputStreamArgs } = require("../src/main/ffmpegArgs.cjs");

const videoOnlyArgs = getOutputStreamArgs({ videoOnly: true });
assert.deepEqual(videoOnlyArgs, ["-map", "0:v:0"]);
assert.equal(videoOnlyArgs.includes("-c:a"), false);

const normalArgs = getOutputStreamArgs({ videoOnly: false });
assert.deepEqual(normalArgs, ["-map", "0:v:0", "-map", "0:a?", "-c:a", "aac", "-b:a", "160k"]);

const muxArgs = getMuxOriginalAudioArgs({
  videoPath: "video.mp4",
  sourcePath: "source.mov",
  outputPath: "final.mp4"
});
assert.deepEqual(muxArgs, [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  "video.mp4",
  "-i",
  "source.mov",
  "-map",
  "0:v:0",
  "-map",
  "1:a?",
  "-c:v",
  "copy",
  "-c:a",
  "copy",
  "-shortest",
  "-movflags",
  "+faststart",
  "final.mp4"
]);

const fallbackMuxArgs = getMuxOriginalAudioArgs({
  videoPath: "video.mp4",
  sourcePath: "source.mov",
  outputPath: "final.mp4",
  audioMode: "aac"
});
assert.deepEqual(fallbackMuxArgs, [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  "video.mp4",
  "-i",
  "source.mov",
  "-map",
  "0:v:0",
  "-map",
  "1:a?",
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "160k",
  "-shortest",
  "-movflags",
  "+faststart",
  "final.mp4"
]);

console.log("FFmpeg args tests passed.");
