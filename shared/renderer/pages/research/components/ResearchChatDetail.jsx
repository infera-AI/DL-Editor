import { getResearchChatId } from "../research.utils.js";
import { ResearchChatMessage } from "./ResearchChatMessage.jsx";

function ResearchChatDetail({ item, token }) {
  if (!item) {
    return (
      <aside className="research-detail chat-detail">
        <div className="research-empty compact">Select a chat session</div>
      </aside>
    );
  }

  const messages = Array.isArray(item.messages) ? item.messages : [];
  const chatId = item.session_code || getResearchChatId(item);
  return (
    <aside className="research-detail chat-detail">
      <header>
        <div>
          <h2>{item.title || item.latest_question || item.session_code || `Session ${getResearchChatId(item)}`}</h2>
          <p className="research-chat-id" title={String(chatId)}>Chat ID: {chatId}</p>
          <p>{[`User ${item.user_id || "-"}`, `${item.message_count || messages.length} messages`].join(" · ")}</p>
        </div>
      </header>
      <div className="research-chat-messages">
        {messages.length ? (
          messages.map((message) => <ResearchChatMessage key={message.message_id || message.id || `${message.role}-${message.create_time}`} message={message} token={token} />)
        ) : (
          <div className="research-preview-empty">No messages</div>
        )}
      </div>
    </aside>
  );
}

export { ResearchChatDetail };
