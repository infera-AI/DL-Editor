

const AUTOMATION_STORAGE_KEY = "dl-studio-editor-automation";

const TRANSFER_QUEUE_STORAGE_KEY = "dl-studio-transfer-queue";

const WEB_VIDEO_UPLOAD_PATH = "/memory/assets/web-video/events";

const RAW_DATA_VIDEO_UPLOAD_PATH = "/memory/raw-data/videos";

const DELPHI_UPLOAD_MAX_BYTES = 2 * 1024 * 1024 * 1024;

const DELPHI_UPLOAD_FILE_NAME_PATTERN = /^\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}\.mp4$/i;

const DELPHI_UPLOAD_VALIDATION_MESSAGES = {
  size: "文件需小于 2GB，请压制后上传。如需上传备份视频，请使用右侧按钮添加。",
  name: "请检查是否为压制后视频，文件名需为 yyyy_mm_dd_hh_mm_ss.mp4"
};

const DEFAULT_AUTOMATION_OPTIONS = {
  autoUpload: true,
  autoBackup: true,
  autoClearLocal: true
};

const UPLOAD_STATUS_LABELS = {
  queued: "等待上传",
  uploading: "上传中",
  processing: "服务器处理中",
  done: "完成",
  error: "传输失败",
  upload_error: "上传失败",
  backup_error: "备份失败",
  canceled: "已取消",
  canceling: "取消中",
  paused: "已暂停"
};

export { AUTOMATION_STORAGE_KEY, TRANSFER_QUEUE_STORAGE_KEY, WEB_VIDEO_UPLOAD_PATH, RAW_DATA_VIDEO_UPLOAD_PATH, DELPHI_UPLOAD_MAX_BYTES, DELPHI_UPLOAD_FILE_NAME_PATTERN, DELPHI_UPLOAD_VALIDATION_MESSAGES, DEFAULT_AUTOMATION_OPTIONS, UPLOAD_STATUS_LABELS };
