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
process.exit(fail ? 1 : 0);
