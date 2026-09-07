

async function saveResearchDownload(result, fallbackName) {
  if (result?.download_url) {
    const anchor = document.createElement("a");
    anchor.href = result.download_url;
    anchor.download = result.filename || fallbackName;
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  const contentType = result?.content_type || "application/zip";
  const filename = result?.filename || fallbackName;
  let blob = result?.blob;
  if (!blob && result?.base64) {
    const binary = window.atob(result.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    blob = new Blob([bytes], { type: contentType });
  }
  if (!blob) {
    throw new Error("导出响应缺少下载内容");
  }
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export { saveResearchDownload };
