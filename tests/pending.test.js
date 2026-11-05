const { chromium } = require("playwright");
const fs = require("fs");
const { i18nMock } = require("./i18n-mock");
const ext = (f) => fs.readFileSync(`${require("path").join(__dirname, "..", f)}`, "utf8");
const mock = (en, ai) => `
  window.__clip = null;
  Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__clip = t; } } });
  window.Translator = { availability: async () => "available",
    create: async () => ({ translate: async () => ${JSON.stringify(en)}, destroy(){} }) };
  window.LanguageModel = { availability: async () => "available",
    create: async () => ({ prompt: () => new Promise(r => setTimeout(() => r(JSON.stringify({ slugs: ${JSON.stringify(ai)} })), 2500)), destroy(){} }) };`;
const rows = (page) => page.evaluate(() => [...document.querySelector("[data-nano-slug]").shadowRoot.querySelectorAll(".item")].map(e => e.innerText.replace(/\n/g, " ")));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 760, height: 260 }, deviceScaleFactor: 2 });
  const run = async (ja, en, ai) => {
    await page.goto("data:text/html,<meta charset=utf-8>");
    await page.setContent(`<h1 id="t" contenteditable style="font:28px sans-serif;margin:30px">${ja}</h1>`);
    for (const c of [i18nMock("ja"), mock(en, ai),ext("slug-rules.js"), ext("content.js")]) await page.addScriptTag({ content: c });
    await page.focus("#t");
    await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(t); getSelection().removeAllRanges(); getSelection().addRange(r); });
    await page.evaluate(() => { window.__nanoSlug.run(); });
  };

  // A: 直訳+短縮あり → AI枠1つ
  await run("macOSでChrome拡張機能の他言語設定を確認する方法", "How to check other language settings for Chrome extensions on macOS", ["chrome-extension-language-macos", "x"]);
  await page.waitForTimeout(1200);
  console.log("A 待機中:", JSON.stringify(await rows(page)));
  await page.screenshot({ path: __dirname + "/pending-wait.png" });
  await page.keyboard.press("3");
  console.log("A 待機中に3:", await page.evaluate(() => window.__clip), "| まだ開いている:", await page.evaluate(() => !!document.querySelector("[data-nano-slug]")));
  await page.waitForTimeout(1600);
  console.log("A 完了:", JSON.stringify(await rows(page)));
  await page.screenshot({ path: __dirname + "/pending-done.png" });

  // B: 短縮なし → AI枠2つ、AIの1つが重複 → 余った枠は消える
  await run("Google Meet Chat to Clipboardの動作について", "About the behavior of Google Meet Chat to Clipboard", ["behavior-google-meet-chat-clipboard", "meet-chat-clipboard-behavior"]);
  await page.waitForTimeout(500);
  console.log("B 待機中:", JSON.stringify(await rows(page)));
  await page.waitForTimeout(2300);
  console.log("B 完了:", JSON.stringify(await rows(page)));
  await page.keyboard.press("2");
  console.log("B 2でコピー:", await page.evaluate(() => window.__clip));
  await browser.close();
})();
