#!/usr/bin/env python3
"""Build the combined StreamLinkSaver.zip release asset.

Layout inside the zip (matches the v1.8.0 package):

    Save link as .strm/
    ├── Chrome/       # Chrome extension files + Chrome README
    ├── Firefox/      # Firefox extension files + Firefox README
    └── README.md     # combined package README

Both browser folders are generated from the shared source in
`Save link as .strm/` plus the per-browser docs in `docs/`.
The output file is ALWAYS named `StreamLinkSaver.zip` so every
GitHub Release (past and future) uses the same asset name.

Usage:
    python3 build-extension-zip.py
"""

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "Save link as .strm"
DOCS = ROOT / "docs"
OUT = ROOT / "StreamLinkSaver.zip"
WRAP = "Save link as .strm"

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
    return OUT


if __name__ == "__main__":
    build()
