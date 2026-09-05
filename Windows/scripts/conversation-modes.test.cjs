const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function main() {
  const modes = await import(pathToFileURL(path.join(__dirname, "../src/renderer/conversation-modes.mjs")));
  const future = {
    mode: "future_v2", label: "Future mode", description: "Discovered, not hard-coded",
    enabled: true, capabilities: { stream: true },
    parameters: { top_k: { supported: true, default: 7 }, thinking_level: { supported: false } }
  };
  const catalog = modes.normalizeQueryModeCatalog({
    default_mode: "agent", modes: [...modes.LEGACY_QUERY_MODES.modes, { ...future, mode: "codex", parameters: {} }, future]
  });
  assert.equal(catalog.modes.length, 4);
  assert.equal(catalog.modes[3].label, "Future mode");
  for (const mode of ["agent", "plain", "codex", "future_v2"]) {
    assert.equal(modes.normalizeConversationQueryMode(mode), mode);
    const item = catalog.modes.find((item) => item.mode === mode);
    assert.equal(modes.canUseQueryMode(item), true);
    const sessions = [{ session_code: "1", query_mode: mode }, { query_mode: "unrelated" }, {}];
    assert.deepEqual(modes.normalizeConversationSessions(sessions, mode), [sessions[0]]);
    assert.deepEqual(modes.normalizeConversationSessions({ sessions }, mode), [sessions[0]]);
    assert.deepEqual(modes.normalizeConversationSessions({ items: sessions }, mode), [sessions[0]]);
  }
  assert.deepEqual(modes.conversationModeParameters(catalog.modes[0], "2"), { thinking_level: 2, top_k: 3 });
  assert.deepEqual(modes.conversationModeParameters(catalog.modes[1], "2"), { top_k: 3 });
  assert.deepEqual(modes.conversationModeParameters(catalog.modes[2], "2"), {});
  assert.deepEqual(modes.conversationModeParameters(future, "2"), { top_k: 7 });
  assert.equal(modes.canUseQueryMode({ ...future, enabled: false }), false);
  assert.equal(modes.canUseQueryMode({ ...future, capabilities: { stream: false } }), false);
  for (const mode of ["", "../plain", "Codex", "plain?x=1", "a".repeat(17), null]) {
    assert.throws(() => modes.normalizeConversationQueryMode(mode));
  }
  assert.throws(() => modes.normalizeQueryModeCatalog({ default_mode: "agent", modes: [future, future] }));
  assert.throws(() => modes.normalizeQueryModeCatalog({ result: catalog }));

  let response = catalog;
  let error = null;
  const loader = modes.createQueryModeLoader(async (route, { token }) => {
    assert.equal(route, "/conversation/query-modes");
    assert.ok(token);
    if (error) throw error;
    return response;
  });
  assert.equal((await loader("user-a")).catalog.modes.length, 4);
  error = new Error("network unavailable");
  assert.match((await loader("user-a")).warning, /上次结果/);
  await assert.rejects(loader("user-b"), /network unavailable/);
  error = Object.assign(new Error("Forbidden"), { status: 403 });
  await assert.rejects(loader("user-a"), /Forbidden/);
  error = new Error("Error invoking remote method: 请求失败 (404)：Not Found");
  const legacy = await loader("user-a");
  assert.deepEqual(legacy.catalog.modes.map((item) => item.mode), ["plain", "agent"]);
  assert.match(legacy.warning, /兼容模式/);
  error = null;
  response = { ...catalog, modes: [] };
  assert.deepEqual((await loader("user-a")).catalog.modes, []);

  // Exercise the actual Electron allow-list expression, including future modes.
  const source = fs.readFileSync(path.join(__dirname, "../src/main/main.js"), "utf8");
  const guard = source.split("\n").find((line) => line.includes(".test(requestPath)") && line.includes("conversation"));
  const expression = guard.slice(guard.indexOf("!")+1, guard.indexOf(".test(requestPath)"));
  const routePattern = new Function("return " + expression)();
  for (const mode of ["plain", "agent", "codex", "future_v2"]) {
    assert.equal(routePattern.test("/conversation/sessions/new/input/mode/" + mode + "/stream"), true);
  }
  for (const route of [
    "https://evil.test/conversation/sessions/new/input/mode/codex/stream",
    "/conversation/sessions/new/input/mode/../stream",
    "/conversation/sessions/new/input/mode/codex/stream?target=evil",
    "/conversation/sessions/new/input/mode/codex%2fstream/stream"
  ]) assert.equal(routePattern.test(route), false);
  console.log("Conversation modes: discovery, parameters, isolation, fallback and IPC guards passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
