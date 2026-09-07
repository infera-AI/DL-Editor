

function getShellActionErrorMessage(result) {
  const message = typeof result === "string" ? result : result?.opened === false ? result.message : "";
  if (!message) {
    return "";
  }
  return message === "Path does not exist." ? "本地压制视频不存在，可能已被清理" : message;
}

export { getShellActionErrorMessage };
