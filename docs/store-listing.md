# Chrome Web Store の掲載情報

ストアの管理画面（Developer Dashboard）に貼る文言の下書き。拡張の動き・権限・扱うデータを変えたら、README・PRIVACY_POLICY.md と合わせてここも直す。

## 掲載情報（Store listing）

### 概要（Summary、132文字以内）

**en（129文字）**

```
Select a post title and get English WordPress slug candidates. Translates Japanese and other languages with Chrome's built-in AI.
```

**ja（64文字）**

```
選択した記事タイトルから、英語のWordPress用slug候補を作ります。日本語などの題名もChrome内蔵AIで英訳します。
```

### 説明（Description）

**en**

```
Select a post title on any page and get up to three English URL slug candidates for WordPress. Press a number key to copy one.

HOW TO USE
1. Select a title on the page.
2. Press Alt+S (Option+S on Mac), or right-click and choose "Generate slug from selection".
3. Press 1–3 or click a candidate to copy it. Press Esc to close.

THREE KINDS OF CANDIDATES
• Literal: translates the title and removes words such as articles and prepositions.
• Short: removes more words from the same translation (shown only if it is shorter).
• AI: a rewritten slug suggested by Gemini Nano (optional; requires supported hardware).

Words written in Latin letters in the original title, such as "macOS" or "Chrome", are kept as long as possible. Words such as "not", "no", "without", and "vs" are never removed.

ANY LANGUAGE
Titles can be in Japanese, Korean, Chinese, and other languages. The language is detected from the title's characters and your browser's language settings. English titles are not translated.

PRIVATE BY DESIGN
• Everything runs on your device with Chrome's built-in Translator, Language Detector, and Prompt APIs.
• The extension makes no network requests and doesn't store your titles or slugs.
• It doesn't run on a page until you start it.

REQUIREMENTS
• Desktop Chrome 138 or later.
• The AI candidate also needs hardware that supports Gemini Nano. Without it, you still get the Literal and Short candidates.
• Chrome may need to download models the first time. Downloads start only after you click the button in the popup. The AI model is several GB.

Tested in the WordPress block editor. Source code and details: https://github.com/maepon/nano-slug-chrome-extension
```

**ja**

```
ページで記事のタイトルを選択すると、WordPress向けの英語のslug候補を最大3つ表示します。数字キーを押すとコピーできます。

使い方
1. ページ上のタイトルを選択します。
2. Alt+S（Macは Option+S）を押すか、右クリックで「選択テキストからslugを生成」を選びます。
3. 1〜3のキーを押すか候補をクリックするとコピーします。Escで閉じます。

3種類の候補
• 直訳：タイトルを英訳し、冠詞や前置詞などを除きます。
• 短縮：同じ英訳から、さらに語を減らします（直訳より短くなる時だけ表示）。
• AI：Gemini Nano が言い換えたslugを提案します（任意。対応するハードウェアが必要）。

元のタイトルにアルファベットで書かれた語（macOS、Chrome など）は、できるだけ残します。not / no / without / vs は消しません。

いろいろな言語に対応
日本語、韓国語、中国語などのタイトルにも対応しています。言語は、タイトルの文字とブラウザの言語設定から判定します。英語のタイトルは翻訳しません。

プライバシー
• 処理はすべて端末の中で、Chrome に内蔵された Translator API、Language Detector API、Prompt API で行います。
• 拡張自体はネットワーク通信を行わず、タイトルやslugを保存しません。
• 起動するまで、ページでは何も動きません。

動作環境
• デスクトップ版 Chrome 138 以降
• AI の候補には、Gemini Nano に対応するハードウェアも必要です。無い環境でも、直訳と短縮の候補は使えます。
• 初回は Chrome がモデルをダウンロードすることがあります。ダウンロードは、ポップアップのボタンを押した時だけ始まります。AI のモデルは数GBあります。

WordPress のブロックエディタで動作を確認しています。ソースコードと詳細：https://github.com/maepon/nano-slug-chrome-extension
```

### 画像

| 欄 | ファイル |
|---|---|
| ストアのアイコン（128×128） | `images/icon/nano-slug-128.png` |
| スクリーンショット（1280×800） | `images/nano-slug-ss.png` |
| 小さなプロモーションタイル（440×280） | `images/nano-slug-promo-440x280.png` |

プロモーションタイルは言語ごとに差し替えられない（全言語で共通）。

## プライバシーへの取り組み（Privacy practices）

### 単一用途（Single purpose）

```
Generates English URL slug candidates for WordPress from a title the user selects on the page, and copies the chosen slug to the clipboard.
```

### 権限ごとの理由（Permission justification）

**activeTab**

```
Used to read the text the user has selected in the current tab, only after the user runs the extension with the keyboard shortcut or the context menu. The extension does not request host permissions.
```

**scripting**

```
Used to inject the content script that shows the slug candidates popup into the current tab (and the frame containing the selection, such as the WordPress editor iframe), only when the user runs the extension.
```

**contextMenus**

```
Adds a "Generate slug from selection" item to the right-click menu for selected text, so the user can run the extension without the keyboard shortcut.
```

**clipboardWrite**

```
Copies the slug the user chooses (by number key or click) to the clipboard.
```

### リモートコード（Remote code）

```
No, I am not using remote code.
```

拡張に同梱した JS だけで動く。外部のスクリプトや `eval` は使わない。

### データの使用（Data usage）

- 収集するデータの項目は、どれにもチェックを入れない。
- 3つの宣言（承認された用途以外で第三者に販売・移転しない／単一用途と関係ない目的に使わない／信用度の判定や貸付に使わない）には、すべてチェックを入れる。

**未確認:** 選択したテキストは「Website content」に当たるが、端末の外へ送らず保存もしない。ストアのいう「収集（collect）」は開発者や外部へ送ることを指すと理解しているので、チェックしない想定。申請前にストアの User Data FAQ で確かめる。

### プライバシーポリシーの URL

```
https://github.com/maepon/nano-slug-chrome-extension/blob/main/PRIVACY_POLICY.md
```

## 申請前に確かめること

- 「Gemini Nano」「Chrome」の名前を説明文で使ってよいか（[ブランドガイドライン](https://developer.chrome.com/docs/webstore/branding)は未確認）
- データの使用の欄の扱い（上記）
- 実機での確認（#19）
