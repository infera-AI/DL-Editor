

const FPS_PRESETS = [1, 2, 4, 5, 10];

const RESOLUTION_PRESETS = [
  { label: "1080p", width: 1920, height: 1080 },
  { label: "720p", width: 1280, height: 720 },
  { label: "480p", width: 854, height: 480 },
  { label: "360p", width: 640, height: 360 }
];

const STATUS_LABELS = {
  queued: "等待",
  processing: "处理中",
  done: "完成",
  error: "压制失败",
  canceled: "取消",
  paused: "暂停"
};

export { FPS_PRESETS, RESOLUTION_PRESETS, STATUS_LABELS };
