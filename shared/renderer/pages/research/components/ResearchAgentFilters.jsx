import { RESEARCH_AGENTS } from "../research-agents.mjs";

export function ResearchAgentFilters({ counts, enabled, onChange, value = "" }) {
  const total = counts ? Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0) : null;
  return (
    <div className="research-agent-section">
      <div aria-label="Filter sessions by owning agent" className="research-agent-filters">
        {[{ id: "", name: "All agents", role: "全部会话" }, ...RESEARCH_AGENTS].map((agent) => (
          <button aria-pressed={value === agent.id} className={`research-agent-filter ${value === agent.id ? "active" : ""}`} disabled={Boolean(agent.id) && !enabled} key={agent.id} onClick={() => onChange({ assistantKind: agent.id })} type="button">
            <span><strong>{agent.name}</strong><b>{agent.id ? counts?.[agent.id] ?? "—" : total ?? "—"}</b></span>
            <small>{agent.role}</small>
          </button>
        ))}
      </div>
      <p className="research-agent-hint">按会话所属 agent 筛选；Laura 的转交回答保留在原会话，并标注实际回答者。数量对应当前用户与日期范围。{!enabled && " 四个 agent 的筛选需要新版 Research 后端。"}</p>
    </div>
  );
}
