const assert = require("assert");

const { parseMacGpuUsageFromIoreg } = require("../src/main/gpuUsage.cjs");

const appleSiliconIoreg = `
+-o AGXAcceleratorG16G  <class AGXAcceleratorG16G, id 0x100000535, registered, matched, active, busy 0 (250 ms), retain 85>
    {
      "PerformanceStatistics" = {"In use system memory (driver)"=0,"Alloc system memory"=2809479168,"Tiler Utilization %"=4,"recoveryCount"=0,"Renderer Utilization %"=12,"Device Utilization %"=37.5,"In use system memory"=400457728}
      "model" = "Apple M4"
    }
`;

const parsed = parseMacGpuUsageFromIoreg(appleSiliconIoreg);

assert.equal(parsed.status, "ok");
assert.equal(parsed.total, 37.5);
assert.equal(parsed.threeD, 12);
assert.equal(parsed.compute, 4);
assert.equal(parsed.videoEncode, null);
assert.equal(parsed.rawTotal, 37.5);
assert.equal(parsed.source, "ioreg");

const empty = parseMacGpuUsageFromIoreg("no performance counters here");
assert.equal(empty.status, "unavailable");
assert.equal(empty.total, null);

console.log("GPU usage tests passed.");
