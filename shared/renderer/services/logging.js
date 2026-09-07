import { dlEditor } from "./desktop.js";

function logRendererEvent(message, details = {}, level = "info") {
  try {
    void dlEditor.writeLog?.({ details, level, message });
  } catch {
    // Renderer logging must never block UI state updates.
  }
}

export { logRendererEvent };
