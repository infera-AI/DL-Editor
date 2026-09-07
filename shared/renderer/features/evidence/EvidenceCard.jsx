import { getResearchEvidenceKind, getResearchEvidenceTimeLabel } from "./evidence.utils.js";
import { useEffect, useState } from "react";

function EvidenceCard({ evidence, resolveUrl, token }) {
  const [urls, setUrls] = useState({ cover: "", media: "" });
  const kind = getResearchEvidenceKind(evidence);
  const type = String(evidence?.evidence_type || kind || "text");
  const title = String(evidence?.title || evidence?.description || `${type} evidence`);
  const content = String(evidence?.content_text || "").trim();
  const description = String(evidence?.description || "").trim();
  const timeLabel = getResearchEvidenceTimeLabel(evidence);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      resolveUrl(token, evidence?.media_url),
      resolveUrl(token, evidence?.cover_url)
    ]).then(([media, cover]) => {
      if (!cancelled) setUrls({ media, cover });
    }).catch(() => {
      if (!cancelled) setUrls({ media: "", cover: "" });
    });
    return () => { cancelled = true; };
  }, [evidence?.cover_url, evidence?.media_url, resolveUrl, token]);

  const imageUrl = urls.media || urls.cover;
  return (
    <article className={`research-evidence-card ${kind}`}>
      <header><span>{type}</span><strong title={title}>{title}</strong>{timeLabel && <small>{timeLabel}</small>}</header>
      {kind === "image" && imageUrl && <a href={imageUrl} rel="noreferrer" target="_blank"><img alt={title} loading="lazy" src={imageUrl} /></a>}
      {kind === "video" && urls.media && <video controls playsInline poster={urls.cover || undefined} preload="metadata" src={urls.media} />}
      {kind === "audio" && urls.media && <audio controls preload="metadata" src={urls.media} />}
      {content && <p>{content}</p>}
      {!content && kind === "text" && description && <p>{description}</p>}
      {description && description !== content && description !== title && <div>{description}</div>}
    </article>
  );
}

export { EvidenceCard };
