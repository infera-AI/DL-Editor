import { formatRepositoryDate } from "../../../utils/date.js";
import { formatBytes } from "../../../utils/format.js";
import { formatRawDataStorageStatus, getRawDataStorageStatus, getRepositoryTitle } from "../cloud.utils.js";
import { formatRepositoryDuration, formatRepositoryStatus, getRepositoryCapturedTime, getRepositoryDurationSeconds, getRepositorySizeBytes, getRepositoryUploadTime } from "../repository-format.js";
import { RepositoryFileIcon } from "./RepositoryFileIcon.jsx";
import { Ellipsis } from "lucide-react";

function RepositoryTableRow({ isRawDataSpace, item, onToggleMenu }) {
  const title = getRepositoryTitle(item);
  const status = item.parse_status || "UNKNOWN";
  const rawDataStorageStatus = getRawDataStorageStatus(item);
  const type = item.asset_type || item.media_type || item.file_type || "file";

  return (
    <article className={isRawDataSpace ? "repository-row rawdata" : "repository-row"}>
      <div className="repository-name-cell">
        <RepositoryFileIcon item={item} />
        <div>
          <h3 title={title}>{title}</h3>
          {!isRawDataSpace && <p>{item.summary_text || item.device_id || item.media_url || "No summary"}</p>}
        </div>
      </div>
      {isRawDataSpace ? (
        <>
          <span className={`repository-status storage ${String(rawDataStorageStatus).toLowerCase()}`}>
            {formatRawDataStorageStatus(rawDataStorageStatus)}
          </span>
          <span>{formatRepositoryDate(getRepositoryUploadTime(item)) || "-"}</span>
          <span>{formatRepositoryDate(getRepositoryCapturedTime(item)) || "-"}</span>
          <span>{formatRepositoryDuration(getRepositoryDurationSeconds(item)) || "-"}</span>
          <span>{formatBytes(getRepositorySizeBytes(item)) || "-"}</span>
        </>
      ) : (
        <>
          <span>{type}</span>
          <span className={`repository-status ${String(status).toLowerCase()}`}>{formatRepositoryStatus(status)}</span>
          <span>{formatRepositoryDate(item.captured_at || item.timestamp_ms || item.create_time) || "-"}</span>
        </>
      )}
      <div className="repository-actions">
        <button onClick={onToggleMenu} title="更多" type="button">
          <Ellipsis size={15} />
        </button>
      </div>
    </article>
  );
}

export { RepositoryTableRow };
