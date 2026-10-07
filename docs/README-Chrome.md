# StreamLink Saver for Chrome

This folder is the Chrome version of StreamLink Saver. It writes a supported HTTP or HTTPS media link into a `.strm` file; it does not download the media itself.

## Install in Chrome

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** in the top-right corner.
3. Select **Load unpacked**.
4. Select this `Chrome` folder, which contains `manifest.json`.
5. Optionally pin **StreamLink Saver** from Chrome’s Extensions menu.

## Save a link

Right-click an HTTP or HTTPS media link and choose **Save Stream Link**. You can also open the extension popup, paste a URL, and select **Save Stream Link**.

The default save path is `Downloads/`. Select the settings gear in the popup to choose a persistent Downloads-relative folder and to turn save notifications on or off. You may also edit `config.js` before loading the extension, then return to `chrome://extensions` and select **Reload**.

> Use only URLs and media you are authorized to access.

