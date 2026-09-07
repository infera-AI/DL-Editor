import { getLocalDateKey, shiftLocalDateKey } from "../../utils/date.js";
import { formatBytes, formatDurationCompact } from "../../utils/format.js";
import { CLOUD_FILTERS, CLOUD_SPACES, CLOUD_VIEW_MODES } from "./cloud.constants.js";
import { filterCloudRepositoryItems, getCloudFilterCount, getCloudMediaFiltersForSpace, getCloudRepositoryStats, getCloudStatusFiltersForSpace, getDefaultCloudMediaFilterIdForSpace, getDefaultCloudStatusFilterIdForSpace, getRepositoryActionMenuPosition, getRepositoryItemKey } from "./cloud.utils.js";
import { CloudFilterIcon } from "./components/CloudFilterIcon.jsx";
import { CloudMetric } from "./components/CloudMetric.jsx";
import { RepositoryItem } from "./components/RepositoryItem.jsx";
import { RepositoryTableRow } from "./components/RepositoryTableRow.jsx";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Cloud, FolderOpen, Gauge, HardDrive, LayoutGrid, List, LockKeyhole, RotateCcw, Search, Timer, TriangleAlert, UserRound, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function CloudRepository({
  authState,
  cloudRepositoryDateKey,
  cloudRepositoryMediaFilterId,
  cloudRepositoryStatusFilterId,
  cloudSpaceId,
  onDeleteItem,
  onLogin,
  onMediaFilterChange,
  onRefresh,
  onRepositoryDateChange,
  onSpaceChange,
  onStatusFilterChange,
  repositoryState
}) {
  const items = repositoryState.items || [];
  const isLoading = repositoryState.status === "loading";
  const [cloudQuery, setCloudQuery] = useState("");
  const [cloudViewMode, setCloudViewMode] = useState("list");
  const [isCloudSpaceMenuOpen, setCloudSpaceMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState("");
  const [repositoryMenuPosition, setRepositoryMenuPosition] = useState(null);
  const displaySpaceId = repositoryState.spaceId || cloudSpaceId;
  const isRawDataSpace = displaySpaceId === "rawdata";
  const activeMediaFilter = cloudRepositoryMediaFilterId;
  const activeStatusFilter = cloudRepositoryStatusFilterId;
  const visibleMediaFilters = useMemo(() => getCloudMediaFiltersForSpace(displaySpaceId), [displaySpaceId]);
  const visibleStatusFilters = useMemo(() => getCloudStatusFiltersForSpace(displaySpaceId), [displaySpaceId]);
  const statsItems = repositoryState.statsItems || items;
  const stats = useMemo(() => getCloudRepositoryStats(statsItems), [statsItems]);
  const filteredItems = useMemo(
    () => filterCloudRepositoryItems(items, activeMediaFilter, activeStatusFilter, cloudQuery),
    [activeMediaFilter, activeStatusFilter, cloudQuery, items]
  );
  const openMenuItem = useMemo(
    () => filteredItems.find((item) => getRepositoryItemKey(item) === openMenuId) || null,
    [filteredItems, openMenuId]
  );
  const activeMediaFilterLabel = visibleMediaFilters.find((filter) => filter.id === activeMediaFilter)?.label || visibleMediaFilters[0]?.label || CLOUD_FILTERS[0].label;
  const activeStatusFilterLabel = visibleStatusFilters.find((filter) => filter.id === activeStatusFilter)?.label || "";
  const activeFilterLabel = activeStatusFilterLabel ? `${activeMediaFilterLabel} / ${activeStatusFilterLabel}` : activeMediaFilterLabel;
  const activeCloudSpace = CLOUD_SPACES.find((space) => space.id === displaySpaceId) || CLOUD_SPACES[0];
  const storagePercent = Math.min(92, Math.max(4, Math.round((stats.totalBytes / (5 * 1024 * 1024 * 1024)) * 100)));

  function closeRepositoryMenu() {
    setOpenMenuId("");
    setRepositoryMenuPosition(null);
  }

  function toggleRepositoryMenu(item, event) {
    event.stopPropagation();
    const itemId = getRepositoryItemKey(item);
    if (openMenuId === itemId) {
      closeRepositoryMenu();
      return;
    }

    setOpenMenuId(itemId);
    setRepositoryMenuPosition(getRepositoryActionMenuPosition(event.currentTarget));
  }

  useEffect(() => {
    if (!visibleMediaFilters.some((filter) => filter.id === activeMediaFilter)) {
      onMediaFilterChange(getDefaultCloudMediaFilterIdForSpace(displaySpaceId));
    }
    if (!visibleStatusFilters.some((filter) => filter.id === activeStatusFilter)) {
      onStatusFilterChange(getDefaultCloudStatusFilterIdForSpace(displaySpaceId));
    }
    closeRepositoryMenu();
  }, [activeMediaFilter, activeStatusFilter, displaySpaceId, onMediaFilterChange, onStatusFilterChange, visibleMediaFilters, visibleStatusFilters]);

  useEffect(() => {
    if (!openMenuId) {
      return undefined;
    }

    window.addEventListener("resize", closeRepositoryMenu);
    window.addEventListener("scroll", closeRepositoryMenu, true);
    return () => {
      window.removeEventListener("resize", closeRepositoryMenu);
      window.removeEventListener("scroll", closeRepositoryMenu, true);
    };
  }, [openMenuId]);

  return (
    <section className="cloud-page">
      <div className="cloud-drive">
        <aside className="cloud-sidebar">
          <div className="cloud-brand">
            <span className="cloud-brand-icon">
              <Cloud size={18} />
            </span>
            <div>
              <strong>DL Cloud</strong>
              <div className="cloud-space-wrap">
                <button
                  className="cloud-space-button"
                  onClick={() => setCloudSpaceMenuOpen((current) => !current)}
                  title="选择空间"
                  type="button"
                >
                  <span>{activeCloudSpace.label}</span>
                  <ChevronDown size={13} />
                </button>
                {isCloudSpaceMenuOpen && (
                  <div className="cloud-space-menu">
                    {CLOUD_SPACES.map((space) => (
                      <button
                        className={displaySpaceId === space.id ? "active" : ""}
                        key={space.id}
                        onClick={() => {
                          onSpaceChange(space.id);
                          setCloudSpaceMenuOpen(false);
                        }}
                        type="button"
                      >
                        {space.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <nav aria-label="Cloud files" className="cloud-nav">
            <div className="cloud-nav-group">
              <span className="cloud-nav-label">文件类型</span>
              {visibleMediaFilters.map((filter) => (
                <button
                  className={activeMediaFilter === filter.id ? "cloud-nav-item active" : "cloud-nav-item"}
                  key={filter.id}
                  onClick={() => onMediaFilterChange(filter.id)}
                  type="button"
                >
                  <CloudFilterIcon id={filter.id} />
                  <span>{filter.label}</span>
                  <b>{getCloudFilterCount(stats, filter.id)}</b>
                </button>
              ))}
            </div>
            {visibleStatusFilters.length > 0 && (
              <div className="cloud-nav-group">
                <span className="cloud-nav-label">解析状态</span>
                {visibleStatusFilters.map((filter) => (
                  <button
                    className={activeStatusFilter === filter.id ? "cloud-nav-item active" : "cloud-nav-item"}
                    key={filter.id}
                    onClick={() => onStatusFilterChange(filter.id)}
                    type="button"
                  >
                    <CloudFilterIcon id={filter.id} />
                    <span>{filter.label}</span>
                    <b>{getCloudFilterCount(stats, filter.id)}</b>
                  </button>
                ))}
              </div>
            )}
          </nav>

          <div className="cloud-storage">
            <div className="cloud-storage-head">
              <HardDrive size={16} />
              <span>Storage</span>
              <strong>{formatBytes(stats.totalBytes) || "0 B"}</strong>
            </div>
            <div className="cloud-storage-meter">
              <span style={{ width: `${storagePercent}%` }} />
            </div>
            <p>{stats.total} files</p>
          </div>
        </aside>

        <section className="cloud-main">
          {!authState?.token ? (
            <div className="cloud-empty">
              <LockKeyhole size={30} />
              <h1>Cloud</h1>
                  <p>登录 infera-button-demo 账号后查看 {isRawDataSpace ? "rawdata" : "repository"}。</p>
              <button className="primary-button" onClick={onLogin} type="button">
                <UserRound size={16} />
                <span>登录</span>
              </button>
            </div>
          ) : (
            <>
              <header className="cloud-toolbar">
                <div className="cloud-breadcrumb">
                  <span>Cloud</span>
                  <ChevronRight size={14} />
                  <strong>{activeFilterLabel}</strong>
                </div>
                <label className="cloud-search">
                  <Search size={15} />
                  <input
                    autoComplete="off"
                    onChange={(event) => setCloudQuery(event.target.value)}
                    placeholder="搜索文件、设备或摘要"
                    type="search"
                    value={cloudQuery}
                  />
                </label>
                {!isRawDataSpace && (
                  <div className="cloud-date-filter">
                    <button
                      className="cloud-date-step"
                      onClick={() => onRepositoryDateChange(shiftLocalDateKey(cloudRepositoryDateKey, -1))}
                      title="前一天"
                      type="button"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <label>
                      <span>Date</span>
                      <input
                        onChange={(event) => onRepositoryDateChange(event.currentTarget.value || getLocalDateKey())}
                        type="date"
                        value={cloudRepositoryDateKey}
                      />
                    </label>
                    <button
                      className="cloud-date-step"
                      onClick={() => onRepositoryDateChange(shiftLocalDateKey(cloudRepositoryDateKey, 1))}
                      title="后一天"
                      type="button"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
                <button className="secondary-button cloud-refresh" disabled={isLoading} onClick={() => onRefresh(displaySpaceId)} type="button">
                  <RotateCcw size={16} />
                  <span>{isLoading ? "同步中" : "刷新"}</span>
                </button>
              </header>

              <div className="cloud-overview">
                <CloudMetric icon={<FolderOpen size={17} />} label="文件" value={stats.total} />
                <CloudMetric icon={<Video size={17} />} label="视频" value={stats.video} />
                {isRawDataSpace ? (
                  <CloudMetric icon={<Timer size={17} />} label="时长" value={formatDurationCompact(Math.round(stats.totalDurationSeconds * 1000)) || "-"} />
                ) : (
                  <CloudMetric icon={<CheckCircle2 size={17} />} label="已解析" value={stats.parsed} />
                )}
                <CloudMetric icon={<Gauge size={17} />} label="容量" value={formatBytes(stats.totalBytes) || "0 B"} />
              </div>

              {repositoryState.status === "error" && (
                <div className="repository-alert">
                  <TriangleAlert size={16} />
                  <span>{repositoryState.message}</span>
                </div>
              )}

              <section className="repository-panel">
                <div className="repository-panel-head">
                  <div>
                    <h2>Files</h2>
                    <span>
                      {filteredItems.length} of {repositoryState.total || items.length}
                    </span>
                  </div>
                  <div className="cloud-view-toggle">
                    {CLOUD_VIEW_MODES.map((mode) => (
                      <button
                        aria-pressed={cloudViewMode === mode}
                        className={cloudViewMode === mode ? "active" : ""}
                        key={mode}
                        onClick={() => setCloudViewMode(mode)}
                        title={mode === "list" ? "列表" : "网格"}
                        type="button"
                      >
                        {mode === "list" ? <List size={15} /> : <LayoutGrid size={15} />}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoading && items.length === 0 ? (
                  <div className="repository-empty">正在读取 repository...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="repository-empty">
                    <span>没有匹配的文件</span>
                  </div>
                ) : cloudViewMode === "grid" ? (
                  <div className="cloud-file-grid">
                    <div className="repository-list">
                      {filteredItems.map((item) => (
                        <RepositoryItem
                          isRawDataSpace={isRawDataSpace}
                          item={item}
                          key={item.asset_id || item.id || item.media_url}
                          onToggleMenu={(event) => toggleRepositoryMenu(item, event)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="cloud-file-table">
                    <div className={isRawDataSpace ? "repository-table-head rawdata" : "repository-table-head"}>
                      <span>名称</span>
                      {isRawDataSpace ? (
                        <>
                          <span>状态</span>
                          <span>上传时间</span>
                          <span>拍摄时间</span>
                          <span>视频时长</span>
                          <span>文件大小</span>
                        </>
                      ) : (
                        <>
                          <span>类型</span>
                          <span>状态</span>
                          <span>时间</span>
                        </>
                      )}
                      <span />
                    </div>
                    <div className="repository-list">
                      {filteredItems.map((item) => (
                        <RepositoryTableRow
                          isRawDataSpace={isRawDataSpace}
                          item={item}
                          key={getRepositoryItemKey(item)}
                          onToggleMenu={(event) => toggleRepositoryMenu(item, event)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {openMenuItem && repositoryMenuPosition && (
                  <div
                    className="repository-action-menu floating"
                    style={{
                      "--menu-left": `${repositoryMenuPosition.left}px`,
                      "--menu-top": `${repositoryMenuPosition.top}px`
                    }}
                  >
                    <button
                      className="danger"
                      onClick={() => {
                        const item = openMenuItem;
                        closeRepositoryMenu();
                        onDeleteItem(item, displaySpaceId);
                      }}
                      type="button"
                    >
                      删除
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

export { CloudRepository };
