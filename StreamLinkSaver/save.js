/* Hidden saver tab: runs as an extension page (full chrome.downloads access
 * on every Chrome version, no offscreen API needed). Reads the stream URL
 * and final path from the URL hash, saves the .strm with its folder assigned
 * at creation, then closes itself. blob: URLs are ignored by
 * download-manager extensions, so nothing fights over the filename. */
(async () => {
  try {
    const params = new URLSearchParams(location.hash.slice(1));
    const url = params.get("url") || "";
    const finalPath = params.get("path") || "stream.strm";
    if (!/^https?:\/\//i.test(url)) throw new Error("unsupported URL");
    const blobUrl = URL.createObjectURL(new Blob([`${url.trim()}\n`], { type: "text/plain" }));
    try {
      await chrome.downloads.download({
        url: blobUrl,
        filename: finalPath,
        conflictAction: "uniquify",
        saveAs: false,
      });
    } finally {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    }
  } catch (error) {
    console.error("StreamLink Saver tab save failed:", error);
  } finally {
    setTimeout(() => window.close(), 1500);
  }
})();
