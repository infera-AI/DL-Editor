const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

function validateRendererStructure(platformRoot) {
  const rendererRoot = path.resolve(platformRoot, "../shared/renderer");
  const platformRequire = createRequire(path.join(platformRoot, "package.json"));
  const parser = platformRequire("@babel/parser");
  const graph = new Map();
  const relativeName = file => path.relative(rendererRoot, file).split(path.sep).join("/");

  function visitDirectory(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { visitDirectory(file); continue; }
      if (!/\.(jsx?|mjs)$/.test(entry.name)) continue;
      const ast = parser.parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] });
      const dependencies = [];
      for (const node of ast.program.body) {
        if (!node.source?.value?.startsWith(".")) continue;
        const target = path.resolve(directory, node.source.value);
        assert.ok(fs.existsSync(target), `Missing import in ${relativeName(file)}: ${node.source.value}`);
        // Windows alone would otherwise miss a case mismatch that fails on macOS CI.
        for (let current = target; current !== rendererRoot; current = path.dirname(current)) {
          assert.ok(current.startsWith(rendererRoot + path.sep), `Source escapes renderer: ${target}`);
          assert.ok(fs.readdirSync(path.dirname(current)).includes(path.basename(current)), `Import case mismatch: ${target}`);
        }
        const sourceName = relativeName(file);
        const targetName = relativeName(target);
        if (/^(services|utils|hooks|components|features)\//.test(sourceName)) {
          assert.ok(!targetName.startsWith("pages/"), `Shared module depends on a page: ${sourceName} -> ${targetName}`);
        }
        if (sourceName.startsWith("pages/") && targetName.startsWith("pages/")) {
          assert.equal(sourceName.split("/")[1], targetName.split("/")[1], `Cross-page import: ${sourceName} -> ${targetName}`);
        }
        dependencies.push(target);
      }
      graph.set(file, dependencies);
    }
  }
  visitDirectory(rendererRoot);
  const visited = new Set();
  const active = new Set();
  function visit(file) {
    assert.ok(!active.has(file), `Circular renderer dependency: ${relativeName(file)}`);
    if (visited.has(file)) return;
    active.add(file);
    for (const dependency of graph.get(file) || []) visit(dependency);
    active.delete(file);
    visited.add(file);
  }
  for (const file of graph.keys()) visit(file);
  return graph.size;
}

function validateBuiltAssets(platformRoot) {
  const distRoot = path.join(platformRoot, "dist");
  const html = fs.readFileSync(path.join(distRoot, "index.html"), "utf8");
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1]);
  assert.ok(assets.some(asset => asset.endsWith(".js")), "Missing renderer JavaScript");
  assert.ok(assets.some(asset => asset.endsWith(".css")), "Missing renderer stylesheet");
  for (const asset of assets) {
    assert.ok(asset.startsWith("./"), `Asset must load from an installed file:// page: ${asset}`);
    const file = path.resolve(distRoot, asset);
    assert.ok(file.startsWith(distRoot + path.sep) && fs.existsSync(file), `Missing built asset: ${asset}`);
  }
}

module.exports = { validateRendererStructure, validateBuiltAssets };
