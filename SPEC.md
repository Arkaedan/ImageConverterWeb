# Image Converter for the web

Build a fully client-side web app for converting images to PNG, JPEG or WebP. It is a browser version of
the [Android Image Converter app](https://github.com/Arkaedan/ImageConverterApp) and should feel like it.

## Requirements

- Runs entirely in the browser: no backend, and images are never uploaded anywhere
- Hosted on GitHub Pages
- Uses only browser APIs for decoding and encoding: no WebAssembly codecs
- Output formats: JPEG, PNG and WebP. WebP is only offered when the browser can encode it (feature detection);
  otherwise it is shown as unavailable
- Input formats: anything the browser can decode, plus SVG
- Batch conversion of multiple images, one image at a time
- Quality control for lossy formats (JPEG, WebP) and optional downscaling by longest side (Original, 4096,
  2048, 1024). Sizes that would not shrink any image are disabled; SVGs are drawn at exactly the chosen size
- Changing a setting only re-converts the images that were converted with different settings
- Settings are remembered between visits
- Add images with a file picker, drag and drop, or paste
- Converted images can be downloaded individually or all at once
- UI is elegant and simple, in the Material You / Material Design 3 style of the Android app, with light and
  dark themes that follow the system setting. One pane on phones, two panes on wide screens
- Built with Svelte 5, TypeScript and Vite, using pnpm

## Post-MVP

- [ ] Installable PWA that works offline
- [ ] "Download all" as a single zip file
- [ ] Share converted images through the Web Share API (mobile share sheet)
- [ ] Web Share Target so images can be shared into the installed app (Chrome on Android)
- [ ] Cross-browser end-to-end tests with Playwright (Chromium, Firefox, WebKit)
