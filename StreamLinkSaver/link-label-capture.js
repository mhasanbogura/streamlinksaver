/* Broadcast Atelier: capture the human-readable name of the precise link the user chooses from the context menu. */
let lastClickedLink = null;

function isSupportedUrl(value) {
  try {
    const url = new URL(value || "", window.location.href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeUrl(value) {
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
}

function cleanLabel(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length < 4 || normalized.length > 220) return "";
  if (/^(download|download now|click here|watch now|play now|get link|stream)$/i.test(normalized)) return "";
  return normalized.replace(/\.(mkv|mp4|m4v|avi|mov|webm|wmv|mpg|mpeg|ts|m2ts|m3u8|mp3|flac|aac|wav)$/i, "").trim();
}

function getLinkLabel(link) {
  const imageAlt = link.querySelector("img[alt]")?.getAttribute("alt");
  const candidates = [
    link.getAttribute("download"),
    link.getAttribute("data-filename"),
    link.getAttribute("data-title"),
    link.getAttribute("aria-label"),
    link.getAttribute("title"),
    link.innerText,
    link.textContent,
    imageAlt,
  ];
  return candidates.map(cleanLabel).find(Boolean) || "";
}

document.addEventListener(
  "contextmenu",
  (event) => {
    const element = event.target instanceof Element ? event.target : null;
    const link = element?.closest("a[href]");
    if (!link || !isSupportedUrl(link.href)) return;
    lastClickedLink = { url: normalizeUrl(link.href), label: getLinkLabel(link) };
  },
  true,
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "streamlink-get-last-link") return;
  const requestedUrl = normalizeUrl(message.linkUrl || "");
  const match = lastClickedLink && lastClickedLink.url === requestedUrl ? lastClickedLink : null;
  sendResponse({ label: match?.label || "" });
});
