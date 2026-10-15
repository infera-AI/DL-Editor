import { useState } from "react";
import { researchMetadata } from "../research-agents.mjs";
import { formatResearchDateTime } from "../research.utils.js";

export function ResearchSimulationContext({ environment, messages = [], changesOnly = false }) {
  const [selected, setSelected] = useState("current");
  const snapshots = messages.filter((message) => message.role === "user" && researchMetadata(message).research_context).map((message, index) => ({ id: String(message.id || index), question: message.content, context: researchMetadata(message).research_context }));
  const context = snapshots.find((item) => item.id === selected)?.context || environment;
  if (changesOnly) return <div className="research-simulation-context"><h3>当前环境的任务变化</h3>{(environment?.changes || []).length ? [...environment.changes].reverse().map((entry, index) => <details className="research-record-card" key={index}><summary>{formatResearchDateTime(entry.at)} · {entry.changes.length} 个任务变化</summary><p>Chat: {entry.session_code || "—"}</p>{entry.changes.map((change) => <div className="research-simulation-change" key={change.task_id}><strong>{change.after?.title || change.before?.title || change.task_id}</strong><span>Before: {describe(change.before)}</span><span>After: {describe(change.after)}</span></div>)}</details>) : <p className="research-agent-hint">尚无任务修改。四个 agent 在此环境中的操作会汇总到这里。</p>}</div>;
  return <div className="research-simulation-context">
    <label>查看上下文<select aria-label="选择上下文快照" onChange={(event) => setSelected(event.target.value)} value={selected}><option value="current">当前沙盒状态</option>{snapshots.map((item, index) => <option key={item.id} value={item.id}>第 {index + 1} 轮开始 · {item.question.slice(0, 32)}</option>)}</select></label>
    {!context ? <p>选择模拟环境后查看上下文。</p> : <><p className="research-agent-hint">环境：{context.environment_id} · 读取时间：{formatResearchDateTime(context.context_read_at)}{environment?.version ? ` · revision ${environment.version}` : ""}</p><h3>任务副本（{context.tasks?.summary?.total || 0}）</h3>{(context.tasks?.tasks || []).map((task) => <details className="research-record-card" key={task.taskId}><summary><strong>{task.title}</strong><span>{task.status}</span></summary><p>{task.currentStep}</p><pre>{JSON.stringify(task, null, 2)}</pre></details>)}<h3>Bella 的个人背景</h3><pre className="research-simulation-personal-context">{JSON.stringify(context.personal_context || {}, null, 2)}</pre><p className="research-agent-hint">任务与个人背景快照记录该轮开始时的输入。Jane 和 Laura 实际引用的记忆证据显示在回答中。</p></>}
  </div>;
}

function describe(task) {
  if (!task) return "不存在";
  return [task.deleted ? "已删除" : task.status, task.archived ? "已归档" : "", task.title, task.current_step].filter(Boolean).join(" · ");
}
