

function getUpdateMessage(result) {
  if (result?.status === "available") {
    return `发现新版本 ${result.latestVersion}：${result.assetName || "安装包可下载"}`;
  }

  if (result?.status === "latest") {
    return `当前已是最新版本 ${result.latestVersion || result.currentVersion}`;
  }

  if (result?.status === "no_asset") {
    return `发现新版本 ${result.latestVersion}，但没有匹配当前系统的安装包`;
  }

  if (result?.status === "no_release") {
    return "当前还没有可用发布版本，请稍后再试";
  }

  return "无法读取更新状态";
}

export { getUpdateMessage };
