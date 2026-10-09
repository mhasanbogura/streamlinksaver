/* Hidden saver tab (extension page: full chrome.downloads access on every
 * Chrome version). Tries the download with the final name + folder first.
 * Some Chrome builds ignore the filename for blob: URLs (landing as
 * <uuid>.txt) — detected via downloads.search and repaired by deleting the
 * botched file and re-saving through an anchor, which always honors the name
 * (into Downloads root). Notifications report where the file truly landed. */
(async () => {
  const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const closeSoon = () => setTimeout(() => window.close(), 1500);
  const note = (message) => {
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
  try {
    const params = new URLSearchParams(location.hash.slice(1));
    const url = params.get("url") || "";
    const finalPath = params.get("path") || "stream.strm";
    if (!/^https?:\/\//i.test(url)) throw new Error("unsupported URL");
    const fileBase = finalPath.split("/").pop().replace(/\.strm$/i, "");
    const expectedDir = finalPath.includes("/") ? finalPath.slice(0, finalPath.lastIndexOf("/")) : "";

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
        note(`Saved to Downloads/${landed}`);
        return;
      }
      // Botched landing (e.g. <uuid>.txt): remove it, repair via anchor.
      try {
        await chrome.downloads.removeFile(downloadId);
      } catch {}
      try {
        await chrome.downloads.erase({ id: downloadId });
      } catch {}
    } finally {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    }
    const fileName = finalPath.split("/").pop();
    const anchorUrl = URL.createObjectURL(new Blob([`${url.trim()}\n`], { type: "text/plain" }));
    try {
      const anchor = document.createElement("a");
      anchor.href = anchorUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      note(`Saved ${fileName} to Downloads/`);
    } finally {
      setTimeout(() => URL.revokeObjectURL(anchorUrl), 15000);
    }
  } catch (error) {
    console.error("StreamLink Saver tab save failed:", error);
  } finally {
    closeSoon();
  }
})();
