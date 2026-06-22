const assert = require("assert");

const {
  getFilterThreadCount,
  getSegmentCount,
  getSegmentedJobConcurrency,
  getTotalFfmpegConcurrency,
  getVideoConcurrency,
  isExtremeGpuMode
} = require("../src/main/gpuScheduler.cjs");

assert.equal(isExtremeGpuMode({ processingDevice: "gpu" }, "h264_nvenc"), true);
assert.equal(isExtremeGpuMode({ processingDevice: "gpu" }, "h264_qsv"), true);
assert.equal(isExtremeGpuMode({ processingDevice: "gpu" }, "h264_amf"), true);
assert.equal(isExtremeGpuMode({ processingDevice: "gpu" }, "h264_mf"), true);
assert.equal(isExtremeGpuMode({ processingDevice: "cpu" }, "h264_nvenc"), false);
assert.equal(isExtremeGpuMode({ processingDevice: "gpu" }, "libx264"), false);

assert.equal(getTotalFfmpegConcurrency("h264_nvenc", { logicalCores: 10 }), 6);
assert.equal(getTotalFfmpegConcurrency("h264_nvenc", { logicalCores: 16 }), 8);
assert.equal(getTotalFfmpegConcurrency("h264_qsv", { logicalCores: 10 }), 4);
assert.equal(getTotalFfmpegConcurrency("h264_amf", { logicalCores: 10 }), 4);
assert.equal(getTotalFfmpegConcurrency("h264_mf", { logicalCores: 10 }), 3);
assert.equal(getTotalFfmpegConcurrency("libx264", { logicalCores: 16 }), 1);

assert.equal(getVideoConcurrency({ processingDevice: "gpu" }, "h264_nvenc", 5), 2);
assert.equal(getVideoConcurrency({ processingDevice: "gpu" }, "h264_qsv", 5), 2);
assert.equal(getVideoConcurrency({ processingDevice: "gpu" }, "h264_amf", 5), 2);
assert.equal(getVideoConcurrency({ processingDevice: "gpu" }, "h264_mf", 5), 1);
assert.equal(getVideoConcurrency({ processingDevice: "cpu" }, "libx264", 5), 1);
assert.equal(getVideoConcurrency({ processingDevice: "gpu" }, "h264_nvenc", 1), 1);

assert.equal(getSegmentedJobConcurrency("h264_nvenc", { logicalCores: 10 }), 6);
assert.equal(getSegmentedJobConcurrency("h264_nvenc", { logicalCores: 10 }, { videoConcurrency: 2 }), 3);
assert.equal(getSegmentedJobConcurrency("h264_qsv", { logicalCores: 10 }, { videoConcurrency: 2 }), 2);
assert.equal(getSegmentedJobConcurrency("h264_amf", { logicalCores: 10 }, { videoConcurrency: 2 }), 2);
assert.equal(getSegmentedJobConcurrency("h264_mf", { logicalCores: 10 }, { videoConcurrency: 1 }), 3);
assert.equal(getSegmentedJobConcurrency("libx264", { logicalCores: 16 }), 1);

assert.equal(getFilterThreadCount("h264_nvenc", { logicalCores: 10 }, { activeWorkers: 6 }), 1);
assert.equal(getFilterThreadCount("h264_nvenc", { logicalCores: 10 }, { activeWorkers: 3 }), 2);
assert.equal(getFilterThreadCount("libx264", { logicalCores: 10 }, { activeWorkers: 1 }), 8);

assert.equal(getSegmentCount(59, 3, "h264_nvenc"), 1);
assert.equal(getSegmentCount(600, 3, "h264_nvenc"), 10);
assert.equal(getSegmentCount(7200, 3, "h264_nvenc"), 80);
assert.equal(getSegmentCount(600, 2, "h264_qsv"), 7);

console.log("GPU scheduler tests passed.");
