

const RAW_DATA_LIST_PATH = "/memory/raw-data";

const CLOUD_REPOSITORY_PAGE_SIZE = 100;

const CLOUD_REPOSITORY_MAX_PAGES = 1000;

const CLOUD_REPOSITORY_DEFAULT_MEDIA_FILTER_ID = "all";

const CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID = "all_status";

const CLOUD_FILTERS = [
  { id: "all", label: "全部文件" },
  { id: "video", label: "视频" },
  { id: "audio", label: "音频" },
  { id: "all_status", label: "全部状态" },
  { id: "parsed", label: "已解析" },
  { id: "processing", label: "处理中" },
  { id: "failed", label: "解析失败" }
];

const CLOUD_VIEW_MODES = ["list", "grid"];

const CLOUD_SPACES = [
  { id: "repository", label: "DL Repository" },
  { id: "rawdata", label: "DL Rawdata" }
];

export { RAW_DATA_LIST_PATH, CLOUD_REPOSITORY_PAGE_SIZE, CLOUD_REPOSITORY_MAX_PAGES, CLOUD_REPOSITORY_DEFAULT_MEDIA_FILTER_ID, CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID, CLOUD_FILTERS, CLOUD_VIEW_MODES, CLOUD_SPACES };
