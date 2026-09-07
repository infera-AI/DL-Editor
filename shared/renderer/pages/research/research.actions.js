import { fetchCurrentUser } from "../../features/auth/auth.api.js";
import { toggleId } from "../../utils/selection.js";
import { saveResearchDownload } from "./research-download.js";
import { exportResearchChats, exportResearchResources, fetchResearchChats, fetchResearchResources, fetchResearchStatistics, fetchResearchUsers, getResearchDateRangeParams } from "./research.api.js";
import { getResearchChatId, getResearchErrorMessage, getResearchResourceId, hasResearchAccess, isResearchPermissionDenied, normalizeResearchItems } from "./research.utils.js";

function createResearchActions({
  authState,
  researchAccessRequestRef,
  setResearchAccessState,
  authStateRef,
  setResearchState,
  researchTab,
  researchFilters,
  researchState,
  setResearchFilters,
  setShowLogin
}) {
  async function loadResearchAccess(authOverride = authState) {
    const token = authOverride?.token;
    if (!token) {
      researchAccessRequestRef.current += 1;
      setResearchAccessState({ status: "auth", token: "", message: "" });
      return;
    }

    const requestId = researchAccessRequestRef.current + 1;
    researchAccessRequestRef.current = requestId;
    setResearchAccessState({ status: "checking", token, message: "" });
    try {
      const currentUser = await fetchCurrentUser(token);
      if (researchAccessRequestRef.current !== requestId) {
        return;
      }

      const resolvedToken = authStateRef.current?.token || token;
      if (!hasResearchAccess(currentUser)) {
        setResearchAccessState({
          status: "forbidden",
          token: resolvedToken,
          message: "当前账号未被授予 Research 访问权限，请联系管理员。"
        });
        setResearchState((current) => ({
          ...current,
          status: "idle",
          users: [],
          resources: [],
          resourcesTotal: 0,
          chats: [],
          chatsTotal: 0,
          statistics: null,
          message: ""
        }));
        return;
      }

      setResearchAccessState({ status: "allowed", token: resolvedToken, message: "" });
    } catch (error) {
      if (researchAccessRequestRef.current !== requestId || !authStateRef.current?.token) {
        return;
      }
      setResearchAccessState({
        status: "error",
        token: authStateRef.current.token,
        message: error.message || "无法验证 Research 访问权限"
      });
    }
  }

  async function loadResearchData(tabOverride = researchTab, authOverride = authState, filtersOverride = researchFilters, options = {}) {
    const token = authOverride?.token;
    const append = Boolean(options.append);
    const offset = Number(options.offset || 0);
    if (!token) {
      setResearchState((current) => ({
        ...current,
        status: "auth",
        message: "请先登录后查看 Research"
      }));
      return;
    }

    setResearchState((current) => ({ ...current, status: append ? "ready" : "loading", message: "", exportMessage: "" }));
    try {
      const usersPromise = fetchResearchUsers(token);
      if (tabOverride === "chats") {
        const [users, chats] = await Promise.all([usersPromise, fetchResearchChats(token, filtersOverride, { offset })]);
        const chatItems = normalizeResearchItems(chats);
        setResearchState((current) => ({
          ...current,
          status: "ready",
          users: normalizeResearchItems(users),
          chats: append ? [...current.chats, ...chatItems] : chatItems,
          chatsTotal: Number(chats?.total) || chatItems.length,
          selectedChatIds: append
            ? current.selectedChatIds
            : current.selectedChatIds.filter((id) => chatItems.some((item) => getResearchChatId(item) === String(id))),
          message: ""
        }));
      } else if (tabOverride === "statistics") {
        const [users, statistics] = await Promise.all([usersPromise, fetchResearchStatistics(token)]);
        setResearchState((current) => ({
          ...current,
          status: "ready",
          users: normalizeResearchItems(users),
          statistics,
          message: ""
        }));
      } else if (tabOverride === "simulation") {
        const users = await usersPromise;
        setResearchState((current) => ({
          ...current,
          status: "ready",
          users: normalizeResearchItems(users),
          message: ""
        }));
      } else {
        const [users, resources] = await Promise.all([usersPromise, fetchResearchResources(token, filtersOverride, { offset })]);
        const resourceItems = normalizeResearchItems(resources);
        setResearchState((current) => ({
          ...current,
          status: "ready",
          users: normalizeResearchItems(users),
          resources: append ? [...current.resources, ...resourceItems] : resourceItems,
          resourcesTotal: Number(resources?.total) || resourceItems.length,
          videoCount: Number(resources?.video_count) || 0,
          audioCount: Number(resources?.audio_count) || 0,
          selectedResourceIds: append
            ? current.selectedResourceIds
            : current.selectedResourceIds.filter((id) => resourceItems.some((item) => getResearchResourceId(item) === String(id))),
          message: ""
        }));
      }
    } catch (error) {
      const permissionDenied = isResearchPermissionDenied(error);
      if (permissionDenied) {
        setResearchAccessState({
          status: "forbidden",
          token: authStateRef.current?.token || token,
          message: "当前账号未被授予 Research 访问权限，请联系管理员。"
        });
      }
      setResearchState((current) => ({
        ...current,
        status: permissionDenied ? "forbidden" : "error",
        message: getResearchErrorMessage(error)
      }));
    }
  }

  function loadMoreResearchResources() {
    return loadResearchData("resources", authState, researchFilters, {
      append: true,
      offset: researchState.resources.length
    });
  }

  function loadMoreResearchChats() {
    return loadResearchData("chats", authState, researchFilters, {
      append: true,
      offset: researchState.chats.length
    });
  }

  function updateResearchFilter(patch) {
    setResearchFilters((current) => ({ ...current, ...patch }));
  }

  function toggleResearchResource(id) {
    setResearchState((current) => ({ ...current, selectedResourceIds: toggleId(current.selectedResourceIds, id) }));
  }

  function toggleResearchChat(id) {
    setResearchState((current) => ({ ...current, selectedChatIds: toggleId(current.selectedChatIds, id) }));
  }

  function selectLoadedResearchResources() {
    setResearchState((current) => ({
      ...current,
      selectedResourceIds: current.resources.map(getResearchResourceId).filter(Boolean)
    }));
  }

  function selectLoadedResearchChats() {
    setResearchState((current) => ({
      ...current,
      selectedChatIds: current.chats.map(getResearchChatId).filter(Boolean)
    }));
  }

  async function exportSelectedResearchResources() {
    await exportResearchArchive("resources", false);
  }

  async function exportFilteredResearchResources() {
    await exportResearchArchive("resources", true);
  }

  async function exportSelectedResearchChats() {
    await exportResearchArchive("chats", false);
  }

  async function exportFilteredResearchChats() {
    await exportResearchArchive("chats", true);
  }

  async function exportResearchArchive(kind, selectAll) {
    const token = authStateRef.current?.token;
    if (!token) {
      setShowLogin(true);
      return;
    }

    const selectedIds = kind === "chats" ? researchState.selectedChatIds : researchState.selectedResourceIds;
    if (!selectAll && selectedIds.length === 0) {
      setResearchState((current) => ({ ...current, exportMessage: kind === "chats" ? "请选择要导出的 chat" : "请选择要导出的资源" }));
      return;
    }

    const dateParams = getResearchDateRangeParams(researchFilters);
    const commonPayload = {
      select_all: Boolean(selectAll),
      user_id: researchFilters.userId ? Number(researchFilters.userId) : null
    };
    setResearchState((current) => ({ ...current, exportMessage: "正在打包导出..." }));
    try {
      const result =
        kind === "chats"
          ? await exportResearchChats(token, {
              ...commonPayload,
              session_ids: selectAll ? [] : selectedIds.map(Number),
              max_sessions: 2000,
              start_ms: dateParams.start_ms,
              end_ms: dateParams.end_ms,
              include_evidences: true
            })
          : await exportResearchResources(token, {
              ...commonPayload,
              asset_ids: selectAll ? [] : selectedIds.map(Number),
              delivery: "oss",
              max_assets: 2000,
              parse_status: researchFilters.status || null,
              date_start_ms: dateParams.date_start_ms,
              date_end_ms: dateParams.date_end_ms,
              include_metadata: true,
              include_parsed_data: true
            });
      await saveResearchDownload(result, kind === "chats" ? "research-chats.zip" : "research-videos.zip");
      const exportDownload = result?.download_url
        ? {
            kind,
            url: result.download_url,
            filename: result.filename || (kind === "chats" ? "research-chats.zip" : "research-videos.zip"),
            sizeBytes: Number(result.size_bytes) || 0,
            expiresAt: Number(result.expires_seconds) > 0 ? Date.now() + Number(result.expires_seconds) * 1000 : 0
          }
        : null;
      setResearchState((current) => ({
        ...current,
        exportMessage: exportDownload ? "" : "导出已开始下载",
        exportDownload: exportDownload || current.exportDownload
      }));
    } catch (error) {
      setResearchState((current) => ({ ...current, exportMessage: error.message || "导出失败" }));
    }
  }

  return { loadResearchAccess, loadResearchData, loadMoreResearchResources, loadMoreResearchChats, updateResearchFilter, toggleResearchResource, toggleResearchChat, selectLoadedResearchResources, selectLoadedResearchChats, exportSelectedResearchResources, exportFilteredResearchResources, exportSelectedResearchChats, exportFilteredResearchChats, exportResearchArchive };
}

export { createResearchActions };
