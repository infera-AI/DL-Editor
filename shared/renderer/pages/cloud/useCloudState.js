import { getLocalDateKey } from "../../utils/date.js";
import { CLOUD_REPOSITORY_DEFAULT_MEDIA_FILTER_ID, CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID, CLOUD_SPACES } from "./cloud.constants.js";
import { useState } from "react";

function useCloudState() {
  const [cloudSpaceId, setCloudSpaceId] = useState(CLOUD_SPACES[0].id);

  const [cloudRepositoryDateKey, setCloudRepositoryDateKey] = useState(() => getLocalDateKey());

  const [cloudRepositoryMediaFilterId, setCloudRepositoryMediaFilterId] = useState(CLOUD_REPOSITORY_DEFAULT_MEDIA_FILTER_ID);

  const [cloudRepositoryStatusFilterId, setCloudRepositoryStatusFilterId] = useState(CLOUD_REPOSITORY_DEFAULT_STATUS_FILTER_ID);

  const [repositoryState, setRepositoryState] = useState({
    status: "idle",
    spaceId: cloudSpaceId,
    dateKey: cloudRepositoryDateKey,
    filterId: cloudRepositoryStatusFilterId,
    items: [],
    statsItems: [],
    total: 0,
    hasMore: false,
    nextCursor: null,
    nextOffset: 0,
    message: ""
  });

  return { cloudSpaceId, setCloudSpaceId, cloudRepositoryDateKey, setCloudRepositoryDateKey, cloudRepositoryMediaFilterId, setCloudRepositoryMediaFilterId, cloudRepositoryStatusFilterId, setCloudRepositoryStatusFilterId, repositoryState, setRepositoryState };
}

export { useCloudState };
