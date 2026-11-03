# Nano Slug Generator（試作 v0.1.5）

選択したタイトルから、WordPress向けのslug候補を最大3つ表示します。

| 候補 | 作り方 | 必要なもの |
|---|---|---|
| 1 直訳 | Translator API で英訳 → 軽め整形（冠詞・前置詞・接続詞・be動詞を除去、`how to` は保持） | Chrome 138+ |
| 2 短縮 | 同じ英訳 → 強め整形（疑問詞・助動詞・代名詞なども除去） | Chrome 138+ |
| 3 AI | Prompt API（Gemini Nano）で意訳（`responseConstraint` でJSON固定） | 対応ハードウェア＋モデル |

- `not / no / without / vs` などの否定・比較の語はどの候補でも消しません。
- 上限は直訳が8語・60文字、短縮が5語・45文字です。
- 上限を超えた時は、`check` や `other` などの汎用語から削ります。次に `how to`、その次に残りの語を後ろから削ります。
- 元の日本語にアルファベットで書かれていた語（`macOS`、`Chrome` など）は最後まで残します。
- 短縮が直訳より短くならない場合、短縮案は出しません。
- 語幹が同じ語（scope/scoped、bookmark/bookmarks）の重複は後ろ側を残します。元の日本語で大文字の略語だった語（HTTPS/HTTP）は別の語として扱います。
- 英語のテキストを選んだ場合は翻訳しません。
- AIが使える環境では、空いている番号にAI用の枠（「AI生成中…」と経過秒数）を先に出します。番号とポップアップの高さは途中で変わりません。

## 読み込み

1. `chrome://extensions` を開き、デベロッパーモードをONにする。
2. 「パッケージ化されていない拡張機能を読み込む」で、このフォルダを選ぶ。

フラグ設定は不要です（Chrome 138以降）。

## 使い方

1. テキストを選択する。
2. **Alt+S**（Macは Option+S）を押すか、右クリックの「選択テキストからslugを生成」を選ぶ。
3. **1〜3キー** を押すかクリックでコピーする。**Esc** で閉じます。

ショートカットは `chrome://extensions/shortcuts` で変更できます。

## 権限

`activeTab` / `scripting` / `contextMenus` / `clipboardWrite` を使います。

`<all_urls>` は使いません。起動した時だけ、そのタブにスクリプトを注入します。

## 実機で確認してほしいこと（試作の目的）

- [ ] 普通のWebページで候補1・2が出るか。content scriptから Translator API が呼べるかの確認です。
- [ ] 候補3が出るか。content scriptから Prompt API が呼べるかの確認です。出ない場合は、ステータス表示の文言と、DevToolsコンソールの `[nano-slug]` ログを確認してください。
- [ ] WordPressのブロックエディタでタイトルを選択し、**ショートカット**で動くか。iframe（editor canvas）内の選択を拾えるかの確認です。
- [ ] 同じく**右クリックメニュー**で動くか。
- [ ] 初回のモデルダウンロード時に、ボタンを押すと進捗が出て続行できるか。
- [ ] WordPress上でコピーできるか。iframe内でのClipboard APIを確認します。失敗時は `execCommand` にフォールバックします。

## 処理時間の計測

実行のたびに、DevToolsのコンソールに `[nano-slug] timing(ms)` が出ます。単位はミリ秒です。

| 項目 | 意味 |
|---|---|
| reused | 同じページ内でAIセッションを使い回したか |
| translate | 翻訳にかかった時間 |
| sessionCreate | AIセッションの新規作成にかかった時間（ページ内の初回のみ） |
| sessionClone | セッションの複製にかかった時間 |
| waitSession | 翻訳が終わった後、セッションの準備完了を待った時間 |
| prompt | AIの生成にかかった時間 |
| total | 全体の時間 |

WordPressの編集画面はiframe内なので、コンソール上部のコンテキスト選択を切り替えないとログが見えない場合があります。

## テスト

```bash
npm install
npx playwright install chromium   # 初回のみ
npm test
```

AI APIは模擬（モック）で置き換えているため、Chrome内蔵AIがない環境でも動きます。

## 既知の制限・未決事項

- 「Next.js」は `next-js`、「Vue 3.5」は `vue-3-5` になります（ドット区切りの扱いは未調整）。
- Prompt APIのモデルが未ダウンロードの場合、自動ではダウンロードしません。ボタンを押した時だけダウンロードします（数GBあるため）。
