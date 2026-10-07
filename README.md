# StreamLink Saver

StreamLink Saver is a Manifest V3 browser extension that writes an HTTP or HTTPS media URL to a small `.strm` file. It supports the popup and a right-click link action. The `.strm` file contains only the URL; it does not download, inspect, or redistribute media.

## Download the browser package

Download [**`StreamLinkSaver.zip`**](https://github.com/mhasanbogura/streamlink-saver/releases/latest) from the latest GitHub Release, then extract it. Its folders are arranged as follows:

```text
StreamLinkSaver/
├── Chrome/       # Chrome extension files and Chrome instructions
└── Firefox/      # Firefox extension files and Firefox instructions
```

Each browser folder includes its own `README.md` and the correct `manifest.json`. Use only the folder for your browser.

| Browser | Folder to open after extraction | Installation method |
| --- | --- | --- |
| Chrome | `StreamLinkSaver/Chrome/` | Open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, then select the `Chrome` folder. |
| Firefox | `StreamLinkSaver/Firefox/` | Open `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on**, then select `Firefox/manifest.json`. |

## Use StreamLink Saver

After installation, right-click an HTTP or HTTPS media link and select **Save Stream Link**, or open the extension popup and paste a stream URL. The extension uses the hosted handoff page at [mhasanbogura.github.io/streamlinksaver](https://mhasanbogura.github.io/streamlinksaver/) to reliably assign the resolved `.strm` filename.

The default save path is `Downloads/`. Select the settings gear in the popup to store a different Downloads-relative folder, such as `Downloads/Direct Link`. The package also includes `config.js`, where the default `SAVE_PATH` constant can be edited before loading the extension.

> Use StreamLink Saver only for URLs and media you are authorized to access.

## GitHub Pages handoff

The companion page is deployed at <https://mhasanbogura.github.io/streamlinksaver/>. The workflow in `.github/workflows/deploy-pages.yml` publishes the static site when changes are pushed to `main`.

