

function getFileNameFromPath(value) {
  return String(value || "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop() || "video";
}

function isSamePath(left, right) {
  return String(left || "") === String(right || "");
}

export { getFileNameFromPath, isSamePath };
