# Nano Slug Generator — 開発メモ

選択したタイトル（日本語に限らない。題名の言語を判定して英訳する）から、WordPress向けのslug候補を最大3つ出すChrome拡張（MV3）です。Chrome内蔵AIを使います。**配布前提**です。

## 構成

| ファイル | 役割 |
|---|---|
| `manifest.json` | 権限は `activeTab` / `scripting` / `contextMenus` / `clipboardWrite` のみ。`<all_urls>` は使わない |
| `background.js` | 起動経路（`chrome.commands` の Alt+S と右クリックメニュー）。選択のあるフレームを探し、そこへ注入する。メニューは `onInstalled` と `onStartup` で作り直す |
| `slug-rules.js` | 整形ルールと言語判定（ブラウザ／Node共通）。`candidates(english, original)` → `{ light, strong }`、`guessLanguage(text, languages)` → `{ lang, candidates }`、`pickDetected(results, guess)` |
| `content.js` | 起動時だけ注入される。言語判定（Language Detector）、翻訳、AI生成、Shadow DOMのポップアップ、キー操作、コピー。文言は `t(key, ...subs)`（`chrome.i18n`）で取る |
| `_locales/` | 表示用の文言（`en` / `ja`、`default_locale` は `en`）。`manifest.json` の `__MSG_…__` もここ。言語を足す時はフォルダを足すだけ |
| `README.md` / `README.ja.md` | 利用者向けの説明（英語と日本語）。利用者に見える動きを変えたら両方を直す |
| `PRIVACY_POLICY.md` | プライバシーポリシー（英語と日本語）。拡張が扱うデータや権限を変えたら直し、日付も改める |
| `CONTRIBUTING.md` | 開発者向けの説明（英語）。テスト、整形ルール、言語判定の順、表示言語の足し方、計測ログ |
| `tests/` | Node + Playwright のテスト。AI APIは模擬（モック）で置き換えている。`i18n-mock.js` は `chrome.i18n.getMessage` の模擬 |
| `package.json` | テスト用のみ（devDependencies は playwright だけ）。拡張本体はビルド不要 |
| `ai-flow/` | [issue-to-pr-flow](https://github.com/maepon/issue-to-pr-flow) を `git subtree` で取り込んだもの。**直接編集しない**（変更は上流へ） |
| `.ai-flow/` | 上記フローのこのプロジェクト用の設定（テストコマンド、権限、出力言語など） |
| `.github/workflows/release.yml` | `v*` タグのプッシュで、ストア用のZIPを付けた GitHub リリースを作る。タグと `manifest.json` の版が違うと失敗する。ZIPに入れるファイルは列挙しているので、拡張が使うファイルを足したらここにも足す（アイコンも） |
| `renovate.json` | 依存更新（Renovate）。毎週月曜朝にPRを作る。`ai-flow/` は対象外（subtreeで更新するため） |

## リポジトリの運用

- `main` はルールセット `protect-main` で保護している：PR必須（承認0）、強制プッシュ禁止、削除禁止、**署名付きコミット必須**。管理者も例外なし。
- マージ方法はマージコミットのみ（subtree の履歴を残すため）。
- 作業は必ずブランチを切ってPRで入れる。
- Renovate のPRは自動マージしない（CIが無いため）。手元で `npm test` を通してからマージする。playwright の更新後は `npx playwright install chromium` も必要。

## 候補の作り方（合意済みの仕様）

| 番号 | タグ | 作り方 |
|---|---|---|
| 1 | 直訳 | Translator API（判定した言語→en）＋軽め整形。上限8語・60文字 |
| 2 | 短縮 | 同じ英訳＋強め整形。上限5語・45文字。**直訳より短くならなければ出さない**（無理に削ると内容語が消えるため） |
| 3 | AI | Prompt API（`responseConstraint` でJSON固定）。2案を頼み、空いている番号を埋める |

### 整形ルール

- **除去する語:** 軽めは冠詞・前置詞・接続詞・be動詞・have・一人称代名詞。強めはそれに加えて疑問詞・助動詞・`since`・`called`・`concept` など。
- **常に残す語:** `not` / `no` / `without` / `vs` は、どの候補でも消さない。
- **`how to`:** 直訳ではかたまりとして残す。
- **上限を超えた時の削る順:**
  1. 汎用語（GENERIC）
  2. `how to`（2語まとめて削る。`how` だけ残さない）
  3. 保護されていない語（後ろから）
  4. 保護語（後ろから）
  - 先頭からの単純な切り捨てはしない。英語の題名は固有名詞が後ろに来やすいため。
- **保護語:** 元の題名にアルファベットで書かれていた語（macOS、Chromeなど）。ドット区切りの語は、`tokenize` の結果に加えて、ドットで分けた語も保護する（`Node.js` → `nodejs` / `node` / `js`）。分ける前に所有格を取り除く（`Next.js's` から `jss` を作らない）。
- **重複語:** 語幹が同じ語（scope/scoped）は**後ろ側を残す**。後ろ側の方が "service workers" のような複合語であることが多いため。大文字の略語（HTTPS/HTTP）は語幹をまとめない。
- **ドット区切り:** `tokenize` 内の `joinDotted` で、ドットが1つ・前が英字始まりで2文字以上・後ろが英字始まりなら1語にまとめる（`Next.js` → `nextjs`）。まとめないもの：前が1文字（`U.S.`）、数字が絡むバージョン番号、ドット2つ以上（`amazon.co.jp`）、後ろがドメインの語（`DOMAIN_SUFFIXES`: com/org/jp/dev。`note-com`、`zenn-dev`）、後ろが拡張子（`FILE_EXTS`: json/html/md/yml/yaml/txt/css。`package-json`、`style-css`）、前か後ろが `KEEP`（`vs.Vue` → `react-vs-vue`。`VS.Code` も `vs-code` になる）。2つの定数は別々で、後で足せる。`js` は `Node.js` などと区別できないので拡張子に入れない。
  - `web.dev` や `Normalize.css` のような製品名も分けて `web-dev` になる。誤判定した時の損失が左右で違い、`web-dev` は語が読めて情報も失わないが、`zenndev` は読みにくいため。`net` / `io` は `Socket.IO` などと区別できないので足さない。
  - **所有格:** ドット区切りの語に付いた `'s` / `’s` は、アポストロフィを取り除く前に取り除く（`Next.js's` → `nextjs`、`package.json's` → `package-json`）。ドットを含まない語（`What's` → `whats`、`Chrome's` → `chromes`）は変えない。
  - バージョン番号は `vue-3-5` のまま。`35` にまとめると「3.5」と「35」の区別がつかなくなるため。
- **数字の表記揺れ:** 「3-months」と「one-month」が混在するが、**そのままでOK**（ユーザー判断）。

## UIの決定事項

- **並び順:** 直訳→短縮→AI。**一度表示した番号は動かさない。** AIが使える環境では、空いている番号に「AI生成中… n.n秒」の枠を先に出す。
  - AIを先頭にする案は却下した。AI案が届いた瞬間に番号がずれ、押し間違えるため。
- **フォーカス:** ポップアップを開いたらフォーカスをポップアップに移し、選択範囲も解除する。
  - 実機で、日本語IMEがONの時に数字キーが選択範囲を上書きする不具合があったため。
  - Escで閉じた時は元のフォーカスと選択範囲を戻す。コピーで閉じた時は戻さない。
- **キー判定:** `e.code` を使う（IME ON時は `e.key` が当てにならないため）。テンキーも可。
- **モデルのダウンロード:** Prompt APIのモデルは自動でダウンロードしない（数GBあるため）。ボタンを押した時だけダウンロードする。Language Detector と Translator のモデルも同じ（ボタンの後に `create()`）。

- **表示言語:** 文言は `chrome.i18n`（`_locales/<言語>/messages.json`）で切り替える。追加の権限もビルドも要らない。**題名の言語（`navigator.languages` で判定）と表示言語は別物。**
  - 言語名（`Intl.DisplayNames`）は `t("displayLocale")` の言語で出す。`chrome.i18n.getUILanguage()` を使うと、英語の文の中に別の言語の言語名が混ざる。
  - メニューの題名は登録した時の言語のまま残り、表示言語は再起動で変わるので、`onInstalled` と `onStartup` の両方で `removeAll` してから `create` する。
  - `getMessage` の置換は**配列・文字列**で渡さないと効かない（数値をそのまま渡すと置換されない）。`t()` が `subs.map(String)` で包む。キーは文字列リテラルで書く（テストがコードからキーを拾う）。
  - `SYSTEM_PROMPT` とコンソールのログは英語のまま。

## 言語判定（翻訳の前）

- `run()` は `prepareAI` を先に始め、`guessLanguage(text, navigator.languages)` で判定する（`navigator.languages` は実行時に読む）。`candidates === null` なら確定で、Language Detector は呼ばない。
- 判定の順: かな→`ja`、ハングル→`ko`、漢字→設定の最初の `ja` / `zh*`（無ければ `ja`、Detector の候補は `ja`/`zh`）、ラテン文字以外→設定のうち文字種が合う言語、ラテン文字だけ（ラテン文字以外が2文字以下で設定の文字種と合わない題名も含む）→設定に英語以外のラテン文字の言語があれば Detector、無ければ `en`、文字なし→`en`。
  - ラテン文字以外（`\p{L}`、結合記号は数えない）が3文字以上、またはラテン文字が無い題名は `{ lang: null, candidates: [] }` のまま（Detector に任せる）。上限は定数 `MAX_NON_LATIN_LETTERS`。
  - **2文字以下にした理由:** 誤って英語にすると、題名の内容が消えた slug が警告なしで出る。製品名を含む他言語の題名（`Как установить Node.js`）を英語として確定させない側に倒した。「2文字」は `Δx Δy` までを許す判断で、実測値に基づかない。
  - Detector が使えない時の代わりの判定は、NFC に正規化した上で ASCII 以外のラテン文字（`é` など）があるかで決める（分解された `é` も拾う。記号や `µ` では英語以外にしない）。`µ`（U+00B5）はラテン文字に変わらないので NFKC は使わない。
  - **設定に無いラテン文字の言語は翻訳しない（#15 で見送り）:** `Créer une application web avec React` は、設定が `ja` / `en` だけなら `creer-une-application-web-avec-react` になる。翻訳したい人は言語設定に追加する。Detector に全部回す案は、英語しか使わない人まで初回にダウンロードのボタンで止まり、短い題名は救えず（`Apprendre React` は en 0.98）、製品名だけの題名を誤判定する（`Kubernetes` は cs 0.38）ため採らなかった。実測値は #15 にある。
- 決まらない時だけ Detector を使い、`pickDetected` で候補に絞って選ぶ。確度の閾値は設けない（候補を絞っており、短い題名では確度が低く出がちで、決める実測値も無いため）。
- Detector が使えない・失敗した時は `guess.lang`（状況は表示しない）。`null` なら「題名の言語を判定できませんでした」。
- 英語と判定したら翻訳しない。それ以外は `その言語→en` で翻訳する。`zh-TW` / `zh-HK` は `zh-Hant`。
- **AIに原文を渡す条件:** `ja` / `en` のみ（`Title: 原文\nEnglish: 英訳`）。それ以外は `English: 英訳` だけ。`AI_OPTS` の `languages: ["en","ja"]` は言語決定前にセッションを準備して使い回すため変えず、宣言と実際の入力を一致させ、Prompt API の他言語対応に依存しないためである。

## 性能（実機計測、ページ内の初回）

`{"translate":224,"sessionCreate":520,"waitSession":298,"prompt":1211,"total":1734}`

- 翻訳とAIセッションの準備は並行して行う。セッションはページ内で使い回す（`clone()`）。
- 残りの大半は生成そのもので、速度の改善はここで止めた。
- 拡張を更新した直後は約10秒かかる（モデルの読み込みと推測）。

## 実機で確認済み（ユーザー環境）

- WordPressブロックエディタ（iframe内のタイトル）で、選択テキストの取得、3候補の表示、クリックと数字キーでのコピーが動く。
- content script から Translator API と Prompt API の両方を呼べる。

## 未着手

- アイコン、ストア掲載用の素材
- クラシックエディタや他のCMSでの動作確認
- 汎用語リスト（GENERIC）の調整。実際のタイトルで様子を見ながら

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
node tests/lang.test.js    # 言語判定、Detector、翻訳の言語、AIへの入力
node tests/i18n.test.js    # 文言の整合、ポップアップ（ja/en）、メニュー、実物の拡張の読み込み
```

macOS では `--lang` で Chrome の表示言語を変えられないので、`i18n.test.js` は模擬（`tests/i18n-mock.js`）で両言語を確かめる。実物の拡張の読み込みは、起動中の言語だけ確かめる（模擬と実物の `getMessage` の一致）。他のテストは `i18nMock("ja")` を注入する。

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
- `package.json` に `test:<name>` を足したら、`.ai-flow/permissions.json` にも `Bash(npm run test:<name>)` を足す（絶対パスの形も）。`Bash(npm run test:*)` は `npm run test:rules` に一致しないため、1つずつ書いている。
- **更新:** タグのコミットを `git fetch` してから `git subtree merge --prefix=ai-flow "$c" --squash`（URLとタグを直接渡さない）。**直後に `ai-flow/scripts/resign-subtree-merge.sh` で再署名する**（main が署名必須のため）。手順は `ai-flow/docs/setup-with-agent.md` の Updating。
- ai-flow を取り込む・更新するPRは**マージコミットで**マージする（squash・rebase不可。次回の更新が以前の版を見つけられなくなる）。
