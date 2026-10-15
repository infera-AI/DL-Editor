import { EvidenceList } from "../../../features/evidence/EvidenceList.jsx";
import { formatResearchDateTime, normalizeResearchFeedbackRating } from "../research.utils.js";
import { getResearchMessageAgent, getResearchSessionAgent, isResearchTaskCandidateCard, researchMessageContent } from "../research-agents.mjs";
import { ResearchReadonlyCard } from "./ResearchChatActivity.jsx";

function ResearchChatMessage({ message, session, cards = [], token, onCardAction, cardActionDisabled }) {
  const role = String(message.role || "message").toLowerCase();
  const feedbackRating = normalizeResearchFeedbackRating(message.feedback_rating);
  const evidenceCount = Array.isArray(message.evidences) ? message.evidences.length : 0;
  const agent = getResearchMessageAgent(message, session);
  const owner = getResearchSessionAgent(session);
  const timestamp = message.occurred_at || message.occurredAt || message.create_time || message.createTime;
  const content = researchMessageContent(message, cards);
  const conversationCards = cards.filter((card) => !isResearchTaskCandidateCard(card));
  if (!content.trim() && conversationCards.length === 0 && evidenceCount === 0 && !feedbackRating && !message.processing_error) return null;
  return (
    <div className={`research-chat-message-row ${role}`}>
      <div className="research-chat-speaker">{role === "assistant" ? <><span className={`research-agent-badge ${agent.id}`}>{agent.name}</span>{owner.id !== agent.id && <span>由 {owner.name} 转交</span>}</> : role === "user" ? "User" : "System"}{message.processing_status && <span>{message.processing_status}</span>}</div>
      <article className={`research-chat-message ${role}`}>
        {content && <p>{content}</p>}
        {conversationCards.map((card, index) => <div key={card.card_id || card.cardId || index}>
          <ResearchReadonlyCard card={card} />
          {onCardAction && <div className="research-simulation-card-actions">{(card.available_actions || card.availableActions || []).filter((action) => ["ACCEPT", "DECLINE", "CONFIRM", "CANCEL"].includes(action)).map((action) => <button className={action === "ACCEPT" || action === "CONFIRM" ? "primary-button" : "ghost-button"} disabled={cardActionDisabled} key={action} onClick={() => onCardAction(card, action)} type="button">{{ ACCEPT: "好的，转交", DECLINE: "不用，你来答", CONFIRM: "确认操作", CANCEL: "取消操作" }[action]}</button>)}</div>}
        </div>)}
        {message.processing_error && <p className="research-operation-error">{message.processing_error}</p>}
        {evidenceCount > 0 && <EvidenceList evidences={message.evidences} token={token} />}
        {feedbackRating && (
          <div className={`research-chat-feedback ${feedbackRating}`}>
            <strong>Feedback: {feedbackRating === "like" ? "Like" : "Dislike"}</strong>
            {message.feedback_text && <span>{message.feedback_text}</span>}
            {message.feedback_at && <small>{formatResearchDateTime(message.feedback_at)}</small>}
          </div>
        )}
      </article>
      {timestamp && <time className="research-chat-message-time" dateTime={timestamp}>{formatResearchDateTime(timestamp)}</time>}
    </div>
  );
}

export { ResearchChatMessage };
