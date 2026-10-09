/* Offscreen document: builds the .strm blob in a DOM context (where Chrome
 * honors the filename for blob: URLs) and starts the download with the
 * final name + folder assigned at creation. Ignores all other messages. */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "streamlink-offscreen-save") return false;
  (async () => {
    const blobUrl = URL.createObjectURL(
      new Blob([`${String(message.url || "").trim()}\n`], { type: "text/plain" })
    );
    try {
      const downloadId = await chrome.downloads.download({
        url: blobUrl,
        filename: message.finalPath,
        conflictAction: "uniquify",
        saveAs: false,
      });
      sendResponse({ ok: true, downloadId });
    } catch (error) {
      sendResponse({ ok: false, error: String(error?.message || error) });
    } finally {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    }
  })();
  return true;
});
