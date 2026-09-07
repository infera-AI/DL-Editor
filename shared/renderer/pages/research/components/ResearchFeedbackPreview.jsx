import { getResearchFeedbackMessages, normalizeResearchFeedbackRating } from "../research.utils.js";

function ResearchFeedbackPreview({ messages }) {
  const feedback = getResearchFeedbackMessages(messages);
  if (!feedback.length) return null;
  return (
    <div className="research-feedback">
      {feedback.slice(0, 3).map((message) => (
        <span key={message.message_id || message.id}>
          {normalizeResearchFeedbackRating(message.feedback_rating) === "like" ? "Like" : "Dislike"}{message.feedback_text ? `: ${message.feedback_text}` : ""}
        </span>
      ))}
    </div>
  );
}

export { ResearchFeedbackPreview };
