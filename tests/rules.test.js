const R = require("../slug-rules.js");
const cases = [
  ["macOSでChrome拡張機能の他言語設定を確認する方法", "How to check other language settings for Chrome extensions on macOS"],
  ["macOSでChrome拡張機能の他言語設定を確認する方法", "How to check the settings of other languages of Chrome extensions on macOS"],
  ["Chrome拡張機能の作り方", "How to make a Chrome extension"],
  ["WordPressでSlugを自動生成する方法", "How to automatically generate slugs in WordPress"],
  ["ReactとVueの違い", "The difference between React and Vue"],
  ["JavaScriptなしでモーダルを作る", "Create a modal without JavaScript"],
  ["varを使うべきでない理由", "Why you should not use var"],
  ["Next.js 15とRemixどっちがいい?", "Next.js 15 vs Remix: Which is better?"],
  ["GitHub ActionsでDockerイメージをビルドしてAWS ECRにプッシュする手順", "Steps to build a Docker image with GitHub Actions and push it to AWS ECR"],
  ["猫", "Cat"],
];
let fail = 0;
for (const [ja, en] of cases) {
  const { light, strong } = R.candidates(en, ja);
  const ok = R.isValid(light) && (strong == null || (R.isValid(strong) && strong.length < light.length));
  if (!ok) fail++;
  console.log(ok ? "OK  " : "FAIL", ja, "\n      直訳:", light, `(${light.length})`, "\n      短縮:", strong, strong ? `(${strong.length})` : "");
}
// 否定語が残るか
const neg = R.candidates("Create a modal without JavaScript", "JavaScriptなしでモーダルを作る");
if (!neg.light.includes("without")) { fail++; console.log("FAIL negation"); }

// 完全一致の検査
function eq(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log("OK  ", label); return; }
  fail++;
  console.log("FAIL", label, "\n      期待:", e, "\n      実際:", a);
}

// tokenize: ドット区切り
const tokenizeCases = [
  ["Next.js 15", ["nextjs", "15"]],
  ["Node.js", ["nodejs"]],
  ["ASP.NET Core", ["aspnet", "core"]],
  ["D3.js", ["d3js"]],
  ["Vue 3.5", ["vue", "3", "5"]],
  ["Node 18.x", ["node", "18", "x"]],
  ["note.com", ["note", "com"]],
  ["example.org", ["example", "org"]],
  ["yahoo.jp", ["yahoo", "jp"]],
  ["amazon.co.jp", ["amazon", "co", "jp"]],
  ["U.S. market", ["u", "s", "market"]],
  ["Next.js.", ["nextjs"]],
  ["Ｎｅｘｔ．ｊｓ", ["nextjs"]],
  ["package.json", ["package", "json"]],
  ["PACKAGE.JSON", ["package", "json"]],
  ["index.html", ["index", "html"]],
  ["README.md", ["readme", "md"]],
  ["config.yml", ["config", "yml"]],
  ["docker-compose.yaml", ["docker", "compose", "yaml"]],
  ["robots.txt", ["robots", "txt"]],
];
for (const [input, expected] of tokenizeCases) eq(`tokenize: ${input}`, R.tokenize(input), expected);

// tokenize: ドット区切りの語の所有格
const possessiveCases = [
  ["Next.js's", ["nextjs"]],
  ["Next.js’s", ["nextjs"]],
  ["package.json's", ["package", "json"]],
  ["note.com's", ["note", "com"]],
  ["Vue 3.5's", ["vue", "3", "5"]],
  ["amazon.co.jp's", ["amazon", "co", "jp"]],
  ["U.S.'s market", ["u", "s", "market"]],
  ["Node.js'", ["nodejs"]],
  ["What's", ["whats"]],
  ["Don't", ["dont"]],
  ["Chrome's", ["chromes"]],
];
for (const [input, expected] of possessiveCases) eq(`tokenize: possessive ${input}`, R.tokenize(input), expected);

