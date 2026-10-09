/* Hidden saver tab (extension page: full chrome.downloads access on every
 * Chrome version). Remembers per machine whether API filenames stick:
 * - If yes: download with the final name + folder, verified via search.
 * - If no (some builds land API-named blob downloads as <uuid>.txt):
 *   the botched file is deleted and re-saved through an anchor, which
 *   always honors the name (into Downloads root).
 * Notifications honor the settings toggle and report where the file landed. */
(async () => {
  const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const closeSoon = () => setTimeout(() => window.close(), 1500);

  const getPrefs = async () => {
    let notificationsEnabled = false;
    let apiNamingOk = null;
    try {
      ({ notificationsEnabled = false } = await chrome.storage.sync.get({
        notificationsEnabled: false,
      }));
    } catch {}
    try {
      ({ apiNamingOk = null } = await chrome.storage.local.get({ apiNamingOk: null }));
    } catch {}
    return { notificationsEnabled, apiNamingOk };
  };
  const setApiNamingOk = async (value) => {
    try {
      await chrome.storage.local.set({ apiNamingOk: value });
    } catch {}
  };
  const note = (enabled, message) => {
    if (!enabled) return;
    try {
      chrome.notifications.create(`streamlink-${Date.now()}`, {
        type: "basic",
        iconUrl: "icon64.png",
        title: "StreamLink Saver",
        message,
        priority: 1,
      });
    } catch {}
  };
  const eraseQuiet = async (id) => {
    try {
      await chrome.downloads.erase({ id });
    } catch {}
  };
  const anchorSave = (url, fileName) => {
    const anchorUrl = URL.createObjectURL(new Blob([`${url.trim()}\n`], { type: "text/plain" }));
    try {
      const anchor = document.createElement("a");
      anchor.href = anchorUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(anchorUrl), 15000);
    }
  };

  try {
    const params = new URLSearchParams(location.hash.slice(1));
    const url = params.get("url") || "";
    const finalPath = params.get("path") || "stream.strm";
    if (!/^https?:\/\//i.test(url)) throw new Error("unsupported URL");
    const fileName = finalPath.split("/").pop();
    const fileBase = fileName.replace(/\.strm$/i, "");
    const expectedDir = finalPath.includes("/") ? finalPath.slice(0, finalPath.lastIndexOf("/")) : "";
    const { notificationsEnabled, apiNamingOk } = await getPrefs();

    let botchedId = null;
    if (apiNamingOk !== false) {
      const blobUrl = URL.createObjectURL(new Blob([`${url.trim()}\n`], { type: "text/plain" }));
      try {
        const downloadId = await chrome.downloads.download({
          url: blobUrl,
          filename: finalPath,
          conflictAction: "uniquify",
          saveAs: false,
        });
        await settle(1500);
        const results = await chrome.downloads.search({ id: downloadId });
        const landed = results?.[0]?.filename || "";
        const landedDir = landed.includes("/") ? landed.slice(0, landed.lastIndexOf("/")) : "";
        const landedTail = landed.split("/").pop();
        const placed =
          landedDir === expectedDir &&
          landedTail.toLowerCase().endsWith(".strm") &&
          landedTail.toLowerCase().startsWith(fileBase.toLowerCase().slice(0, 20));
        if (placed) {
          await setApiNamingOk(true);
          note(notificationsEnabled, `Saved to Downloads/${landed}`);
          return;
        }
        await setApiNamingOk(false);
        botchedId = downloadId;
        try {
          await chrome.downloads.removeFile(downloadId);
        } catch {}
        await settle(700);
        await eraseQuiet(downloadId);
      } finally {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      }
    }
    anchorSave(url, fileName);
    await settle(700);
    if (botchedId !== null) await eraseQuiet(botchedId);
    note(notificationsEnabled, `Saved ${fileName} to Downloads/`);
  } catch (error) {
    console.error("StreamLink Saver tab save failed:", error);
  } finally {
    closeSoon();
  }
})();
