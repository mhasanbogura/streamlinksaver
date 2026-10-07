/* Broadcast Atelier: persistent path preference with an explicit Downloads/ default. */
const input = document.querySelector("#save-path");
const notificationsInput = document.querySelector("#notifications-enabled");
const saveButton = document.querySelector("#save-button");
const resetButton = document.querySelector("#reset-button");
const status = document.querySelector("#status");
const DEFAULT_SAVE_PATH = globalThis.SAVE_PATH || "Downloads/";

function cleanPath(value) {
  const parts = String(value || "")
    .split(/[\\/]+/)
    .map((part) => part.replace(/[<>:"|?*\u0000-\u001f]/g, "-").trim())
    .filter((part) => part && part !== "." && part !== "..");
  if (parts[0]?.toLowerCase() !== "downloads") parts.unshift("Downloads");
  return `${parts.join("/")}/`.replace(/\/{2,}/g, "/");
}

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = kind;
}

async function load() {
  const { savePath = DEFAULT_SAVE_PATH, notificationsEnabled = true } = await chrome.storage.sync.get({
    savePath: DEFAULT_SAVE_PATH,
    notificationsEnabled: true,
  });
  input.value = cleanPath(savePath);
  notificationsInput.checked = notificationsEnabled !== false;
  setStatus(`Current path: ${input.value}`);
}

async function save() {
  const savePath = cleanPath(input.value || DEFAULT_SAVE_PATH);
  const notificationsEnabled = notificationsInput.checked;
  input.value = savePath;
  await chrome.storage.sync.set({ savePath, notificationsEnabled });
  setStatus(`Saved. Future files will use ${savePath}`, "success");
}

resetButton.addEventListener("click", async () => {
  await chrome.storage.sync.remove("savePath");
  input.value = cleanPath(DEFAULT_SAVE_PATH);
  setStatus(`Reset to ${input.value}`, "success");
});
saveButton.addEventListener("click", () => save().catch(() => setStatus("Could not save this path.", "error")));
notificationsInput.addEventListener("change", () => save().catch(() => setStatus("Could not save settings.", "error")));
load().catch(() => setStatus("Could not load settings.", "error"));

