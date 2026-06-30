const https = require("https");

const INFERA_API_BASE_URL = process.env.INFERA_API_BASE_URL || process.env.VITE_INFERA_API_BASE_URL || "https://api.infera.cn/api/infera";
const CLIENT_RELEASES_URL = `${INFERA_API_BASE_URL.replace(/\/+$/, "")}/client/releases`;
const LATEST_RELEASE_API_URL = `${CLIENT_RELEASES_URL}/latest`;
const RELEASES_URL = `${CLIENT_RELEASES_URL}/latest`;

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

function normalizeArch(value) {
  const arch = String(value || "").toLowerCase();
  if (arch === "x64" || arch === "x86_64" || arch === "amd64") return "x64";
  if (arch === "arm64" || arch === "aarch64") return "arm64";
  return arch;
}

function hasArchToken(name, arch) {
  if (arch === "arm64") return /(^|[^a-z0-9])arm64([^a-z0-9]|$)/.test(name);
  if (arch === "x64") return /(^|[^a-z0-9])(x64|x86_64|amd64)([^a-z0-9]|$)/.test(name);
  return false;
}

function getDarwinArchScore(name, arch) {
  const targetArch = normalizeArch(arch);
  if (targetArch !== "arm64" && targetArch !== "x64") return 0;

  const hasArm64 = hasArchToken(name, "arm64");
  const hasX64 = hasArchToken(name, "x64");
  if (targetArch === "arm64") {
    if (hasArm64) return 15;
    if (hasX64) return -1;
  }
  if (targetArch === "x64") {
    if (hasX64) return 15;
    if (hasArm64) return -1;
  }

  return hasArm64 || hasX64 ? -1 : 1;
}

function scoreAsset(asset, platform, arch = process.arch) {
  const name = String(asset?.name || "").toLowerCase();
  if (!asset?.browser_download_url || name.endsWith(".blockmap") || name.endsWith(".yml")) return 0;

  if (platform === "darwin") {
    const archScore = getDarwinArchScore(name, arch);
    if (archScore < 0) return 0;
    if ((name.includes("dl-studio-mac") || name.includes("dl-editor-mac")) && name.endsWith(".dmg")) return 30 + archScore;
    if ((name.includes("dl-studio-mac") || name.includes("dl-editor-mac")) && name.endsWith(".pkg")) return 20 + archScore;
    if (name.endsWith(".dmg")) return 10 + archScore;
    if (name.endsWith(".pkg")) return 5 + archScore;
  }

  if (platform === "win32") {
    if ((name.includes("dl-studio-windows-setup") || name.includes("dl-editor-windows-setup")) && name.endsWith(".exe")) return 30;
    if (name.includes("windows") && name.endsWith(".exe")) return 20;
    if (name.endsWith(".exe")) return 10;
  }

  return 0;
}

function selectDownloadAsset(release, platform = process.platform, arch = process.arch) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  let selected = null;
  let selectedScore = 0;

  for (const asset of assets) {
    const assetScore = scoreAsset(asset, platform, arch);
    if (assetScore > selectedScore) {
      selected = asset;
      selectedScore = assetScore;
    }
  }

  return selected;
}

function buildUpdateResult({ currentVersion, platform = process.platform, arch = process.arch, release }) {
  const latestVersion = getReleaseVersion(release);
  if (!latestVersion) {
    throw new Error("更新数据缺少版本号。");
  }

  const releaseUrl = release?.html_url || RELEASES_URL;
  const base = {
    currentVersion,
    latestVersion,
    releaseName: release?.name || `DL Studio ${latestVersion}`,
    releaseUrl,
    publishedAt: release?.published_at || "",
    assetName: "",
    downloadUrl: ""
  };

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return { ...base, status: "latest" };
  }

  const asset = selectDownloadAsset(release, platform, arch);
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
          "User-Agent": "DL-Studio-Updater"
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
            const error = new Error(`更新服务返回 ${response.statusCode}`);
            error.statusCode = response.statusCode;
            reject(error);
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("更新服务返回了无效数据。"));
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

async function checkForUpdate({
  currentVersion,
  platform = process.platform,
  arch = process.arch,
  apiUrl = LATEST_RELEASE_API_URL
} = {}) {
  let release;
  try {
    release = await requestJson(apiUrl);
  } catch (error) {
    if (error.statusCode === 404) {
      return buildNoReleaseResult({ currentVersion });
    }
    throw error;
  }

  return buildUpdateResult({ currentVersion, platform, arch, release });
}

module.exports = {
  LATEST_RELEASE_API_URL,
  buildNoReleaseResult,
  buildUpdateResult,
  checkForUpdate,
  compareVersions,
  selectDownloadAsset
};
