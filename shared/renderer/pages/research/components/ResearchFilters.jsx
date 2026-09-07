import { RESEARCH_RESOURCE_STATUSES } from "../research.constants.js";
import { getResearchUserLabel } from "../research.utils.js";

function ResearchFilters({ filters, onChange, showStatus, users }) {
  return (
    <div className="research-filter-row">
      <select onChange={(event) => onChange({ userId: event.target.value })} value={filters.userId}>
        <option value="">All users</option>
        {users.map((user) => (
          <option key={user.user_id || user.id} value={user.user_id || user.id}>
            {getResearchUserLabel(user)}
          </option>
        ))}
      </select>
      {showStatus && (
        <select onChange={(event) => onChange({ status: event.target.value })} value={filters.status}>
          {RESEARCH_RESOURCE_STATUSES.map((status) => (
            <option key={status.id || "all"} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
      )}
      <label className="research-date-input">
        <span>From</span>
        <input onChange={(event) => onChange({ from: event.target.value })} type="date" value={filters.from} />
      </label>
      <label className="research-date-input">
        <span>To</span>
        <input onChange={(event) => onChange({ to: event.target.value })} type="date" value={filters.to} />
      </label>
    </div>
  );
}

export { ResearchFilters };
