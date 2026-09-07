import { useResearchLazyLoad } from "../../../hooks/useResearchLazyLoad.js";
import { resolveResearchSignedUrl } from "../../../services/signed-urls.js";
import { isResearchAudio } from "../research.utils.js";
import { FileAudio, FileVideo } from "lucide-react";
import { useEffect, useState } from "react";

function ResearchThumbnail({ item, token }) {
  const [url, setUrl] = useState("");
  const [containerRef, shouldLoad] = useResearchLazyLoad();
  useEffect(() => {
    let canceled = false;
    setUrl("");
    if (!shouldLoad || !item?.thumbnail_url || !token) return;
    resolveResearchSignedUrl(token, item.thumbnail_url)
      .then((nextUrl) => {
        if (!canceled) setUrl(nextUrl);
      })
      .catch(() => {
        if (!canceled) setUrl("");
      });
    return () => {
      canceled = true;
    };
  }, [item?.thumbnail_url, shouldLoad, token]);

  return (
    <div className="research-thumb" ref={containerRef}>
      {url ? (
        <img alt="" decoding="async" loading="lazy" src={url} />
      ) : (
        <div className="research-tile-placeholder">
          {isResearchAudio(item) ? <FileAudio size={28} /> : <FileVideo size={28} />}
        </div>
      )}
    </div>
  );
}

export { ResearchThumbnail };
