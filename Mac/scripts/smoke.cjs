const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = [
  "dist/index.html",
  "src/main/main.js",
  "src/main/preload.js",
  "src/renderer/App.jsx",
  "src/renderer/styles.css",
  "../shared/renderer/app/App.jsx",
  "../shared/build/vite.config.cjs"
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length) {
  console.error(`Missing required build files: ${missing.join(", ")}`);
  process.exit(1);
}

require("../../shared/testing/renderer-structure.cjs").validateBuiltAssets(root);
console.log("Smoke check passed.");
