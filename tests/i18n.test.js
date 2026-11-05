// 文言の切り替え(chrome.i18n): 静的な整合、ポップアップ(ja/en)、右クリックメニュー、実物の拡張の読み込み
const { chromium } = require("playwright");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { i18nMock, makeGetMessage, loadMessages } = require("./i18n-mock");

const ROOT = path.join(__dirname, "..");
const ext = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

let fail = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log(`OK   ${name}`);
  else { fail++; console.log(`FAIL ${name}\n     actual:   ${a}\n     expected: ${e}`); }
}
const git = (...args) => spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
const gitLines = (...args) => git(...args).stdout.split("\n").filter(Boolean);

const LOCALES = fs.readdirSync(path.join(ROOT, "_locales"));
const EN = loadMessages("en");
const JA_TITLE = "WordPressでSlugを自動生成する方法";
const EN_TEXT = "How to automatically generate slugs in WordPress";

// ---------- 静的チェック ----------
function checkScripts() {
  const pkg = JSON.parse(ext("package.json"));
  eq("AC-1 test に i18n.test.js", pkg.scripts.test.includes("node tests/i18n.test.js"), true);
  eq("AC-1 test:i18n", pkg.scripts["test:i18n"], "node tests/i18n.test.js");
}

function checkManifest() {
  const m = JSON.parse(ext("manifest.json"));
  eq("AC-3 default_locale", m.default_locale, "en");
  eq("AC-3 description", m.description, "__MSG_extDescription__");
  eq("AC-3 command description", m.commands["generate-slug"].description, "__MSG_generateSlug__");
  eq("AC-4 permissions", m.permissions, ["activeTab", "scripting", "contextMenus", "clipboardWrite"]);
  eq("AC-4 all_urls / host_permissions なし", /all_urls|host_permissions/.test(ext("manifest.json")), false);
}

function checkNoJapaneseLiterals() {
  const re = "^(?:(?!//).)*[\"\\x60](?:(?!//)[^\"\\x60])*[\\p{Hiragana}\\p{Katakana}\\p{Han}]";
  eq("AC-5 コード中に日本語の文字列なし", gitLines("grep", "-n", "-P", re, "--", "content.js", "background.js", "manifest.json"), []);
}

function checkLocales() {
  const enKeys = Object.keys(EN).sort();
  const phNames = (m) => Object.keys(m.placeholders || {}).map((s) => s.toLowerCase()).sort();
  for (const loc of LOCALES) {
    const msgs = loadMessages(loc);
    eq(`AC-7 ${loc}: キーの集合`, Object.keys(msgs).sort(), enKeys);
    eq(`AC-7 ${loc}: placeholders の名前`, enKeys.map((k) => phNames(msgs[k])), enKeys.map((k) => phNames(EN[k])));
    const missing = [];
    for (const [k, v] of Object.entries(msgs)) {
      for (const [, name] of v.message.replace(/\$\$/g, "").matchAll(/\$([A-Za-z0-9_@]+)\$/g)) {
        if (!phNames(v).includes(name.toLowerCase())) missing.push(`${k}:${name}`);
      }
    }
    eq(`AC-7 ${loc}: $NAME$ がすべて placeholders にある`, missing, []);
    let ok = true;
    try { new Intl.Locale(msgs.displayLocale.message); } catch (_) { ok = false; }
    eq(`AC-7 ${loc}: displayLocale が Intl.Locale で使える`, ok, true);
  }
}

function checkKeyUsage() {
  const used = new Set();
  const nonLiteral = [];
  for (const f of ["content.js", "background.js"]) {
    const src = ext(f);
    for (const re of [/\bt\(/g, /\bgetMessage\(/g]) {
      for (const m of src.matchAll(re)) {
        const rest = src.slice(m.index + m[0].length);
        const lit = /^\s*"([^"]+)"/.exec(rest);
        if (lit) used.add(lit[1]);
        else {
          const line = src.slice(0, m.index).split("\n").length;
          // t の定義(getMessage(key, ...))だけは許す
          if (!/^\s*key\b/.test(rest)) nonLiteral.push(`${f}:${line}`);
        }
      }
    }
  }
  for (const [, key] of ext("manifest.json").matchAll(/__MSG_(\w+)__/g)) used.add(key);
  const enKeys = Object.keys(EN);
  eq("AC-8 使うキーがすべて en にある", [...used].filter((k) => !enKeys.includes(k)), []);
  eq("AC-8 en のキーがすべて使われている", enKeys.filter((k) => !used.has(k)), []);
  eq("AC-8 文字列リテラルでない t() / getMessage() なし", nonLiteral, []);
}

