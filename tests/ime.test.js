const { chromium } = require("playwright");
const fs = require("fs");
const { i18nMock } = require("./i18n-mock");
const ext = (f) => fs.readFileSync(`${require("path").join(__dirname, "..", f)}`, "utf8");
const mock = `
  window.__clip = null;
  Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__clip = t; } } });
  window.Translator = { availability: async () => "available",
    create: async () => ({ translate: async () => "How to check other language settings for Chrome extensions on macOS", destroy(){} }) };`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  const setup = async () => {
    await page.goto("data:text/html,<meta charset=utf-8>");
    await page.setContent(`<h1 id="t" contenteditable="true">macOSでChrome拡張機能の他言語設定を確認する方法</h1>`);
    for (const c of [i18nMock("ja"), mock,ext("slug-rules.js"), ext("content.js")]) await page.addScriptTag({ content: c });
    await page.focus("#t");
    await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(t); getSelection().removeAllRanges(); getSelection().addRange(r); });
    await page.evaluate(() => window.__nanoSlug.run());
    await page.waitForTimeout(200);
  };
  const title = () => page.evaluate(() => t.textContent);

  // 1) 数字キー
  await setup();
  console.log("focus in popup:", await page.evaluate(() => document.activeElement?.hasAttribute("data-nano-slug")));
  await page.keyboard.press("2");
  await page.waitForTimeout(100);
  console.log("[key 2] clip:", await page.evaluate(() => window.__clip), "| title intact:", (await title()).startsWith("macOS"));

  // 2) IME変換入力をシミュレート(フォーカスが編集領域にあれば書き換わる)
  await setup();
  await cdp.send("Input.imeSetComposition", { text: "１", selectionStart: 1, selectionEnd: 1 });
  await cdp.send("Input.insertText", { text: "１" });
  await page.waitForTimeout(100);
  console.log("[IME] title intact:", (await title()).startsWith("macOS"), "| popup open:", await page.evaluate(() => !!document.querySelector("[data-nano-slug]")));

  // 3) Escでフォーカスと選択が戻る
  await page.keyboard.press("Escape");
  console.log("[Esc] focus back:", await page.evaluate(() => document.activeElement?.id), "| selection:", await page.evaluate(() => getSelection().toString().length > 0));
  await browser.close();
})();
