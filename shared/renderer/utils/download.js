

function getResearchDownloadFilename(disposition, fallback = "research-export.zip") {
  const text = String(disposition || "");
  const utf8Match = text.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  return text.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
}

export { getResearchDownloadFilename };
