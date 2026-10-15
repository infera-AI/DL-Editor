import { getResearchChatId } from "../research.utils.js";
import { ResearchChatMessage } from "./ResearchChatMessage.jsx";
import { getResearchSessionAgent, researchActivityCards, researchCardsForMessage } from "../research-agents.mjs";
import { ResearchChatActivity } from "./ResearchChatActivity.jsx";
import { useState } from "react";

function ResearchChatDetail({ item, token }) {
  const [view, setView] = useState("messages");
  if (!item) {
    return (
      <aside className="research-detail chat-detail">
        <div className="research-empty compact">Select a chat session</div>
      </aside>
    );
  }

  const messages = Array.isArray(item.messages) ? item.messages : [];
  const chatId = item.session_code || getResearchChatId(item);
  const agent = getResearchSessionAgent(item);
  const tools = item.tool_invocations || item.toolInvocations || [];
  return (
    <aside className="research-detail chat-detail">
      <header>
        <div>
          <div className="research-chat-agent-line"><span className={`research-agent-badge ${agent.id}`}>{agent.name}</span><span>{agent.role} · {item.status || "Recorded"}</span></div>
          <h2>{item.title || item.latest_question || item.session_code || `Session ${getResearchChatId(item)}`}</h2>
          <p className="research-chat-id" title={String(chatId)}>Chat ID: {chatId}</p>
          <p>{[`User ${item.user_id || "-"}`, `${item.message_count || messages.length} messages`].join(" · ")}</p>
          <p>{[item.session_kind, item.query_mode && `Query: ${item.query_mode}`, item.source_type].filter(Boolean).join(" · ")}</p>
          <div className="research-chat-detail-tabs" aria-label="Chat detail view">
            <button aria-pressed={view === "messages"} onClick={() => setView("messages")} type="button">Conversation</button>
            <button aria-pressed={view === "activity"} onClick={() => setView("activity")} type="button">Activity ({tools.length + researchActivityCards(item).length})</button>
          </div>
        </div>
      </header>
      <div className="research-chat-messages">
        {view === "activity" ? <ResearchChatActivity item={item} /> : messages.length ? (
          messages.map((message) => <ResearchChatMessage cards={researchCardsForMessage(item.cards, message)} key={message.message_id || message.id || `${message.role}-${message.create_time}`} message={message} session={item} token={token} />)
        ) : (
          <div className="research-preview-empty">No messages</div>
        )}
      </div>
    </aside>
  );
}

export { ResearchChatDetail };
