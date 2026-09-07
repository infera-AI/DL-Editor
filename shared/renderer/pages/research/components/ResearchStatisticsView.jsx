import { formatResearchLongDuration, formatResearchNumber, getRecentResearchDateKeys, shortResearchDateKey } from "../research.utils.js";
import { ResearchStatisticsModal } from "./ResearchStatisticsModal.jsx";
import { useState } from "react";

function ResearchStatisticsView({ data }) {
  const [detailUserId, setDetailUserId] = useState("");
  const [detailPage, setDetailPage] = useState(0);
  const users = Array.isArray(data?.users)
    ? [...data.users].sort((a, b) => Number(b.duration_ms ?? b.durationMs ?? 0) - Number(a.duration_ms ?? a.durationMs ?? 0))
    : [];
  const recentDates = getRecentResearchDateKeys(7);
  const totalDuration = users.reduce((sum, item) => sum + (Number(item.duration_ms ?? item.durationMs ?? 0) || 0), 0);
  const activeUser = users.find((user) => String(user.user_id ?? user.userId) === String(detailUserId));

  return (
    <section className="research-statistics-view">
      <div className="research-stat-cards">
        <div><span>Users</span><strong>{formatResearchNumber(users.length)}</strong></div>
        <div><span>Total duration</span><strong>{formatResearchLongDuration(totalDuration)}</strong></div>
        <div><span>Timezone</span><strong>{data?.timezone || "Asia/Shanghai"}</strong></div>
      </div>
      <div className="research-table-wrap">
        {users.length === 0 ? (
          <div className="repository-empty">No statistics</div>
        ) : (
          <table className="research-stats-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Nickname</th>
                <th>Total duration</th>
                <th>Agent chats</th>
                {recentDates.map((dateKey) => <th key={dateKey}>{shortResearchDateKey(dateKey)}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const daily = new Map((Array.isArray(user.daily) ? user.daily : []).map((item) => [item.date, item]));
                return (
                  <tr key={user.user_id ?? user.userId} onClick={() => { setDetailUserId(String(user.user_id ?? user.userId)); setDetailPage(0); }}>
                    <td>{user.user_id ?? user.userId}</td>
                    <td>{user.nickname || ""}</td>
                    <td>{formatResearchLongDuration(user.duration_ms ?? user.durationMs)}</td>
                    <td>{formatResearchNumber(user.chat_count ?? user.chatCount)}</td>
                    {recentDates.map((dateKey) => {
                      const item = daily.get(dateKey);
                      return <td key={dateKey}>{formatResearchLongDuration(item?.duration_ms ?? item?.durationMs)}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {activeUser && (
        <ResearchStatisticsModal
          onClose={() => setDetailUserId("")}
          onPageChange={setDetailPage}
          page={detailPage}
          user={activeUser}
        />
      )}
    </section>
  );
}

export { ResearchStatisticsView };
