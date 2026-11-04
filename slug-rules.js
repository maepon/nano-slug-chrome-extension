// slug整形ルール(ブラウザ/Node共通)
(function (root) {
  // 常に残す語(消すと意味が壊れる)
  const KEEP = new Set(["not", "no", "without", "vs", "versus", "never", "non"]);

  // 軽め: 冠詞・前置詞・接続詞・be動詞
  const LIGHT = new Set([
    "a", "an", "the",
    "of", "to", "for", "in", "on", "at", "by", "with", "from", "into", "about", "as",
    "and", "or",
    "is", "are", "was", "were", "be", "been",
    "have", "has", "had",
    "i", "me", "we", "us"
  ]);

  // 強め: 軽め + 疑問詞・助動詞・代名詞・汎用語
  const STRONG = new Set([
    ...LIGHT,
    "how", "what", "why", "when", "where", "which", "who",
    "can", "could", "should", "would", "will", "do", "does", "did",
    "i", "you", "we", "your", "my", "our", "it", "its", "this", "that", "these", "those",
    "between", "using", "way", "ways",
    "since", "called", "named", "concept", "idea", "regarding", "something"
  ]);

  // 上限超過時に最初に削る汎用語(意味が薄い動詞・形容詞など)
  const GENERIC = new Set([
    "check", "confirm", "other", "various", "some", "make", "use", "using", "get", "try",
    "way", "ways", "method", "methods", "easy", "easily", "simple", "simply", "very", "just",
    "also", "all", "more", "really", "about", "properly", "correctly"
  ]);

  // ドット区切りを1語にまとめない語(後で足せる)。ドットの後ろがこれらなら今まで通りハイフンにする
  // ドメイン: note.com -> note-com, zenn.dev -> zenn-dev
  // dev は web.dev のような製品名も分けてしまうが、誤判定しても語が読めるので分ける側に倒す
  const DOMAIN_SUFFIXES = new Set(["com", "org", "jp", "dev"]);
  // ファイル名の拡張子: package.json -> package-json, style.css -> style-css
  // js は Node.js など製品名に使われるため入れない
  const FILE_EXTS = new Set(["json", "html", "md", "yml", "yaml", "txt", "css"]);

  const LIMITS = {
    light: { words: 8, len: 60 },
    strong: { words: 5, len: 45 }
  };
  const MAX_WORDS = LIMITS.light.words;
  const MAX_LEN = LIMITS.light.len;

  // Next.js -> nextjs。ドット1つで、前が英字始まり2文字以上、後ろが英字始まりの時だけまとめる
  // (3.5 や u.s、amazon.co.jp、ドメイン・拡張子は対象外。ドットは後でハイフンになる)
  function joinDotted(text) {
    return text.replace(/[a-z0-9]+(?:\.[a-z0-9]+)+/g, (m) => {
      const parts = m.split(".");
      const ok = parts.length === 2 &&
        /^[a-z][a-z0-9]+$/.test(parts[0]) &&
        /^[a-z]/.test(parts[1]) &&
        !DOMAIN_SUFFIXES.has(parts[1]) &&
        !FILE_EXTS.has(parts[1]) &&
        !KEEP.has(parts[0]) &&
        !KEEP.has(parts[1]);   // vs.Vue は vs と vue のまま
      return ok ? parts.join("") : m;
    });
  }

  // ドット区切りの語の所有格だけ取り除く(Next.js's -> Next.js)。What's や Chrome's は変えない
  function stripDottedPossessive(lowered) {
    return lowered.replace(/([a-z0-9]+(?:\.[a-z0-9]+)+\.?)['’]s(?![a-z0-9])/g, "$1");
  }

  // 小文字化・アクセント除去・所有格の除去まで(アポストロフィはまだ残る)
  function prepare(text) {
    return stripDottedPossessive(String(text)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")       // アクセント除去
      .toLowerCase()
      .replace(/&/g, " and "));
  }

  function tokenize(text) {
    return joinDotted(prepare(text).replace(/['’]/g, ""))   // don't -> dont
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  // ドットをまとめずに分けた語(Node.js -> node, js)
  function splitDotted(text) {
    return prepare(text)
      .replace(/['’]/g, "")
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  function filterWords(words, stop) {
    const out = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      // "how to" は1つのかたまりとして保持(軽めのみ)
      if (stop === LIGHT && w === "how" && words[i + 1] === "to") {
        out.push("how", "to");
        i++;
        continue;
      }
      if (KEEP.has(w) || !stop.has(w)) out.push(w);
    }
    // 全部消えた場合は元に戻す
    return dedupe(out.length ? out : words);
  }

  // 語幹がほぼ同じ語の重複を除く(scope / scoped, bookmark / bookmarks)。
  // 後ろの出現を残す(後ろの方が "scoped bookmark" "service workers" のような具体的な複合語であることが多い)
  // 大文字略語(HTTPS / HTTP など)は語幹をまとめない
  let acronyms = new Set();
  function stem(w) {
    if (w.length <= 3 || /^\d+$/.test(w) || acronyms.has(w)) return w;
    return w.replace(/(ies)$/, "y").replace(/(es|s|ed|ing)$/, "").replace(/e$/, "");
  }
  function dedupe(words) {
    const keys = words.map(stem);
    return words.filter((w, i) => keys.indexOf(keys[i], i + 1) === -1);
  }

  // 上限に収まるまで、優先度の低い語から削る(先頭からの単純な切り捨てはしない)
  //   1. 汎用語(後ろから)  2. 保護されていない語(後ろから)  3. 保護語(後ろから)
  function shrink(words, maxWords, maxLen, keep = new Set()) {
    const ws = words.slice();
    const fits = () => ws.length <= maxWords && ws.join("-").length <= maxLen;
    const dropLast = (pred) => {
      for (let i = ws.length - 1; i >= 0; i--) {
        if (pred(ws[i], i)) { ws.splice(i, 1); return true; }
      }
      return false;
    };
    // "how to" は直訳の特徴なので、汎用語より後・内容語より先に削る
    const isHowTo = (w, i) => (w === "how" && ws[i + 1] === "to") || (w === "to" && ws[i - 1] === "how");
    const steps = [
      (w, i) => GENERIC.has(w) && !keep.has(w) && !isHowTo(w, i),
      (w, i) => isHowTo(w, i),
      (w) => !keep.has(w) && !KEEP.has(w),
      () => true
    ];
    for (const pred of steps) {
      while (!fits() && ws.length > 1 && dropLast(pred)) {}
      if (fits()) break;
    }
    return ws.join("-").slice(0, maxLen).replace(/-+$/g, "");
  }

  function limit(words) {
    return shrink(words, MAX_WORDS, MAX_LEN);
  }

  // 元テキスト中のアルファベット表記の語(macOS, Chromeなど)。最優先で残す
  function keywordsFrom(original) {
    const latin = String(original || "").match(/[A-Za-z0-9][A-Za-z0-9.'’+-]*/g) || [];
    return new Set(latin.flatMap((w) => [...tokenize(w), ...splitDotted(w)]));
  }

  // level: "light" | "strong" / original: 翻訳前のテキスト(任意)
  function toSlug(text, level = "light", original = "") {
    const words = tokenize(text);
    if (!words.length) return "";
    const keep = keywordsFrom(original);
    acronyms = new Set((String(original || "").match(/[A-Z]{2,}[A-Z0-9]*/g) || []).map((a) => a.toLowerCase()));
    const stop = level === "strong" ? STRONG : LIGHT;
    const lim = LIMITS[level] || LIMITS.light;
    return shrink(filterWords(words, stop), lim.words, lim.len, keep);
  }

  // 直訳・短縮の2案。短縮が直訳より短くならない場合は出さない(無理に削ると内容語が消えるため)
  function candidates(english, original = "") {
    const light = toSlug(english, "light", original);
    const strong = toSlug(english, "strong", original);
    return { light, strong: strong && strong.length < light.length ? strong : null };
  }

  // AIの出力など、外部由来の文字列を安全なslugにする
  function sanitize(s) {
    return limit(tokenize(s));
  }

  function isValid(s) {
    return typeof s === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= MAX_LEN;
  }

  const api = { toSlug, candidates, sanitize, isValid, tokenize, keywordsFrom, MAX_WORDS, MAX_LEN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.__nanoSlugRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
