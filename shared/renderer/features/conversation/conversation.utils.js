

function getConversationTitle(item, fallback = "新对话") {
  return String(item?.title || item?.latest_question || "").trim() || fallback;
}

function formatConversationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export { getConversationTitle, formatConversationTime };
