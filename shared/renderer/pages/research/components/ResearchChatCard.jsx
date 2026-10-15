import { formatResearchDateTime, getResearchChatId, getResearchFeedbackMessages, normalizeResearchFeedbackRating } from "../research.utils.js";
import { ResearchFeedbackPreview } from "./ResearchFeedbackPreview.jsx";
import { getResearchSessionAgent, getResearchMessageAgent } from "../research-agents.mjs";

function ResearchChatCard({ active, item, onSelect, onToggle, selected }) {
  const id = getResearchChatId(item);
  const agent = getResearchSessionAgent(item);
  const guests = [...new Set((item.messages || []).filter((message) => message.role === "assistant").map((message) => getResearchMessageAgent(message, item).id))].filter((id) => id !== agent.id);
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
    <article aria-label={item.title || item.session_code || `Session ${id}`} className={`research-chat-card ${active ? "active" : ""} ${selected ? "selected" : ""}`} onClick={handleClick} onDoubleClick={() => onToggle(id)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(id); } }} tabIndex={0}>
      <input
        aria-label={`Select ${item.title || item.session_code || id}`}
        checked={selected}
        onChange={() => onToggle(id)}
        onClick={(event) => event.stopPropagation()}
        type="checkbox"
      />
      <div>
        <div className="research-chat-agent-line"><span className={`research-agent-badge ${agent.id}`}>{agent.name}</span><span>{agent.role}</span>{guests.length > 0 && <span>转交 · {guests.map((id) => id[0].toUpperCase() + id.slice(1)).join(", ")}</span>}</div>
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
