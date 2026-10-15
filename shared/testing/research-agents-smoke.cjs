// Run with Electron from a built platform directory. All API calls use fixtures.
const { app, BrowserWindow } = require("electron");
const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const platformRoot = path.resolve(process.argv[2] || process.cwd());
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "dl-research-test-")));
app.disableHardwareAcceleration();
app.on("window-all-closed", () => {});
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 1000, show: false, webPreferences: { preload: path.join(__dirname, "desktop-fixture.cjs"), contextIsolation: true, sandbox: true, offscreen: true, backgroundThrottling: false, additionalArguments: ["--fixture-research-agents", "--fixture-research-simulation"] } });
  const errors = [];
  win.webContents.on("console-message", (_event, level, message) => { if (level >= 3) errors.push(message); });
  win.webContents.session.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*"] }, (details, callback) => { errors.push(`Unexpected network: ${details.url}`); callback({ cancel: true }); });
  win.webContents.session.on("will-download", (_event, item) => item.cancel());
  const evaluate = (fn, ...args) => win.webContents.executeJavaScript(`(${fn.toString()})(...${JSON.stringify(args)})`);
  const waitFor = async (fn) => {
    const until = Date.now() + 10000;
    while (Date.now() < until) {
      if (errors.length) throw new Error(errors.join("\n"));
      if (await evaluate(fn)) return;
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw new Error(`Timed out: ${fn}`);
  };
  const click = (selector, label) => evaluate((selector, label) => {
    const node = [...document.querySelectorAll(selector)].find(node => node.textContent.includes(label));
    if (!node || node.disabled) throw new Error(`Unavailable: ${selector} ${label}`);
    node.click();
  }, selector, label);
  await win.loadFile(path.join(platformRoot, "dist/index.html"));
  await waitFor(() => document.querySelectorAll(".nav-item").length === 6 && !document.querySelector(".splash-screen"));
  await click(".nav-item", "Research");
  await waitFor(() => Boolean(document.querySelector(".research-page")));
  await click(".research-tabs button", "Chats");
  await waitFor(() => document.querySelectorAll(".research-chat-card").length === 5);
  assert.equal(await evaluate(() => document.querySelector(".research-chat-messages").textContent.includes("由 Laura 转交")), true);
  assert.equal(await evaluate(() => document.querySelectorAll(".research-chat-message-row").length), 3, "Candidate projections must not leave empty message rows");
  assert.equal(await evaluate(() => document.querySelector(".research-chat-messages").textContent.includes("TaskCandidateCard")), false);
  assert.equal(await evaluate(() => document.querySelector(".research-chat-messages").textContent.includes("候选任务：")), false);
  await click(".research-chat-detail-tabs button", "Activity");
  assert.equal(await evaluate(() => document.querySelector(".research-chat-activity").textContent.includes("laura_handoff")), true);
  assert.equal(await evaluate(() => document.querySelector(".research-chat-activity").textContent.includes("候选任务：核对发布清单")), true);
  assert.equal(await evaluate(() => document.querySelector(".research-chat-activity").textContent.includes("候选任务：整理会议纪要")), true);
  assert.equal(await evaluate(() => document.querySelectorAll(".research-chat-activity .research-record-card").length), 5, "Activity includes candidates and a message-only record without duplicates");
  assert.equal(await evaluate(() => document.querySelectorAll(".research-chat-activity button").length), 0);
  await click(".research-chat-detail-tabs button", "Conversation");
  if (process.env.DL_RESEARCH_SCREENSHOT) {
    await evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
    fs.writeFileSync(process.env.DL_RESEARCH_SCREENSHOT, (await win.webContents.capturePage()).toPNG());
  }
  await click(".research-agent-filter", "Laura");
  await click(".research-agent-filter", "Jane");
  await waitFor(() => document.querySelectorAll(".research-chat-card").length === 1 && document.querySelector(".chat-detail h2").textContent.includes("昨天"));
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(await evaluate(() => document.querySelector(".chat-detail h2").textContent.includes("昨天")), true, "slower Laura response must not replace Jane");
  await click(".research-actions button", "Export filtered");
  await waitFor(() => window.rendererFixture.calls().some(call => call.payload?.path?.includes("/chats/export")));
  assert.equal(await evaluate(() => { const call = window.rendererFixture.calls().find(call => call.payload?.path?.includes("/chats/export")); const body = typeof call.payload.body === "string" ? JSON.parse(call.payload.body) : call.payload.body; return body.assistant_kind; }), "jane");
  await click(".research-agent-filter", "Legacy");
  await waitFor(() => document.querySelector(".chat-detail h2")?.textContent.includes("早期"));
  assert.equal(await evaluate(() => document.querySelector(".research-chat-speaker").textContent.includes("Legacy / Unknown")), true);
  assert.equal(await evaluate(() => document.querySelectorAll(".research-chat-message-row").length), 1);
  await click(".research-chat-detail-tabs button", "Activity");
  assert.equal(await evaluate(() => document.querySelectorAll(".research-chat-activity .research-record-card").length), 20, "Legacy message-only candidates stay in Activity");
  await click(".research-chat-detail-tabs button", "Conversation");
  await click(".research-tabs button", "Simulation");
  await evaluate(() => { const element = document.querySelector('[aria-label="模拟受试用户"]'); element.value = "20"; element.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitFor(() => !document.querySelector(".research-simulation-setup button").disabled);
  await click(".research-simulation-setup button", "新建沙盒");
  await waitFor(() => document.querySelector('[aria-label="模拟环境"]').value !== "" && !document.querySelector(".research-simulation-composer textarea").disabled);
  await evaluate(() => { const element = document.querySelector(".research-simulation-composer textarea"); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(element, "请转交给 Dario"); element.dispatchEvent(new Event("input", { bubbles: true })); });
  await click(".research-simulation-composer button", "Send");
  await waitFor(() => Boolean(document.querySelector(".research-simulation-card-actions button:not(:disabled)")));
  assert.equal(await evaluate(() => document.querySelector(".research-simulation-messages").textContent.includes("TaskCandidateCard")), false);
  assert.equal(await evaluate(() => document.querySelector(".research-simulation-messages").innerText.includes("AgentHandoffCard")), false);
  await click(".research-simulation-card-actions button", "好的，转交");
  await waitFor(() => document.querySelector(".research-simulation-messages").textContent.includes("已在沙盒里创建任务"));
  assert.ok(await evaluate(() => document.querySelector(".research-simulation-messages").textContent.includes("由 Laura 转交")));
  await click(".research-simulation-chat .research-chat-detail-tabs button", "上下文");
  await waitFor(() => document.querySelector(".research-simulation-context").textContent.includes("任务副本（2）"));
  for (const name of ["Dario", "Jane", "Bella"]) {
    await click(".research-simulation-agent-picker button", name);
    await waitFor(() => !document.querySelector(".research-simulation-composer textarea").disabled);
    assert.ok(await evaluate((name) => document.querySelector(".research-simulation-composer textarea").placeholder.includes(name), name));
  }
  await evaluate(() => { const element = document.querySelector('[aria-label="模拟环境"]'); element.value = "legacy"; element.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitFor(() => document.querySelector(".research-simulation-composer textarea").disabled && [...document.querySelectorAll(".research-simulation-agent-picker button")].every(button => button.disabled));
  win.setSize(1000, 800);
  assert.equal(await evaluate(() => document.querySelector(".research-body").scrollWidth <= document.querySelector(".research-body").clientWidth), true, "Research should fit the window");
  assert.deepEqual(errors, []);
  console.log("Research renderer passed: agent filters, identity, handoff, activity, request race, export, legacy, simulation environments, four roles, interactive handoff, context and layout.");
  win.destroy(); app.exit(0);
}).catch(error => { console.error(error.stack || error); app.exit(1); });
