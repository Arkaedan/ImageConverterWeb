# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

A fully client-side web app (Svelte 5, TypeScript, Vite) that converts images to JPEG, PNG or WebP. It is the
browser counterpart of the [Android Image Converter app](https://github.com/Arkaedan/ImageConverterApp) and
mirrors its UI and behaviour. It is hosted on GitHub Pages, so there is no backend. See [SPEC.md](SPEC.md)
for the requirements and the post-MVP list.

- Package manager: pnpm (version pinned by `packageManager` in `package.json`)
- Served from `/ImageConverterWeb/` (Vite `base`), the GitHub Pages project path
- Only browser APIs for decoding and encoding: **no WebAssembly codecs**

## Commands

```bash
pnpm install
pnpm dev        # dev server at http://localhost:5173/ImageConverterWeb/
pnpm check      # svelte-check (TypeScript + Svelte diagnostics); keep it clean
pnpm test       # Vitest unit tests
pnpm build      # production build into dist/
pnpm theme      # regenerate src/styles/theme.css after changing the seed colour
```

Run `pnpm check` and `pnpm test` before considering a change done. Anything touching decoding or encoding
should also be tried in a real browser, ideally Chrome, Firefox and Safari, since codec support differs.

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Layout

```
src/
  main.ts                    Mounts the app and loads global styles
  App.svelte                 The single screen: app bar, layout, drag/drop and paste, snackbar
  conversion/
    formats.ts               Output formats, sizes, settings, and pure helpers (sizing, names, labels)
    worker.ts                Web Worker: decode (createImageBitmap) -> resize -> encode (OffscreenCanvas)
    client.ts                Promise-based wrapper around the worker; terminate() cancels mid-conversion
    protocol.ts              Message types shared by the page and the worker
    svg.ts                   SVG size parsing and rendering (main thread; workers can't decode SVG)
    errors.ts                ConversionError and user-facing failure text
  state/
    converter.svelte.ts      ConverterStore: items, settings, conversion queue (like the Android ViewModel)
    settings.ts              Settings persistence in localStorage
  ui/                        Svelte components (EmptyState, ImageRow, SettingsCard, ConvertBar, Icon)
  lib/download.ts            Triggering file downloads
  styles/
    theme.css                Generated Material 3 colour roles for light and dark (do not edit by hand)
    app.css                  Base styles, type scale, shared buttons
scripts/generate-theme.js    Builds theme.css from a seed colour with material-color-utilities
```

Unit tests live next to the code as `*.test.ts` and cover pure logic only (no DOM).

## How conversion works

1. Images are probed one at a time in a worker for their size and a thumbnail. SVGs are parsed on the main
   thread instead.
2. Convert processes images one at a time to bound memory. Raster files go to the worker as `File`s. SVGs are
   rendered on the main thread at their output size and sent over as an `ImageBitmap`.
3. The worker scales down in halving steps for quality, flattens onto white for formats without transparency
   (JPEG), and encodes with `OffscreenCanvas.convertToBlob`.
4. Browsers silently fall back to PNG for types they can't encode, so support is detected at startup by
   encoding a 1×1 image and checking `blob.type`. Unsupported formats (in practice WebP on some Safari
   versions) are shown as unavailable. Every output's type is checked again.

EXIF orientation is applied on decode, and metadata isn't copied. Output is sRGB. Raster images are never
enlarged; SVGs are drawn at exactly the chosen size.

## Conventions

- TypeScript strict mode, 2-space indent, single quotes, ~120-column lines. Match the surrounding comment
  density: doc comments on types and non-obvious functions, sparse inline comments that explain *why*.
- Svelte 5 runes only (`$state`, `$derived`, `$props`, `$effect`), no legacy `export let` or stores.
- Keep the UI simple and Material 3: use the `--md-*` colour roles from `theme.css`, never hard-coded colours,
  and make sure both light and dark themes work. One pane below 720px wide, two panes from 720px.
- Use native form controls (radio inputs, range inputs, buttons) styled to look like M3, for accessibility.
- Icons are inline Material Symbols paths in `ui/Icon.svelte`. Don't add an icon font or package.
- Keep dependencies minimal, and don't add runtime dependencies without discussing it first.
- Heavy work belongs in the worker. Revoke object URLs when images or outputs are removed or replaced.
