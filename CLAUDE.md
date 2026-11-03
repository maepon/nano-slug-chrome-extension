# Nano Slug Generator — 開発メモ

選択した日本語タイトルから、WordPress向けのslug候補を最大3つ出すChrome拡張（MV3）です。Chrome内蔵AIを使います。**配布前提**です。

## 構成

| ファイル | 役割 |
|---|---|
| `manifest.json` | 権限は `activeTab` / `scripting` / `contextMenus` / `clipboardWrite` のみ。`<all_urls>` は使わない |
| `background.js` | 起動経路（`chrome.commands` の Alt+S と右クリックメニュー）。選択のあるフレームを探し、そこへ注入する |
| `slug-rules.js` | 整形ルール（ブラウザ／Node共通）。`candidates(english, original)` → `{ light, strong }` |
| `content.js` | 起動時だけ注入される。翻訳、AI生成、Shadow DOMのポップアップ、キー操作、コピー |
| `tests/` | Node + Playwright のテスト。AI APIは模擬（モック）で置き換えている |
| `package.json` | テスト用のみ（devDependencies は playwright だけ）。拡張本体はビルド不要 |
| `ai-flow/` | [issue-to-pr-flow](https://github.com/maepon/issue-to-pr-flow) を `git subtree` で取り込んだもの。**直接編集しない**（変更は上流へ） |
| `.ai-flow/` | 上記フローのこのプロジェクト用の設定（テストコマンド、権限、出力言語など） |

## 候補の作り方（合意済みの仕様）

| 番号 | タグ | 作り方 |
|---|---|---|
| 1 | 直訳 | Translator API（ja→en）＋軽め整形。上限8語・60文字 |
| 2 | 短縮 | 同じ英訳＋強め整形。上限5語・45文字。**直訳より短くならなければ出さない**（無理に削ると内容語が消えるため） |
| 3 | AI | Prompt API（`responseConstraint` でJSON固定）。2案を頼み、空いている番号を埋める |

### 整形ルール

- **除去する語:** 軽めは冠詞・前置詞・接続詞・be動詞・have・一人称代名詞。強めはそれに加えて疑問詞・助動詞・`since`・`called`・`concept` など。
- **常に残す語:** `not` / `no` / `without` / `vs` は、どの候補でも消さない。
- **`how to`:** 直訳ではかたまりとして残す。
- **上限を超えた時の削る順:**
  1. 汎用語（GENERIC）
  2. `how to`
  3. 保護されていない語（後ろから）
  4. 保護語（後ろから）
  - 先頭からの単純な切り捨てはしない。英語の題名は固有名詞が後ろに来やすいため。
- **保護語:** 元の日本語にアルファベットで書かれていた語（macOS、Chromeなど）。
- **重複語:** 語幹が同じ語（scope/scoped）は**後ろ側を残す**。後ろ側の方が "service workers" のような複合語であることが多いため。大文字の略語（HTTPS/HTTP）は語幹をまとめない。
- **数字の表記揺れ:** 「3-months」と「one-month」が混在するが、**そのままでOK**（ユーザー判断）。

## UIの決定事項

- **並び順:** 直訳→短縮→AI。**一度表示した番号は動かさない。** AIが使える環境では、空いている番号に「AI生成中… n.n秒」の枠を先に出す。
  - AIを先頭にする案は却下した。AI案が届いた瞬間に番号がずれ、押し間違えるため。
- **フォーカス:** ポップアップを開いたらフォーカスをポップアップに移し、選択範囲も解除する。
  - 実機で、日本語IMEがONの時に数字キーが選択範囲を上書きする不具合があったため。
  - Escで閉じた時は元のフォーカスと選択範囲を戻す。コピーで閉じた時は戻さない。
- **キー判定:** `e.code` を使う（IME ON時は `e.key` が当てにならないため）。テンキーも可。
- **モデルのダウンロード:** Prompt APIのモデルは自動でダウンロードしない（数GBあるため）。ボタンを押した時だけダウンロードする。

## 性能（実機計測、ページ内の初回）

`{"translate":224,"sessionCreate":520,"waitSession":298,"prompt":1211,"total":1734}`

- 翻訳とAIセッションの準備は並行して行う。セッションはページ内で使い回す（`clone()`）。
- 残りの大半は生成そのもので、速度の改善はここで止めた。
- 拡張を更新した直後は約10秒かかる（モデルの読み込みと推測）。

## 実機で確認済み（ユーザー環境）

- WordPressブロックエディタ（iframe内のタイトル）で、選択テキストの取得、3候補の表示、クリックと数字キーでのコピーが動く。
- content script から Translator API と Prompt API の両方を呼べる。

## 未着手

- アイコン、ストア掲載用の素材、プライバシーポリシー（データは端末外に出ない）
- クラシックエディタや他のCMSでの動作確認
- 汎用語リスト（GENERIC）の調整。実際のタイトルで様子を見ながら
- 「Next.js」が `next-js` になるなど、ドット区切りの扱い

## テスト

```bash
npm install                     # devDependencies の playwright を入れる
npx playwright install chromium # 初回のみ
npm test                        # real 以外をまとめて実行（rules が失敗したら止まる）

# 個別に実行する場合（npm run test:rules なども可）
node tests/rules.test.js   # 整形ルール（失敗時に終了コード1）
node tests/real.test.js    # 実例タイトルの出力一覧（目視確認用）
node tests/ui.test.js      # ポップアップ（全API／DL必要／API非対応）
node tests/ime.test.js     # IME入力で選択範囲が書き換わらないか
node tests/pending.test.js # AI枠の確保・番号固定・余り枠の削除
node tests/perf.test.js    # 並行化とセッション使い回し
```

`real.test.js` の英訳は、実機のスクリーンショットから推定したものです。

## Issue駆動の開発フロー（ai-flow）

`ai-flow/` に issue-to-pr-flow v0.13.0 を入れてある。使い方は `ai-flow/docs/guide.ja.md`。

```bash
cd ai-flow
make spec ISSUE=n   # 指示書（受け入れ基準 AC-n）か質問をIssueに書く。人が読んで判断する
make impl ISSUE=n   # 計画→実装→レビュー→PR作成
```

- 設定は `.ai-flow/`（共有・コミットする）と `ai-flow/.env`（個人用・コミットしない。モデルIDと通知）。
- 整形ツールは無いので `FORMAT_*` は空。出力言語は日本語。
- **更新:** タグのコミットを `git fetch` してから `git subtree merge --prefix=ai-flow "$c" --squash`（URLとタグを直接渡さない）。手順は `ai-flow/docs/setup-with-agent.md` の Updating。
- ai-flow を取り込む・更新するPRは**マージコミットで**マージする（squash・rebase不可。次回の更新が以前の版を見つけられなくなる）。
