import { formatResearchDateTime, getResearchChatId, getResearchFeedbackMessages, normalizeResearchFeedbackRating } from "../research.utils.js";
import { ResearchFeedbackPreview } from "./ResearchFeedbackPreview.jsx";

function ResearchChatCard({ active, item, onSelect, onToggle, selected }) {
  const id = getResearchChatId(item);
  const feedback = getResearchFeedbackMessages(item.messages || []);
  const dislikeCount = feedback.filter((message) => normalizeResearchFeedbackRating(message.feedback_rating) === "dislike").length;

  function handleClick(event) {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      onToggle(id);
    } else {
      onSelect(id);
    }
  }

  return (
    <article className={`research-chat-card ${active ? "active" : ""} ${selected ? "selected" : ""}`} onClick={handleClick} onDoubleClick={() => onToggle(id)}>
      <input
        checked={selected}
        onChange={() => onToggle(id)}
        onClick={(event) => event.stopPropagation()}
        type="checkbox"
      />
      <div>
        <strong>{item.title || item.latest_question || item.session_code || `Session ${id}`}</strong>
        <span>{[`User ${item.user_id || "-"}`, `${item.message_count || 0} messages`, formatResearchDateTime(item.update_time || item.created_at_ms)].filter(Boolean).join(" · ")}</span>
        <p>{item.latest_question || item.latest_answer || ""}</p>
        <ResearchFeedbackPreview messages={item.messages || []} />
      </div>
      {feedback.length > 0 && (
        <span className={`research-feedback-badge ${dislikeCount ? "dislike" : "like"}`}>
          {dislikeCount ? `${dislikeCount} dislikes` : `${feedback.length} feedback`}
        </span>
      )}
    </article>
  );
}

export { ResearchChatCard };
