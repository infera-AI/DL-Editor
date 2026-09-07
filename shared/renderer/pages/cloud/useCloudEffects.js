import { getDefaultCloudStatusFilterIdForSpace } from "./cloud.utils.js";
import { useEffect } from "react";

function useCloudEffects({
  activeNav,
  authState,
  setRepositoryState,
  cloudSpaceId,
  cloudRepositoryDateKey,
  loadCloudRepository,
  cloudRepositoryStatusFilterId
}) {
  useEffect(() => {
    const shouldLoadCloudRepository = activeNav === "Cloud";
    if (!shouldLoadCloudRepository) {
      return;
    }

    if (!authState?.token) {
      setRepositoryState({
        status: "auth",
        spaceId: cloudSpaceId,
        dateKey: cloudSpaceId === "rawdata" ? "" : cloudRepositoryDateKey,
        filterId: getDefaultCloudStatusFilterIdForSpace(cloudSpaceId),
        items: [],
        statsItems: [],
        total: 0,
        hasMore: false,
        nextCursor: null,
        message: "请先登录后查看 Cloud repository"
      });
      return;
    }

    loadCloudRepository(authState, cloudSpaceId, cloudRepositoryDateKey, cloudRepositoryStatusFilterId);
  }, [activeNav, authState?.token, cloudRepositoryDateKey, cloudRepositoryStatusFilterId, cloudSpaceId]);
}

export { useCloudEffects };
