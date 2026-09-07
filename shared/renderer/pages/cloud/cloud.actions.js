import { deleteRawDataArchive, fetchCloudRepository } from "./cloud.api.js";
import { CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID } from "./cloud.constants.js";
import { getCloudStatusFilterIdForSpace, getDefaultCloudMediaFilterIdForSpace, getDefaultCloudStatusFilterIdForSpace, getRepositoryTitle } from "./cloud.utils.js";

function createCloudActions({
  setCloudSpaceId,
  setCloudRepositoryMediaFilterId,
  setCloudRepositoryStatusFilterId,
  setRepositoryState,
  authStateRef,
  cloudRepositoryDateKey,
  authState,
  cloudSpaceId,
  cloudRepositoryStatusFilterId,
  setNotice,
  setShowLogin
}) {
  function changeCloudSpace(nextSpaceId) {
    const nextMediaFilterId = getDefaultCloudMediaFilterIdForSpace(nextSpaceId);
    const nextStatusFilterId = getDefaultCloudStatusFilterIdForSpace(nextSpaceId);
    setCloudSpaceId(nextSpaceId);
    setCloudRepositoryMediaFilterId(nextMediaFilterId);
    setCloudRepositoryStatusFilterId(nextStatusFilterId);
    setRepositoryState({
      status: authStateRef.current?.token ? "loading" : "auth",
      spaceId: nextSpaceId,
      dateKey: nextSpaceId === "rawdata" ? "" : cloudRepositoryDateKey,
      filterId: nextStatusFilterId,
      items: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      nextOffset: 0,
      message: authStateRef.current?.token ? "" : "请先登录后查看 Cloud repository"
    });
  }

  async function loadCloudRepository(
    authOverride = authState,
    spaceIdOverride = cloudSpaceId,
    dateKeyOverride = cloudRepositoryDateKey,
    filterIdOverride = cloudRepositoryStatusFilterId
  ) {
    const token = authOverride?.token;
    const effectiveDateKey = spaceIdOverride === "rawdata" ? "" : dateKeyOverride;
    const effectiveFilterId = getCloudStatusFilterIdForSpace(spaceIdOverride, filterIdOverride);
    if (!token) {
      setRepositoryState({
        status: "auth",
        spaceId: spaceIdOverride,
        dateKey: effectiveDateKey,
        filterId: effectiveFilterId,
        items: [],
        statsItems: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
        nextOffset: 0,
        message: "请先登录后查看 Cloud repository"
      });
      return;
    }

    setRepositoryState((current) => ({
      ...current,
      items:
        current.spaceId === spaceIdOverride && current.dateKey === effectiveDateKey && current.filterId === effectiveFilterId
          ? current.items
          : [],
      statsItems:
        current.spaceId === spaceIdOverride && current.dateKey === effectiveDateKey
          ? current.statsItems || []
          : [],
      spaceId: spaceIdOverride,
      dateKey: effectiveDateKey,
      filterId: effectiveFilterId,
      status: "loading",
      message: ""
    }));

    try {
      const repository = await fetchCloudRepository(token, spaceIdOverride, {
        dateKey: effectiveDateKey,
        filterId: effectiveFilterId
      });
      const statsRepository =
        spaceIdOverride !== "rawdata" && effectiveFilterId !== CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID
          ? await fetchCloudRepository(token, spaceIdOverride, {
              dateKey: effectiveDateKey,
              filterId: CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID
            })
          : repository;
      setRepositoryState((current) =>
        current.spaceId === spaceIdOverride && current.dateKey === effectiveDateKey && current.filterId === effectiveFilterId
          ? {
              status: "ready",
              spaceId: spaceIdOverride,
              dateKey: effectiveDateKey,
              filterId: effectiveFilterId,
              items: repository.items,
              statsItems: statsRepository.items,
              total: repository.total,
              hasMore: repository.hasMore,
              nextCursor: repository.nextCursor,
              message: ""
            }
          : current
      );
    } catch (error) {
      setRepositoryState((current) =>
        current.spaceId === spaceIdOverride && current.dateKey === effectiveDateKey && current.filterId === effectiveFilterId
          ? {
              ...current,
              spaceId: spaceIdOverride,
              dateKey: effectiveDateKey,
              filterId: effectiveFilterId,
              status: "error",
              message: error.message || "无法读取 Cloud repository"
            }
          : current
      );
    }
  }

  async function deleteCloudRepositoryItem(item, spaceIdOverride = cloudSpaceId) {
    if (spaceIdOverride !== "rawdata") {
      setNotice("Repository 删除稍后接入");
      return;
    }

    if (!authState?.token) {
      setShowLogin(true);
      setNotice("请先登录后删除 Rawdata");
      return;
    }

    const title = getRepositoryTitle(item);
    setRepositoryState((current) => ({ ...current, spaceId: spaceIdOverride, dateKey: "", filterId: "all", status: "loading", message: "" }));
    try {
      await deleteRawDataArchive(authState.token, item);
      setNotice(`已删除 ${title}`);
      await loadCloudRepository(authState, spaceIdOverride, cloudRepositoryDateKey, cloudRepositoryStatusFilterId);
    } catch (error) {
      setRepositoryState((current) => ({
        ...current,
        spaceId: spaceIdOverride,
        dateKey: "",
        filterId: "all",
        status: "error",
        message: error.message || "删除 Rawdata 失败"
      }));
      setNotice(error.message || "删除 Rawdata 失败");
    }
  }

  return { changeCloudSpace, loadCloudRepository, deleteCloudRepositoryItem };
}

export { createCloudActions };
