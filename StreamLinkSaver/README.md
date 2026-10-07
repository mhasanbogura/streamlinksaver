# StreamLink Saver extension source

This folder contains the shared StreamLink Saver extension source. It is used to build the browser-specific folders in the GitHub Release package.

For installation, download [**`StreamLinkSaver.zip`**](https://github.com/mhasanbogura/streamlinksaver/releases/latest), extract it, and use the README inside either the `Chrome/` or `Firefox/` folder. Each folder contains the correct browser manifest and installation steps.

The default save location is defined in `config.js`:

```js
const SAVE_PATH = "Downloads/";
```

The extension settings page can also store a Downloads-relative save folder such as `Downloads/Direct Link`, and turn save notifications on or off.

