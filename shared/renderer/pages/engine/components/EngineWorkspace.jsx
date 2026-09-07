import { ConversationWorkspace } from "../../../features/conversation/ConversationWorkspace.jsx";
import { dlEditor } from "../../../services/desktop.js";
import { mergeEngineQaResponse, nonEmptyEngineAnswer, requestEngine, streamEngineQa } from "../engine.api.js";
import { ENGINE_HEALTH_RETRY_MS, ENGINE_INDEX_HITS, ENGINE_INDEX_QUERY } from "../engine.constants.js";
import { getEngineErrorMessage, getEngineStatusDetail } from "../engine.utils.js";
import { EngineSearchPanel } from "./EngineSearchPanel.jsx";
import { EngineTestView } from "./EngineTestView.jsx";
import { Activity, LockKeyhole, Play, RotateCcw, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

function EngineWorkspace({ authState, onLock, onLogin }) {
  const [activeEngineTab, setActiveEngineTab] = useState("search");
  const [engineView, setEngineView] = useState("workspace");
  const [engineUseVespa, setEngineUseVespa] = useState(false);
  const [engineInput, setEngineInput] = useState("");
  const [searchEvents, setSearchEvents] = useState([]);
  const [queryEvents, setQueryEvents] = useState([]);
  const [engineStatus, setEngineStatus] = useState({ status: "checking", message: "", health: null });
  const [engineMediaProxyUrl, setEngineMediaProxyUrl] = useState("");
  const [engineIndexState, setEngineIndexState] = useState({
    status: "idle",
    message: "",
    response: null,
    loadedAt: ""
  });

  useEffect(() => {
    let isCurrent = true;

    async function checkHealth() {
      try {
        const health = await requestEngine("/healthz");
        if (isCurrent) {
          setEngineStatus({ status: "online", message: "", health });
        }
      } catch (error) {
        if (isCurrent) {
          setEngineStatus({ status: "offline", message: getEngineErrorMessage(error), health: null });
        }
      }
    }

    checkHealth();
    const intervalId = window.setInterval(checkHealth, ENGINE_HEALTH_RETRY_MS);
    return () => {
      isCurrent = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadMediaProxyUrl() {
      try {
        const proxyUrl = typeof dlEditor.getEngineMediaProxyUrl === "function" ? await dlEditor.getEngineMediaProxyUrl() : "";
        if (isCurrent) {
          setEngineMediaProxyUrl(proxyUrl || "");
        }
      } catch {
        if (isCurrent) {
          setEngineMediaProxyUrl("");
        }
      }
    }

    loadMediaProxyUrl();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function refreshEngineHealth() {
    setEngineView("workspace");
    setEngineInput("");
    setSearchEvents([]);
    setQueryEvents([]);
    setEngineStatus((current) => ({ ...current, status: "checking", message: "" }));
    try {
      const health = await requestEngine("/healthz");
      setEngineStatus({ status: "online", message: "", health });
    } catch (error) {
      setEngineStatus({ status: "offline", message: getEngineErrorMessage(error), health: null });
    }
  }

  function updateEngineEntry(kind, id, patch) {
    const updater = (current) =>
      current.map((entry) => {
        if (entry.id !== id) {
          return entry;
        }
        const nextPatch = typeof patch === "function" ? patch(entry) : patch;
        return { ...entry, ...nextPatch };
      });
    if (kind === "search") {
      setSearchEvents(updater);
    } else {
      setQueryEvents(updater);
    }
  }

  function handleEngineQaStreamEvent(entryId, startedAt, message) {
    const eventName = message?.event || "message";
    const data = message?.data || {};

    if (eventName === "planner_status") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          planner_status: data,
          planner_progress: [...(entry.response?.planner_progress || []), data].slice(-14)
        }),
        status: "streaming",
        streamStage: "planner"
      }));
      return;
    }

    if (eventName === "evidence_status") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          evidence_status: data,
          evidence_progress: [...(entry.response?.evidence_progress || []), data].slice(-14)
        }),
        status: "streaming",
        streamStage: "evidence"
      }));
      return;
    }

    if (eventName === "answer_start") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          index_watermark: data.index_watermark,
          plan: data.plan,
          query_id: data.query_id
        }),
        status: "streaming",
        streamStage: "evidence"
      }));
      return;
    }

    if (eventName === "search.plan") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, { plan: data }),
        status: "streaming",
        streamStage: "evidence"
      }));
      return;
    }

    if (eventName === "answer_delta") {
      const text = String(data.text || "");
      updateEngineEntry("query", entryId, (entry) => {
        const previousStreamAnswer = entry.response?.stream_answer || entry.response?.answer || "";
        const nextStreamAnswer =
          data.replace && text ? text : data.replace ? previousStreamAnswer : `${previousStreamAnswer}${text}`;
        return {
          response: mergeEngineQaResponse(entry.response, {
            answer: nextStreamAnswer,
            stream_answer: nextStreamAnswer,
            answer_source: data.source || entry.response?.answer_source
          }),
          status: "streaming",
          streamStage: data.source === "llm" ? "llm" : "grounded"
        };
      });
      return;
    }

    if (eventName === "citations") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          citations: Array.isArray(data) ? data : []
        }),
        status: "streaming",
        streamStage: "evidence"
      }));
      return;
    }

    if (eventName === "evidence_reasoning") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          evidence_reasoning: Array.isArray(data) ? data : []
        }),
        status: "streaming",
        streamStage: "reasoning"
      }));
      return;
    }

    if (eventName === "retrieval_results") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          retrieval_results: Array.isArray(data) ? data : []
        }),
        status: "streaming",
        streamStage: "retrieval"
      }));
      return;
    }

    if (eventName === "llm_status") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          llm_status: data
        }),
        status: "streaming",
        streamStage: data.stage === "refinement_finished" ? "llm" : "llm_waiting"
      }));
      return;
    }

    if (eventName === "llm_thinking_delta") {
      const text = String(data.text || "");
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          llm_thinking: `${entry.response?.llm_thinking || ""}${text}`,
          llm_status: { stage: "thinking", elapsed_ms: data.elapsed_ms }
        }),
        status: "streaming",
        streamStage: "llm_thinking"
      }));
      return;
    }

    if (eventName === "refinement_error") {
      updateEngineEntry("query", entryId, (entry) => ({
        response: mergeEngineQaResponse(entry.response, {
          refinement_error: data.message || "LLM refinement unavailable"
        }),
        status: "streaming",
        streamStage: "llm_error"
      }));
      return;
    }

    if (eventName === "done") {
      updateEngineEntry("query", entryId, (entry) => ({
        elapsedMs: data.latency_ms || Math.max(1, Math.round(performance.now() - startedAt)),
        response: (() => {
          const finalAnswer =
            nonEmptyEngineAnswer(data.answer) ||
            nonEmptyEngineAnswer(entry.response?.answer) ||
            nonEmptyEngineAnswer(entry.response?.stream_answer);
          return mergeEngineQaResponse(entry.response, {
            answer: finalAnswer,
            final_answer: finalAnswer,
            confidence: data.confidence || entry.response?.confidence,
            evidence_reasoning: data.evidence_reasoning || entry.response?.evidence_reasoning || [],
            refined: Boolean(data.refined),
            retrieval_results: data.retrieval_results || entry.response?.retrieval_results || []
          });
        })(),
        status: "done",
        streamStage: data.refined ? "done_refined" : "done_grounded"
      }));
      return;
    }

    if (eventName === "stream_error") {
      updateEngineEntry("query", entryId, {
        elapsedMs: Math.max(1, Math.round(performance.now() - startedAt)),
        error: data.message || "DL Engine QA stream failed.",
        status: "error"
      });
    }
  }

  async function commitEnginePrompt(prompt) {
    const value = String(prompt || "").trim();
    if (!value) {
      return;
    }

    const kind = activeEngineTab;
    const startedAt = performance.now();
    const entry = {
      id: `${Date.now()}-${kind}`,
      kind,
      prompt: value,
      status: "loading",
      version: engineUseVespa ? "Vespa" : "Local",
      versionMode: engineUseVespa ? "Vespa hybrid" : "Local multi-index",
      scopeTitle: "DL Engine Memory",
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    };

    if (kind === "search") {
      setSearchEvents((current) => [entry, ...current].slice(0, 8));
    } else {
      setQueryEvents((current) => [...current, entry].slice(-8));
    }

    try {
      if (kind === "search") {
        const response = await requestEngine("/v1/search", {
          method: "POST",
          body: {
            query: value,
            hits: 8,
            include_debug: true,
            use_vespa: engineUseVespa,
            request_id: entry.id
          }
        });

        updateEngineEntry(kind, entry.id, {
          elapsedMs: Math.max(1, Math.round(performance.now() - startedAt)),
          response,
          status: "done"
        });
      } else {
        await streamEngineQa(
          {
            query: value,
            response_mode: "sse",
            include_plan: true,
            max_answer_tokens: 1024
          },
          (message) => handleEngineQaStreamEvent(entry.id, startedAt, message)
        );
      }
      setEngineStatus((current) => ({ status: "online", message: "", health: current.health || { status: "ok" } }));
    } catch (error) {
      const message = getEngineErrorMessage(error);
      updateEngineEntry(kind, entry.id, {
        elapsedMs: Math.max(1, Math.round(performance.now() - startedAt)),
        error: message,
        status: "error"
      });
      setEngineStatus({ status: "offline", message, health: null });
    }
  }

  function submitEnginePrompt(event) {
    event.preventDefault();
    setEngineView("workspace");
    commitEnginePrompt(engineInput);
    setEngineInput("");
  }

  async function loadEngineIndexContent() {
    setEngineView("test");
    setEngineIndexState({
      status: "loading",
      message: "",
      response: null,
      loadedAt: ""
    });

    try {
      let response = null;
      if (typeof dlEditor.getEngineIndexContent === "function") {
        try {
          response = await dlEditor.getEngineIndexContent();
        } catch (error) {
          if (/No handler registered for 'engine:get-index-content'/i.test(String(error?.message || error))) {
            throw new Error("Engine index handler 还没有加载，请重启 Electron dev app 后再点测试 icon。");
          }
          throw error;
        }
      }
      if (!response) {
        response = await requestEngine("/v1/search", {
          method: "POST",
          body: {
            query: ENGINE_INDEX_QUERY,
            hits: ENGINE_INDEX_HITS,
            include_debug: true,
            use_vespa: engineUseVespa,
            request_id: `engine-index-${Date.now()}`
          }
        });
      }

      setEngineIndexState({
        status: "done",
        message: "",
        response,
        loadedAt: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      });
      setEngineStatus((current) => ({ status: "online", message: "", health: current.health || { status: "ok" } }));
    } catch (error) {
      const message = getEngineErrorMessage(error);
      setEngineIndexState({
        status: "error",
        message,
        response: null,
        loadedAt: ""
      });
      setEngineStatus({ status: "offline", message, health: null });
    }
  }

  function runEngineTest() {
    loadEngineIndexContent();
  }

  function clearEngineWorkspace() {
    setEngineView("workspace");
    setEngineInput("");
    setSearchEvents([]);
    setQueryEvents([]);
    setEngineIndexState({ status: "idle", message: "", response: null, loadedAt: "" });
    refreshEngineHealth();
  }

  return (
    <section className="engine-workspace">
      <header className="engine-main-toolbar">
        <div className="engine-toolbar-title">
          <strong>DL Engine</strong>
          <span>{activeEngineTab === "query" ? "Infera agent conversation" : getEngineStatusDetail(engineStatus)}</span>
        </div>
        <div aria-label="Engine mode" className="engine-tabs" role="tablist">
          {["search", "query"].map((tab) => (
            <button
              aria-selected={activeEngineTab === tab}
              className={activeEngineTab === tab ? "active" : ""}
              key={tab}
              onClick={() => {
                setActiveEngineTab(tab);
                setEngineView("workspace");
              }}
              role="tab"
              type="button"
            >
              {tab === "search" ? <Search size={15} /> : <Sparkles size={15} />}
              <span>{tab === "search" ? "Search" : "Query"}</span>
            </button>
          ))}
        </div>
        <div className="engine-toolbar-actions">
          {activeEngineTab === "search" && (
            <>
              <label className="engine-vespa-toggle">
                <input checked={engineUseVespa} onChange={(event) => setEngineUseVespa(event.target.checked)} type="checkbox" />
                <span>Vespa</span>
              </label>
              <button className="engine-icon-button" onClick={clearEngineWorkspace} title="刷新" type="button">
                <RotateCcw size={16} />
              </button>
              <button className="engine-icon-button" onClick={runEngineTest} title="测试" type="button">
                <Activity size={17} />
              </button>
            </>
          )}
          <button className="engine-icon-button danger" onClick={onLock} title="锁定" type="button">
            <LockKeyhole size={17} />
          </button>
        </div>
      </header>

      {engineView === "test" ? (
        <EngineTestView
          engineIndexState={engineIndexState}
          engineMediaProxyUrl={engineMediaProxyUrl}
          onRefresh={loadEngineIndexContent}
          useVespa={engineUseVespa}
        />
      ) : (
        <section className={`engine-main ${activeEngineTab === "query" ? "conversation-mode" : ""}`}>
          {activeEngineTab === "search" ? (
            <EngineSearchPanel engineMediaProxyUrl={engineMediaProxyUrl} engineStatus={engineStatus} entries={searchEvents} useVespa={engineUseVespa} />
          ) : (
            <ConversationWorkspace
              allowModeSwitch
              authState={authState}
              embedded
              onLogin={onLogin}
              queryMode="agent"
              subtitle="DL Engine Agent memory conversation"
              title="Engine"
            />
          )}

          {activeEngineTab === "search" && <form className="engine-input-bar" onSubmit={submitEnginePrompt}>
            <label className="engine-input-wrap">
              {activeEngineTab === "search" ? <Search size={16} /> : <Sparkles size={16} />}
              <input
                autoComplete="off"
                onChange={(event) => setEngineInput(event.target.value)}
                placeholder={activeEngineTab === "search" ? "输入检索内容" : "输入问题"}
                type="text"
                value={engineInput}
              />
            </label>
            <button className="primary-button engine-submit-button" type="submit">
              {activeEngineTab === "search" ? <Search size={15} /> : <Play size={15} />}
              <span>{activeEngineTab === "search" ? "Search" : "Query"}</span>
            </button>
          </form>}
        </section>
      )}
    </section>
  );
}

export { EngineWorkspace };
