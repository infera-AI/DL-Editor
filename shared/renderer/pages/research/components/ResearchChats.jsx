import { formatRepositoryDate } from "../../../utils/date.js";
import { ResearchFeedbackPreview } from "./ResearchFeedbackPreview.jsx";

function ResearchChats({ items, onExportFiltered, onExportSelected, onSelectLoaded, onToggle, selectedIds }) {
  const selected = new Set((selectedIds || []).map(String));
  return (
    <section className="research-panel">
      <div className="research-actions">
        <button className="ghost-button" onClick={onSelectLoaded} type="button">Select loaded chats</button>
        <button className="primary-button" onClick={onExportSelected} type="button">Export selected chats</button>
        <button className="ghost-button" onClick={onExportFiltered} type="button">Export filtered chats</button>
      </div>
      <div className="research-list">
        {items.length === 0 ? (
          <div className="repository-empty">No chats</div>
        ) : (
          items.map((item) => {
            const id = String(item.session_id || item.id);
            return (
              <article className="research-chat-row" key={id}>
                <input checked={selected.has(id)} onChange={() => onToggle(id)} type="checkbox" />
                <div>
                  <strong>{item.title || item.session_code || `Session ${id}`}</strong>
                  <span>{[`User ${item.user_id || "-"}`, `${item.message_count || 0} messages`, formatRepositoryDate(item.update_time)].filter(Boolean).join(" · ")}</span>
                  <p>{item.latest_question || item.latest_answer || ""}</p>
                  <ResearchFeedbackPreview messages={item.messages || []} />
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export { ResearchChats };
