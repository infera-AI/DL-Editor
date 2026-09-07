import { formatBytes } from "../../../utils/format.js";
import { fetchResearchParsedData } from "../research.api.js";
import { formatResearchDateTime, getResearchItemTimestamp, getResearchResourceId, isResearchAudio } from "../research.utils.js";
import { ResearchMediaPreview } from "./ResearchMediaPreview.jsx";
import { ResearchParsedPanel } from "./ResearchParsedPanel.jsx";
import { useEffect, useState } from "react";

function ResearchResourceDetail({ item, token }) {
  const [parsedState, setParsedState] = useState({ data: null, message: "", status: "idle" });

  useEffect(() => {
    let canceled = false;
    if (!item?.parsed_data_url || !token) {
      setParsedState({ data: null, message: "", status: item ? "empty" : "idle" });
      return;
    }
    setParsedState({ data: null, message: "Loading", status: "loading" });
    fetchResearchParsedData(token, item.parsed_data_url)
      .then((data) => {
        if (!canceled) setParsedState({ data, message: "", status: "ready" });
      })
      .catch((error) => {
        if (!canceled) setParsedState({ data: null, message: error.message || "Failed", status: "error" });
      });
    return () => {
      canceled = true;
    };
  }, [item?.parsed_data_url, token]);

  if (!item) {
    return (
      <aside className="research-detail">
        <div className="research-empty compact">Select a video</div>
      </aside>
    );
  }

  const timestamp = getResearchItemTimestamp(item);
  return (
    <aside className="research-detail">
      <header>
        <div>
          <h2>{item.file_name || `Asset ${getResearchResourceId(item)}`}</h2>
          <p>{[item.parse_status, formatResearchDateTime(timestamp), formatBytes(item.size_bytes)].filter(Boolean).join(" · ")}</p>
        </div>
        <span>{isResearchAudio(item) ? "Audio" : "Video"}</span>
      </header>
      <ResearchMediaPreview item={item} token={token} />
      <ResearchParsedPanel state={parsedState} />
    </aside>
  );
}

export { ResearchResourceDetail };
