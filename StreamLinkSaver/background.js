/* StreamLink Saver: a hidden extension tab performs the .strm download with
 * its final name and folder assigned at creation. Extension tabs have full
 * chrome.downloads access on every Chrome version (no offscreen API needed),
 * and blob: URLs are ignored by download-manager extensions, so nothing
 * fights over the name. */
if (typeof importScripts === "function") importScripts("config.js");

const MENU_ID = "streamlink-save-link";
const HOSTED_HANDOFF_URL = "https://mhasanbogura.github.io/streamlinksaver/";

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

function normalizeSavePath(value) {
  const parts = String(value || "")
    .split(/[\\/]+/)
    .map((part) => part.replace(/[<>:"|?*\u0000-\u001f]/g, "-").trim())
    .filter((part) => part && part !== "." && part !== "..");
  if (parts[0]?.toLowerCase() === "downloads") parts.shift();
  return parts.join("/").slice(0, 180);
}

const DEFAULT_SAVE_PATH = globalThis.SAVE_PATH || "Downloads/";

async function getActiveSaveFolder() {
  const { savePath = DEFAULT_SAVE_PATH } = await chrome.storage.sync.get({ savePath: DEFAULT_SAVE_PATH });
  return normalizeSavePath(savePath);
}

async function areNotificationsEnabled() {
  try {
    const { notificationsEnabled = false } = await chrome.storage.sync.get({ notificationsEnabled: false });
    return notificationsEnabled !== false;
  } catch {
    return true;
  }
}

async function showNotification(message, kind = "saved") {
  if (!(await areNotificationsEnabled())) return;
  const notificationId = `streamlink-${kind}-${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "icon64.png",
    title: "StreamLink Saver",
    message,
    priority: 1,
  });
  setTimeout(() => chrome.notifications.clear(notificationId).catch(() => {}), 6000);
}

function isSupportedUrl(value) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function sanitizeFileBase(value) {
  const cleaned = value
    .replace(/\.strm$/i, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .trim();
  return (cleaned || "stream").slice(0, 120);
}

function removeMediaExtension(value) {
  const mediaBoundary = /\.(mkv|mp4|m4v|avi|mov|webm|wmv|mpg|mpeg|ts|m2ts|m3u8|mp3|flac|aac|wav)(?=$|[\s[\](){}_-])/i;
  const match = value.match(mediaBoundary);
  return match ? value.slice(0, match.index) : value;
}

function isGenericName(value) {
  return /^(download|file|stream|video|media|watch)$/i.test(value.trim());
}

function filenameFromUrl(value) {
  const url = new URL(value);
  const lastSegment = url.pathname.split("/").filter(Boolean).pop();
  const decoded = lastSegment ? decodeURIComponent(lastSegment) : url.hostname.replace(/^www\./i, "");
  const withoutExtension = removeMediaExtension(decoded).replace(/\.[a-z0-9]{1,10}$/i, "");
  const fileBase = sanitizeFileBase(withoutExtension || url.hostname);
  return `${isGenericName(fileBase) ? sanitizeFileBase(`stream-${url.hostname}`) : fileBase}.strm`;
}

function filenameFromLabel(label, fallbackUrl) {
  const fileBase = sanitizeFileBase(removeMediaExtension(label || ""));
  return fileBase && !isGenericName(fileBase) ? `${fileBase}.strm` : filenameFromUrl(fallbackUrl);
}

function buildDownloadPath(filename, folder) {
  return folder ? `${folder}/${filename}` : filename;
}

async function openHandoffFallback(url, filename) {
  // Proven backup: the hosted page downloads the .strm with the right name
  // into Downloads root (no subfolder). Used only when the direct path fails.
  const handoffUrl = new URL(HOSTED_HANDOFF_URL);
  handoffUrl.searchParams.set("handoff", "1");
  handoffUrl.searchParams.set("streamUrl", url);
  handoffUrl.searchParams.set("filename", filename);
  const handoffTab = await chrome.tabs.create({ url: handoffUrl.href, active: false });
  if (handoffTab?.id) {
    setTimeout(() => chrome.tabs.remove(handoffTab.id).catch(() => {}), 7000);
  }
}

async function queueSave(url, filename) {
  const finalPath = buildDownloadPath(filename, await getActiveSaveFolder());
  try {
    // Hidden extension tab does the download: extension pages have full
    // chrome.downloads access on every Chrome version (no offscreen API),
    // and blob: URLs are ignored by download-manager extensions.
    const saveUrl =
      chrome.runtime.getURL("save.html") +
      "#url=" + encodeURIComponent(url) +
      "&path=" + encodeURIComponent(finalPath);
    const saveTab = await withTimeout(
      chrome.tabs.create({ url: saveUrl, active: false }),
      20000,
      "saver tab"
    );
    if (saveTab?.id) {
      setTimeout(() => chrome.tabs.remove(saveTab.id).catch(() => {}), 9000);
    }
  } catch (error) {
    console.error("StreamLink Saver tab save failed, using handoff fallback:", error);
    await openHandoffFallback(url, filename);
    showNotification(`Saved ${filename} to Downloads/ (subfolder unavailable)`);
    return filename;
  }
  showNotification(`Saved to Downloads/${finalPath}`);
  return finalPath;
}

async function setUpMenu() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Save Stream Link",
    contexts: ["link"],
    targetUrlPatterns: ["http://*/*", "https://*/*"],
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setUpMenu().catch((error) => console.warn("Could not create StreamLink Saver menu", error));
});

// Recreate the menu on every service-worker start. onInstalled/onStartup do
// not fire on a manual Reload, which used to leave right-click saving missing
// until the next browser restart.
setUpMenu().catch((error) => console.warn("Could not create StreamLink Saver menu", error));

chrome.runtime.onStartup.addListener(() => {
  setUpMenu().catch((error) => console.warn("Could not restore StreamLink Saver menu", error));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "streamlink-save" || !isSupportedUrl(message.url)) return;
  const filename = sanitizeFileBase(message.filename || "stream") + ".strm";
  queueSave(message.url, filename)
    .then((finalPath) => sendResponse({ ok: true, finalPath }))
    .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
  return true;
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !isSupportedUrl(info.linkUrl)) return;
  try {
    let label = "";
    if (tab?.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "streamlink-get-last-link", linkUrl: info.linkUrl });
        label = response?.label || "";
      } catch {
        // Content scripts are unavailable on browser-managed pages; the URL fallback remains available.
      }
    }
    await queueSave(info.linkUrl, filenameFromLabel(label, info.linkUrl));
  } catch (error) {
    console.warn("StreamLink Saver could not save the .strm file", error);
  }
});
