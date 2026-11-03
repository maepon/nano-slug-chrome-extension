const { chromium } = require("playwright");
const fs = require("fs");
const ext = (f) => fs.readFileSync(`${require("path").join(__dirname, "..", f)}`, "utf8");
// 翻訳500ms / セッション作成800ms / clone 50ms / 生成500ms
const mock = `
  window.__n = { create: 0, clone: 0 };
  const wait = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));
  Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => {} } });
  window.Translator = { availability: async () => "available",
    create: async () => ({ translate: () => wait(500, "How to make a Chrome extension"), destroy(){} }) };
  const sess = () => ({ prompt: () => wait(500, JSON.stringify({ slugs: ["chrome-extension-guide", "build-chrome-extension"] })),
    clone: async () => { __n.clone++; await wait(50); return sess(); }, destroy(){} });
  window.LanguageModel = { availability: async () => "available",
    create: async () => { __n.create++; await wait(800); return sess(); } };`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => { if (m.text().includes("timing")) logs.push(m.text()); });
  await page.goto("data:text/html,<meta charset=utf-8>");
  await page.setContent(`<h1 id="t">Chrome拡張機能の作り方</h1>`);
  for (const c of [mock, ext("slug-rules.js"), ext("content.js")]) await page.addScriptTag({ content: c });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(t); getSelection().removeAllRanges(); getSelection().addRange(r); });
    const t0 = Date.now();
    await page.evaluate(() => window.__nanoSlug.run());
    const items = await page.evaluate(() => [...document.querySelector("[data-nano-slug]").shadowRoot.querySelectorAll(".item")].map(e => e.innerText.replace(/\n/g, " ")));
    console.log(`run${i + 1}: ${Date.now() - t0}ms`, JSON.stringify(items));
    await page.keyboard.press("Escape");
  }
  console.log("counts:", JSON.stringify(await page.evaluate(() => __n)));
  logs.forEach((l) => console.log(l));
  await browser.close();
})();
