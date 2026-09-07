import { resolveResearchSignedUrl } from "../../../services/signed-urls.js";
import { isResearchAudio } from "../research.utils.js";
import { useEffect, useState } from "react";

function ResearchMediaPreview({ item, token }) {
  const [mediaUrl, setMediaUrl] = useState("");
  const path = item?.media_url || item?.video_url || "";
  const audio = isResearchAudio(item);

  useEffect(() => {
    let canceled = false;
    setMediaUrl("");
    if (!path || !token) return;
    resolveResearchSignedUrl(token, path)
      .then((nextUrl) => {
        if (!canceled) setMediaUrl(nextUrl);
      })
      .catch(() => {
        if (!canceled) setMediaUrl("");
      });
    return () => {
      canceled = true;
    };
  }, [path, token]);

  if (!path) return <div className="research-preview-empty">No media URL</div>;
  if (!mediaUrl) return <div className="research-preview-empty">Loading preview</div>;
  return audio ? <audio className="research-audio" controls preload="metadata" src={mediaUrl} /> : <video className="research-video" controls preload="metadata" src={mediaUrl} />;
}

export { ResearchMediaPreview };
