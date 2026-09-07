import { formatBytes } from "../../utils/format.js";
import { ResearchBatchExportModal } from "./components/ResearchBatchExportModal.jsx";
import { ResearchChatsView } from "./components/ResearchChatsView.jsx";
import { ResearchExportAllModal } from "./components/ResearchExportAllModal.jsx";
import { ResearchFilters } from "./components/ResearchFilters.jsx";
import { ResearchResourcesView } from "./components/ResearchResourcesView.jsx";
import { ResearchSimulationView } from "./components/ResearchSimulationView.jsx";
import { ResearchStatisticsView } from "./components/ResearchStatisticsView.jsx";
import { fetchResearchExportCount } from "./research.api.js";
import { formatResearchDownloadExpiry, formatResearchNumber, getResearchChatId, getResearchResourceId } from "./research.utils.js";
import { Download, LockKeyhole, RotateCcw, TriangleAlert, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

function ResearchPage({
  accessState,
  authState,
  filters,
  onExportFilteredChats,
  onExportFilteredResources,
  onExportSelectedChats,
  onExportSelectedResources,
  onFilterChange,
  onLogin,
  onLoadMoreChats,
  onLoadMoreResources,
  onRefresh,
  onRetryAccess,
  onSelectLoadedChats,
  onSelectLoadedResources,
  onTabChange,
  onToggleChat,
  onToggleResource,
  state,
  tab
}) {
  const isLoading = state.status === "loading";
  const users = state.users || [];
  const [activeResourceId, setActiveResourceId] = useState("");
  const [activeChatId, setActiveChatId] = useState("");
  const [showBatchExport, setShowBatchExport] = useState(false);
  const [exportAllState, setExportAllState] = useState({ open: false, status: "idle", data: null, message: "" });
  const selectedResourceCount = state.selectedResourceIds?.length || 0;
  const selectedChatCount = state.selectedChatIds?.length || 0;
  const loadedResourceCount = state.resources?.length || 0;
  const loadedChatCount = state.chats?.length || 0;
  const activeResource = (state.resources || []).find((item) => getResearchResourceId(item) === String(activeResourceId)) || state.resources?.[0] || null;
  const activeChat = (state.chats || []).find((item) => getResearchChatId(item) === String(activeChatId)) || state.chats?.[0] || null;
  const exportDownload = state.exportDownload?.kind === tab ? state.exportDownload : null;

  useEffect(() => {
    if (tab !== "resources") return;
    const ids = (state.resources || []).map(getResearchResourceId);
    if (!ids.length) {
      setActiveResourceId("");
    } else if (!ids.includes(String(activeResourceId))) {
      setActiveResourceId(ids[0]);
    }
  }, [activeResourceId, state.resources, tab]);

  useEffect(() => {
    if (tab !== "chats") return;
    const ids = (state.chats || []).map(getResearchChatId);
    if (!ids.length) {
      setActiveChatId("");
    } else if (!ids.includes(String(activeChatId))) {
      setActiveChatId(ids[0]);
    }
  }, [activeChatId, state.chats, tab]);

  const tabs = [
    ["resources", "Resources"],
    ["chats", "Chats"],
    ["simulation", "Simulation"],
    ["statistics", "Statistics"]
  ];
  const title = tab === "chats" ? "Agent Chats" : tab === "simulation" ? "Research Simulation" : tab === "statistics" ? "User Statistics" : "Research Resources";
  const meta =
    tab === "chats"
      ? `${loadedChatCount}${state.chatsTotal > loadedChatCount ? ` / ${state.chatsTotal}` : ""} chats loaded · Selected ${selectedChatCount} chats`
      : tab === "simulation"
        ? "Use a provider's data context without writing to their chat history"
      : tab === "statistics"
        ? `${state.statistics?.users?.length || 0} users counted`
        : `${loadedResourceCount}${state.resourcesTotal > loadedResourceCount ? ` / ${state.resourcesTotal}` : ""} files loaded · Selected ${selectedResourceCount} items`;

  async function openExportAllModal() {
    setExportAllState({ open: true, status: "loading", data: null, message: "Checking matching resources..." });
    try {
      const data = await fetchResearchExportCount(authState.token, filters, 2000);
      setExportAllState({ open: true, status: "ready", data, message: "" });
    } catch (error) {
      setExportAllState({ open: true, status: "error", data: null, message: error.message || "Unable to count matching resources" });
    }
  }

  async function confirmExportAll() {
    setExportAllState((current) => ({ ...current, status: "exporting" }));
    await onExportFilteredResources();
    setExportAllState({ open: false, status: "idle", data: null, message: "" });
  }

  if (!authState?.token) {
    return (
      <section className="research-login-page">
        <div className="research-login-card">
          <div className="research-login-icon">
            <LockKeyhole size={24} />
          </div>
          <div className="research-login-copy">
            <h1>登录后访问 Research</h1>
            <p>使用当前 DL Studio 账户查看有权限的 Research 数据。</p>
          </div>
          <button className="primary-button" onClick={onLogin} type="button">
            <UserRound size={16} />
            <span>登录</span>
          </button>
        </div>
      </section>
    );
  }

  const accessStatus = state.status === "forbidden" ? "forbidden" : accessState?.status;

  if (accessStatus === "idle" || accessStatus === "checking") {
    return (
      <section className="research-login-page">
        <div className="research-login-card">
          <div className="research-login-icon">
            <LockKeyhole size={24} />
          </div>
          <div className="research-login-copy">
            <h1>正在检查 Research 权限</h1>
            <p>正在读取当前账号的访问权限。</p>
          </div>
        </div>
      </section>
    );
  }

  if (accessStatus === "forbidden") {
    return (
      <section className="research-login-page">
        <div className="research-login-card">
          <div className="research-login-icon">
            <LockKeyhole size={24} />
          </div>
          <div className="research-login-copy">
            <h1>无 Research 访问权限</h1>
            <p>{accessState?.message || "当前账号未被授予 Research 访问权限，请联系管理员。"}</p>
          </div>
          <button className="primary-button" onClick={onRetryAccess} type="button">
            <RotateCcw size={16} />
            <span>重新检查</span>
          </button>
        </div>
      </section>
    );
  }

  if (accessStatus === "error") {
    return (
      <section className="research-login-page">
        <div className="research-login-card">
          <div className="research-login-icon">
            <TriangleAlert size={24} />
          </div>
          <div className="research-login-copy">
            <h1>无法验证 Research 权限</h1>
            <p>{accessState?.message || "请检查网络后重试。"}</p>
          </div>
          <button className="primary-button" onClick={onRetryAccess} type="button">
            <RotateCcw size={16} />
            <span>重试</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="research-page">
      <div className="research-tabs">
        {tabs.map(([id, label]) => (
          <button className={tab === id ? "active" : ""} key={id} onClick={() => onTabChange(id)} type="button">
            {label}
          </button>
        ))}
      </div>
      <div className="research-body">
        <header className="research-head">
          <div>
            <p className="eyebrow">RESEARCH</p>
            <h1>{title}</h1>
            <span>
              {tab === "chats"
                ? `${state.chatsTotal || 0} chats · selected ${selectedChatCount}`
                : tab === "statistics"
                  ? `${state.statistics?.users?.length || 0} users`
                  : tab === "simulation"
                    ? "Researcher-owned test conversations"
                  : `${state.resourcesTotal || 0} files · selected ${selectedResourceCount}`}
            </span>
          </div>
          {tab === "resources" && (
            <div className="research-count-chips">
              <span>Videos <strong>{formatResearchNumber(state.videoCount)}</strong></span>
              <span>Audio <strong>{formatResearchNumber(state.audioCount)}</strong></span>
            </div>
          )}
          <button className="secondary-button research-refresh" disabled={isLoading} onClick={onRefresh} type="button">
            <RotateCcw size={16} />
            <span>{isLoading ? "Loading" : "Refresh"}</span>
          </button>
        </header>

        {(tab === "resources" || tab === "chats") && <ResearchFilters filters={filters} onChange={onFilterChange} showStatus={tab === "resources"} users={users} />}

        {state.status === "error" && (
          <div className="repository-alert">
            <TriangleAlert size={16} />
            <span>{state.message}</span>
          </div>
        )}
        {state.exportMessage && <div className="notice">{state.exportMessage}</div>}
        {exportDownload && (
          <div className="research-download-notice">
            <div>
              <strong>导出包已就绪</strong>
              <span>
                {[formatBytes(exportDownload.sizeBytes), formatResearchDownloadExpiry(exportDownload.expiresAt)].filter(Boolean).join(" · ")}
              </span>
            </div>
            <a className="secondary-button" download={exportDownload.filename} href={exportDownload.url} rel="noreferrer">
              <Download size={16} />
              <span>再次下载 {exportDownload.filename}</span>
            </a>
          </div>
        )}

        {tab === "chats" ? (
          <ResearchChatsView
            activeId={getResearchChatId(activeChat)}
            activeItem={activeChat}
            hasMore={loadedChatCount < Number(state.chatsTotal || 0)}
            items={state.chats}
            onExportFiltered={onExportFilteredChats}
            onExportSelected={onExportSelectedChats}
            onLoadMore={onLoadMoreChats}
            onSelectItem={setActiveChatId}
            onSelectLoaded={onSelectLoadedChats}
            onToggle={onToggleChat}
            selectedIds={state.selectedChatIds}
            token={authState.token}
          />
        ) : tab === "simulation" ? (
          <ResearchSimulationView token={authState.token} users={users} />
        ) : tab === "statistics" ? (
          <ResearchStatisticsView data={state.statistics} />
        ) : (
          <ResearchResourcesView
            activeId={getResearchResourceId(activeResource)}
            activeItem={activeResource}
            hasMore={loadedResourceCount < Number(state.resourcesTotal || 0)}
            items={state.resources}
            onBatchExport={() => setShowBatchExport(true)}
            onExportFiltered={openExportAllModal}
            onExportSelected={onExportSelectedResources}
            onLoadMore={onLoadMoreResources}
            onSelectItem={setActiveResourceId}
            onSelectLoaded={onSelectLoadedResources}
            onToggle={onToggleResource}
            selectedIds={state.selectedResourceIds}
            token={authState.token}
          />
        )}
      </div>
      {showBatchExport && (
        <ResearchBatchExportModal
          initialUserId={filters.userId}
          onClose={() => setShowBatchExport(false)}
          token={authState.token}
          users={users}
        />
      )}
      {exportAllState.open && (
        <ResearchExportAllModal
          onClose={() => setExportAllState({ open: false, status: "idle", data: null, message: "" })}
          onConfirm={confirmExportAll}
          state={exportAllState}
        />
      )}
    </section>
  );
}

export { ResearchPage };
