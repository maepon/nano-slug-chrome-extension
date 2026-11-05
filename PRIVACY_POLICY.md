# Privacy Policy

[日本語](#プライバシーポリシー)

**Nano Slug Generator**  
**Last updated:** November 5, 2026

The extension doesn't collect your data or send it to its developer or any third party.

## What the extension handles

When you run the extension, it handles the following on your device:

- **Selected text:** the first 200 characters of your selection. It's used to detect the language and create slug candidates.
- **Browser language settings:** used to determine the title's language. The interface language follows Chrome's display language.
- **Slug candidates:** shown in the popup. The slug you choose is copied to your clipboard.

The extension doesn't read the page until you run it from the keyboard shortcut or the right-click menu.

## How data is processed

Selected text is processed with Chrome's built-in Language Detector, Translator, and Prompt APIs. According to [Chrome's documentation](https://developer.chrome.com/docs/ai/get-started), "No data is sent to Google or any third party when using the model."

The extension itself makes no network requests, and it has no analytics, advertising, or tracking.

## Storage

The extension doesn't save your selected text or slugs. They stay in the page's memory while it's open, and the slug you copy stays on your clipboard like anything else you copy.

Technical messages, such as errors and processing times, may appear in your browser's DevTools console. The extension doesn't send them anywhere.

## Model downloads and Chrome

Chrome may need to download models the first time they're used. The extension starts a download only after you click its button. Chrome performs these downloads, and [Google Chrome's privacy notice](https://www.google.com/chrome/privacy/) applies to Chrome itself.

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | To read your selection in the current tab when you run the extension |
| `scripting` | To add the popup to that tab when you run the extension |
| `contextMenus` | To add the right-click menu item |
| `clipboardWrite` | To copy the slug you choose |

## Changes

Changes to this policy are published in this file with a new date. You can see earlier versions in the file's history on GitHub.

## Contact

If you have questions, please [open an issue on GitHub](https://github.com/maepon/nano-slug-chrome-extension/issues).

---

# プライバシーポリシー

**Nano Slug Generator**  
**最終更新日:** 2026年11月5日

この拡張は、データを収集せず、開発者や第三者に送信しません。

## 拡張が扱う情報

拡張を起動すると、端末の中で次の情報を扱います。

- **選択したテキスト:** 選択範囲の先頭200文字です。言語の判定とslug候補の作成に使います。
- **ブラウザの言語設定:** タイトルの言語の判定に使います。画面の言語は Chrome の表示言語に合わせます。
- **slug候補:** ポップアップに表示します。選んだslugはクリップボードにコピーします。

キーボードショートカットか右クリックメニューで起動するまで、ページの内容は読みません。

## データの処理

選択したテキストは、Chrome に内蔵された Language Detector API、Translator API、Prompt API で処理します。[Chrome のドキュメント](https://developer.chrome.com/docs/ai/get-started)には、「No data is sent to Google or any third party when using the model.」（モデルの使用時に、データが Google や第三者に送信されることはない）とあります。

拡張自体はネットワーク通信を行いません。アクセス解析、広告、トラッキングもありません。

## 保存

選択したテキストやslugは保存しません。ページを開いている間はページのメモリに残ります。コピーしたslugは、他のコピーした内容と同じようにクリップボードに残ります。

エラーや処理時間などの技術的なメッセージが、ブラウザの DevTools コンソールに出ることがあります。拡張がこれらを送信することはありません。

## モデルのダウンロードと Chrome

モデルは、初めて使う時にダウンロードが必要なことがあります。拡張は、ボタンを押した時だけダウンロードを始めます。ダウンロードは Chrome が行い、Chrome 自体には [Google Chrome のプライバシーに関するお知らせ](https://www.google.com/chrome/privacy/)が適用されます。

## 権限

| 権限 | 使う理由 |
|---|---|
| `activeTab` | 起動した時に、開いているタブの選択範囲を読むため |
| `scripting` | 起動した時に、そのタブへポップアップを表示するため |
| `contextMenus` | 右クリックメニューに項目を追加するため |
| `clipboardWrite` | 選んだslugをコピーするため |

## 変更

このポリシーを変更する時は、このファイルを更新し、日付を改めます。以前の内容は GitHub のファイル履歴で確認できます。

## 連絡先

ご質問は [GitHub の Issue](https://github.com/maepon/nano-slug-chrome-extension/issues) でお知らせください。
