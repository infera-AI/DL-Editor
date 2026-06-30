const assert = require("assert");

const { getDecoderArgs } = require("../src/main/decoderArgs.cjs");

assert.deepEqual(getDecoderArgs({ useGpuPath: false, videoFilters: "fps=2" }), []);
assert.deepEqual(getDecoderArgs({ useGpuPath: true, videoFilters: "fps=2" }), []);
assert.deepEqual(getDecoderArgs({ useGpuPath: true, videoFilters: "scale=1280:720" }), []);
assert.deepEqual(getDecoderArgs({ useGpuPath: true, videoFilters: "" }), ["-hwaccel", "auto"]);
assert.deepEqual(getDecoderArgs({ useGpuPath: true }), ["-hwaccel", "auto"]);

console.log("Decoder args tests passed.");
