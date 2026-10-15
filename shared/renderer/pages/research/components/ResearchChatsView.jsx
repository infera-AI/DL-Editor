import { RESEARCH_PAGE_SIZE } from "../research.constants.js";
import { getResearchChatId } from "../research.utils.js";
import { ResearchChatCard } from "./ResearchChatCard.jsx";
import { ResearchChatDetail } from "./ResearchChatDetail.jsx";

function ResearchChatsView({
  activeId,
  activeItem,
  hasMore,
  items,
  loading,
  onExportFiltered,
  onExportSelected,
  onLoadMore,
  onSelectItem,
  onSelectLoaded,
  onToggle,
  selectedIds,
  token
}) {
  const selected = new Set((selectedIds || []).map(String));
  return (
    <section className="research-shell">
      <div className="research-actions">
        <button className="ghost-button" disabled={loading || !items.length} onClick={onSelectLoaded} type="button">Select loaded chats</button>
        <button className="primary-button" disabled={loading || !selected.size} onClick={onExportSelected} type="button">Export selected chats ({selected.size})</button>
        <button className="ghost-button" disabled={loading || !items.length} onClick={onExportFiltered} type="button">Export filtered chats</button>
      </div>
      <div className="research-workspace chats">
        <div className="research-chat-list">
          {items.length === 0 ? (
            <div className="repository-empty">{loading ? "Loading chat sessions..." : "No matching chat sessions"}</div>
          ) : (
            <>
              {items.map((item) => {
                const id = getResearchChatId(item);
                return (
                  <ResearchChatCard
                    active={String(activeId) === id}
                    item={item}
                    key={id}
                    onSelect={onSelectItem}
                    onToggle={onToggle}
                    selected={selected.has(id)}
                  />
                );
              })}
              {hasMore && (
                <div className="research-pager">
                  <button className="ghost-button" onClick={onLoadMore} type="button">Show next {RESEARCH_PAGE_SIZE}</button>
                  <span>{items.length} loaded</span>
                </div>
              )}
            </>
          )}
        </div>
        <ResearchChatDetail item={activeItem} key={getResearchChatId(activeItem) || "empty"} token={token} />
      </div>
    </section>
  );
}

export { ResearchChatsView };
