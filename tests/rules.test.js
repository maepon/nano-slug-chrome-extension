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
];
for (const [ja, en, light, strong] of candidateCases) {
  eq(`candidates: ${ja} / ${en}`, R.candidates(en, ja), { light, strong });
}

// keywordsFrom: ドット区切り
eq("keywordsFrom: Next.jsとNode.jsの違い", [...R.keywordsFrom("Next.jsとNode.jsの違い")].sort(), ["nextjs", "nodejs"]);
eq("keywordsFrom: package.jsonとNode.js", [...R.keywordsFrom("package.jsonとNode.js")].sort(), ["json", "nodejs", "package"]);

// sanitize: ドット区切り(ハイフンで書かれたものはまとめない)
const sanitizeCases = [
  ["next.js-app-router", "nextjs-app-router"],
  ["Next.js App Router", "nextjs-app-router"],
  ["next-js-app", "next-js-app"],
  ["edit package.json", "edit-package-json"],
];
for (const [input, expected] of sanitizeCases) eq(`sanitize: ${input}`, R.sanitize(input), expected);

process.exit(fail ? 1 : 0);