// tokenize: 常に残す語はドットでまとめない
const keepCases = [
  ["vs.Vue", ["vs", "vue"]],
  ["VS.Code", ["vs", "code"]],
  ["No.One", ["no", "one"]],
  ["React.vs", ["react", "vs"]],
  ["not.a", ["not", "a"]],
  ["without.any", ["without", "any"]],
  ["versus.Vue", ["versus", "vue"]],
  ["never.js", ["never", "js"]],
  ["non.js", ["non", "js"]],
];
for (const [input, expected] of keepCases) eq(`tokenize: keep ${input}`, R.tokenize(input), expected);

// tokenize: css / dev
const cssDevCases = [
  ["style.css", ["style", "css"]],
  ["Normalize.css", ["normalize", "css"]],
  ["zenn.dev", ["zenn", "dev"]],
  ["web.dev", ["web", "dev"]],
];
for (const [input, expected] of cssDevCases) eq(`tokenize: css/dev ${input}`, R.tokenize(input), expected);

// candidates: [元の日本語, 英訳, light, strong]
const candidateCases = [
  // ドット区切り・バージョン・ドメイン・ファイル名
  ["Next.js 15とRemixどっちがいい?", "Next.js 15 vs Remix: Which is better?", "nextjs-15-vs-remix-which-better", "nextjs-15-vs-remix-better"],
  ["Node.jsでAPIを作る方法", "How to build an API with Node.js", "how-to-build-api-nodejs", "build-api-nodejs"],
  ["Vue 3.5の新機能", "What's new in Vue 3.5", "whats-new-vue-3-5", null],
  ["ASP.NET Coreの入門", "Introduction to ASP.NET Core", "introduction-aspnet-core", null],
  ["note.comで記事を書く方法", "How to write articles on note.com", "how-to-write-articles-note-com", "write-articles-note-com"],
  ["amazon.co.jpで買う", "Buy on amazon.co.jp", "buy-amazon-co-jp", null],
  ["Node 18.xのサポート終了", "End of support for Node 18.x", "end-support-node-18-x", null],
  ["D3.jsでグラフを描く", "Draw graphs with D3.js", "draw-graphs-d3js", null],
  ["package.jsonの書き方", "How to write package.json", "how-to-write-package-json", "write-package-json"],
  ["README.mdに目次を付ける", "Add a table of contents to README.md", "add-table-contents-readme-md", null],
  ["index.htmlを分割する", "Split index.html", "split-index-html", null],
  ["GitHub Actionsのworkflow.ymlの書き方", "How to write workflow.yml for GitHub Actions", "how-to-write-workflow-yml-github-actions", "write-workflow-yml-github-actions"],
  // 所有格・常に残す語・css/dev・保護語の分解
  ["package.jsonのscriptsの書き方", "How to write package.json's scripts", "how-to-write-package-json-scripts", "write-package-json-scripts"],
  ["note.comの編集画面", "note.com's editing screen", "note-com-editing-screen", null],
  ["Next.jsのルーター機能", "Next.js's router features", "nextjs-router-features", null],
  ["Next.jsのルーター機能", "Next.js’s router features", "nextjs-router-features", null],
  ["Vue 3.5の新機能", "Vue 3.5's new features", "vue-3-5-new-features", null],
  ["amazon.co.jpのセール", "amazon.co.jp's sale", "amazon-co-jp-sale", null],
  ["style.cssのルール", "style.css's rules", "style-css-rules", null],
  ["Node.jsのエラー処理で実行時に起きる問題を調べて直す", "Investigate and fix runtime problems that occur during error handling in Node", "investigate-fix-runtime-problems-that-occur-during-node", "investigate-fix-runtime-problems-node"],
  ["Node.jsのエラー処理で実行時に起きる問題を調べて直す", "Investigate and fix runtime problems that occur during error handling in Node.js", "investigate-fix-runtime-problems-that-occur-during-nodejs", "investigate-fix-runtime-problems-nodejs"],
  ["Next.jsのエラー処理で実行時に起きる問題を調べて直す", "Investigate and fix runtime problems that occur during error handling in Next. js", "investigate-fix-runtime-problems-that-occur-next-js", "investigate-fix-runtime-next-js"],
  ["Next.jsのエラー処理で実行時に起きる問題を調べて直す", "Investigate and fix runtime problems that occur during error handling in Next js", "investigate-fix-runtime-problems-that-occur-next-js", "investigate-fix-runtime-next-js"],
  ["Next.jsのエラー処理で実行時に起きる問題を調べて直す", "Investigate and fix runtime problems that occur during error handling in Next", "investigate-fix-runtime-problems-that-occur-during-next", "investigate-fix-runtime-problems-next"],
  ["Next.jsのエラー処理で実行時に起きる問題を調べて直す", "Investigate and fix runtime problems that occur during error handling in Next.js", "investigate-fix-runtime-problems-that-occur-during-nextjs", "investigate-fix-runtime-problems-nextjs"],
  ["ReactとVueの比較", "React vs.Vue comparison", "react-vs-vue-comparison", null],
  ["ReactとVueの比較", "React vs. Vue comparison", "react-vs-vue-comparison", null],
  ["ReactとVue", "React.vs Vue", "react-vs-vue", null],
  ["誰も知らない", "No.One knows", "no-one-knows", null],
  ["何もなしで", "without.any thing", "without-any-thing", null],
  ["style.cssを分割する方法", "How to split style.css", "how-to-split-style-css", "split-style-css"],
  ["zenn.devで記事を書く方法", "How to write articles on zenn.dev", "how-to-write-articles-zenn-dev", "write-articles-zenn-dev"],
  // 既存の例(変化なし)
  ["macOSでChrome拡張機能の他言語設定を確認する方法", "How to check other language settings for Chrome extensions on macOS", "how-to-check-language-settings-chrome-extensions-macos", "language-settings-chrome-extensions-macos"],
  ["macOSでChrome拡張機能の他言語設定を確認する方法", "How to check the settings of other languages of Chrome extensions on macOS", "how-to-check-settings-languages-chrome-extensions-macos", "settings-languages-chrome-extensions-macos"],
  ["Chrome拡張機能の作り方", "How to make a Chrome extension", "how-to-make-chrome-extension", "make-chrome-extension"],
  ["WordPressでSlugを自動生成する方法", "How to automatically generate slugs in WordPress", "how-to-automatically-generate-slugs-wordpress", "automatically-generate-slugs-wordpress"],
  ["ReactとVueの違い", "The difference between React and Vue", "difference-between-react-vue", "difference-react-vue"],
  ["JavaScriptなしでモーダルを作る", "Create a modal without JavaScript", "create-modal-without-javascript", null],
  ["varを使うべきでない理由", "Why you should not use var", "why-you-should-not-use-var", "not-use-var"],
  ["GitHub ActionsでDockerイメージをビルドしてAWS ECRにプッシュする手順", "Steps to build a Docker image with GitHub Actions and push it to AWS ECR", "steps-build-docker-image-github-actions-aws-ecr", "docker-github-actions-aws-ecr"],
  ["猫", "Cat", "cat", null],
  // 上限超過で "how to" を削る時は2語まとめて削る(how だけ残さない)
  ["Node.jsのエラー処理で実行時に起きる問題を調べて直す方法", "How to investigate and fix runtime problems that occur during error handling in Node", "investigate-fix-runtime-problems-that-occur-during-node", "investigate-fix-runtime-problems-node"],
  ["認証とレート制限付きのスケーラブルなREST APIサーバーを作る方法", "How to build a scalable REST API server with authentication and rate limiting", "build-scalable-rest-api-server-authentication-rate-limiting", "build-scalable-rest-api-server"],
];
for (const [ja, en, light, strong] of candidateCases) {
  eq(`candidates: ${ja} / ${en}`, R.candidates(en, ja), { light, strong });
}

