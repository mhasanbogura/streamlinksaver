#!/usr/bin/env python3
"""Build the combined StreamLinkSaver.zip release asset.

Layout inside the zip:

    StreamLinkSaver/
    ├── Chrome/       # Chrome extension files + Chrome README
    ├── Firefox/      # Firefox extension files + Firefox README
    └── README.md     # combined package README

Both browser folders are generated from the shared source in
`StreamLinkSaver/` plus the per-browser docs in `docs/`.
The output file is ALWAYS named `StreamLinkSaver.zip` so every
GitHub Release (past and future) uses the same asset name.

Every local build also syncs the package to
`~/Extensions/Stream Link Saver/` (skipped automatically when that
folder's parent does not exist, e.g. in CI), so the browser
always runs the latest build from there.

Usage:
    python3 build-extension-zip.py
"""

import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "StreamLinkSaver"
DOCS = ROOT / "docs"
OUT = ROOT / "StreamLinkSaver.zip"
WRAP = "StreamLinkSaver"
INSTALL_DIR = Path.home() / "Extensions" / "Stream Link Saver"

SHARED_FILES = [
    "config.js",
    "icon16.png",
    "icon32.png",
    "icon48.png",
    "icon64.png",
    "link-label-capture.js",
    "options.css",
    "options.html",
    "options.js",
    "popup.css",
    "popup.html",
    "popup.js",
]


def build() -> Path:
    if OUT.exists():
        OUT.unlink()
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        # --- Chrome folder ---
        for name in SHARED_FILES + ["background.js"]:
            src = SRC / name
            if src.exists():
                zf.write(src, f"{WRAP}/Chrome/{name}")
        zf.write(SRC / "manifest.json", f"{WRAP}/Chrome/manifest.json")
        zf.write(DOCS / "README-Chrome.md", f"{WRAP}/Chrome/README.md")

        # --- Firefox folder ---
        for name in SHARED_FILES + ["firefox-background.js"]:
            src = SRC / name
            if src.exists():
                zf.write(src, f"{WRAP}/Firefox/{name}")
        # firefox-manifest.json becomes manifest.json in the Firefox folder
        zf.write(SRC / "firefox-manifest.json", f"{WRAP}/Firefox/manifest.json")
        zf.write(DOCS / "README-Firefox.md", f"{WRAP}/Firefox/README.md")

        # --- Package README ---
        zf.write(DOCS / "README-Release-Package.md", f"{WRAP}/README.md")

    entries = zipfile.ZipFile(OUT).namelist()
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes, {len(entries)} files)")
    install()
    return OUT


def install() -> None:
    """Copy the built package to ~/Extensions/Stream Link Saver/.

    The browser loads the unpacked extension from there, so every
    local build is immediately runnable. Skipped when ~/Extensions
    does not exist (e.g. CI runners).
    """
    if not (Path.home() / "Extensions").exists():
        print("Skipped install: ~/Extensions does not exist here.")
        return
    if INSTALL_DIR.exists():
        shutil.rmtree(INSTALL_DIR)
    INSTALL_DIR.mkdir(parents=True)
    with zipfile.ZipFile(OUT) as zf:
        for name in zf.namelist():
            target = INSTALL_DIR / Path(name).relative_to(WRAP)
            if name.endswith("/"):
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(zf.read(name))
    print(f"Installed to {INSTALL_DIR} (load this folder unpacked in the browser)")


if __name__ == "__main__":
    build()