function checkUnchanged() {
  eq("AC-14 変えないファイル", gitLines("diff", "--stat", "main", "--", "slug-rules.js", "tests/rules.test.js", "tests/real.test.js"), []);
  eq("AC-14 SYSTEM_PROMPT / navigator.languages", gitLines("grep", "-n", "-E", "SYSTEM_PROMPT = |navigator\\.languages", "--", "content.js").length, 2);
}

function checkDocs() {
  for (const f of ["README.md", "CLAUDE.md"]) {
    eq(`AC-15 ${f} に _locales`, gitLines("grep", "-n", "-F", "_locales", "--", f).length > 0, true);
  }
}

// ---------- 右クリックメニュー ----------
function checkContextMenu(first, second) {
  let lang = first;
  let menus = [];
  const dup = [];
  const fires = {};
  const reg = (name) => ({ addListener: (f) => { fires[name] = f; } });
  const chrome = {
    runtime: { onInstalled: reg("installed"), onStartup: reg("startup") },
    commands: { onCommand: reg("command") },
    scripting: {},
    contextMenus: {
      onClicked: reg("clicked"),
      removeAll: (cb) => { menus = []; if (cb) { cb(); return undefined; } return Promise.resolve(); },
      create: (p) => { if (menus.some((m) => m.id === p.id)) dup.push(p.id); else menus.push(p); }
    },
    i18n: { getMessage: (k, s) => makeGetMessage(lang)(k, s) }
  };
  vm.runInNewContext(ext("background.js"), { chrome, console });
  const title = (l) => makeGetMessage(l)("generateSlug");
  fires.installed();
  eq(`AC-12 ${first}→${second}: onInstalled`, menus.map((m) => m.title), [title(first)]);
  lang = second;
  fires.startup();
  eq(`AC-12 ${first}→${second}: onStartup で題名が変わる`, menus.map((m) => m.title), [title(second)]);
  fires.startup();
  eq(`AC-12 ${first}→${second}: 二重登録の失敗なし`, [menus.length, dup], [1, []]);
}

