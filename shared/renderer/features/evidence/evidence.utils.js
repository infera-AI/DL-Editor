

function getResearchEvidenceKind(evidence) {
  const type = String(evidence?.evidence_type || "").trim().toLowerCase();
  const mime = String(evidence?.mime || "").trim().toLowerCase();
  const variant = String(evidence?.metadata?.display_variant || "").trim().toLowerCase();
  const mediaUrl = String(evidence?.media_url || "").toLowerCase();
  if (mime.startsWith("image/") || ["image", "frame", "keyframe", "snapshot", "still"].includes(type) || variant.includes("frame")) return "image";
  if (mime.startsWith("audio/") || type === "audio" || /\.(mp3|m4a|ogg|opus|wav)(?:[?#]|$)/.test(mediaUrl)) return "audio";
  if (mime.startsWith("video/") || type === "video" || variant.includes("video") || /\.(mp4|mov|m4v|webm)(?:[?#]|$)/.test(mediaUrl)) return "video";
  return "text";
}

function formatResearchEvidenceOffset(value) {
  if (value === null || value === undefined || value === "") return "";
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getResearchEvidenceTimeLabel(evidence) {
  const metadataLabel = String(evidence?.metadata?.time_label || "").trim();
  if (metadataLabel) return metadataLabel;
  const start = formatResearchEvidenceOffset(evidence?.start_ms);
  const end = formatResearchEvidenceOffset(evidence?.end_ms);
  return start && end && start !== end ? `${start} - ${end}` : start || end;
}

export { getResearchEvidenceKind, formatResearchEvidenceOffset, getResearchEvidenceTimeLabel };
