import { formatRepositoryDate } from "../../../utils/date.js";
import { formatRawDataStorageStatus, getRawDataStorageStatus, getRepositoryTitle } from "../cloud.utils.js";
import { formatRepositoryStatus } from "../repository-format.js";
import { RepositoryFileIcon } from "./RepositoryFileIcon.jsx";
import { Ellipsis } from "lucide-react";

function RepositoryGridCard({ isRawDataSpace, item, onToggleMenu }) {
  const title = getRepositoryTitle(item);
  const status = isRawDataSpace ? getRawDataStorageStatus(item) : item.parse_status || "UNKNOWN";

  return (
    <article className="repository-item">
      <div className="repository-card">
        <RepositoryFileIcon item={item} />
        <div className="repository-card-body">
          <h3 title={title}>{title}</h3>
          <span>{formatRepositoryDate(item.captured_at || item.timestamp_ms || item.create_time) || "No date"}</span>
        </div>
        <div className="repository-card-foot">
          <span className={`repository-status ${isRawDataSpace ? "storage " : ""}${String(status).toLowerCase()}`}>
            {isRawDataSpace ? formatRawDataStorageStatus(status) : formatRepositoryStatus(status)}
          </span>
          <button onClick={onToggleMenu} title="更多" type="button">
            <Ellipsis size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

export { RepositoryGridCard };
