const fs = require("fs");
const path = require("path");

// Preserve the existing source-level regression checks across the extracted modules.
function readRendererSource(platformRoot) {
  const rendererRoot = path.resolve(platformRoot, "../shared/renderer");
  const sources = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(jsx?|mjs)$/.test(entry.name)) sources.push(fs.readFileSync(file, "utf8"));
    }
  }
  visit(rendererRoot);
  return sources.join("\n\n");
}

function readRendererStyles(platformRoot) {
  function expand(file, ancestors = new Set()) {
    if (ancestors.has(file)) throw new Error(`Circular CSS import: ${file}`);
    const next = new Set([...ancestors, file]);
    return fs.readFileSync(file, "utf8").replace(/@import\s+"([^"]+)"\s*;/g, (_, relativePath) => expand(path.resolve(path.dirname(file), relativePath), next));
  }
  return expand(path.join(platformRoot, "src/renderer/styles.css"));
}

module.exports = { readRendererSource, readRendererStyles };