// keywordsFrom: ドット区切り
eq("keywordsFrom: Next.jsとNode.jsの違い", [...R.keywordsFrom("Next.jsとNode.jsの違い")].sort(), ["js", "next", "nextjs", "node", "nodejs"]);
eq("keywordsFrom: package.jsonとNode.js", [...R.keywordsFrom("package.jsonとNode.js")].sort(), ["js", "json", "node", "nodejs", "package"]);
const keywordsCases = [
  ["Next.js'sの違い", ["js", "next", "nextjs"]],
  ["note.comとzenn.dev", ["com", "dev", "note", "zenn"]],
  ["ASP.NET Core", ["asp", "aspnet", "core", "net"]],
  ["Vue 3.5", ["3", "5", "vue"]],
  ["macOSでChrome", ["chrome", "macos"]],
];
for (const [input, expected] of keywordsCases) eq(`keywordsFrom: ${input}`, [...R.keywordsFrom(input)].sort(), expected);

// sanitize: ドット区切り(ハイフンで書かれたものはまとめない)
const sanitizeCases = [
  ["next.js-app-router", "nextjs-app-router"],
  ["Next.js App Router", "nextjs-app-router"],
  ["next-js-app", "next-js-app"],
  ["edit package.json", "edit-package-json"],
  ["next.js's-app-router", "nextjs-app-router"],
  ["vs.vue-compare", "vs-vue-compare"],
];
for (const [input, expected] of sanitizeCases) eq(`sanitize: ${input}`, R.sanitize(input), expected);

