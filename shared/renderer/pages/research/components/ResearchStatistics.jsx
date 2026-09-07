import { formatDurationCompact } from "../../../utils/format.js";

function ResearchStatistics({ data }) {
  const users = Array.isArray(data?.users) ? [...data.users].sort((a, b) => Number(b.duration_ms || 0) - Number(a.duration_ms || 0)) : [];
  return (
    <section className="research-panel">
      <div className="research-list">
        {users.length === 0 ? (
          <div className="repository-empty">No statistics</div>
        ) : (
          users.map((user) => (
            <article className="research-stat-row" key={user.user_id}>
              <div>
                <strong>{user.nickname || `User ${user.user_id}`}</strong>
                <span>{user.asset_count || 0} assets · {formatDurationCompact(Number(user.duration_ms || 0)) || "0:00"}</span>
              </div>
              <div className="research-stat-days">
                {(user.daily || []).slice().reverse().map((day) => (
                  <span key={day.date}>{day.date}: {day.asset_count || 0}</span>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export { ResearchStatistics };
