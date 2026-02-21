# Fast PDF Editor

A lightweight browser-based PDF editor focused on speed and simple text edits.

## Features

- Upload and render multi-page PDFs.
- Navigate between pages.
- Add editable text overlays (drag and type).
- Remove words/areas using erase boxes.
- Export a new edited PDF directly in-browser.

## Run locally

Because modules are loaded from CDN, serve this folder with any static server.

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Notes

- "Delete words" is implemented as white rectangle redaction-style cover.
- Works best for quick edits and annotations.