// guessLanguage: 題名の文字とブラウザ設定から言語を決める
const guessCases = [
  ["コーヒー", ["zh-CN"], "ja", null],
  ["macOSで", ["en-US"], "ja", null],
  ["한국어", ["ja"], "ko", null],
  ["Next.js 15와", ["ja"], "ko", null],
  ["猫", ["ja", "en-US"], "ja", null],
  ["猫", ["zh-CN", "en"], "zh", null],
  ["貓", ["zh-TW"], "zh-Hant", null],
  ["猫", ["en-US", "zh-CN", "ja"], "zh", null],
  ["猫", ["en-US", "en"], "ja", ["ja", "zh"]],
  ["猫", [], "ja", ["ja", "zh"]],
  ["Как дела", ["ru-RU", "en"], "ru", null],
  ["Как дела", ["ru", "uk"], "ru", ["ru", "uk"]],
  ["Как дела", ["en-US"], null, []],
  ["สวัสดี", ["th", "ja"], "th", null],
  ["How to make", ["ja", "en-US", "en"], "en", null],
  ["How to make", [], "en", null],
  ["How to make", ["fr-FR", "fr", "en-US", "en"], "en", ["fr", "en"]],
  ["Bonjour", ["fr"], "en", ["fr", "en"]],
  ["Comment créer", ["fr-FR", "fr", "en-US", "en"], "fr", ["fr", "en"]],
  ["Comment créer", ["en-US", "fr"], "fr", ["en", "fr"]],
  ["Comment créer", ["fr", "de", "en"], "fr", ["fr", "de", "en"]],
  ["2026 !!", ["fr"], "en", null],
];
for (const [text, langs, lang, candidates] of guessCases) {
  eq(`guessLanguage: ${text} ${JSON.stringify(langs)}`, R.guessLanguage(text, langs), { lang, candidates });
}

// pickDetected: Language Detector の結果から選ぶ(results は 言語:確度)
const det = (s) => s.split(",").filter(Boolean).map((x) => { const [l, c] = x.trim().split(":"); return { detectedLanguage: l, confidence: Number(c) }; });
const pickCases = [
  ["en:.4, fr:.3", "en", ["fr", "en"], "en"],
  ["de:.6, fr:.2", "en", ["fr", "en"], "fr"],
  ["fr-CA:.6", "en", ["fr", "en"], "fr"],
  ["und:1", "en", ["fr", "en"], "en"],
  ["zh-Hant:.7", "ja", ["ja", "zh"], "zh-Hant"],
  ["ru:.8", null, [], "ru"],
  ["en:.9, ru:.1", null, [], "ru"],
  ["und:1", null, [], null],
  ["", null, [], null],
];
for (const [results, lang, candidates, expected] of pickCases) {
  eq(`pickDetected: ${results || "(空)"}`, R.pickDetected(det(results), { lang, candidates }), expected);
}

process.exit(fail ? 1 : 0);
