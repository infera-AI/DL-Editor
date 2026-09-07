import { buildEngineMediaUrl, getEngineMediaSegmentLabel } from "../engine.utils.js";
import { FileAudio, Video } from "lucide-react";
import { useEffect, useState } from "react";

function EngineMediaPreview({ mediaProxyUrl, rawRef }) {
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [mediaState, setMediaState] = useState({ status: "idle", kind: "video" });
  const src = rawRef?.asset_id ? buildEngineMediaUrl(rawRef, mediaProxyUrl) : "";

  useEffect(() => {
    setPlaybackFailed(false);
    if (!src) {
      setMediaState({ status: "idle", kind: "video" });
      return undefined;
    }

    const controller = new AbortController();
    const mediaProbeUrl = src.split("#")[0];
    setMediaState({ status: "loading", kind: "video" });

    fetch(mediaProbeUrl, { method: "HEAD", signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`media unavailable (${response.status})`);
        }
        const contentType = response.headers.get("content-type") || "";
        setMediaState({
          status: "ready",
          kind: contentType.startsWith("audio/") ? "audio" : "video"
        });
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setMediaState({ status: "error", kind: "video" });
        }
      });

    return () => controller.abort();
  }, [src]);

  if (!rawRef?.asset_id) {
    return null;
  }

  return (
    <div className="engine-media-preview">
      <div className="engine-media-caption">
        {mediaState.kind === "audio" ? <FileAudio size={14} /> : <Video size={14} />}
        <span>{getEngineMediaSegmentLabel(rawRef)}</span>
      </div>
      {!src ? (
        <div className="engine-media-placeholder">视频代理未就绪</div>
      ) : mediaState.status === "loading" ? (
        <div className="engine-media-placeholder">正在读取媒体</div>
      ) : mediaState.status === "error" || playbackFailed ? (
        <div className="engine-media-placeholder">媒体源暂不可用</div>
      ) : mediaState.kind === "audio" ? (
        <div className="engine-audio-frame">
          <audio controls onError={() => setPlaybackFailed(true)} preload="metadata" src={src} />
        </div>
      ) : (
        <div className="engine-video-frame">
          <video controls onError={() => setPlaybackFailed(true)} preload="metadata" src={src} />
        </div>
      )}
    </div>
  );
}

export { EngineMediaPreview };
