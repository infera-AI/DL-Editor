const assert = require("assert");

const { buildVideoFilters, parseFrameRate } = require("../src/main/videoFilters.cjs");

assert.equal(Math.round(parseFrameRate("30000/1001") * 1000) / 1000, 29.97);
assert.equal(parseFrameRate("0/0"), null);
assert.equal(parseFrameRate("bad"), null);

assert.equal(
  buildVideoFilters(
    { fps: 30, width: 1280, height: 720, resolutionMode: "target" },
    { width: 640, height: 360, avgFrameRate: "30000/1001" }
  ),
  ""
);

assert.equal(
  buildVideoFilters(
    { fps: 2, width: 1280, height: 720, resolutionMode: "target" },
    { width: 3840, height: 2160, avgFrameRate: "60/1" }
  ),
  "fps=2,scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2:flags=fast_bilinear"
);

assert.equal(
  buildVideoFilters(
    { fps: 30, width: 1280, height: 720, resolutionMode: "target" },
    { width: 1920, height: 1080, avgFrameRate: "24/1" }
  ),
  "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2:flags=fast_bilinear"
);

assert.equal(
  buildVideoFilters(
    { fps: 5, width: 1280, height: 720, resolutionMode: "target" },
    {}
  ),
  "fps=5,scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2:flags=fast_bilinear"
);

assert.equal(
  buildVideoFilters(
    { fps: 2, width: 1280, height: 720, resolutionMode: "source" },
    { width: 3840, height: 2160, avgFrameRate: "60/1" }
  ),
  "fps=2"
);

console.log("Video filter tests passed.");
