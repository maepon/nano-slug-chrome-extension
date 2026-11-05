# Nano Slug Generator

[日本語](README.ja.md)

Select a post title and get up to three English URL slug candidates for WordPress. Press a number key to copy one. Titles can be in Japanese, Korean, Chinese, and other languages. Everything runs on your device with Chrome's built-in AI.

<!-- TODO: icon and screenshot -->

| Selected title | Candidate | Type |
|---|---|---|
| `macOSでChrome拡張機能の他言語設定を確認する方法` | `how-to-check-language-settings-chrome-extensions-macos` | Literal |
| | `language-settings-chrome-extensions-macos` | Short |
| | `mac-chrome-extension-language-settings` | AI |

## Install

<!-- TODO: add the Chrome Web Store link after publishing -->

The extension isn't on the Chrome Web Store yet. To try it now, load it from source:

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the repository folder.

## Usage

1. Select a title on the page.
2. Press **Alt+S** (**Option+S** on Mac), or right-click and choose **Generate slug from selection**.
3. Press **1–3** or click a candidate to copy it. Press **Esc** to close.

You can change the shortcut at `chrome://extensions/shortcuts`.

## Candidates

| Type | How it's made | Requires |
|---|---|---|
| Literal | Translates the title, then removes words such as articles and prepositions | Chrome's Translator API |
| Short | Uses the same translation and removes more words. Hidden if it wouldn't be shorter than Literal | Chrome's Translator API |
| AI | Gemini Nano suggests a rewritten slug and fills the remaining numbers | Chrome's Prompt API |

If the title is already in English, it isn't translated. Words written in Latin letters in the original title, such as `macOS` or `Chrome`, are kept as long as possible. Words such as `not`, `no`, `without`, and `vs` are never removed.

## Requirements

- **Literal and Short:** desktop Chrome 138 or later.
- **AI (optional):** Chrome also needs to meet the [hardware requirements for Gemini Nano](https://developer.chrome.com/docs/ai/get-started). At the time of writing, these include:
  - Windows 10/11, macOS 13+, Linux, or ChromeOS on Chromebook Plus
  - At least 22 GB of free space on the volume with your Chrome profile
  - A GPU with more than 4 GB of VRAM, or a CPU with 16 GB of RAM and 4 or more cores
  - An unmetered connection for the first download

Mobile browsers aren't supported. If AI isn't available, you still get the Literal and Short candidates.

## Model downloads

Chrome may need to download language detection, translation, and AI models the first time they're used. The extension shows a button and only starts a download after you click it. The AI model is several GB.

## Languages

**Title language.** The extension detects the language from the characters in the title and your browser's language settings (`chrome://settings/languages`):

- Japanese kana and Korean Hangul are recognized from the characters alone.
- Other scripts, such as Chinese characters and Cyrillic, also use your language settings. Language Detector is used if those settings can't decide.
- For titles in Latin letters, the extension checks for another language only if your settings include a Latin-script language other than English. Otherwise, it treats the title as English.

**To translate a Latin-script language such as French, add it to your browser's language settings.** Otherwise, the title isn't translated and the slug stays in the original language.

**Display language.** The interface follows Chrome's display language. It's available in English and Japanese, and other display languages use English. The display language doesn't affect slugs.

## Privacy

- The extension makes no network requests and doesn't store your titles or slugs.
- Titles are processed with Chrome's built-in APIs. According to [Chrome's documentation](https://developer.chrome.com/docs/ai/get-started), "No data is sent to Google or any third party when using the model."
- Chrome downloads the models over the network. See [Model downloads](#model-downloads).

For details, see the [privacy policy](PRIVACY_POLICY.md).

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | To read your selection in the current tab when you run the extension |
| `scripting` | To add the popup to that tab when you run the extension |
| `contextMenus` | To add the right-click menu item |
| `clipboardWrite` | To copy the slug you choose |

The extension doesn't use `<all_urls>` and doesn't run on a page until you start it.

## Limitations

- It's been tested in the WordPress block editor. The classic editor and other CMSs haven't been tested yet.
- Only the first 200 characters of a selection are used.
- Short titles in another language may be treated as English even when the language is in your settings.
- If a title's language can't be detected, or Chrome can't translate from it, no slug is shown.
- Like other extensions, it can't run on pages such as `chrome://` and the Chrome Web Store.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for tests, slug rules, and how to add a display language in `_locales/`.

## License

[MIT](LICENSE)
