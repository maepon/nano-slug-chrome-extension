// Nano Slug Generator - content script (起動時のみ注入)
// 候補1: Translator + 軽め整形 / 候補2: 強め整形 / 候補3: Prompt API(使える環境のみ)
(function () {
  if (window.__nanoSlug) return; // 二重注入防止(関数定義は初回のみ)

  const MAX_INPUT = 200;
  const R = () => window.__nanoSlugRules;

  let host = null;     // Shadow DOMのホスト要素
  let ui = null;       // { root, list, status }
  let slugs = [];
  let runId = 0;
  let prevFocus = null; // 開く前のフォーカスと選択範囲(Escで戻す)
  let prevRange = null;

  // ---------- UI ----------
  const CSS = `
    :host { all: initial; }
    .box { position: absolute; z-index: 2147483647; min-width: 260px; max-width: 560px;
      background: #fff; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 8px;
      box-shadow: 0 6px 20px rgba(0,0,0,.15); padding: 6px;
      font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 5px; cursor: pointer; }
    .item:hover, .item.copied { background: #f1f5f9; }
    .key { flex: none; width: 18px; height: 18px; border-radius: 4px; background: #e2e8f0; color: #475569;
      font-size: 11px; display: grid; place-items: center; }
    .slug { flex: 1; font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: nowrap; }
    .box:focus { outline: none; }
    .item.pending { cursor: default; }
    .item.pending:hover { background: none; }
    .item.pending .slug { font-family: inherit; color: #94a3b8; }
    .item.pending .key { opacity: .5; }
    .tag { flex: none; font-size: 10px; color: #64748b; }
    .status { padding: 4px 8px; font-size: 11px; color: #64748b; }
    .status:empty { display: none; }
    button { font: inherit; font-size: 12px; margin: 4px 8px; padding: 4px 10px; border-radius: 5px;
      border: 1px solid #94a3b8; background: #f8fafc; color: #0f172a; cursor: pointer; }
  `;

  function openUI(rect) {
    closeUI();
    host = document.createElement("div");
    host.setAttribute("data-nano-slug", "");
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${CSS}</style><div class="box" tabindex="-1"><div class="list"></div><div class="status"></div></div>`;
    const box = root.querySelector(".box");
    const top = window.scrollY + (rect ? rect.bottom : 20) + 6;
    const left = window.scrollX + (rect ? rect.left : 20);
    box.style.top = `${Math.max(0, top)}px`;
    box.style.left = `${Math.max(0, Math.min(left, window.scrollX + window.innerWidth - 260))}px`;
    document.documentElement.appendChild(host);
    ui = { root, box, list: root.querySelector(".list"), status: root.querySelector(".status") };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onOutside, true);

    // 編集領域からフォーカスを外す。
    // 残したままだと日本語IMEが数字キーを先に受け取り、選択範囲を書き換えてしまう。
    prevFocus = document.activeElement;
    const sel = window.getSelection();
    prevRange = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    box.focus({ preventScroll: true });
    // フォーカスを外しても選択範囲が残っていると、IMEの確定文字がそこへ入ることがあるため解除しておく
    try { sel?.removeAllRanges(); } catch (_) {}
  }

  function closeUI(restore = false) {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("mousedown", onOutside, true);
    host?.remove();
    host = ui = null;
    slugs = [];
    runId++; // 進行中の処理を無効化
    if (restore) {
      try {
        prevFocus?.focus?.({ preventScroll: true });
        if (prevRange) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(prevRange);
        }
      } catch (_) {}
    }
    prevFocus = prevRange = null;
  }

  function setStatus(text) {
    if (ui) ui.status.textContent = text;
  }

  function makeRow(n, text, tag) {
    const row = document.createElement("div");
    row.className = "item";
    const k = document.createElement("span"); k.className = "key"; k.textContent = String(n);
    const s = document.createElement("span"); s.className = "slug"; s.textContent = text; // innerHTMLは使わない
    const t = document.createElement("span"); t.className = "tag"; t.textContent = tag;
    row.append(k, s, t);
    return row;
  }

  function addCandidate(slug, tag) {
    if (!ui || !R().isValid(slug) || slugs.includes(slug) || slugs.length >= 3) return;
    slugs.push(slug);
    const n = slugs.length;
    // 保留枠(AI生成中…)があれば、その枠に入れる。番号と高さは動かさない
    let row = ui.list.querySelector(".item.pending");
    if (row) {
      row.classList.remove("pending");
      row.querySelector(".slug").textContent = slug;
      row.querySelector(".tag").textContent = tag;
    } else {
      row = makeRow(n, slug, tag);
      ui.list.appendChild(row);
    }
    row.addEventListener("click", () => copy(n - 1, row));
  }

  // AI用の枠を先に確保し、経過秒数を表示する。戻り値は後始末用の関数
  function reservePending(count) {
    if (!ui || count <= 0) return () => {};
    const rows = [];
    for (let i = 0; i < count; i++) {
      const row = makeRow(slugs.length + i + 1, "AI生成中…", "");
      row.classList.add("pending");
      ui.list.appendChild(row);
      rows.push(row);
    }
    const t0 = performance.now();
    const timer = setInterval(() => {
      const sec = ((performance.now() - t0) / 1000).toFixed(1);
      rows.forEach((r) => { if (r.classList.contains("pending")) r.querySelector(".tag").textContent = `${sec}秒`; });
    }, 100);
    // 終了時: 埋まらなかった枠は消す(既存の番号には影響しない)
    return () => {
      clearInterval(timer);
      rows.forEach((r) => { if (r.classList.contains("pending")) r.remove(); });
    };
  }

  function addButton(label, onClick) {
    if (!ui) return;
    const b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("click", onClick, { once: true });
    ui.status.after(b);
    return b;
  }

  function onKey(e) {
    if (!ui) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeUI(true); return; }
    // e.code で判定(IME ON時は e.key が "Process" や全角になるため)。テンキーも許可
    const m = /^(?:Digit|Numpad)([1-3])$/.exec(e.code);
    if (m && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); e.stopImmediatePropagation();
      const i = Number(m[1]) - 1;
      if (slugs[i]) copy(i, ui.list.children[i]);
      return;
    }
    // ポップアップ表示中は、その他の文字キーも編集領域に流さない
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }

  function onOutside(e) {
    if (host && !e.composedPath().includes(host)) closeUI();
  }

  async function copy(i, row) {
    const text = slugs[i];
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (_) {}
    if (!ok) {
      // iframe等でClipboard APIが拒否された場合のフォールバック
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.documentElement.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch (_) {}
      ta.remove();
    }
    if (ok) {
      row?.classList.add("copied");
      setStatus(`コピーしました: ${text}`);
      setTimeout(closeUI, 700);
    } else {
      setStatus("コピーに失敗しました");
    }
  }

  // ---------- 生成 ----------
  const langName = (lang) => {
    try { return new Intl.DisplayNames(["ja"], { type: "language" }).of(lang) || lang; } catch (_) { return lang; }
  };

  // ボタンが押されるまで待つ。ポップアップを閉じると押されないまま終わる(続きは実行されない)
  async function waitForClick(message) {
    await new Promise((resolve) => {
      setStatus(message);
      addButton("ダウンロードして続行", resolve);
    });
    ui?.root.querySelectorAll("button").forEach((b) => b.remove());
  }

  // 題名の言語を決める。文字とブラウザ設定で決まればDetectorは呼ばない。
  // Detectorが使えない時・失敗した時は guess.lang(null は判定不能)
  async function detectLanguage(text, guess, id) {
    if (guess.candidates === null) return guess.lang;
    try {
      if (!("LanguageDetector" in self)) return guess.lang;
      const avail = await LanguageDetector.availability();
      if (avail === "unavailable") return guess.lang;
      if (avail !== "available") {
        // 翻訳モデルと同じく、ダウンロードはユーザー操作(クリック)が必要
        await waitForClick("言語判定モデルのダウンロードが必要です");
        if (id !== runId) return guess.lang;
      }
      const detector = await LanguageDetector.create({
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            if (id === runId) setStatus(`言語判定モデルをダウンロード中… ${Math.round(e.loaded * 100)}%`);
          });
        }
      });
      try {
        return R().pickDetected(await detector.detect(text), guess);
      } finally {
        detector.destroy?.();
      }
    } catch (e) {
      console.warn("[nano-slug]", e);
      return guess.lang;
    }
  }

  async function translate(text, lang, id) {
    if (lang === "en") return text; // 英語ならそのまま
    if (!("Translator" in self)) throw new Error("NO_TRANSLATOR");
    const opts = { sourceLanguage: lang, targetLanguage: "en" };
    const avail = await Translator.availability(opts);
    if (avail === "unavailable") throw new Error("TRANSLATOR_UNAVAILABLE");
    if (avail !== "available") {
      // 初回ダウンロードはユーザー操作(クリック)が必要
      await waitForClick("初回のみ翻訳モデルのダウンロードが必要です");
      if (id !== runId) return null;
    }
    const translator = await Translator.create({
      ...opts,
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          if (id === runId) setStatus(`翻訳モデルをダウンロード中… ${Math.round(e.loaded * 100)}%`);
        });
      }
    });
    try {
      return await translator.translate(text);
    } finally {
      translator.destroy?.();
    }
  }

  const SYSTEM_PROMPT = `You create short URL slugs for WordPress blog posts.
Given a post title (possibly with its original text), and an English translation of it, propose 2 alternative slugs.
Rules:
- 2 to 5 English words, lowercase, joined with hyphens.
- Keep the key topic words. Never drop negation or comparison words (not, without, vs).
- Make them shorter and more natural than a literal translation.`;

  const SCHEMA = {
    type: "object",
    properties: { slugs: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 } },
    required: ["slugs"]
  };

  const AI_OPTS = {
    expectedInputs: [{ type: "text", languages: ["en", "ja"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }]
  };

  // ページ内で使い回すベースセッション(システムプロンプト読み込み済み)。
  // スクリプトは一度注入されるとページに残るので、同じページ内の2回目以降は clone() だけで済む
  let baseSession = null;

  async function getSession(timing) {
    const t = performance.now();
    if (!baseSession) {
      baseSession = await LanguageModel.create({
        ...AI_OPTS,
        initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }]
      });
      timing.sessionCreate = Math.round(performance.now() - t);
    }
    const t2 = performance.now();
    try {
      // clone() がない環境では毎回作り直す(同じセッションに履歴を溜めないため)
      const s = baseSession.clone
        ? await baseSession.clone()
        : await LanguageModel.create({ ...AI_OPTS, initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }] });
      timing.sessionClone = Math.round(performance.now() - t2);
      return s;
    } catch (e) {
      baseSession = null; // 壊れていたら次回作り直す
      throw e;
    }
  }

  // 翻訳と並行して始める: 可否確認 → (使えるなら)セッション準備
  function prepareAI(timing) {
    if (!("LanguageModel" in self)) {
      return { availP: Promise.resolve("none"), sessionP: Promise.resolve(null) };
    }
    const availP = LanguageModel.availability(AI_OPTS).catch(() => "unavailable");
    const sessionP = availP.then((a) => (a === "available" ? getSession(timing) : null));
    sessionP.catch(() => {}); // 未処理エラー警告を防ぐ(実際の処理は後でawait)
    return { availP, sessionP };
  }

  // 原文を渡すのは AI_OPTS で宣言した言語(ja / en)だけ。それ以外は英訳だけを渡す
  const aiInput = (original, english, lang) =>
    lang === "ja" || lang === "en" ? `Title: ${original}\nEnglish: ${english}` : `English: ${english}`;

  async function generateAI(original, english, lang, id, prep, timing) {
    const avail = await prep.availP;
    if (avail === "none") return { skipped: "" };
    if (avail === "unavailable") return { skipped: "この環境ではAI候補は使えません" };
    if (avail !== "available") return { needsDownload: true }; // 巨大なので勝手にダウンロードしない
    const release = reservePending(3 - slugs.length);
    let session = null;
    try {
      const t = performance.now();
      session = await prep.sessionP;
      timing.waitSession = Math.round(performance.now() - t);
      const t2 = performance.now();
      const raw = await session.prompt(
        aiInput(original, english, lang),
        { responseConstraint: SCHEMA }
      );
      timing.prompt = Math.round(performance.now() - t2);
      if (id !== runId) return {};
      const parsed = JSON.parse(raw);
      const out = (parsed.slugs || []).map((x) => R().sanitize(x));
      out.forEach((x) => addCandidate(x, "AI"));
      return {};
    } finally {
      if (session && session !== baseSession) session.destroy?.();
      release();
    }
  }

  async function downloadPromptModel(original, english, lang, id) {
    ui?.root.querySelectorAll("button").forEach((b) => b.remove());
    setStatus("AIモデルをダウンロード中…(数GBあります)");
    try {
      const s = await LanguageModel.create({
        expectedInputs: [{ type: "text", languages: ["en", "ja"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            if (id === runId) setStatus(`AIモデルをダウンロード中… ${Math.round(e.loaded * 100)}%`);
          });
        }
      });
      s.destroy?.();
      if (id !== runId) return;
      setStatus("");
      const timing = {};
      const r = await generateAI(original, english, lang, id, prepareAI(timing), timing);
      setStatus(r.skipped || "");
    } catch (e) {
      console.warn("[nano-slug]", e);
      if (id === runId) setStatus("AIモデルを準備できませんでした");
    }
  }

  async function run() {
    const sel = window.getSelection();
    const text = (sel?.toString() || "").trim().replace(/\s+/g, " ").slice(0, MAX_INPUT);
    const rect = sel && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    openUI(rect && (rect.width || rect.height) ? rect : null);
    const id = runId;

    if (!text) {
      setStatus("テキストを選択してから実行してください");
      return;
    }

    const timing = { reused: !!baseSession };
    const t0 = performance.now();
    const prep = prepareAI(timing); // 翻訳と並行してAIの準備を始める

    setStatus("翻訳中…");
    const guess = R().guessLanguage(text, navigator.languages);
    const lang = await detectLanguage(text, guess, id);
    if (id !== runId) return;
    if (!lang) { setStatus("題名の言語を判定できませんでした"); return; }

    let english;
    try {
      english = await translate(text, lang, id);
      timing.translate = Math.round(performance.now() - t0); // 言語判定の時間を含む
    } catch (e) {
      console.warn("[nano-slug]", e);
      const msg = {
        NO_TRANSLATOR: "このChromeでは翻訳APIが使えません(Chrome 138以降が必要)",
        TRANSLATOR_UNAVAILABLE: `この環境では${langName(lang)}→英語の翻訳が使えません`
      }[e.message] || "翻訳に失敗しました";
      setStatus(msg);
      return;
    }
    if (id !== runId || english == null) return;

    const { light, strong } = R().candidates(english, text);
    addCandidate(light, "直訳");
    if (strong) addCandidate(strong, "短縮");
    if (!slugs.length) { setStatus("slugを作れませんでした"); return; }

    setStatus("");
    try {
      const r = await generateAI(text, english, lang, id, prep, timing);
      if (id !== runId) return;
      if (r.needsDownload) {
        addButton("AI候補を有効化(初回ダウンロード)", () => downloadPromptModel(text, english, lang, id));
        return;
      }
      setStatus(r.skipped || "");
    } catch (e) {
      console.warn("[nano-slug]", e);
      if (id === runId) setStatus("AI候補を生成できませんでした");
    } finally {
      timing.total = Math.round(performance.now() - t0);
      // 計測: DevToolsのコンソールに出る(単位ms)
      console.info("[nano-slug] timing(ms)", JSON.stringify(timing));
    }
  }

  window.__nanoSlug = { run };
})();
