import { resolveConversationEvidenceUrl } from "../evidence/evidence.api.js";
import { EvidenceList } from "../evidence/EvidenceList.jsx";
import { Sparkles } from "lucide-react";

function ConversationStreamTurn({ status, token, turn }) {
  const evidences = turn.evidences.length > 0 ? turn.evidences : turn.candidateEvidences;
  return (
    <>
      <div className="conversation-message-row user pending">
        <article className="conversation-message user"><div><p>{turn.question}</p></div></article>
      </div>
      <div className="conversation-message-row assistant pending">
        <article className={`conversation-message assistant ${turn.error ? "error" : "streaming"}`}>
          <Sparkles size={15} />
          <div>
            <p>{turn.answer || (turn.error ? turn.error : status || "正在处理...")}</p>
            {evidences.length > 0 && <EvidenceList evidences={evidences} resolveUrl={resolveConversationEvidenceUrl} token={token} />}
            {turn.error && turn.answer && <span className="conversation-message-error">{turn.error}</span>}
          </div>
        </article>
      </div>
    </>
  );
}

export { ConversationStreamTurn };
