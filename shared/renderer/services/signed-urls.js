import { requestInfera } from "./infera.js";

const RESEARCH_SIGNED_URL_CACHE_TTL_MS = 20 * 60 * 1000;

const RESEARCH_SIGNED_URL_CACHE_MAX = 600;

const RESEARCH_SIGNED_URL_CONCURRENCY = 8;

const researchSignedUrlCache = new Map();

const researchSignedUrlQueue = [];

let researchSignedUrlActiveCount = 0;

async function resolveResearchSignedUrl(token, path) {
  if (!path) return "";
  const cacheKey = `${String(token || "").slice(-18)}:${path}`;
  const cached = researchSignedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise || cached.url || "";
  }

  const promise = enqueueResearchSignedUrlRequest(async () => {
    const result = await requestInfera(path, { token, responseType: "redirect" });
    return result?.url || "";
  })
    .then((url) => {
      researchSignedUrlCache.set(cacheKey, {
        expiresAt: Date.now() + RESEARCH_SIGNED_URL_CACHE_TTL_MS,
        url
      });
      trimResearchSignedUrlCache();
      return url;
    })
    .catch((error) => {
      researchSignedUrlCache.delete(cacheKey);
      throw error;
    });

  researchSignedUrlCache.set(cacheKey, {
    expiresAt: Date.now() + RESEARCH_SIGNED_URL_CACHE_TTL_MS,
    promise
  });
  trimResearchSignedUrlCache();
  return promise;
}

function enqueueResearchSignedUrlRequest(run) {
  return new Promise((resolve, reject) => {
    researchSignedUrlQueue.push({ reject, resolve, run });
    pumpResearchSignedUrlQueue();
  });
}

function pumpResearchSignedUrlQueue() {
  while (researchSignedUrlActiveCount < RESEARCH_SIGNED_URL_CONCURRENCY && researchSignedUrlQueue.length > 0) {
    const task = researchSignedUrlQueue.shift();
    researchSignedUrlActiveCount += 1;
    Promise.resolve()
      .then(task.run)
      .then(task.resolve, task.reject)
      .finally(() => {
        researchSignedUrlActiveCount = Math.max(0, researchSignedUrlActiveCount - 1);
        pumpResearchSignedUrlQueue();
      });
  }
}

function trimResearchSignedUrlCache() {
  if (researchSignedUrlCache.size <= RESEARCH_SIGNED_URL_CACHE_MAX) return;
  const overflow = researchSignedUrlCache.size - RESEARCH_SIGNED_URL_CACHE_MAX;
  let removed = 0;
  for (const key of researchSignedUrlCache.keys()) {
    researchSignedUrlCache.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

export { RESEARCH_SIGNED_URL_CACHE_TTL_MS, RESEARCH_SIGNED_URL_CACHE_MAX, RESEARCH_SIGNED_URL_CONCURRENCY, researchSignedUrlCache, researchSignedUrlQueue, researchSignedUrlActiveCount, resolveResearchSignedUrl, enqueueResearchSignedUrlRequest, pumpResearchSignedUrlQueue, trimResearchSignedUrlCache };
