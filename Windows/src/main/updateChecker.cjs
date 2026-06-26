const https = require("https");

const GITHUB_OWNER = "infera-AI";
const GITHUB_REPO = "DL-Editor";
const LATEST_RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

function normalizeVersion(value) {
  return String(value || "")
    .trim()
    .replace(/^v/i, "")
    .split("-")[0];
}

function compareVersions(left, right) {
  const leftParts = normalizeVersion(left).split(".").map((part) => Number(part));
  const rightParts = normalizeVersion(right).split(".").map((part) => Number(part));
  const length = Math.max(leftParts.length, rightParts.length, 3);

  for (let index = 0; index < length; index += 1) {
    const leftValue = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
    const rightValue = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

function getReleaseVersion(release) {
  return normalizeVersion(release?.tag_name || release?.name);
}

function scoreAsset(asset, platform) {
  const name = String(asset?.name || "").toLowerCase();
  if (!asset?.browser_download_url || name.endsWith(".blockmap") || name.endsWith(".yml")) return 0;

  if (platform === "darwin") {
    if (name.includes("dl-editor-mac") && name.endsWith(".dmg")) return 30;
    if (name.includes("dl-editor-mac") && name.endsWith(".pkg")) return 20;
    if (name.endsWith(".dmg")) return 10;
    if (name.endsWith(".pkg")) return 5;
  }

  if (platform === "win32") {
    if (name.includes("dl-editor-windows-setup") && name.endsWith(".exe")) return 30;
    if (name.includes("windows") && name.endsWith(".exe")) return 20;
    if (name.endsWith(".exe")) return 10;
  }

  return 0;
}

function selectDownloadAsset(release, platform = process.platform) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  let selected = null;
  let selectedScore = 0;

  for (const asset of assets) {
    const assetScore = scoreAsset(asset, platform);
    if (assetScore > selectedScore) {
      selected = asset;
      selectedScore = assetScore;
    }
  }

  return selected;
}

function buildUpdateResult({ currentVersion, platform = process.platform, release }) {
  const latestVersion = getReleaseVersion(release);
  if (!latestVersion) {
    throw new Error("GitHub release does not include a version.");
  }

  const releaseUrl = release?.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
  const base = {
    currentVersion,
    latestVersion,
    releaseName: release?.name || `DL Editor ${latestVersion}`,
    releaseUrl,
    publishedAt: release?.published_at || "",
    assetName: "",
    downloadUrl: ""
  };

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return { ...base, status: "latest" };
  }

  const asset = selectDownloadAsset(release, platform);
  if (!asset) {
    return { ...base, status: "no_asset" };
  }

  return {
    ...base,
    status: "available",
    assetName: asset.name,
    downloadUrl: asset.browser_download_url
  };
}

function buildNoReleaseResult({ currentVersion }) {
  return {
    status: "no_release",
    currentVersion,
    latestVersion: "",
    releaseName: "",
    releaseUrl: RELEASES_URL,
    publishedAt: "",
    assetName: "",
    downloadUrl: ""
  };
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "DL-Editor-Updater"
        },
        timeout: 15000
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = new Error(`GitHub returned ${response.statusCode}`);
            error.statusCode = response.statusCode;
            reject(error);
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("GitHub returned invalid update data."));
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("Update check timed out."));
    });
    request.on("error", reject);
  });
}

async function checkForUpdate({ currentVersion, platform = process.platform, apiUrl = LATEST_RELEASE_API_URL } = {}) {
  let release;
  try {
    release = await requestJson(apiUrl);
  } catch (error) {
    if (error.statusCode === 404) {
      return buildNoReleaseResult({ currentVersion });
    }
    throw error;
  }

  return buildUpdateResult({ currentVersion, platform, release });
}

module.exports = {
  LATEST_RELEASE_API_URL,
  buildNoReleaseResult,
  buildUpdateResult,
  checkForUpdate,
  compareVersions,
  selectDownloadAsset
};
