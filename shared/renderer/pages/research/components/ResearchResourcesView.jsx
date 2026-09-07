import { RESEARCH_PAGE_SIZE } from "../research.constants.js";
import { getResearchResourceId, groupResearchResources } from "../research.utils.js";
import { ResearchResourceDetail } from "./ResearchResourceDetail.jsx";
import { ResearchResourceTile } from "./ResearchResourceTile.jsx";

function ResearchResourcesView({
  activeId,
  activeItem,
  hasMore,
  items,
  onBatchExport,
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
  const groups = groupResearchResources(items || []);
  return (
    <section className="research-shell">
      <div className="research-actions">
        <button className="ghost-button" onClick={onSelectLoaded} type="button">Select loaded</button>
        <button className="primary-button" onClick={onExportSelected} type="button">Export selected</button>
        <button className="ghost-button" onClick={onExportFiltered} type="button">Export all</button>
        <button className="ghost-button" onClick={onBatchExport} type="button">Batch export</button>
      </div>
      <div className="research-workspace">
        <div className="research-gallery">
          {items.length === 0 ? (
            <div className="repository-empty">No matching resources</div>
          ) : (
            <>
              {groups.map((group) => (
                <section className="research-date-group" key={group.dateKey}>
                  <h2>
                    {group.dateLabel}
                    <span>{group.dateKey} · {group.items.length} captures</span>
                  </h2>
                  <div className="research-grid">
                    {group.items.map((item) => {
                      const id = getResearchResourceId(item);
                      return (
                        <ResearchResourceTile
                          active={String(activeId) === id}
                          item={item}
                          key={id}
                          onSelect={onSelectItem}
                          onToggle={onToggle}
                          selected={selected.has(id)}
                          token={token}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
              {hasMore && (
                <div className="research-pager">
                  <button className="ghost-button" onClick={onLoadMore} type="button">Show next {RESEARCH_PAGE_SIZE}</button>
                  <span>{items.length} loaded</span>
                </div>
              )}
            </>
          )}
        </div>
        <ResearchResourceDetail item={activeItem} token={token} />
      </div>
    </section>
  );
}

export { ResearchResourcesView };
