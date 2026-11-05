// Nano Slug Generator - service worker
// 起動経路: ショートカット(chrome.commands) と 右クリックメニュー(contextMenus)。
// どちらも activeTab の一時権限が付与されるので、<all_urls> は不要。

const SCRIPT_FILES = ["slug-rules.js", "content.js"];

// メニューの題名は登録時の表示言語で残る。表示言語は再起動で変わるので、起動時にも作り直す
function registerMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "nano-slug-generate",
      title: chrome.i18n.getMessage("generateSlug"),
      contexts: ["selection"]
    });
  });
}

chrome.runtime.onInstalled.addListener(registerMenu);
chrome.runtime.onStartup.addListener(registerMenu);

// 右クリック: どのフレームで選択されたかが info.frameId で分かる
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "nano-slug-generate" || !tab?.id) return;
  await runInFrame(tab.id, info.frameId ?? 0);
});

// ショートカット: 選択のあるフレームを探してから実行
// (ブロックエディタは編集領域がiframe内のことがあるため全フレームを調べる)
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "generate-slug" || !tab?.id) return;
  const frameId = await findFrameWithSelection(tab.id);
  await runInFrame(tab.id, frameId ?? 0);
});

async function findFrameWithSelection(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => (window.getSelection()?.toString() || "").trim().length
    });
    const hit = results
      .filter((r) => r.result > 0)
      .sort((a, b) => b.result - a.result)[0];
    return hit?.frameId;
  } catch (e) {
    console.warn("[nano-slug] frame scan failed:", e);
    return 0;
  }
}

async function runInFrame(tabId, frameId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      files: SCRIPT_FILES
    });
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      func: () => window.__nanoSlug?.run()
    });
  } catch (e) {
    console.warn("[nano-slug] inject failed:", e);
  }
}
