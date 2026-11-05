// 題名の言語判定 → 翻訳 → AI入力 の流れ(Translator / LanguageDetector / LanguageModel はモック)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const ext = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

const EN = "How to automatically generate slugs in WordPress";
const EN_SLUG = "how-to-automatically-generate-slugs-wordpress";
const DL_BTN = "ダウンロードして続行";

let fail = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) console.log(`OK   ${name}`);
  else { fail++; console.log(`FAIL ${name}\n     actual:   ${a}\n     expected: ${e}`); }
}

// o: languages, detector(none|available|downloadable|unavailable|createReject|detectReject), detectLang, detectDelay,
//    tAvail, noTranslator, translateDelay, ai, aiAvail, sessionDelay, cloneDelay, genDelay
const mock = (o) => `
  window.__o = ${JSON.stringify(o)};
  window.__log = [];
  const o = window.__o, L = (s) => window.__log.push(s), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  Object.defineProperty(navigator, "languages", { value: o.languages, configurable: true });
  Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => {} }, configurable: true });
  if (!o.noTranslator) window.Translator = {
    availability: async (a) => { L("T.availability:" + a.sourceLanguage + ">" + a.targetLanguage); return o.tAvail || "available"; },
    create: async (a) => {
      L("T.create:" + a.sourceLanguage + ">" + a.targetLanguage);
      return { translate: async () => { L("translate"); await sleep(o.translateDelay || 0); L("translate-done"); return ${JSON.stringify(EN)}; }, destroy() {} };
    }
  };
  if (o.detector && o.detector !== "none") window.LanguageDetector = {
    availability: async () => {
      L("D.availability");
      return o.detector === "unavailable" ? "unavailable" : o.detector === "downloadable" ? "downloadable" : "available";
    },
    create: async (a) => {
      L("D.create");
      if (o.detector === "createReject") throw new Error("create failed");
      a && a.monitor && a.monitor({ addEventListener: (n, f) => { if (n === "downloadprogress") f({ loaded: 0.5 }); } });
      return {
        detect: async () => {
          L("D.detect");
          await sleep(o.detectDelay || 0);
          if (o.detector === "detectReject") throw new Error("detect failed");
          return [{ detectedLanguage: o.detectLang, confidence: 0.9 }];
        },
        destroy() { L("D.destroy"); }
      };
    }
  };
  if (o.ai) {
    let created = false;
    window.LanguageModel = {
      availability: async (a) => { L("LM.availability:" + JSON.stringify(a.expectedInputs[0].languages)); return o.aiAvail === "downloadable" && !created ? "downloadable" : "available"; },
      create: async (a) => {
        L("LM.create:" + JSON.stringify(a.expectedInputs[0].languages));
        await sleep(o.sessionDelay || 0);
        created = true;
        return {
          clone: async () => {
            L("clone");
            await sleep(o.cloneDelay || 0);
            return { prompt: async (inp) => { L("prompt:" + inp); await sleep(o.genDelay || 0); return JSON.stringify({ slugs: ["ai-slug-one", "ai-slug-two"] }); }, destroy() {} };
          },
          destroy() {}
        };
      }
    };
  }`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 760, height: 260 } });

  const start = async (title, o) => {
    await page.goto("data:text/html,<meta charset=utf-8>");
    await page.setContent('<h1 id="t" contenteditable></h1>');
    await page.evaluate((t) => { document.getElementById("t").textContent = t; }, title);
    for (const c of [mock(o), ext("slug-rules.js"), ext("content.js")]) await page.addScriptTag({ content: c });
    await page.focus("#t");
    await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById("t")); getSelection().removeAllRanges(); getSelection().addRange(r); });
    await page.evaluate(() => { window.__nanoSlug.run(); });
  };
  const root = "document.querySelector('[data-nano-slug]')?.shadowRoot";
  const slugs = () => page.evaluate(`[...(${root}?.querySelectorAll('.item .slug') || [])].map((e) => e.textContent)`);
  const status = () => page.evaluate(`${root}?.querySelector('.status')?.textContent ?? null`);
  const buttons = () => page.evaluate(`[...(${root}?.querySelectorAll('button') || [])].map((e) => e.textContent)`);
  const click = () => page.evaluate(`${root}.querySelector('button').click()`);
  const log = () => page.evaluate(() => window.__log);
  const only = async (prefix) => (await log()).filter((s) => s.startsWith(prefix));
  const wait = (ms) => page.waitForTimeout(ms);
  const SETTLE = 400;

  // AC-3: 文字と設定で確定する題名は Detector を呼ばない
  for (const [title, languages, src] of [
    ["WordPressでSlugを自動生成する方法", ["ja", "en-US"], "ja"],
    ["猫", ["ja", "en-US"], "ja"],
    ["워드프레스 슬러그 자동 생성", ["ja", "en-US"], "ko"],
    ["如何自动生成别名", ["zh-CN", "en"], "zh"],
    ["如何自動生成別名", ["zh-TW", "en"], "zh-Hant"],
    ["Как создать", ["ru-RU", "en"], "ru"]
  ]) {
    await start(title, { languages, detector: "downloadable" });
    await wait(SETTLE);
    eq(`AC-3 ${title} ${src}: Translator`, await only("T."), [`T.availability:${src}>en`, `T.create:${src}>en`]);
    eq(`AC-3 ${title} ${src}: 1行目`, (await slugs())[0], EN_SLUG);
    eq(`AC-3 ${title} ${src}: Detectorなし・ボタンなし`, [await only("D."), await buttons()], [[], []]);
  }

  // AC-4: 英語は翻訳しない・Detector に触れない
  for (const noTranslator of [false, true]) {
    await start("How to make a Chrome extension", { languages: ["ja", "en-US", "en"], detector: "available", detectLang: "en", noTranslator });
    await wait(SETTLE);
    eq(`AC-4 noTranslator=${noTranslator}: API呼び出し`, [await only("T."), await only("D.")], [[], []]);
    eq(`AC-4 noTranslator=${noTranslator}: 1行目`, (await slugs())[0], "how-to-make-chrome-extension");
  }

  // AC-5: Detector で選ぶ
  for (const [title, languages, detectLang, src] of [
    ["Comment faire un site", ["fr-FR", "en-US"], "fr", "fr"],
    ["How to make a Chrome extension", ["fr-FR", "en-US"], "en", null],
    ["猫", ["en-US"], "zh", "zh"]
  ]) {
    await start(title, { languages, detector: "available", detectLang });
    await wait(SETTLE);
    eq(`AC-5 ${title} ${detectLang}: Translator`, await only("T."), src ? [`T.availability:${src}>en`, `T.create:${src}>en`] : []);
    eq(`AC-5 ${title} ${detectLang}: 1行目`, (await slugs())[0], src ? EN_SLUG : "how-to-make-chrome-extension");
    eq(`AC-5 ${title} ${detectLang}: destroy`, (await only("D.")).filter((s) => s === "D.destroy").length, 1);
  }

  // AC-6: Detector が使えない4状態
  for (const detector of ["none", "unavailable", "createReject", "detectReject"]) {
    const o = { languages: ["fr-FR", "en-US"], detector, detectLang: "fr" };
    await start("Comment créer un site", o);
    await wait(SETTLE);
    eq(`AC-6 ${detector}: フランス語は翻訳`, [await only("T."), (await slugs())[0], await buttons()], [["T.availability:fr>en", "T.create:fr>en"], EN_SLUG, []]);
    await start("Bonjour le monde", o);
    await wait(SETTLE);
    eq(`AC-6 ${detector}: ASCIIは翻訳しない`, [await only("T."), (await slugs())[0], await buttons()], [[], "bonjour-le-monde", []]);
  }

  // AC-7: Detector のダウンロードはボタンの後
  for (const [title, languages, src] of [["Comment faire un site", ["fr-FR", "en-US"], "fr"], ["猫", ["en-US"], "zh"]]) {
    await start(title, { languages, detector: "downloadable", detectLang: src, detectDelay: 300 });
    await wait(SETTLE);
    eq(`AC-7 ${title}: クリック前`, [await only("D.create"), await only("T."), await status(), await buttons()],
      [[], [], "言語判定モデルのダウンロードが必要です", [DL_BTN]]);
    await click();
    await wait(100);
    eq(`AC-7 ${title}: ダウンロード中`, [await only("D.create"), await status()], [["D.create"], "言語判定モデルをダウンロード中… 50%"]);
    await wait(SETTLE + 300);
    eq(`AC-7 ${title}: クリック後`, [await only("T."), (await slugs())[0]], [[`T.availability:${src}>en`, `T.create:${src}>en`], EN_SLUG]);
  }

  // AC-8: 翻訳が使えない時は言語名つきの文言
  for (const [title, languages, name] of [
    ["워드프레스", ["ja"], "韓国語"],
    ["如何自動生成別名", ["zh-TW"], "繁体中国語"],
    ["Comment créer", ["fr"], "フランス語"],
    ["WordPressで", ["ja"], "日本語"]
  ]) {
    await start(title, { languages, detector: "none", tAvail: "unavailable" });
    await wait(SETTLE);
    eq(`AC-8 ${title}`, [await slugs(), await status(), await only("T.create")], [[], `この環境では${name}→英語の翻訳が使えません`, []]);
  }

  // AC-9: 言語を判定できない
  await start("Как дела", { languages: ["en-US"], detector: "none" });
  await wait(SETTLE);
  eq("AC-9 判定不能", [await slugs(), await status(), await only("T.")], [[], "題名の言語を判定できませんでした", []]);

  // AC-10: 翻訳モデルのダウンロードは判定した言語で、ボタンの後
  await start("워드프레스", { languages: ["ja"], tAvail: "downloadable" });
  await wait(SETTLE);
  eq("AC-10 クリック前", [await only("T.create"), await status(), await buttons()], [[], "初回のみ翻訳モデルのダウンロードが必要です", [DL_BTN]]);
  await click();
  await wait(SETTLE);
  eq("AC-10 クリック後", [await only("T.create"), (await slugs())[0]], [["T.create:ko>en"], EN_SLUG]);

  // AC-11: AIへの入力
  const aiCases = [
    ["WordPressで", ["ja"], {}, `Title: WordPressで\nEnglish: ${EN}`],
    ["How to make", ["en-US"], {}, "Title: How to make\nEnglish: How to make"],
    ["워드프레스", ["ko"], {}, `English: ${EN}`],
    ["Comment créer", ["fr"], {}, `English: ${EN}`],
    ["워드프레스", ["ko"], { aiAvail: "downloadable" }, `English: ${EN}`]
  ];
  for (const [title, languages, extra, expected] of aiCases) {
    await start(title, { languages, detector: "none", ai: true, ...extra });
    await wait(SETTLE);
    if (extra.aiAvail) {
      eq(`AC-11 ${title} DL: ボタン`, await buttons(), ["AI候補を有効化(初回ダウンロード)"]);
      await click();
      await wait(SETTLE);
    }
    const l = await log();
    eq(`AC-11 ${title} ${JSON.stringify(extra)}: prompt`, l.filter((s) => s.startsWith("prompt:")), ["prompt:" + expected]);
    eq(`AC-11 ${title} ${JSON.stringify(extra)}: expectedInputs`, [...new Set(l.filter((s) => s.startsWith("LM.")).map((s) => s.split(":")[1]))], ['["en","ja"]']);
  }

  // AC-12: 翻訳とAIの準備は並行する
  const slow = { ai: true, translateDelay: 500, sessionDelay: 800, cloneDelay: 50, genDelay: 500 };
  for (const [title, o] of [
    ["워드프레스", { languages: ["ko"], detector: "none" }],
    ["Comment faire", { languages: ["fr", "en"], detector: "available", detectLang: "fr", detectDelay: 200 }]
  ]) {
    await start(title, { ...slow, ...o });
    await wait(1800);
    const l = await log();
    eq(`AC-12 ${title}: AI準備が翻訳完了より前`, l.indexOf("LM.create:[\"en\",\"ja\"]") >= 0 && l.indexOf("LM.create:[\"en\",\"ja\"]") < l.indexOf("translate-done"), true);
    if (title === "워드프레스") {
      await page.evaluate(() => {
        const r = document.createRange(); r.selectNodeContents(document.getElementById("t")); getSelection().removeAllRanges(); getSelection().addRange(r);
        window.__nanoSlug.run();
      });
      await wait(1800);
      const l2 = await log();
      eq("AC-12 2回実行: create 1回・clone 2回", [l2.filter((s) => s.startsWith("LM.create")).length, l2.filter((s) => s === "clone").length], [1, 2]);
    }
  }

  // AC-13: Detector のボタン待ちで Esc → 続行しない
  await start("Comment faire un site", { languages: ["fr-FR", "en-US"], detector: "downloadable", detectLang: "fr" });
  await wait(SETTLE);
  eq("AC-13 待機中", await buttons(), [DL_BTN]);
  await page.keyboard.press("Escape");
  await wait(1000);
  eq("AC-13 Esc後", [await only("T."), await page.evaluate(() => !!document.querySelector("[data-nano-slug]"))], [[], false]);

  // #12: 英字が主の題名は英語として確定(Translator / Detector を呼ばない)
  for (const [title, languages, slug] of [
    ["How to use π in JavaScript", ["ja", "en-US"], "how-to-use-javascript"],
    ["λ calculus basics", ["ja", "en-US"], "calculus-basics"],
    ["µs timing in Node.js", ["ja", "en-US"], "s-timing-nodejs"],
    ["What’s new in Chrome", ["fr-FR", "en-US"], "whats-new-chrome"],
    ["Chrome — release notes", ["fr-FR", "en-US"], "chrome-release-notes"]
  ]) {
    const greek = languages[0] === "ja";
    await start(title, { languages, detector: greek ? "available" : "none", detectLang: "el" });
    await wait(SETTLE);
    eq(`#12 ${title}: 英語で確定`, [await only("T."), await only("D."), (await slugs())[0]], [[], [], slug]);
  }

  // #12: フランス語は翻訳する(Detector なし)
  await start("Créer une application web avec React", { languages: ["fr-FR", "en-US"], detector: "none" });
  await wait(SETTLE);
  eq("#12 Créer…: フランス語は翻訳", [await only("T."), await only("D."), (await slugs())[0]], [["T.availability:fr>en", "T.create:fr>en"], [], EN_SLUG]);

  // #12: 他言語の部分が3文字以上なら今のまま
  await start("Как установить Node.js", { languages: ["ja", "en-US"], detector: "none" });
  await wait(SETTLE);
  eq("#12 Как…: Detectorなしは判定不能", [await slugs(), await status(), await only("T.")], [[], "題名の言語を判定できませんでした", []]);
  await start("Как установить Node.js", { languages: ["ja", "en-US"], detector: "available", detectLang: "ru" });
  await wait(SETTLE);
  eq("#12 Как…: Detectorでru", [await only("T."), (await only("D.")).includes("D.detect"), (await slugs())[0]], [["T.availability:ru>en", "T.create:ru>en"], true, EN_SLUG]);

  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
