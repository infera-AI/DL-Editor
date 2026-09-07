import { requestInfera, resolveInferaUrl } from "../../services/infera.js";
import { buildResearchPath } from "../../services/research-path.js";
import { resolveResearchSignedUrl } from "../../services/signed-urls.js";

async function resolveResearchEvidenceUrl(token, rawUrl) {
  const normalized = String(rawUrl || "").trim();
  if (!normalized) return "";
  try {
    const url = new URL(normalized, resolveInferaUrl("/"));
    const keyframe = url.pathname.match(/^\/memory\/keyframes\/(\d+)\/content\/?$/);
    if (keyframe) return resolveResearchSignedUrl(token, buildResearchPath(`/keyframes/${keyframe[1]}/content`));
    const asset = url.pathname.match(/^\/memory\/assets\/(\d+)\/clip\/?$/);
    if (asset) {
      return resolveResearchSignedUrl(token, buildResearchPath(`/assets/${asset[1]}/video`, {
        start_ms: url.searchParams.get("start_ms"),
        end_ms: url.searchParams.get("end_ms")
      }));
    }
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return resolveResearchSignedUrl(token, normalized);
  } catch {
    return "";
  }
}

async function resolveConversationEvidenceUrl(token, rawUrl) {
  const normalized = String(rawUrl || "").trim();
  if (!normalized || !token) return "";
  try {
    const url = new URL(normalized, resolveInferaUrl("/"));
    const isProtectedMemoryMedia = /\/memory\/(?:keyframes\/\d+\/content|assets\/\d+\/clip)\/?$/i.test(url.pathname);
    if (isProtectedMemoryMedia) {
      const result = await requestInfera(url.toString(), { token, responseType: "redirect" });
      return result?.url || "";
    }
    if (/^https?:\/\//i.test(normalized)) return normalized;
    return resolveResearchSignedUrl(token, normalized);
  } catch {
    return "";
  }
}

export { resolveResearchEvidenceUrl, resolveConversationEvidenceUrl };
