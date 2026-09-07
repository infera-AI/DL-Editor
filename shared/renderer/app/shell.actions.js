import { dlEditor } from "../services/desktop.js";
import { getUpdateMessage } from "./update.utils.js";

function createShellActions({
  setUpdateState,
  setNotice
}) {
  async function checkForUpdates() {
    setUpdateState({ status: "checking", message: "正在检查最新版本..." });

    try {
      const result = await dlEditor.checkForUpdates();
      setUpdateState({ ...result, message: getUpdateMessage(result) });
    } catch (error) {
      setUpdateState({
        status: "error",
        message: error.message || "无法检查更新，请稍后再试"
      });
    }
  }

  async function openUpdateLink(update) {
    const targetUrl = update?.downloadUrl || update?.releaseUrl;
    if (!targetUrl) return;

    try {
      await dlEditor.openExternal(targetUrl);
    } catch (error) {
      setUpdateState((current) => ({
        ...current,
        status: "error",
        message: error.message || "无法打开更新链接"
      }));
    }
  }

  async function revealMainLog() {
    try {
      const result = await dlEditor.revealMainLog();
      setNotice(result?.opened ? "已打开日志文件位置" : "无法打开日志文件位置");
    } catch (error) {
      setNotice(error.message || "无法打开日志文件位置");
    }
  }

  return { checkForUpdates, openUpdateLink, revealMainLog };
}

export { createShellActions };