// ---------- 実物の拡張 ----------
async function checkRealExtension() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nano-slug-i18n-"));
  let context;
  try {
    context = await chromium.launchPersistentContext(dir, {
      channel: "chromium",
      headless: true,
      args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`]
    });
    const sw = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker", { timeout: 15000 });
    const keys = Object.keys(EN);
    const real = await sw.evaluate((keys) => ({
      locale: chrome.i18n.getMessage("displayLocale"),
      description: chrome.runtime.getManifest().description,
      command: chrome.runtime.getManifest().commands["generate-slug"].description,
      messages: Object.fromEntries(keys.map((k) => [k, chrome.i18n.getMessage(k, ["X"])]))
    }), keys);
    eq("AC-13 displayLocale が en か ja", ["en", "ja"].includes(real.locale), true);
    const msgs = loadMessages(real.locale);
    const mock = makeGetMessage(real.locale);
    eq("AC-13 manifest の description", real.description, msgs.extDescription.message);
    eq("AC-13 manifest のコマンドの説明", real.command, msgs.generateSlug.message);
    eq("AC-13 __MSG_ が残っていない", `${real.description}${real.command}`.includes("__MSG_"), false);
    eq("AC-13 全キーで実物と模擬が一致", real.messages, Object.fromEntries(keys.map((k) => [k, mock(k, ["X"])])));
  } catch (e) {
    fail++;
    console.log(`FAIL AC-13 実物の拡張の読み込み: ${e.message}`);
  } finally {
    await context?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------- ポップアップ ----------
// o: title, languages, english, noSelect, noTranslator, tAvail, translateDelay, translateThrow,
//    detector("downloadable"), detectLang, detectDelay, ai(unavailable|downloadable|available), aiSlugs, genDelay,
//    promptThrow, createThrow, clipThrow, execFalse
const mock = (o) => `
  const o = ${JSON.stringify(o)};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__clip = [];
  const progress = (a, delay) => a && a.monitor && a.monitor({ addEventListener: (n, f) => { if (n === "downloadprogress") setTimeout(() => f({ loaded: 0.5 }), delay || 0); } });
  Object.defineProperty(navigator, "languages", { value: o.languages || ["ja", "en-US"], configurable: true });
  Object.defineProperty(navigator, "clipboard", { value: { writeText: async (s) => { if (o.clipThrow) throw new Error("denied"); window.__clip.push(s); } }, configurable: true });
  if (o.execFalse) document.execCommand = () => false;
  if (!o.noTranslator) window.Translator = {
    availability: async () => o.tAvail || "available",
    create: async (a) => {
      if (o.tAvail === "downloadable") progress(a);
      return { translate: async () => { await sleep(o.translateDelay || 0); if (o.translateThrow) throw new Error("fail"); return o.english; }, destroy() {} };
    }
  };
  if (o.detector === "downloadable") window.LanguageDetector = {
    availability: async () => "downloadable",
    create: async (a) => {
      progress(a);
      return { detect: async () => { await sleep(o.detectDelay || 0); return [{ detectedLanguage: o.detectLang, confidence: 0.9 }]; }, destroy() {} };
    }
  };
  if (o.ai) {
    let created = false;
    window.LanguageModel = {
      availability: async () => o.ai === "unavailable" ? "unavailable" : o.ai === "downloadable" && !created ? "downloadable" : "available",
      create: async (a) => {
        if (a.monitor) {
          if (o.createThrow) throw new Error("fail");
          progress(a, 200);
          await sleep(500);
        }
        created = true;
        return {
          clone: async () => ({
            prompt: async () => { await sleep(o.genDelay || 0); if (o.promptThrow) throw new Error("fail"); return JSON.stringify({ slugs: o.aiSlugs || ["wordpress-auto-slug", "ai-slug-two"] }); },
            destroy() {}
          }),
          destroy() {}
        };
      }
    };
  }`;

const BOX = "document.querySelector('[data-nano-slug]')?.shadowRoot";

async function checkPopups(browser) {
  const page = await browser.newPage({ viewport: { width: 760, height: 260 } });
  const wait = (ms) => page.waitForTimeout(ms);
  const read = () => page.evaluate(`(() => {
    const r = ${BOX}; if (!r) return null;
    const q = (s) => [...r.querySelectorAll(s)].map((e) => e.textContent);
    return { status: r.querySelector('.status').textContent, buttons: q('button'), tags: q('.tag'), slugs: q('.slug'), keys: q('.key'),
      h: r.querySelector('.box').getBoundingClientRect().height };
  })()`);
  const click = () => page.evaluate(`${BOX}.querySelector('button').click()`);
  const clip = () => page.evaluate(() => window.__clip);
  const start = async (loc, o) => {
    const opts = { english: EN_TEXT, ...o };
    await page.goto("data:text/html,<meta charset=utf-8>");
    await page.setContent('<h1 id="t" contenteditable></h1>');
    await page.evaluate((t) => { document.getElementById("t").textContent = t; }, opts.title || JA_TITLE);
    for (const c of [i18nMock(loc), mock(opts), ext("slug-rules.js"), ext("content.js")]) await page.addScriptTag({ content: c });
    await page.focus("#t");
    if (!opts.noSelect) await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById("t")); getSelection().removeAllRanges(); getSelection().addRange(r); });
    await page.evaluate(() => { window.__nanoSlug.run(); });
  };

  const slugsByLoc = {}, clipByLoc = {};
  for (const loc of ["ja", "en"]) {
    const msg = (key, ...subs) => makeGetMessage(loc)(key, subs.map(String));
    const status = async () => (await read()).status;
    const L = (s) => `AC-9 ${loc}: ${s}`;

    await start(loc, { noSelect: true });
    await wait(100);
    eq(L("selectTextFirst"), await status(), msg("selectTextFirst"));

    await start(loc, { translateDelay: 500 });
    await wait(150);
    eq(L("translating"), await status(), msg("translating"));

    await start(loc, { title: "Как создать", languages: ["ja", "en"] });
    await wait(300);
    eq(L("langDetectFailed"), await status(), msg("langDetectFailed"));

    await start(loc, { noTranslator: true });
    await wait(300);
    eq(L("noTranslator"), await status(), msg("noTranslator"));

    await start(loc, { title: "Comment créer", languages: ["fr", "en"], tAvail: "unavailable" });
    await wait(300);
    const unavailable = await status();
    eq(L("translatorUnavailable"), unavailable, msg("translatorUnavailable", loc === "ja" ? "フランス語" : "French"));
    eq(L("translatorUnavailable の実文字列"), unavailable,
      loc === "ja" ? "この環境ではフランス語→英語の翻訳が使えません" : "French to English translation isn't available in this environment");

    await start(loc, { translateThrow: true });
    await wait(300);
    eq(L("translateFailed"), await status(), msg("translateFailed"));

    await start(loc, { english: "!!!" });
    await wait(300);
    eq(L("slugFailed"), await status(), msg("slugFailed"));

    await start(loc, { title: "Comment faire un site", languages: ["fr", "en"], detector: "downloadable", detectLang: "fr", detectDelay: 400 });
    await wait(300);
    let r = await read();
    eq(L("detectorDownloadNeeded"), [r.status, r.buttons], [msg("detectorDownloadNeeded"), [msg("downloadAndContinue")]]);
    await click();
    await wait(100);
    eq(L("detectorDownloading"), await status(), msg("detectorDownloading", 50));

    await start(loc, { tAvail: "downloadable", translateDelay: 400 });
    await wait(300);
    r = await read();
    eq(L("translatorDownloadNeeded"), [r.status, r.buttons], [msg("translatorDownloadNeeded"), [msg("downloadAndContinue")]]);
    await click();
    await wait(100);
    eq(L("translatorDownloading"), await status(), msg("translatorDownloading", 50));

    await start(loc, { ai: "unavailable" });
    await wait(400);
    eq(L("aiUnavailable"), await status(), msg("aiUnavailable"));

    await start(loc, { ai: "available", promptThrow: true });
    await wait(400);
    eq(L("aiGenerateFailed"), await status(), msg("aiGenerateFailed"));

    await start(loc, { ai: "downloadable" });
    await wait(400);
    r = await read();
    eq(L("aiEnable"), r.buttons, [msg("aiEnable")]);
    await click();
    await wait(50);
    eq(L("aiDownloadStart"), await status(), msg("aiDownloadStart"));
    await wait(300);
    eq(L("aiDownloading"), await status(), msg("aiDownloading", 50));

    await start(loc, { ai: "downloadable", createThrow: true });
    await wait(400);
    await click();
    await wait(200);
    eq(L("aiPrepareFailed"), await status(), msg("aiPrepareFailed"));

    await start(loc, { ai: "available", genDelay: 1200 });
    await wait(500);
    r = await read();
    eq(L("AI待機中の .slug"), r.slugs[2], msg("aiGenerating"));
    eq(L("AI待機中の .tag"),(loc === "ja" ? /^\d+\.\d秒$/ : /^\d+\.\ds$/).test(r.tags[2]), true);

    await start(loc, { ai: "available" });
    await wait(500);
    r = await read();
    eq(L("タグ"), r.tags, [msg("tagLiteral"), msg("tagShort"), msg("tagAi")]);
    slugsByLoc[loc] = r.slugs;
    await page.keyboard.press("Digit2");
    await wait(50);
    r = await read();
    eq(L("copied"), r.status, msg("copied", slugsByLoc[loc][1]));
    clipByLoc[loc] = await clip();

    await start(loc, { clipThrow: true, execFalse: true });
    await wait(300);
    await page.keyboard.press("Digit1");
    await wait(100);
    eq(L("copyFailed"), await status(), msg("copyFailed"));

    // AC-11: AI待機中と生成後で高さと番号が変わらない(AI枠1つ / 2つ)
    for (const [label, o] of [
      ["AI枠1つ", { english: EN_TEXT }],
      ["AI枠2つ", { english: "Kubernetes", aiSlugs: ["k8s-basics", "kubernetes-intro"] }]
    ]) {
      await start(loc, { ai: "available", genDelay: 800, ...o });
      await wait(400);
      const pending = await read();
      await wait(900);
      const done = await read();
      eq(`AC-11 ${loc} ${label}: 高さ`, pending.h, done.h);
      eq(`AC-11 ${loc} ${label}: 番号`, [pending.keys.slice(0, 3), done.keys], [["1", "2", "3"], ["1", "2", "3"]]);
    }
  }
  eq("AC-10 ja と en で .slug が一致", slugsByLoc.ja, slugsByLoc.en);
  eq("AC-10 ja と en でクリップボードが一致", clipByLoc.ja, clipByLoc.en);
  await page.close();
}

(async () => {
  checkScripts();
  checkManifest();
  checkNoJapaneseLiterals();
  checkLocales();
  checkKeyUsage();
  checkUnchanged();
  checkDocs();
  checkContextMenu("en", "ja");
  checkContextMenu("ja", "en");
  await checkRealExtension();
  const browser = await chromium.launch();
  try { await checkPopups(browser); } finally { await browser.close(); }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
