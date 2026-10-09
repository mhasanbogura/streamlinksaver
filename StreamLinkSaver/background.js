/* StreamLink Saver: direct .strm download with filename assigned at creation. No onDeterminingFilename listener, so other download-manager extensions can never fight over the name. */
if (typeof importScripts === "function") importScripts("config.js");

const MENU_ID = "streamlink-save-link";

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

async function queueDirectSave(url, filename) {
  const finalPath = buildDownloadPath(filename, await getActiveSaveFolder());
  // Filename (including subfolder) is assigned here at creation time.
  // A blob: URL is used because Chrome ignores the filename parameter for
  // data: URLs (they always land as download.txt). Like data: URLs, blob:
  // URLs are ignored by download-manager extensions, so no other extension
  // ever joins the filename determination — no conflicts.
  const blobUrl = URL.createObjectURL(
    new Blob([`${url.trim()}\n`], { type: "text/plain" })
  );
  try {
    await chrome.downloads.download({
      url: blobUrl,
      filename: finalPath,
      conflictAction: "uniquify",
      saveAs: false,
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
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

chrome.runtime.onStartup.addListener(() => {
  setUpMenu().catch((error) => console.warn("Could not restore StreamLink Saver menu", error));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "streamlink-save" || !isSupportedUrl(message.url)) return;
  const filename = sanitizeFileBase(message.filename || "stream") + ".strm";
  queueDirectSave(message.url, filename)
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
    await queueDirectSave(info.linkUrl, filenameFromLabel(label, info.linkUrl));
  } catch (error) {
    console.warn("StreamLink Saver could not save the .strm file", error);
  }
});
