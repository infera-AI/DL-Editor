import { resolveConversationEvidenceUrl } from "../evidence/evidence.api.js";
import { EvidenceList } from "../evidence/EvidenceList.jsx";
import { formatConversationTime } from "./conversation.utils.js";
import { Sparkles } from "lucide-react";

function ConversationMessage({ message, token }) {
  const role = String(message?.role || "assistant").toLowerCase();
  const evidences = Array.isArray(message?.evidences) ? message.evidences : [];
  return (
    <div className={`conversation-message-row ${role}`}>
      <article className={`conversation-message ${role}`}>
        {role !== "user" && <Sparkles size={15} />}
        <div>
          <p>{message?.content || ""}</p>
          {evidences.length > 0 && <EvidenceList evidences={evidences} resolveUrl={resolveConversationEvidenceUrl} token={token} />}
          {message?.processing_status === "FAILED" && message?.processing_error && (
            <span className="conversation-message-error">{message.processing_error}</span>
          )}
        </div>
      </article>
      {message?.create_time && <time dateTime={message.create_time}>{formatConversationTime(message.create_time)}</time>}
    </div>
  );
}

export { ConversationMessage };
