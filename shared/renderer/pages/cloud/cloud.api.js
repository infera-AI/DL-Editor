import { requestInfera } from "../../services/infera.js";
import { buildCloudRepositoryPagePath, normalizeCloudItems } from "./cloud-query.js";
import { CLOUD_REPOSITORY_MAX_PAGES, CLOUD_SPACES, RAW_DATA_LIST_PATH } from "./cloud.constants.js";
import { getRawDataId } from "./cloud.utils.js";

async function fetchCloudRepository(token, spaceId = CLOUD_SPACES[0].id, options = {}) {
  const items = [];
  let total = null;
  let hasMore = true;
  let cursor = null;
  let offset = 0;
  let pageCount = 0;
  const endpoint = spaceId === "rawdata" ? RAW_DATA_LIST_PATH : "/device/files";
  const dateKey = typeof options.dateKey === "string" && spaceId !== "rawdata" ? options.dateKey : "";
  const filterId = typeof options.filterId === "string" && spaceId !== "rawdata" ? options.filterId : "all";

  while (hasMore && pageCount < CLOUD_REPOSITORY_MAX_PAGES) {
    const result = await requestInfera(buildCloudRepositoryPagePath(endpoint, { cursor, dateKey, filterId, offset }), { token });
    const pageItems = normalizeCloudItems(result);
    items.push(...pageItems);
    total = Number.isFinite(Number(result?.total)) ? Number(result.total) : total;
    hasMore = Boolean(result?.has_more);
    cursor = result?.next_cursor || null;
    offset = Number.isFinite(Number(result?.next_offset)) ? Number(result.next_offset) : offset + pageItems.length;

    if (!hasMore || (!cursor && !Number.isFinite(Number(result?.next_offset)))) {
      hasMore = false;
    }

    pageCount += 1;
  }

  return {
    items,
    total: total ?? items.length,
    hasMore,
    nextCursor: cursor
  };
}

async function deleteRawDataArchive(token, item) {
  const rawDataId = getRawDataId(item);
  if (!rawDataId) {
    throw new Error("缺少 raw data id，无法删除");
  }

  return requestInfera(RAW_DATA_LIST_PATH, {
    method: "DELETE",
    token,
    body: {
      id: rawDataId,
      raw_data_id: rawDataId,
      raw_data_ids: [rawDataId]
    }
  });
}

export { fetchCloudRepository, deleteRawDataArchive };
