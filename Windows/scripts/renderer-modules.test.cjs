const path = require("path");
const { validateRendererStructure } = require("../../shared/testing/renderer-structure.cjs");
const count = validateRendererStructure(path.resolve(__dirname, ".."));
console.log(`Renderer structure passed: ${count} modules, exact import paths, page boundaries and no cycles.`);
