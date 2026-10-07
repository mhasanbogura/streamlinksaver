# Host StreamLink Saver on GitHub Pages

This guide deploys the **companion web page** that the Chrome extension opens in the background to create each `.strm` file. The extension itself is still installed locally in Chrome as an unpacked extension or from a packaged ZIP.

## 1. Put the project in a GitHub repository

Use the project’s **Settings → GitHub** panel to export it to a new repository, or download the source and push it manually. For a GitHub Pages project URL such as `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`, use the repository name in the Vite base path. Vite requires `/` for a user-site repository named `YOUR-USERNAME.github.io`, but requires `/<repository>/` for an ordinary project repository.[1]

In `vite.config.ts`, add a `base` property immediately inside `defineConfig`:

```ts
export default defineConfig({
  base: "/YOUR-REPOSITORY/",
  plugins,
  // keep the existing settings below
});
```

For example, a repository named `streamlink-saver` uses `base: "/streamlink-saver/"`. Do not add this property if your repository itself is named `YOUR-USERNAME.github.io`.

## 2. Add the GitHub Pages workflow

Create `.github/workflows/deploy-pages.yml` in the repository with the following workflow. This project’s Vite build output is `dist/public`, so that is the folder uploaded to Pages.

```yaml
name: Deploy StreamLink Saver to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Check out source
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Set up pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist/public

      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

## 3. Enable GitHub Pages

Push the workflow to the `main` branch. In the GitHub repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. The workflow then runs on each push to `main`; its completed deployment URL is shown in the Actions run and on the Pages settings screen.[1][2]

## 4. Point the extension at GitHub Pages

After Pages is live, edit `extension/background.js` and replace the current `HOSTED_HANDOFF_URL` value with your published page URL, including the repository path and trailing slash:

```js
const HOSTED_HANDOFF_URL = "https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/";
```

For a repository named `streamlink-saver`, the final value is:

```js
const HOSTED_HANDOFF_URL = "https://YOUR-USERNAME.github.io/streamlink-saver/";
```

Rebuild or repackage the `extension` folder, then open `chrome://extensions` and select **Reload** for StreamLink Saver. The context-menu action will now open your GitHub Pages version in an inactive tab, create the `.strm` file, and close the tab after the handoff.

## 5. Test the deployed handoff

First, confirm that the page loads at your GitHub Pages URL. Then right-click a visible media link and select **Save Stream Link**. The download should use the visible filename with the media extension replaced by `.strm`.

> **Important:** The current decorative image URLs use Manus-hosted assets. They are not required for the `.strm` handoff, but you should copy or replace those visual assets with repository-hosted files if you want the GitHub Pages interface to look identical.

## References

[1] [Vite — Deploying a Static Site: GitHub Pages](https://vite.dev/guide/static-deploy#github-pages)

[2] [GitHub Docs — Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
