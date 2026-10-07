# StreamLink Saver for Firefox

This folder is the Firefox version of StreamLink Saver. It writes a supported HTTP or HTTPS media link into a `.strm` file; it does not download the media itself.

## Install in Firefox

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Select **Load Temporary Add-on**.
3. Open this `Firefox` folder and select `manifest.json`.
4. Use the extension popup or the right-click menu item **Save Stream Link**.

Firefox temporary add-ons are removed when Firefox restarts. A signed Firefox package is required for a persistent end-user installation.

## Save location

The default save path is `Downloads/`. Firefox creates the `.strm` file directly through its downloads API so the selected filename and Downloads-relative folder are assigned when the download starts. Select the settings gear in the popup to choose a persistent Downloads-relative folder and to turn save notifications on or off. You can also edit `config.js` before loading the extension and then select **Reload** for the temporary add-on from `about:debugging`.

## If the menu does not appear

After loading or reloading the temporary add-on, refresh the webpage where you want to right-click a link. The **Save Stream Link** item appears only for HTTP and HTTPS links.

> Use only URLs and media you are authorized to access.
