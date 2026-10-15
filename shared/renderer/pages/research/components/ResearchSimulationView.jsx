import { useEffect, useRef, useState } from "react";
import { actOnResearchSimulationCard, cancelResearchSimulationInput, createResearchSimulationEnvironment, createResearchSimulationSession, createResearchSimulationStreamId, fetchResearchSimulationEnvironment, fetchResearchSimulationEnvironments, fetchResearchSimulationSession, fetchResearchSimulationSessions, streamResearchSimulationInput } from "../research.api.js";
import { RESEARCH_AGENTS, getResearchAgent, researchCardsForMessage } from "../research-agents.mjs";
import { getResearchUserLabel, normalizeResearchItems, formatResearchDateTime } from "../research.utils.js";
import { ResearchChatMessage } from "./ResearchChatMessage.jsx";
import { ResearchChatActivity } from "./ResearchChatActivity.jsx";
import { ResearchSimulationContext } from "./ResearchSimulationContext.jsx";

export function ResearchSimulationView({ token, users, researcherId }) {
  const [subject, setSubject] = useState("");
  const [environments, setEnvironments] = useState([]);
  const [environmentId, setEnvironmentId] = useState("");
  const [environment, setEnvironment] = useState(null);
  const [agentId, setAgentId] = useState("laura");
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState("0");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [view, setView] = useState("conversation");
  const messagesRef = useRef(null);
  const scopeRef = useRef("");
  const mounted = useRef(true);
  const runRef = useRef(null);
  const loadRef = useRef(0);
  const ownerKey = researcherId || token;
  const scope = `${ownerKey}:${subject}:${environmentId}:${agentId}`;
  scopeRef.current = scope;
  const current = (key) => mounted.current && scopeRef.current === key;
  const busy = working || streaming;
  const legacy = environmentId === "legacy";
  const hasSandbox = Boolean(environmentId) && !legacy;
  const code = session?.session_code || "new";
  const agent = getResearchAgent(legacy ? "legacy" : agentId);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const run = runRef.current;
      if (run?.code) cancelResearchSimulationInput(run.token, run.subject, run.code, run.id).catch(() => {});
    };
  }, [ownerKey]);

  useEffect(() => {
    let cancelled = false;
    setEnvironments([]); setEnvironmentId(""); setEnvironment(null); setSession(null); setSessions([]); setQuestion(""); setStatus("");
    if (!subject) return undefined;
    setLoading(true);
    fetchResearchSimulationEnvironments(token, subject).then((result) => {
      if (cancelled) return;
      const items = normalizeResearchItems(result);
      setEnvironments(items); setEnvironmentId(items[0]?.environment_id || "");
    }).catch((error) => { if (!cancelled) setStatus(error.message || "无法加载模拟环境"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subject, ownerKey]);

  useEffect(() => {
    const request = ++loadRef.current;
    setSessions([]); setSession(null); setDraft(""); setQuestion(""); setEnvironment(null); setView("conversation");
    if (!subject || !environmentId) { setLoading(false); return undefined; }
    setLoading(true); setStatus("");
    Promise.all([fetchResearchSimulationSessions(token, subject, legacy ? {} : { environmentId, assistantKind: agentId }), legacy ? Promise.resolve(null) : fetchResearchSimulationEnvironment(token, subject, environmentId)])
      .then(([list, context]) => { if (current(scope) && request === loadRef.current) { setSessions(normalizeResearchItems(list).filter((item) => !legacy || !item.environment_id)); setEnvironment(context); } })
      .catch((error) => { if (current(scope) && request === loadRef.current) setStatus(error.message || "无法加载模拟会话"); })
      .finally(() => { if (current(scope) && request === loadRef.current) setLoading(false); });
    return () => { loadRef.current += 1; };
  }, [ownerKey, subject, environmentId, agentId]);

  useEffect(() => { messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight }); }, [draft, session?.messages]);

  async function refreshScope() {
    const [list, context] = await Promise.all([fetchResearchSimulationSessions(token, subject, { environmentId, assistantKind: agentId }), fetchResearchSimulationEnvironment(token, subject, environmentId)]);
    if (current(scope)) { setSessions(normalizeResearchItems(list)); setEnvironment(context); }
  }

  async function newEnvironment() {
    if (busy || !subject) return;
    setWorking(true); setStatus("正在复制受试用户的任务与计划...");
    try {
      const item = await createResearchSimulationEnvironment(token, subject);
      if (!current(scope)) return;
      setEnvironments((items) => [item, ...items]); setEnvironmentId(item.environment_id); setStatus("");
    } catch (error) { if (current(scope)) setStatus(error.message || "创建沙盒失败"); }
    finally { if (mounted.current) setWorking(false); }
  }

  async function loadSession(sessionCode) {
    if (busy || loading) return;
    const request = ++loadRef.current;
    setLoading(true); setStatus("");
    try {
      const result = await fetchResearchSimulationSession(token, subject, sessionCode);
      if (current(scope) && request === loadRef.current) { setSession(result); setDraft(""); setView("conversation"); }
    } catch (error) { if (current(scope)) setStatus(error.message || "加载会话失败"); }
    finally { if (current(scope) && request === loadRef.current) setLoading(false); }
  }

  async function startNewSession() {
    if (busy || loading || !hasSandbox) return;
    setWorking(true); setStatus("");
    try {
      const result = await createResearchSimulationSession(token, subject, environmentId, agentId);
      if (!current(scope)) return;
      setSession(result); setDraft(""); setView("conversation"); await refreshScope();
    } catch (error) { if (current(scope)) setStatus(error.message || "创建会话失败"); }
    finally { if (current(scope)) setWorking(false); }
  }

  async function cardAction(card, action) {
    if (busy || code === "new" || !hasSandbox) return;
    setWorking(true); setStatus("正在处理确认...");
    try {
      const result = await actOnResearchSimulationCard(token, subject, code, card, action);
      if (!current(scope)) return;
      setSession(result); await refreshScope(); setStatus("");
    } catch (error) {
      if (current(scope)) {
        setStatus(error.message || "确认失败，请重新加载后重试");
        const latest = await fetchResearchSimulationSession(token, subject, code).catch(() => null);
        if (latest && current(scope)) setSession(latest);
        await refreshScope().catch(() => {});
      }
    } finally { if (current(scope)) setWorking(false); }
  }

  async function submitQuestion(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy || loading || !hasSandbox || runRef.current) return;
    const run = { id: createResearchSimulationStreamId(), token, subject, code: code === "new" ? null : code };
    runRef.current = run;
    setStreaming(true); setStopping(false); setDraft(""); setStatus("正在准备回答...");
    let active = session;
    try {
      if (!run.code) { active = await createResearchSimulationSession(token, subject, environmentId, agentId); run.code = active.session_code; }
      if (!current(scope)) return;
      setSession({ ...active, messages: [...(active?.messages || []), { role: "user", content: text }] }); setQuestion("");
      await streamResearchSimulationInput(token, subject, run.code, { client_request_id: run.id, question_text: text, environment_id: environmentId, assistant_kind: agentId, top_k: 3, thinking_level: Number(thinking) }, ({ event: eventName, data }) => {
        if (!current(scope)) return;
        if (eventName === "status") setStatus(data?.text || data?.stage || "正在处理...");
        else if (eventName === "delta") setDraft((answer) => answer + (data?.text || ""));
        else if (eventName === "done" && data?.session) { setSession(data.session); setDraft(""); }
      });
      const saved = await fetchResearchSimulationSession(token, subject, run.code);
      if (current(scope)) { setSession(saved); await refreshScope(); setStatus(""); }
    } catch (error) {
      if (current(scope)) {
        setStatus(error.message || "模拟失败");
        if (run.code) {
          const saved = await fetchResearchSimulationSession(token, subject, run.code).catch(() => null);
          if (saved && current(scope)) setSession(saved);
          await refreshScope().catch(() => {});
        }
      }
    } finally { runRef.current = null; if (current(scope)) { setStreaming(false); setDraft(""); setStopping(false); } }
  }

  async function stop() {
    const run = runRef.current;
    if (!run?.code || stopping) return;
    setStopping(true);
    try { await cancelResearchSimulationInput(token, run.subject, run.code, run.id); if (current(scope)) setStatus("正在停止回复并保存已完成的沙盒操作..."); }
    catch (error) { if (current(scope)) { setStatus(error.message || "停止失败"); setStopping(false); } }
  }

  const messages = session?.messages || [];
  return <section className="research-simulation-view">
    <aside className="research-simulation-sidebar">
      <div className="research-simulation-setup">
        <label>受试用户<select aria-label="模拟受试用户" disabled={busy} onChange={(event) => setSubject(event.target.value)} value={subject}><option value="">选择受试用户</option>{users.map((user) => <option key={user.user_id || user.id} value={user.user_id || user.id}>{getResearchUserLabel(user)}</option>)}</select></label>
        <label>模拟环境<select aria-label="模拟环境" disabled={busy || !subject} onChange={(event) => setEnvironmentId(event.target.value)} value={environmentId}><option value="">{environments.length ? "选择环境" : "尚无模拟环境"}</option>{environments.map((item) => <option key={item.environment_id} value={item.environment_id}>{item.title}</option>)}<option value="legacy">旧版模拟记录（只读）</option></select></label>
        <button className="secondary-button" disabled={busy || loading || !subject} onClick={newEnvironment} type="button">从真实任务新建沙盒</button>
        <p>四个 agent 共用当前沙盒。新建环境重新复制真实任务，保留已有模拟记录。</p>
      </div>
      <div className="research-simulation-agent-picker" aria-label="模拟 agent">{RESEARCH_AGENTS.filter((item) => item.id !== "legacy").map((item) => <button aria-pressed={!legacy && agentId === item.id} disabled={busy || legacy} key={item.id} onClick={() => setAgentId(item.id)} type="button"><strong>{item.name}</strong><small>{item.role}</small></button>)}</div>
      <div className="research-simulation-toolbar"><strong>{agent.name} 的会话</strong><button className="primary-button" disabled={busy || loading || !hasSandbox} onClick={startNewSession} type="button">New</button></div>
      <div className="research-simulation-sessions">{!subject ? <div className="research-preview-empty">先选择受试用户</div> : !environmentId ? <div className="research-preview-empty">新建或选择模拟环境后开始</div> : loading ? <div className="research-preview-empty">正在加载...</div> : sessions.length === 0 ? <div className="research-preview-empty">还没有 {agent.name} 的模拟会话</div> : sessions.map((item) => <button className={item.session_code === code ? "active" : ""} disabled={busy} key={item.session_code} onClick={() => loadSession(item.session_code)} type="button"><strong>{item.title || item.latest_question || "新会话"}</strong><span>{formatResearchDateTime(item.update_time)}</span></button>)}</div>
    </aside>
    <div className="research-simulation-chat">
      <header><div><div className="research-chat-agent-line"><span className={`research-agent-badge ${agentId}`}>{agent.name}</span><span>{agent.role} · 沙盒模拟</span></div><h2>{session?.title || session?.latest_question || `${agent.name} · 新模拟对话`}</h2>{code !== "new" && <span className="research-chat-id" title={code}>Chat ID: {code}</span>}<span>记忆与画像只读受试用户数据；任务操作仅保存到当前沙盒。</span><div className="research-chat-detail-tabs">{[["conversation", "对话"], ["context", "上下文"], ["activity", "操作记录"]].map(([id, label]) => <button aria-pressed={view === id} key={id} onClick={() => setView(id)} type="button">{label}</button>)}</div></div></header>
      <div className="research-simulation-messages" ref={messagesRef}>{view === "context" ? <ResearchSimulationContext environment={environment} messages={messages} /> : view === "activity" ? <><ResearchChatActivity item={session || {}} /><ResearchSimulationContext changesOnly environment={environment} messages={messages} /></> : !messages.length && !draft ? <div className="research-preview-empty">{legacy ? "选择旧版会话查看历史；继续测试请新建沙盒。" : hasSandbox ? `向 ${agent.name} 提问，也可测试转交、确认和撤销。` : "选择受试用户并新建一个沙盒环境。"}</div> : <>{messages.map((message, index) => <ResearchChatMessage cardActionDisabled={busy || loading} cards={researchCardsForMessage(session?.cards, message)} key={message.public_message_id || message.id || index} message={message} onCardAction={legacy ? undefined : cardAction} session={session} token={token} />)}{streaming && <ResearchChatMessage message={{ role: "assistant", content: draft || "正在回答..." }} session={{ assistant_kind: agentId }} token={token} />}</>}</div>
      <form className="research-simulation-composer" onSubmit={submitQuestion}><textarea aria-label="模拟对话输入" disabled={busy || loading || !hasSandbox} onChange={(event) => setQuestion(event.target.value)} placeholder={legacy ? "旧版模拟记录仅供查看" : `向 ${agent.name} 提问；可以输入“确认”“取消”“撤销”`} value={question} /><div><span role="status">{status}</span><select aria-label="思考深度" disabled={busy || legacy} onChange={(event) => setThinking(event.target.value)} value={thinking}><option value="0">Fast</option><option value="1">Balanced</option><option value="2">Deep</option></select>{streaming ? <button className="secondary-button" disabled={stopping} onClick={stop} type="button">{stopping ? "Stopping" : "Stop"}</button> : <button className="primary-button" disabled={busy || loading || !hasSandbox || !question.trim()} type="submit">{working ? "Working" : "Send"}</button>}</div></form>
    </div>
  </section>;
}
