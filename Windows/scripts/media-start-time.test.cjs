const assert = require("assert");

const { deriveStartTimeMs, findMediaTimestampMs } = require("../src/main/mediaStartTime.cjs");

const endTimeMs = Date.parse("2026-06-26T08:30:00.000Z");
const metadataStartMs = Date.parse("2026-06-26T08:00:00.000Z");

assert.equal(
  findMediaTimestampMs({
    format: { tags: { creation_time: "2026-06-26T08:00:00.000000Z" } },
    streams: []
  }),
  metadataStartMs
);

assert.equal(
  findMediaTimestampMs({
    format: { tags: {} },
    streams: [{ tags: { creation_time: "2026-06-26T08:00:00.000000Z" } }]
  }),
  metadataStartMs
);

assert.equal(
  deriveStartTimeMs({
    mediaInfo: {
      duration: 1800,
      format: { tags: { creation_time: "2026-06-26T08:00:00.000000Z" } },
      streams: []
    },
    modifiedAtMs: endTimeMs
  }),
  metadataStartMs
);

assert.equal(
  deriveStartTimeMs({
    mediaInfo: {
      duration: 1800,
      format: { tags: {} },
      streams: []
    },
    modifiedAtMs: endTimeMs
  }),
  endTimeMs - 1800 * 1000
);

assert.equal(
  deriveStartTimeMs({
    mediaInfo: {
      duration: 0,
      format: { tags: {} },
      streams: []
    },
    modifiedAtMs: endTimeMs
  }),
  endTimeMs
);

console.log("Media start time tests passed.");
