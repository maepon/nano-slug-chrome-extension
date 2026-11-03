<!--
Project context. Inserted at the end of every prompt under the "Project context" heading
(do not add a top-level heading here). Write in any language. Keep it short: it is paid for on every step.
Placeholders such as {{ROOT_REL}} and {{FLOW_DIR}} are filled in.
-->
- Follow the root `README.md` and `CLAUDE.md`. Always read them when checking the specification. `CLAUDE.md` records agreed decisions (candidate order, trimming rules, focus handling); do not change them unless the Issue says so
- Read project files by their path relative to the root, e.g. `{{ROOT_REL}}slug-rules.js`
- A Chrome extension (Manifest V3) with no build step. Keep the permissions in `manifest.json` as they are (`activeTab` / `scripting` / `contextMenus` / `clipboardWrite`; never `<all_urls>`)
- `slug-rules.js` is shared by the browser and Node (tests). Keep it free of browser-only and Node-only APIs
- Chrome's built-in AI (Translator API, Prompt API) cannot run in tests; the tests replace them with mocks. Behaviour in real Chrome is checked by a human: write such checks as `manual`
- Tests: `npm test` runs every test except `tests/real.test.js` (an output list for visual checks). Run one file with `npm run test:<name>` (e.g. `npm run test:rules`), not bare `node`. The UI tests need Playwright's Chromium installed
- Documentation that a change may update: `README.md` / `CLAUDE.md`. After implementing, update the relevant ones
