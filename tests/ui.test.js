const { chromium } = require("playwright");
const fs = require("fs");
const ext = (f) => fs.readFileSync(`${require("path").join(__dirname, "..", f)}`, "utf8");

// モック: Translator / LanguageModel
const mock = (mode) => `
  window.__clip = null;
  Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__clip = t; } } });
  ${mode === "none" ? "" : `
  window.Translator = { availability: async () => "available",
    create: async () => ({ translate: async (t) => "How to automatically generate slugs in WordPress", destroy(){} }) };`}
  ${mode === "full" ? `
  window.LanguageModel = { availability: async () => "available",
    create: async () => ({ prompt: async () => JSON.stringify({ slugs: ["WordPress Auto Slug", "<b>auto-slug-wordpress</b>"] }), destroy(){} }) };` : ""}
  ${mode === "dl" ? `window.LanguageModel = { availability: async () => "downloadable", create: async () => ({}) };` : ""}
`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 300 }, deviceScaleFactor: 2 });
  for (const mode of ["full", "dl", "none"]) {
    await page.goto("data:text/html,<meta charset=utf-8>");
    await page.setContent(`<div style="padding:40px;font:20px sans-serif"><h1 id="t">WordPressでSlugを自動生成する方法</h1></div>`);
    await page.addScriptTag({ content: mock(mode) });
    await page.addScriptTag({ content: ext("slug-rules.js") });
    await page.addScriptTag({ content: ext("content.js") });
    await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById("t")); getSelection().removeAllRanges(); getSelection().addRange(r); });
    await page.evaluate(() => window.__nanoSlug.run());
    await page.waitForTimeout(300);
    const items = await page.evaluate(() => [...document.querySelector("[data-nano-slug]").shadowRoot.querySelectorAll(".item")].map(e => e.innerText.replace(/\n/g, " ")));
    const status = await page.evaluate(() => document.querySelector("[data-nano-slug]").shadowRoot.querySelector(".status").textContent + " | buttons:" + [...document.querySelector("[data-nano-slug]").shadowRoot.querySelectorAll("button")].map(b=>b.textContent).join(","));
    console.log(mode, JSON.stringify(items), status);
    await page.screenshot({ path: `${__dirname}/ui-${mode}.png` });
    if (mode === "full") {
      await page.keyboard.press("3");
      await page.waitForTimeout(100);
      console.log("clipboard:", await page.evaluate(() => window.__clip));
      await page.waitForTimeout(900);
      console.log("closed:", await page.evaluate(() => !document.querySelector("[data-nano-slug]")));
    }
  }
  await browser.close();
})();
