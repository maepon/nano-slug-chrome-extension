const R = require("../slug-rules.js");
// 英訳はスクリーンショットの直訳結果から推定したもの
const cases = [
  ["PFO閉鎖術から3ヶ月経ちました", "3 months have passed since PFO"],
  ["ブックマークにスコープを — Scoped Bookmark という考え方", "Scope to bookmarks - the concept of Scoped Bookmark"],
  ["PFO（卵円孔開存）閉鎖術という手術を受けました", "I underwent surgery called PFO closure"],
  ["Google Meet Chat to Clipboardの動作について", "About the behavior of Google Meet Chat to Clipboard"],
  ["macOSでChrome拡張機能の他言語設定を確認する方法", "How to check other language settings for Chrome extensions on macOS"],
  ["Chrome拡張機能の作り方", "How to make a Chrome extension"],
  ["JavaScriptなしでモーダルを作る", "Create a modal without JavaScript"],
  ["HTTPSとHTTPの違い", "Differences between HTTPS and HTTP"],
  ["サービスとサービスワーカー", "Services and service workers"],
];
for (const [ja, en] of cases) {
  const { light, strong } = R.candidates(en, ja);
  console.log(ja, "\n   直訳:", light, "\n   短縮:", strong);
}
