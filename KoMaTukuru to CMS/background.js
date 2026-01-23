// background.js (MV3 service worker)

const CMS_CREATE_URL_PATTERN = "https://cmstakashimaya.com/webadmin/addon/store/article/create/*";
const TARGET_STORE_ID = "2";
const TARGET_STORE_SUFFIX = "1";

function isTargetCmsUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.origin !== "https://cmstakashimaya.com") return false;
    if (!u.pathname.startsWith("/webadmin/addon/store/article/create/")) return false;

    const sp = u.searchParams;
    return sp.get("store_id") === TARGET_STORE_ID && sp.get("store_suffix_number") === TARGET_STORE_SUFFIX;
  } catch {
    return false;
  }
}

async function findBestCmsTab() {
  const tabs = await chrome.tabs.query({ url: CMS_CREATE_URL_PATTERN });

  const candidates = tabs.filter(t => t.url && isTargetCmsUrl(t.url));
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  return candidates[0];
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || msg.type !== "KOMA_SEND_TO_CMS") return;

    const cmsTab = await findBestCmsTab();
    if (!cmsTab || !cmsTab.id) {
      sendResponse({ ok: false, reason: "CMS tab not found" });
      return;
    }

    await chrome.tabs.sendMessage(cmsTab.id, {
      type: "CMS_FILL",
      payload: msg.payload
    });

    sendResponse({ ok: true, tabId: cmsTab.id });
  })();

  return true;
});
