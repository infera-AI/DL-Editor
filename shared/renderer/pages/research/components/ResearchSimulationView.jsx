import { createResearchSimulationStreamId, fetchResearchSimulationSession, fetchResearchSimulationSessions, streamResearchSimulationInput } from "../research.api.js";
import { getResearchUserLabel, normalizeResearchItems } from "../research.utils.js";
import { ResearchChatMessage } from "./ResearchChatMessage.jsx";
import { useEffect, useRef, useState } from "react";

function ResearchSimulationView({ token, users }) {
  const [subjectUserId, setSubjectUserId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activeSessionCode, setActiveSessionCode] = useState("new");
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState("");
  const [thinkingLevel, setThinkingLevel] = useState("0");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [status, setStatus] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [draftAnswer, session?.messages]);

  useEffect(() => {
    let cancelled = false;
    setSessions([]);
    setActiveSessionCode("new");
    setSession(null);
    setDraftAnswer("");
    if (!subjectUserId) {
      setStatus("");
      return undefined;
    }
    setStatus("Loading conversations...");
    fetchResearchSimulationSessions(token, subjectUserId)
      .then((data) => {
        if (!cancelled) {
          setSessions(normalizeResearchItems(data));
          setStatus("");
        }
      })
      .catch((error) => { if (!cancelled) setStatus(error.message || "Unable to load simulations"); });
    return () => { cancelled = true; };
  }, [subjectUserId]);

  async function loadSession(sessionCode) {
    if (!subjectUserId || streaming) return;
    setStatus("Loading conversation...");
    try {
      const data = await fetchResearchSimulationSession(token, subjectUserId, sessionCode);
      setActiveSessionCode(sessionCode);
      setSession(data);
      setDraftAnswer("");
      setStatus("");
    } catch (error) {
      setStatus(error.message || "Unable to load the conversation");
    }
  }

  function startNewSession() {
    if (streaming) return;
    setActiveSessionCode("new");
    setSession(null);
    setDraftAnswer("");
    setStatus("");
  }

  async function submitQuestion(event) {
    event.preventDefault();
    const normalizedQuestion = question.trim();
    if (!subjectUserId || !normalizedQuestion || streaming) return;
    const requestId = createResearchSimulationStreamId();
    const existingMessages = Array.isArray(session?.messages) ? session.messages : [];
    setSession((current) => ({ ...(current || {}), messages: [...existingMessages, { role: "user", content: normalizedQuestion, evidences: [] }] }));
    setQuestion("");
    setDraftAnswer("");
    setStreaming(true);
    setStatus("Preparing your answer...");
    let resolvedSessionCode = activeSessionCode || "new";
    try {
      await streamResearchSimulationInput(
        token,
        subjectUserId,
        resolvedSessionCode,
        { client_request_id: requestId, question_text: normalizedQuestion, top_k: 3, thinking_level: Number(thinkingLevel) || 0 },
        ({ event: eventName, data }) => {
          if (eventName === "session" && data?.session_code) {
            resolvedSessionCode = data.session_code;
            setActiveSessionCode(data.session_code);
          } else if (eventName === "status") {
            setStatus(data?.text || data?.stage || "Working...");
          } else if (eventName === "delta") {
            setDraftAnswer((current) => current + (data?.text || ""));
          } else if (eventName === "done" && data?.session) {
            resolvedSessionCode = data.session.session_code || resolvedSessionCode;
            setActiveSessionCode(resolvedSessionCode);
            setSession(data.session);
            setDraftAnswer("");
          }
        }
      );
      const list = await fetchResearchSimulationSessions(token, subjectUserId);
      setSessions(normalizeResearchItems(list));
      if (resolvedSessionCode !== "new") {
        setSession(await fetchResearchSimulationSession(token, subjectUserId, resolvedSessionCode));
        setActiveSessionCode(resolvedSessionCode);
      }
      setStatus("");
    } catch (error) {
      setStatus(error.message || "Unable to complete the conversation");
    } finally {
      setStreaming(false);
      setDraftAnswer("");
    }
  }

  const messages = Array.isArray(session?.messages) ? session.messages : [];
  return (
    <section className="research-simulation-view">
      <aside className="research-simulation-sidebar">
        <div className="research-simulation-toolbar">
          <select disabled={streaming} onChange={(event) => setSubjectUserId(event.target.value)} value={subjectUserId}>
            <option value="">Select data provider</option>
            {users.map((user) => <option key={user.user_id || user.id} value={user.user_id || user.id}>{getResearchUserLabel(user)}</option>)}
          </select>
          <button className="primary-button" disabled={streaming || !subjectUserId} onClick={startNewSession} type="button">New</button>
        </div>
        <div className="research-simulation-sessions">
          {!subjectUserId ? <div className="research-preview-empty">Select a data provider</div> : sessions.length === 0 ? <div className="research-preview-empty">No saved simulations for this provider</div> : sessions.map((item) => (
            <button className={item.session_code === activeSessionCode ? "active" : ""} key={item.session_code} onClick={() => loadSession(item.session_code)} type="button">
              <strong>{item.title || item.latest_question || "Untitled conversation"}</strong>
              <span>{item.update_time ? new Date(item.update_time).toLocaleString() : ""}</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="research-simulation-chat">
        <header>
          <div>
            <h2>{activeSessionCode === "new" ? "New research simulation" : session?.title || session?.latest_question || "Research simulation"}</h2>
            {activeSessionCode !== "new" && <span className="research-chat-id" title={activeSessionCode}>Chat ID: {activeSessionCode}</span>}
            <span>The data provider is fixed when a new session starts. Switch providers to browse their conversations.</span>
          </div>
        </header>
        <div className="research-simulation-messages" ref={messagesRef}>
          {!messages.length && !draftAnswer ? (
            <div className="research-preview-empty">{subjectUserId ? "Start a new conversation with this provider's data context." : "Select a data provider, then start a conversation."}</div>
          ) : (
            <>
              {messages.map((message, index) => <ResearchChatMessage key={message.message_id || message.id || `${message.role}-${index}`} message={message} token={token} />)}
              {streaming && <div className="research-chat-message-row assistant"><article className="research-chat-message assistant streaming"><p>{draftAnswer || "..."}</p></article></div>}
            </>
          )}
        </div>
        <form className="research-simulation-composer" onSubmit={submitQuestion}>
          <textarea disabled={streaming || !subjectUserId} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask the agent as this data provider..." value={question} />
          <div><span>{status}</span><select disabled={streaming} onChange={(event) => setThinkingLevel(event.target.value)} value={thinkingLevel}><option value="0">Fast</option><option value="1">Balanced</option><option value="2">Deep</option></select><button className="primary-button" disabled={streaming || !subjectUserId || !question.trim()} type="submit">{streaming ? "Working" : "Send"}</button></div>
        </form>
      </div>
    </section>
  );
}

export { ResearchSimulationView };
