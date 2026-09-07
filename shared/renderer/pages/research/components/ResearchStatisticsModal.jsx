import { formatResearchLongDuration, formatResearchNumber } from "../research.utils.js";

function ResearchStatisticsModal({ onClose, onPageChange, page, user }) {
  const pageSize = 14;
  const daily = (Array.isArray(user.daily) ? user.daily : [])
    .map((item) => ({
      chatCount: Number(item.chat_count ?? item.chatCount ?? 0) || 0,
      date: String(item.date || ""),
      durationMs: Number(item.duration_ms ?? item.durationMs ?? 0) || 0
    }))
    .filter((item) => item.date && (item.durationMs > 0 || item.chatCount > 0))
    .sort((left, right) => right.date.localeCompare(left.date));
  const totalPages = Math.max(1, Math.ceil(daily.length / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const rows = daily.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="research-modal" onClick={onClose}>
      <div className="research-modal-panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>{user.nickname || `User ${user.user_id ?? user.userId}`} daily duration</h2>
          <button className="ghost-button" onClick={onClose} type="button">Close</button>
        </header>
        <div className="research-modal-body">
          {rows.length ? (
            <table className="research-stats-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Agent chats</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.date}>
                    <td>{item.date}</td>
                    <td>{formatResearchLongDuration(item.durationMs)}</td>
                    <td>{formatResearchNumber(item.chatCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="research-preview-empty">No daily duration data</div>
          )}
        </div>
        <footer>
          <button className="ghost-button" disabled={safePage <= 0} onClick={() => onPageChange(safePage - 1)} type="button">Previous</button>
          <span>Page {safePage + 1} / {totalPages}</span>
          <button className="ghost-button" disabled={safePage >= totalPages - 1} onClick={() => onPageChange(safePage + 1)} type="button">Next</button>
        </footer>
      </div>
    </div>
  );
}

export { ResearchStatisticsModal };
