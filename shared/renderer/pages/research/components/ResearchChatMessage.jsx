import { EvidenceList } from "../../../features/evidence/EvidenceList.jsx";
import { formatResearchDateTime, normalizeResearchFeedbackRating } from "../research.utils.js";

function ResearchChatMessage({ message, token }) {
  const role = String(message.role || "message").toLowerCase();
  const feedbackRating = normalizeResearchFeedbackRating(message.feedback_rating);
  const evidenceCount = Array.isArray(message.evidences) ? message.evidences.length : 0;
  return (
    <div className={`research-chat-message-row ${role}`}>
      <article className={`research-chat-message ${role}`}>
        <p>{message.content || ""}</p>
        {evidenceCount > 0 && <EvidenceList evidences={message.evidences} token={token} />}
        {feedbackRating && (
          <div className={`research-chat-feedback ${feedbackRating}`}>
            <strong>Feedback: {feedbackRating === "like" ? "Like" : "Dislike"}</strong>
            {message.feedback_text && <span>{message.feedback_text}</span>}
            {message.feedback_at && <small>{formatResearchDateTime(message.feedback_at)}</small>}
          </div>
        )}
      </article>
      {message.create_time && <time className="research-chat-message-time" dateTime={message.create_time}>{formatResearchDateTime(message.create_time)}</time>}
    </div>
  );
}

export { ResearchChatMessage };
