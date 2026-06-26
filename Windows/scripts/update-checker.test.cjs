const assert = require("assert");

const { buildNoReleaseResult, buildUpdateResult, compareVersions, selectDownloadAsset } = require("../src/main/updateChecker.cjs");

const release = {
  tag_name: "v1.2.0",
  html_url: "https://github.com/infera-AI/DL-Editor/releases/tag/v1.2.0",
  name: "DL Editor 1.2.0",
  published_at: "2026-06-26T08:00:00Z",
  assets: [
    {
      name: "DL-Editor-Mac-1.2.0-arm64.pkg",
      browser_download_url: "https://github.com/infera-AI/DL-Editor/releases/download/v1.2.0/pkg"
    },
    {
      name: "DL-Editor-Mac-1.2.0-arm64.dmg",
      browser_download_url: "https://github.com/infera-AI/DL-Editor/releases/download/v1.2.0/dmg"
    },
    {
      name: "DL-Editor-Windows-Setup-1.2.0.exe",
      browser_download_url: "https://github.com/infera-AI/DL-Editor/releases/download/v1.2.0/exe"
    },
    {
      name: "DL-Editor-Windows-Setup-1.2.0.exe.blockmap",
      browser_download_url: "https://github.com/infera-AI/DL-Editor/releases/download/v1.2.0/blockmap"
    }
  ]
};

assert.equal(compareVersions("1.2.0", "1.1.9"), 1);
assert.equal(compareVersions("v1.0.0", "1.0.0"), 0);
assert.equal(compareVersions("1.0.0", "1.0.1"), -1);

assert.equal(selectDownloadAsset(release, "darwin").name, "DL-Editor-Mac-1.2.0-arm64.dmg");
assert.equal(selectDownloadAsset(release, "win32").name, "DL-Editor-Windows-Setup-1.2.0.exe");

const macUpdate = buildUpdateResult({
  currentVersion: "1.0.0",
  platform: "darwin",
  release
});
assert.equal(macUpdate.status, "available");
assert.equal(macUpdate.latestVersion, "1.2.0");
assert.equal(macUpdate.downloadUrl, "https://github.com/infera-AI/DL-Editor/releases/download/v1.2.0/dmg");

const current = buildUpdateResult({
  currentVersion: "1.2.0",
  platform: "win32",
  release
});
assert.equal(current.status, "latest");
assert.equal(current.downloadUrl, "");

const noRelease = buildNoReleaseResult({ currentVersion: "1.0.0" });
assert.equal(noRelease.status, "no_release");
assert.equal(noRelease.currentVersion, "1.0.0");
assert.equal(noRelease.releaseUrl, "https://github.com/infera-AI/DL-Editor/releases");

console.log("Update checker tests passed.");
