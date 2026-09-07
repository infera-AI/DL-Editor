

const GUESS_VISIBLE_STATUSES = new Set(["pending", "confirmed", "corrected", "unsure"]);

const GUESS_PAGE_SIZE = 100;

const GUESS_LIST_PATH = "/memory/long-term/guesses";

const GUESS_ITEMS_PATH = "/memory/long-term/items";

const GUESS_REGISTRY_PATH = "/memory/long-term/registry";

const GUESS_STATUS_FILTERS = [
  { id: "all", label: "全部" },
  { id: "pending", label: "待反馈" },
  { id: "confirmed", label: "已确认" },
  { id: "unsure", label: "不确定" }
];

const GUESS_TIME_FILTERS = [
  { id: "all", label: "全部时间" },
  { id: "today", label: "今天" },
  { id: "7d", label: "近 7 天" },
  { id: "30d", label: "近 30 天" },
  { id: "custom", label: "自定义" }
];

const GUESS_VALUE_LABELS = {
  avoid: "避免",
  like: "喜欢",
  likes: "喜欢",
  prefer: "偏好",
  preferred: "偏好",
  dislike: "不喜欢",
  dislikes: "不喜欢",
  tolerate: "可以接受",
  neutral: "中立",
  hate: "很反感",
  seek: "主动接近",
  approach: "接近",
  concise: "简洁",
  balanced: "适中",
  detailed: "详细",
  adaptive: "按情况调整",
  direct: "直接",
  gentle: "委婉",
  ask_first: "先问清楚",
  best_effort: "尽量先答",
  daily: "每天",
  weekly: "每周",
  monthly: "每月",
  ad_hoc: "按需",
  active: "进行中",
  paused: "暂停",
  completed: "已完成",
  cancelled: "已取消",
  canceled: "已取消",
  dropped: "已放弃",
  distant: "疏远",
  ended: "已结束",
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
  employed: "在职",
  self_employed: "自由职业",
  student: "学生",
  unemployed: "待业",
  retired: "退休",
  onsite: "现场办公",
  remote: "远程",
  hybrid: "混合办公",
  office: "办公室",
  home: "家里",
  coworking: "共享办公",
  cafe: "咖啡馆",
  restaurant: "餐厅",
  work: "工作",
  study: "学习",
  family: "家庭",
  friend: "朋友",
  true: "是",
  false: "否"
};

const GUESS_ENUM_OPTIONS_BY_KEY = {
  "style.answer.detail_level": ["concise", "balanced", "detailed", "adaptive"],
  "style.report.detail_level": ["concise", "balanced", "detailed", "adaptive"],
  "style.answer.directness": ["direct", "balanced", "gentle"],
  "style.answer.question_clarification": ["ask_first", "best_effort", "adaptive"],
  "preference.schedule.planning_cadence": ["daily", "weekly", "monthly", "ad_hoc"],
  "goal_project.commitment.status": ["active", "paused", "completed", "cancelled"],
  "goal_project.project.status": ["active", "paused", "completed", "cancelled"],
  "goal_project.goal.priority": ["low", "medium", "high", "urgent"],
  "identity.occupation.employment_status": ["employed", "self_employed", "student", "unemployed", "retired"],
  "identity.occupation.work_mode": ["onsite", "remote", "hybrid"],
  "identity.location.workplace_type": ["office", "home", "coworking", "hybrid"],
  "relationship.person.status": ["active", "distant", "ended"]
};

const GUESS_TOKEN_FAMILIES = [
  ["like", "prefer", "neutral", "tolerate", "dislike", "avoid"],
  ["concise", "balanced", "detailed", "adaptive"],
  ["direct", "gentle"],
  ["ask_first", "best_effort"],
  ["daily", "weekly", "monthly", "ad_hoc"],
  ["active", "paused", "completed", "cancelled", "dropped"],
  ["low", "medium", "high", "urgent"],
  ["employed", "self_employed", "student", "unemployed", "retired"],
  ["onsite", "remote", "hybrid"],
  ["true", "false"]
];

export { GUESS_VISIBLE_STATUSES, GUESS_PAGE_SIZE, GUESS_LIST_PATH, GUESS_ITEMS_PATH, GUESS_REGISTRY_PATH, GUESS_STATUS_FILTERS, GUESS_TIME_FILTERS, GUESS_VALUE_LABELS, GUESS_ENUM_OPTIONS_BY_KEY, GUESS_TOKEN_FAMILIES };
