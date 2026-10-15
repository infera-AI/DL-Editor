export const RESEARCH_AGENTS = [
  { id: "laura", mode: "chat", name: "Laura", role: "总助手", description: "日常问答与转交" },
  { id: "dario", mode: "task", name: "Dario", role: "任务管家", description: "任务操作与确认" },
  { id: "jane", mode: "retrieval", name: "Jane", role: "记忆检索", description: "回答与来源证据" },
  { id: "bella", mode: "companion", name: "Bella", role: "情绪陪伴", description: "陪伴与状态回应" },
  { id: "legacy", mode: "legacy", name: "Legacy / Unknown", role: "历史或未标记", description: "未记录四个 agent 的归属" }
];

export function researchMetadata(item) {
  const value = item?.reserved_json ?? item?.reserved;
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

export function getResearchAgent(id) {
  return RESEARCH_AGENTS.find((agent) => agent.id === id) || RESEARCH_AGENTS[4];
}

export function getResearchSessionAgent(item) {
  const explicit = item?.assistant_kind ?? item?.assistantKind;
  if (RESEARCH_AGENTS.some((agent) => agent.id === explicit)) return getResearchAgent(explicit);
  const meta = researchMetadata(item);
  const mode = String(item?.conversation_mode ?? meta.conversationMode ?? meta.conversation_mode ?? "legacy").trim().toLowerCase();
  return RESEARCH_AGENTS.find((agent) => agent.mode === (mode === "memory" ? "retrieval" : mode)) || getResearchAgent("legacy");
}

export function getResearchMessageAgent(message, session) {
  const id = message?.answered_by ?? message?.answeredBy ?? researchMetadata(message).answered_by;
  return RESEARCH_AGENTS.some((agent) => agent.id === id) ? getResearchAgent(id) : getResearchSessionAgent(session);
}

const cardTypeKey = (value) => String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
const CARD_LABELS = {
  taskcandidatecard: "候选任务",
  agenthandoffcard: "转交请求",
  taskoperationconfirmcard: "任务操作确认",
  taskcard: "任务",
  traveltaskcard: "出行任务",
  clarificationcard: "补充信息",
  objectlocationcard: "物品位置",
  proactiveinterventioncard: "主动提醒",
  companionsummarycard: "陪伴总结"
};

export function isResearchTaskCandidateCard(card) {
  return [card?.card_type ?? card?.cardType, card?.object_type ?? card?.objectType]
    .some((value) => ["taskcandidate", "taskcandidatecard"].includes(cardTypeKey(value)));
}

export function researchCardLabel(card) {
  return isResearchTaskCandidateCard(card) ? "候选任务" : CARD_LABELS[cardTypeKey(card?.card_type ?? card?.cardType)] || "对话卡片";
}

export function researchCardsForMessage(cards, message) {
  const ids = [message?.public_message_id, message?.publicMessageId, message?.messageId, message?.message_id, message?.id].filter((id) => id != null).map(String);
  const payloadCardId = message?.payload?.cardId ?? message?.payload?.card_id;
  const attached = (cards || []).filter((card) => {
    const id = card.message_id ?? card.messageId;
    return (id != null && ids.includes(String(id))) || (payloadCardId != null && String(card.card_id ?? card.cardId) === String(payloadCardId));
  });
  if (attached.length) return attached;
  // Older Research responses only contain the projection message, without its card snapshot.
  const type = String(message?.content || "").trim();
  const role = String(message?.role || "").toLowerCase();
  const kind = String(message?.content_kind ?? message?.contentKind ?? "").toUpperCase();
  const source = message?.source_type ?? message?.sourceType;
  if (role !== "user" && CARD_LABELS[type.toLowerCase()] && (role === "system" || kind === "CARD" || source === "conversation_projection")) {
    return [{ card_id: `record-${ids[0] || `${type}-${message?.create_time || message?.createTime || ""}`}`, message_id: ids[0], card_type: type, state: "Recorded", recorded_message: message }];
  }
  return [];
}

export function researchMessageContent(message, cards = []) {
  const content = String(message?.content || "");
  if (String(message?.role || "").toLowerCase() === "user") return content;
  if (String(message?.content_kind ?? message?.contentKind ?? "").toUpperCase() === "CARD") return "";
  return cards.some((card) => String(card.card_type ?? card.cardType ?? "").trim() === content.trim()) ? "" : content;
}

export function researchActivityCards(item) {
  const cards = item?.cards || [];
  return [...cards, ...(item?.messages || []).flatMap((message) => researchCardsForMessage(cards, message).filter((card) => card.recorded_message))];
}

export function researchCardSnapshot(card) {
  return card?.snapshot && typeof card.snapshot === "object" ? card.snapshot : {};
}
