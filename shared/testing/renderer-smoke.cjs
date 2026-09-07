// Usage from a platform directory after npm run build:
//   node_modules/.bin/electron ../shared/testing/renderer-smoke.cjs .
const { app, BrowserWindow } = require("electron");
const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const platformRoot = path.resolve(process.argv[2] || process.cwd());
const devUrl = /^http:\/\/127\.0\.0\.1:\d+\/?$/.test(process.argv[3] || "") ? process.argv[3] : null;
const distRoot = path.resolve(devUrl ? path.join(platformRoot, "dist") : process.argv[3] || path.join(platformRoot, "dist"));
const platform = path.basename(platformRoot) === "Mac" ? "darwin" : "win32";
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "dl-renderer-test-")));
app.disableHardwareAcceleration();
app.on("window-all-closed", () => {});

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1400, height: 960, show: false,
    webPreferences: {
      preload: path.join(__dirname, "desktop-fixture.cjs"),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false,
      offscreen: true,
      partition: `renderer-fixture-${Date.now()}`,
      additionalArguments: [`--fixture-platform=${platform}`]
    }
  });
  const errors = [];
  win.webContents.on("console-message", (_event, level, message) => { if (level >= 3) errors.push(message); });
  // A test must never call real API endpoints, upload a file, or delete user data.
  win.webContents.session.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*"] }, (details, callback) => {
    if (devUrl && new URL(details.url).origin === new URL(devUrl).origin) { callback({ cancel: false }); return; }
    errors.push(`Unexpected network request: ${details.url}`);
    callback({ cancel: true });
  });
  const evaluate = (fn, ...args) => win.webContents.executeJavaScript(`(${fn.toString()})(...${JSON.stringify(args)})`);
  const waitFor = async (fn, label) => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (await evaluate(fn)) return;
      if (errors.length) throw new Error(errors.join("\n"));
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw new Error(`Timed out: ${label}`);
  };
  const click = (selector, text) => evaluate((selector, text) => {
    const element = [...document.querySelectorAll(selector)].find(node => !text || node.textContent.trim() === text);
    if (!element || element.disabled) throw new Error(`Button unavailable: ${selector} ${text || ""}`);
    element.click();
  }, selector, text);
  const input = (selector, value) => evaluate((selector, value) => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`Input missing: ${selector}`);
    const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, selector, value);

  if (devUrl) await win.loadURL(devUrl);
  else await win.loadFile(path.join(distRoot, "index.html"));
  await waitFor(() => document.querySelectorAll(".nav-item").length === 6 && !document.querySelector(".splash-screen"), "application startup");
  assert.equal(await evaluate(() => document.querySelector(".app-shell").className.includes(`platform-${window.dlEditor.platform}`)), true);
  assert.equal(await evaluate(() => document.querySelector(".path-button").textContent.trim()), "C:/fixture/output");
  if (process.env.DL_RENDERER_SCREENSHOT) {
    await waitFor(() => Number(getComputedStyle(document.querySelector(".app-shell")).opacity) >= 0.999, "startup fade completes");
    await evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
    await evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(process.env.DL_RENDERER_SCREENSHOT, (await win.webContents.capturePage()).toPNG());
  }

  const originalTheme = await evaluate(() => document.documentElement.dataset.theme);
  await click('.window-actions button[title="切换深色主题"]');
  await waitFor(() => document.documentElement.dataset.theme === "dark", "theme switch");
  assert.equal(originalTheme, "light");
  assert.equal(await evaluate(() => localStorage.getItem("dl-studio-theme")), "dark");

  await click(".queue-toolbar .secondary-button");
  await waitFor(() => document.querySelectorAll(".queue-item").length === 1, "video selection");
  await click(".queue-batch-actions .primary-button");
  await waitFor(() => window.rendererFixture.calls().some(call => call.method === "startBatch"), "batch start");
  await click(".queue-batch-actions .action-button");
  await waitFor(() => document.querySelector(".queue-batch-actions .action-button").textContent.trim() === "继续", "batch pause");
  await click(".queue-batch-actions .action-button");
  await waitFor(() => document.querySelector(".queue-batch-actions .action-button").textContent.trim() === "暂停", "batch resume");

  await click(".nav-item", "Cloud");
  await waitFor(() => Boolean(document.querySelector(".cloud-drive")), "Cloud page");
  await evaluate(() => window.rendererFixture.emit("job", { id: "fixture-job", status: "done", outputPath: "C:/fixture/output/2026_09_07_10_00_00.mp4", targetFps: 2 }));
  await evaluate(() => window.rendererFixture.emit("batch", { status: "finished", completed: 1, failed: 0, outputDirectory: "C:/fixture/output" }));
  await waitFor(() => window.rendererFixture.calls().some(call => call.method === "uploadInferaVideo"), "automatic transfer while Editor is unmounted");

  await click(".nav-item", "Guess");
  await waitFor(() => Boolean(document.querySelector(".guess-page")), "Guess page");
  await click(".nav-item", "Research");
  await waitFor(() => Boolean(document.querySelector(".research-page")), "Research permission and page");
  await click(".nav-item", "Delphi");
  await waitFor(() => Boolean(document.querySelector(".conversation-composer textarea:not(:disabled)")), "Delphi conversation modes");
  await input(".conversation-composer textarea", "Fixture question");
  await click(".conversation-composer button[type=submit]");
  await waitFor(() => [...document.querySelectorAll(".conversation-message")].some(node => node.textContent.includes("Fixture answer")), "conversation stream");

  await click(".nav-item", "Engine");
  await waitFor(() => Boolean(document.querySelector(".engine-gate")), "Engine gate");
  await input('.engine-gate input[type=password]', "111111");
  await click('.engine-gate button[type=submit]');
  await waitFor(() => Boolean(document.querySelector(".engine-workspace")), "Engine unlock");
  await click(".nav-item", "Editor");
  await waitFor(() => document.querySelectorAll(".queue-item").length === 1, "Editor job preservation");
  assert.equal(await evaluate(() => window.rendererFixture.subscriptions().job), 1, "page navigation must not duplicate desktop subscriptions");
  assert.ok(await evaluate(() => JSON.parse(localStorage.getItem("dl-studio-transfer-queue") || "[]").length > 0), "automatic queue must be persisted");
  await evaluate(() => window.rendererFixture.finishUpload());
  await waitFor(() => window.rendererFixture.calls().some(call => call.method === "deleteLocalFile"), "automatic cleanup through mocked desktop bridge");
  await evaluate(() => window.rendererFixture.expireNextRepositoryRequest());
  await click(".nav-item", "Cloud");
  await waitFor(() => JSON.parse(localStorage.getItem("dl-studio-auth") || "null")?.token === "fixture-refreshed", "401 token refresh and persistence");
  await click(".profile-button");
  await waitFor(() => Boolean(document.querySelector(".login-account")), "account dialog");
  await click(".login-account button");
  await waitFor(() => Boolean(document.querySelector(".login-form")), "logout");
  assert.equal(await evaluate(() => localStorage.getItem("dl-studio-auth")), null);
  await input('.login-form input[name="identifier"]', "fixture");
  await input('.login-form input[type="password"]', "fixture-password");
  await click('.login-form button[type="submit"]');
  await waitFor(() => !document.querySelector(".login-form") && Boolean(document.querySelector(".profile-initial")), "login and Cloud refresh callback");
  assert.equal(await evaluate(() => JSON.parse(localStorage.getItem("dl-studio-auth")).token), "renderer-fixture-token");
  assert.deepEqual(errors, []);
  console.log(`${path.basename(platformRoot)} renderer smoke passed (${devUrl ? "Vite dev" : "file:// assets"}): six pages, theme, batch pause/resume, background transfers, persistence, conversation stream, Engine gate, subscription lifetime, token refresh and logout/login.`);
  win.destroy();
  app.exit(0);
}).catch(error => {
  console.error(error.stack || error);
  app.exit(1);
});
