const assert = require("assert");

const {
  getFilterThreadCount,
  getSegmentCount,
  getSegmentedJobConcurrency,
  getTotalFfmpegConcurrency,
  getVideoConcurrency,
  isExtremeGpuMode
} = require("../src/main/gpuScheduler.cjs");

assert.equal(isExtremeGpuMode({ processingDevice: "gpu" }, "h264_videotoolbox"), true);
assert.equal(isExtremeGpuMode({ processingDevice: "cpu" }, "h264_videotoolbox"), false);
assert.equal(isExtremeGpuMode({ processingDevice: "gpu" }, "libx264"), false);

assert.equal(getTotalFfmpegConcurrency("h264_videotoolbox", { logicalCores: 10 }), 8);
assert.equal(getTotalFfmpegConcurrency("h264_videotoolbox", { logicalCores: 4 }), 4);
assert.equal(getTotalFfmpegConcurrency("h264_videotoolbox", { logicalCores: 16 }), 8);
assert.equal(getTotalFfmpegConcurrency("libx264", { logicalCores: 16 }), 1);

assert.equal(getSegmentedJobConcurrency("h264_videotoolbox", { logicalCores: 10 }), 8);
assert.equal(getSegmentedJobConcurrency("h264_videotoolbox", { logicalCores: 10 }, { videoConcurrency: 2 }), 4);
assert.equal(getSegmentedJobConcurrency("h264_videotoolbox", { logicalCores: 4 }, { videoConcurrency: 2 }), 2);
assert.equal(getSegmentedJobConcurrency("libx264", { logicalCores: 16 }), 1);

assert.equal(getVideoConcurrency({ processingDevice: "gpu" }, "h264_videotoolbox", 5), 2);
assert.equal(getVideoConcurrency({ processingDevice: "cpu" }, "libx264", 5), 1);
assert.equal(getVideoConcurrency({ processingDevice: "gpu" }, "h264_videotoolbox", 1), 1);

assert.equal(getFilterThreadCount("h264_videotoolbox", { logicalCores: 10 }, { activeWorkers: 8 }), 1);
assert.equal(getFilterThreadCount("h264_videotoolbox", { logicalCores: 10 }, { activeWorkers: 4 }), 2);
assert.equal(getFilterThreadCount("libx264", { logicalCores: 10 }, { activeWorkers: 1 }), 8);

assert.equal(getSegmentCount(59, 4, "h264_videotoolbox"), 1);
assert.equal(getSegmentCount(600, 4, "h264_videotoolbox"), 10);
assert.equal(getSegmentCount(7200, 4, "h264_videotoolbox"), 80);

console.log("GPU scheduler tests passed.");
