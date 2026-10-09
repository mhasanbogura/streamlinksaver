/* Broadcast Atelier: direct, privacy-preserving URL-to-.strm conversion; no media requests are made. */
const sourceUrl = document.querySelector("#source-url");
const fileName = document.querySelector("#file-name");
const filePreview = document.querySelector("#file-preview");
const saveButton = document.querySelector("#save-button");
const currentPageButton = document.querySelector("#current-page");
const statusMessage = document.querySelector("#status-message");
const statusDot = document.querySelector("#status-dot");
const urlHint = document.querySelector("#url-hint");
const settingsButton = document.querySelector("#settings-button");

let fileNameWasEdited = false;

// Stamp the real extension version (manifest) into the header.
try {
  const versionEl = document.querySelector("#app-version");
  const manifestVersion = chrome.runtime.getManifest()?.version;
  if (versionEl && manifestVersion) versionEl.textContent = `v${manifestVersion}`;
} catch {
  // Popup works fine without the version stamp.
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

function isSupportedUrl(value) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function filenameFromUrl(value) {
  try {
    const url = new URL(value.trim());
    const lastSegment = url.pathname.split("/").filter(Boolean).pop();
    const decoded = lastSegment ? decodeURIComponent(lastSegment) : url.hostname.replace(/^www\./i, "");
    const withoutExtension = decoded.replace(/\.(mkv|mp4|m4v|avi|mov|webm|wmv|mpg|mpeg|ts|m2ts|m3u8|mp3|flac|aac|wav)$/i, "").replace(/\.[a-z0-9]{1,10}$/i, "");
    const base = sanitizeFileBase(withoutExtension || url.hostname);
    return /^(download|file|stream|video|media|watch)$/i.test(base) ? sanitizeFileBase(`stream-${url.hostname}`) : base;
  } catch {
    return "stream";
  }
}

function updateOutput() {
  if (!fileNameWasEdited) fileName.value = filenameFromUrl(sourceUrl.value);
  const filename = `${sanitizeFileBase(fileName.value)}.strm`;
  filePreview.textContent = filename;
  const ready = isSupportedUrl(sourceUrl.value);
  statusDot.className = `status-dot${ready ? " ready" : ""}`;
  if (sourceUrl.value && !ready) {
    urlHint.textContent = "Enter a complete HTTP or HTTPS URL.";
    urlHint.className = "field-hint error";
  } else {
    urlHint.textContent = "HTTPS and HTTP links are supported.";
    urlHint.className = "field-hint";
  }
}

function setStatus(message, kind = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${kind}`.trim();
}

async function useCurrentPage() {
  if (!globalThis.chrome?.tabs) {
    setStatus("Open this popup from the browser to use the current page.", "error");
    return;
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !isSupportedUrl(tab.url)) throw new Error("unsupported");
    sourceUrl.value = tab.url;
    fileNameWasEdited = false;
    updateOutput();
    setStatus("Current page URL loaded.", "success");
  } catch {
    setStatus("This page cannot be saved as a stream link.", "error");
  }
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

function fallbackAnchorDownload(url, filename) {
  // Last resort inside the popup itself: pure DOM download, no extension
  // APIs involved. Lands in Downloads root with the right name.
  const blobUrl = URL.createObjectURL(new Blob([`${url.trim()}\n`], { type: "text/plain" }));
  try {
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  }
}

async function saveStreamFile() {
  const url = sourceUrl.value.trim();
  if (!isSupportedUrl(url)) {
    updateOutput();
    setStatus("Provide a complete HTTP or HTTPS URL first.", "error");
    sourceUrl.focus();
    return;
  }

  const filename = `${sanitizeFileBase(fileName.value)}.strm`;
  saveButton.disabled = true;
  setStatus("Preparing the .strm file…");
  try {
    const response = await withTimeout(
      chrome.runtime.sendMessage({ type: "streamlink-save", url, filename }),
      25000,
      "background save"
    );
    if (!response?.ok) throw new Error(response?.error || "background save failed");
    statusDot.className = "status-dot success";
    setStatus(`Saving to Downloads/${response.finalPath}`, "success");
  } catch (error) {
    const reason = String(error?.message || error).slice(0, 140);
    console.error("StreamLink Saver background save failed:", error);
    try {
      fallbackAnchorDownload(url, filename);
      statusDot.className = "status-dot success";
      setStatus(`Saved ${filename} to Downloads/ (direct path failed: ${reason})`, "success");
    } catch {
      statusDot.className = "status-dot ready";
      setStatus(`Could not create the file: ${reason}`, "error");
    }
  } finally {
    saveButton.disabled = false;
  }
}

sourceUrl.addEventListener("input", () => { updateOutput(); setStatus("Ready to route a URL."); });
fileName.addEventListener("input", () => { fileNameWasEdited = true; updateOutput(); });
currentPageButton.addEventListener("click", useCurrentPage);
saveButton.addEventListener("click", saveStreamFile);
settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
updateOutput();
