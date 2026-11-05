// chrome.i18n.getMessage の模擬。_locales/<locale>/messages.json を読む。
// 実物と同じ挙動: subs は配列だけ置換する(数値をそのまま渡すと置換されない)、$NAME$ は大文字小文字を区別しない、
// $$ は $、存在しないキーは空文字列。
const fs = require("fs");
const path = require("path");

const loadMessages = (locale) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "..", "_locales", locale, "messages.json"), "utf8"));

// toString() でブラウザへ埋め込むので、外の変数に依存しない
function createGetMessage(messages) {
  return function getMessage(key, subs) {
    const m = messages[key];
    if (!m) return "";
    const list = Array.isArray(subs) ? subs : [];
    const ph = {};
    for (const [name, v] of Object.entries(m.placeholders || {})) ph[name.toLowerCase()] = v.content;
    return m.message.replace(/\$([A-Za-z0-9_@]+)\$|\$\$/g, (all, name) => {
      if (!name) return "$";
      const content = ph[name.toLowerCase()];
      if (content === undefined) return "";
      return content.replace(/\$(\d)/g, (_, n) => (list[n - 1] === undefined ? "" : list[n - 1]));
    });
  };
}

const makeGetMessage = (locale) => createGetMessage(loadMessages(locale));

// ページに注入するスクリプト。window.chrome があれば壊さず i18n だけ足す
function i18nMock(locale) {
  return `(function () {
    const getMessage = (${createGetMessage.toString()})(${JSON.stringify(loadMessages(locale))});
    window.chrome = window.chrome || {};
    window.chrome.i18n = Object.assign(window.chrome.i18n || {}, { getMessage, getUILanguage: () => ${JSON.stringify(locale)} });
  })();`;
}

module.exports = { i18nMock, makeGetMessage, loadMessages };
