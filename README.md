# Image Converter for the web

A simple web app for converting images to JPEG, PNG or WebP. It runs entirely in your browser, so your
images are never uploaded anywhere.

**Use it at https://arkaedan.github.io/ImageConverterWeb/**

It's the browser version of the [Android Image Converter app](https://github.com/Arkaedan/ImageConverterApp).

## Features

- **Convert to** JPEG, PNG or WebP
- **Convert from** anything your browser can open (JPEG, PNG, WebP, AVIF, GIF, BMP, ICO, ...) plus **SVG**
- Batch conversion of multiple images at once
- Quality control for JPEG and WebP, and optional downscaling (or SVG render size) by longest side
- Add images with the file picker, drag and drop, or paste
- Shows how much smaller (or larger) each converted file is
- Light and dark themes that follow your system setting
- Settings are remembered between visits

### Format notes

- **WebP** is only offered when your browser can encode it. Chrome, Edge and Firefox can; some Safari versions
  can't, so it is shown as unavailable there.
- **HEIC** photos (from iPhones) can only be opened in Safari, which is the only browser that decodes them.
- **JPEG** doesn't support transparency, so transparent areas become white.
- **SVG** files are drawn at the selected size. *Original* uses the size declared in the file.
- Animated images are converted from their first frame.
- Metadata such as EXIF and location is not copied to converted files. Photos are rotated according to their
  EXIF orientation.
- Very large images may fail in browsers with strict canvas size limits, notably Safari on iOS.

## Development

Requires Node.js 22+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev      # http://localhost:5173/ImageConverterWeb/
pnpm check    # type check
pnpm test     # unit tests
pnpm build    # production build in dist/
```

### Deployment

Pushing to `main` builds and deploys the site with GitHub Actions. In the repository's
**Settings → Pages**, set **Source** to **GitHub Actions** once.

See [AGENTS.md](AGENTS.md) for an overview of the code layout and conventions, and [SPEC.md](SPEC.md) for
the requirements and post-MVP plans.
