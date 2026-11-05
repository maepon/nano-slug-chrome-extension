# Contributing to Nano Slug Generator

The extension has no build step. Load the repository folder from `chrome://extensions` to run it.

## Workflow

- Work on a branch and open a pull request. `main` requires pull requests and signed commits.
- Pull requests are merged with merge commits.
- Don't edit `ai-flow/` directly. It's a `git subtree` of [issue-to-pr-flow](https://github.com/maepon/issue-to-pr-flow).
- Update both `README.md` and `README.ja.md` when user-facing behavior changes.

## Tests

```bash
npm install
npx playwright install chromium   # first time only
npm test
```

The tests replace the AI APIs and `chrome.i18n` with mocks, so they run without Chrome's built-in AI. `tests/i18n.test.js` also loads the real extension and compares the real `getMessage` with the mock.

`npm test` doesn't include `tests/real.test.js`, which prints sample titles for visual checks. Run it with `npm run test:real`.

## Display languages

Messages are in `_locales/<language>/messages.json`. To add a language, add that file with the same keys as `en`; no code change is needed. `npm test` checks for missing keys and mismatched placeholders.

Set `displayLocale` to the language of the file. It decides the language of language names inside messages, such as `French` in `French to English…`.

On macOS, you can try another display language without changing system settings. Use a separate profile, and quit that Chrome completely before you switch languages:

```bash
open -na "Google Chrome" --args -AppleLanguages '(en)' --user-data-dir=/tmp/chrome-en
```

## Title language detection

Slugs are always English. The title's language is decided before translation, in this order:

1. Kana means Japanese, and Hangul means Korean.
2. Chinese characters without kana use the first Japanese or Chinese language in the browser settings. If there is none, Language Detector chooses between the two, with Japanese as the fallback.
3. Other non-Latin scripts use the browser languages written in that script.
4. A title with Latin letters and at most two other letters (`How to use π in JavaScript`) that match no configured script is treated like a Latin-only title. If the browser settings include a Latin-script language other than English, Language Detector chooses among the configured languages. Otherwise, the title is English.
5. Anything else with letters, such as `Как установить Node.js` without a matching setting, goes to Language Detector.

If Language Detector can't be used, Latin titles with non-ASCII Latin letters such as `é` use the first configured non-English language; others are English. Symbols and other scripts don't count as non-English.

## Slug rules

- **Literal** removes articles, prepositions, conjunctions, be-verbs, `have`, and first-person pronouns, and keeps `how to`. The limit is 8 words and 60 characters.
- **Short** also removes question words, auxiliaries, and similar words. The limit is 5 words and 45 characters. It's hidden if it isn't shorter than Literal.
- **Always kept:** `not`, `no`, `without`, `vs`, `versus`, `never`, and `non`.
- **Over the limit:** generic words such as `check` and `other` go first, then `how to` as a pair, then unprotected words from the end, and finally protected words from the end.
- **Protected words:** words written in Latin letters in the original title. A dotted word is also protected in its split forms, so `Node.js` protects `nodejs`, `node`, and `js`.
- **Repeated stems:** for `scope`/`scoped` or `bookmark`/`bookmarks`, the later word stays. Uppercase acronyms such as `HTTPS` and `HTTP` are kept separate.
- **Dotted words** with one dot, two or more characters starting with a letter before it, and a letter after it become one word (`Next.js` → `nextjs`). The dot becomes a hyphen instead in these cases:
  - One character before the dot (`U.S.`)
  - Numbers (`Vue 3.5` → `vue-3-5`)
  - Two or more dots (`amazon.co.jp`)
  - `com`, `org`, `jp`, or `dev` after the dot (`zenn.dev` → `zenn-dev`)
  - A file extension after the dot: `json`, `html`, `md`, `yml`, `yaml`, `txt`, or `css` (`package.json` → `package-json`)
  - An always-kept word on either side (`React vs.Vue` → `react-vs-vue`)
- **Possessives** on dotted words are removed (`Next.js's` → `nextjs`).

## Timing logs

Each run writes `[nano-slug] timing(ms)` to the DevTools console. In the WordPress editor, you may need to switch the console's context to the editor iframe.

| Field | Meaning |
|---|---|
| `reused` | Whether the AI session on this page was reused |
| `translate` | Language detection and translation |
| `sessionCreate` | Creating the AI session (first run on the page only) |
| `sessionClone` | Cloning the session |
| `waitSession` | Waiting for the session after translation finished |
| `prompt` | AI generation |
| `total` | The whole run |

## Releases

1. Update `version` in `manifest.json` through a pull request.
2. After it's merged, tag `main` with the same version and push the tag:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

`.github/workflows/release.yml` then creates a GitHub release with a zip for the Chrome Web Store. It fails if the tag and the `manifest.json` version don't match.

If the extension starts using a new file or folder, such as icons, add it to the zip in the workflow.
