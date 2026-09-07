import { canUseQueryMode, conversationModeParameters, normalizeConversationQueryMode, normalizeConversationSessions, queryModeHttpStatus } from "./conversation-modes.mjs";
import { createConversationRequestId, fetchConversationQueryModes, fetchConversationSession, fetchConversationSessions, streamConversationInput } from "./conversation.api.js";
import { formatConversationTime, getConversationTitle } from "./conversation.utils.js";
import { ConversationMessage } from "./ConversationMessage.jsx";
import { ConversationStreamTurn } from "./ConversationStreamTurn.jsx";
import { Activity, Play, Plus, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function ConversationWorkspace({ allowModeSwitch = false, authState, embedded = false, onLogin, queryMode, subtitle, title }) {
  const [selectedQueryMode, setSelectedQueryMode] = useState(() => normalizeConversationQueryMode(queryMode));
  const mode = allowModeSwitch ? selectedQueryMode : normalizeConversationQueryMode(queryMode);
  const token = authState?.token || "";
  const [sessions, setSessions] = useState([]);
  const [activeSessionCode, setActiveSessionCode] = useState("new");
  const [session, setSession] = useState(null);
  const [draft, setDraft] = useState("");
  const [thinkingLevel, setThinkingLevel] = useState("1");
  const [listState, setListState] = useState({ status: "idle", message: "" });
  const [sessionState, setSessionState] = useState({ status: "idle", message: "" });
  const [streaming, setStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [streamTurn, setStreamTurn] = useState(null);
  const messagesRef = useRef(null);
  const [modeCatalog, setModeCatalog] = useState(null);
  const [modeState, setModeState] = useState({ status: "loading", message: "" });
  const [modeReload, setModeReload] = useState(0);
  const initializedModeToken = useRef("");
  const viewRef = useRef({ token, mode });
  viewRef.current = { token, mode };
  const modeOptions = modeCatalog?.modes || [];
  const modeOption = modeOptions.find((item) => item.mode === mode);
  const canReadMode = canUseQueryMode(modeOption);
  const modeReady = modeState.status === "ready" && canReadMode;
  const modeLabel = modeOption?.label || mode;

  useEffect(() => {
    let cancelled = false;
    setModeState({ status: token ? "loading" : "idle", message: "" });
    if (!token) {
      setModeCatalog(null);
      initializedModeToken.current = "";
      return undefined;
    }
    fetchConversationQueryModes(token).then(({ catalog, warning }) => {
      if (cancelled) return;
      setModeCatalog(catalog);
      if (initializedModeToken.current !== token) {
        initializedModeToken.current = token;
        const preferred = catalog.modes.find((item) => item.mode === queryMode && canUseQueryMode(item))
          || catalog.modes.find((item) => item.mode === catalog.default_mode && canUseQueryMode(item))
          || catalog.modes.find(canUseQueryMode);
        if (allowModeSwitch && preferred) {
          setSelectedQueryMode((current) => catalog.modes.some((item) => item.mode === current && canUseQueryMode(item)) ? current : preferred.mode);
        }
      }
      setModeState({ status: "ready", message: warning });
    }).catch((error) => {
      if (!cancelled) setModeState({ status: "error", message: error.message || "模式列表加载失败" });
    });
    return () => { cancelled = true; };
  }, [allowModeSwitch, modeReload, queryMode, token]);

  useEffect(() => {
    let cancelled = false;
    setSessions([]);
    setActiveSessionCode("new");
    setSession(null);
    setStreamTurn(null);
    setStreamStatus("");
    if (!token || !canReadMode) {
      setListState({ status: "idle", message: "" });
      return undefined;
    }

    setListState({ status: "loading", message: "" });
    fetchConversationSessions(token, mode)
      .then((result) => {
        if (cancelled) return;
        const nextSessions = normalizeConversationSessions(result, mode);
        setSessions(nextSessions);
        setListState({ status: "ready", message: "" });
        if (nextSessions[0]?.session_code) {
          setActiveSessionCode(nextSessions[0].session_code);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setListState({ status: "error", message: error.message || "会话列表加载失败" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canReadMode, mode, token]);

  useEffect(() => {
    let cancelled = false;
    if (!token || !canReadMode || !activeSessionCode || activeSessionCode === "new" || streaming) {
      if (activeSessionCode === "new") {
        setSession(null);
        setSessionState({ status: "idle", message: "" });
      }
      return undefined;
    }

    setSessionState({ status: "loading", message: "" });
    fetchConversationSession(token, activeSessionCode, mode)
      .then((result) => {
        if (!cancelled) {
          setSession(result);
          setSessionState({ status: "ready", message: "" });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSession(null);
          setSessionState({ status: "error", message: error.message || "会话加载失败" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeSessionCode, canReadMode, mode, streaming, token]);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    const frame = window.requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSessionCode, session?.messages?.length, streamTurn?.answer]);

  function startNewConversation() {
    if (streaming) return;
    setActiveSessionCode("new");
    setSession(null);
    setSessionState({ status: "idle", message: "" });
    setStreamTurn(null);
    setStreamStatus("");
    setDraft("");
  }

  async function refreshConversationSessions(preferredSessionCode = activeSessionCode) {
    if (!token || !modeReady) return;
    try {
      const result = await fetchConversationSessions(token, mode);
      if (viewRef.current.token !== token || viewRef.current.mode !== mode) return;
      const nextSessions = normalizeConversationSessions(result, mode);
      setSessions(nextSessions);
      setListState({ status: "ready", message: "" });
      if (
        preferredSessionCode &&
        preferredSessionCode !== "new" &&
        nextSessions.some((item) => item.session_code === preferredSessionCode)
      ) {
        setActiveSessionCode(preferredSessionCode);
      }
    } catch (error) {
      if (viewRef.current.token !== token || viewRef.current.mode !== mode) return;
      setListState({ status: "error", message: error.message || "会话列表加载失败" });
    }
  }

  async function submitConversation(event) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || streaming || !modeReady) return;
    if (!token) {
      onLogin?.();
      return;
    }

    const requestId = createConversationRequestId(mode);
    let resolvedSessionCode = activeSessionCode || "new";
    let completedSession = null;
    setDraft("");
    setStreaming(true);
    setStreamStatus("正在准备回答");
    setStreamTurn({
      answer: "",
      candidateEvidences: [],
      error: "",
      evidences: [],
      question,
      requestId
    });

    try {
      await streamConversationInput(
        token,
        resolvedSessionCode,
        mode,
        {
          client_request_id: requestId,
          question_text: question,
          query_mode: mode,
          ...conversationModeParameters(modeOption, thinkingLevel)
        },
        ({ event: eventName, data }) => {
          if (eventName === "queue") {
            const position = Number(data?.position || 0);
            setStreamStatus(position > 0 ? `排队中 · 前方 ${position} 个请求` : "排队中");
            return;
          }
          if (eventName === "status") {
            setStreamStatus(data?.text || data?.stage || "正在处理");
            return;
          }
          if (eventName === "session" && data?.session_code) {
            resolvedSessionCode = data.session_code;
            setActiveSessionCode(data.session_code);
            return;
          }
          if (eventName === "candidate_evidence") {
            setStreamTurn((current) => current ? {
              ...current,
              candidateEvidences: Array.isArray(data?.evidences) ? data.evidences : []
            } : current);
            return;
          }
          if (eventName === "selected_evidence") {
            setStreamTurn((current) => current ? {
              ...current,
              evidences: Array.isArray(data?.evidences) ? data.evidences : current.evidences
            } : current);
            return;
          }
          if (eventName === "delta") {
            const text = String(data?.text || "");
            setStreamTurn((current) => current ? { ...current, answer: `${current.answer || ""}${text}` } : current);
            return;
          }
          if (eventName === "final") {
            setStreamTurn((current) => current ? {
              ...current,
              answer: String(data?.answer || current.answer || ""),
              evidences: Array.isArray(data?.evidences) ? data.evidences : current.evidences
            } : current);
            return;
          }
          if (eventName === "done") {
            if (data?.session) {
              completedSession = data.session;
              resolvedSessionCode = data.session.session_code || resolvedSessionCode;
              setSession(data.session);
              setSessionState({ status: "ready", message: "" });
            }
            setStreamStatus("回答完成");
          }
        }
      );

      if (!completedSession && resolvedSessionCode !== "new") {
        completedSession = await fetchConversationSession(token, resolvedSessionCode, mode);
        setSession(completedSession);
        setSessionState({ status: "ready", message: "" });
      }
      if (completedSession) {
        setStreamTurn(null);
      }
      await refreshConversationSessions(resolvedSessionCode);
    } catch (error) {
      const message = error.message || "对话请求失败";
      setStreamStatus(message);
      setStreamTurn((current) => current ? { ...current, error: message } : current);
      if ([400, 404, 422].includes(queryModeHttpStatus(error)) || /query_mode|unsupported.*mode/i.test(message)) {
        // Refresh discovery, but never resend the question in a different mode.
        setModeReload((value) => value + 1);
      }
    } finally {
      setStreaming(false);
    }
  }

  const messages = Array.isArray(session?.messages) ? session.messages : [];
  const activeSummary = sessions.find((item) => item.session_code === activeSessionCode);
  const activeTitle = activeSessionCode === "new"
    ? "新对话"
    : getConversationTitle(session || activeSummary, activeSessionCode);
  const activeSubtitle = allowModeSwitch
    ? modeOption?.description || "请选择可用的问答模式"
    : subtitle;

  return (
    <section className={`conversation-workspace ${embedded ? "embedded" : ""}`}>
      <aside className="conversation-sidebar">
        <header className="conversation-sidebar-head">
          <button className="engine-icon-button" disabled={streaming} onClick={startNewConversation} title="新建对话" type="button">
            <Plus size={16} />
          </button>
          <div>
            <strong>{title}</strong>
            <span>{modeLabel} sessions</span>
          </div>
          <button className="engine-icon-button" disabled={!token || streaming || !modeReady} onClick={() => refreshConversationSessions()} title="刷新会话" type="button">
            <RotateCcw size={15} />
          </button>
        </header>
        <div className="conversation-session-list">
          {!token ? (
            <div className="conversation-sidebar-empty">登录后查看会话</div>
          ) : listState.status === "loading" ? (
            <div className="conversation-sidebar-empty">正在加载会话</div>
          ) : listState.status === "error" ? (
            <div className="conversation-sidebar-empty error">{listState.message}</div>
          ) : sessions.length === 0 ? (
            <div className="conversation-sidebar-empty">还没有 {modeLabel} 对话</div>
          ) : (
            sessions.map((item) => (
              <button
                className={item.session_code === activeSessionCode ? "conversation-session active" : "conversation-session"}
                disabled={streaming}
                key={item.session_code}
                onClick={() => {
                  setActiveSessionCode(item.session_code);
                  setSession(null);
                  setStreamTurn(null);
                  setStreamStatus("");
                }}
                type="button"
              >
                <Sparkles size={15} />
                <span>
                  <strong>{getConversationTitle(item)}</strong>
                  <small>{formatConversationTime(item.update_time)}</small>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="conversation-main">
        <header className="conversation-header">
          <div>
            <strong>{activeTitle}</strong>
            <span>{activeSubtitle}</span>
          </div>
          {allowModeSwitch ? (
            <div className="conversation-mode-switch">
              <select
                aria-label={`${title} conversation mode`}
                disabled={!token || streaming || modeState.status !== "ready"}
                onChange={(event) => {
                  startNewConversation();
                  setSelectedQueryMode(event.target.value);
                }}
                title={modeOption?.description || "问答模式"}
                value={mode}
              >
                {!modeOption && <option disabled value={mode}>{modeState.status === "loading" ? "正在加载模式…" : `${mode}（不可用）`}</option>}
                {modeOptions.map((item) => (
                  <option disabled={!canUseQueryMode(item)} key={item.mode} value={item.mode}>
                    {item.label}{canUseQueryMode(item) ? "" : "（不可用）"}
                  </option>
                ))}
              </select>
              <button aria-label="刷新模式列表" disabled={!token || streaming || modeState.status === "loading"} onClick={() => setModeReload((value) => value + 1)} title="刷新模式列表" type="button">
                <RotateCcw size={14} />
              </button>
            </div>
          ) : (
            <span className={`conversation-mode-badge ${mode}`}>{mode}</span>
          )}
        </header>

        {token && (modeState.message || (modeState.status === "ready" && !modeReady)) && (
          <div className="conversation-mode-notice" role="status">
            {modeState.message || "当前模式不可用，请选择其他模式或刷新列表。"}
          </div>
        )}

        <div className="conversation-messages" ref={messagesRef}>
          {!token ? (
            <div className="conversation-empty-state">
              <UserRound size={24} />
              <strong>登录后使用 {title}</strong>
              <span>会话和消息会按当前账号隔离。</span>
              <button className="primary-button" onClick={onLogin} type="button">登录</button>
            </div>
          ) : sessionState.status === "loading" && !streamTurn ? (
            <div className="conversation-empty-state">正在加载对话</div>
          ) : sessionState.status === "error" && !streamTurn ? (
            <div className="conversation-empty-state error">{sessionState.message}</div>
          ) : messages.length === 0 && !streamTurn ? (
            <div className="conversation-empty-state">
              <Sparkles size={24} />
              <strong>开始 {modeLabel} 对话</strong>
              <span>{modeOption?.description || "等待加载可用模式。"}</span>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ConversationMessage
                  key={message.id || `${message.role}-${message.create_time || index}`}
                  message={message}
                  token={token}
                />
              ))}
              {streamTurn && <ConversationStreamTurn status={streamStatus} token={token} turn={streamTurn} />}
            </>
          )}
        </div>

        <form className="conversation-composer" onSubmit={submitConversation}>
          <textarea
            disabled={!token || streaming || !modeReady}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={token ? "输入问题，Enter 发送，Shift + Enter 换行" : "请先登录"}
            rows={2}
            value={draft}
          />
          <div className="conversation-composer-footer">
            <span title={streamStatus}>{streamStatus}</span>
            <div>
              {modeOption?.parameters?.thinking_level?.supported === true && <select aria-label="思考级别" disabled={!token || streaming || !modeReady} onChange={(event) => setThinkingLevel(event.target.value)} value={thinkingLevel}>
                <option value="0">Fast</option>
                <option value="1">Balanced</option>
                <option value="2">Deep</option>
                <option value="3">Max</option>
              </select>}
              <button className="primary-button" disabled={!token || streaming || !modeReady || !draft.trim()} type="submit">
                {streaming ? <Activity size={15} /> : <Play size={15} />}
                <span>{streaming ? "Working" : "Send"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

export { ConversationWorkspace };
