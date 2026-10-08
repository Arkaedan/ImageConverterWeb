import { ConversionError } from './errors';
import type { Dimensions } from './formats';

/** CSS pixels per unit for the absolute units allowed in SVG width/height attributes. */
const PX_PER_UNIT: Record<string, number> = { '': 1, px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, pt: 4 / 3, pc: 16 };

/** The size browsers give a replaced element without one, and so an SVG that declares nothing. */
const DEFAULT_SIZE: Dimensions = { width: 300, height: 150 };

/** Parses an SVG length such as "120", "64px" or "2in" into pixels. Relative units like "%" give `null`. */
export function parseLength(value: string | null): number | null {
  const match = value?.trim().match(/^([+]?\d*\.?\d+(?:e[+-]?\d+)?)\s*([a-z]*)$/i);
  if (!match) return null;
  const factor = PX_PER_UNIT[match[2].toLowerCase()];
  const px = Number(match[1]) * (factor ?? NaN);
  return Number.isFinite(px) && px > 0 ? px : null;
}

export function parseViewBox(value: string | null): Dimensions | null {
  const parts = value?.trim().split(/[\s,]+/).map(Number);
  if (!parts || parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [, , width, height] = parts;
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * The size an SVG declares: its width and height attributes, with a missing one derived from the viewBox
 * aspect ratio, or the viewBox itself when neither is usable.
 */
export function svgIntrinsicSize(width: string | null, height: string | null, viewBox: string | null): Dimensions {
  const w = parseLength(width);
  const h = parseLength(height);
  const box = parseViewBox(viewBox);
  if (w && h) return { width: w, height: h };
  if (box) {
    if (w) return { width: w, height: (w * box.height) / box.width };
    if (h) return { width: (h * box.width) / box.height, height: h };
    return box;
  }
  return { width: w ?? DEFAULT_SIZE.width, height: h ?? DEFAULT_SIZE.height };
}

export interface SvgSource {
  document: XMLDocument;
  size: Dimensions;
}

export async function readSvg(file: Blob): Promise<SvgSource> {
  const document = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
  const root = document.documentElement;
  if (root.nodeName !== 'svg' || document.getElementsByTagName('parsererror').length > 0) {
    throw new ConversionError('unreadable');
  }
  const size = svgIntrinsicSize(root.getAttribute('width'), root.getAttribute('height'), root.getAttribute('viewBox'));
  return { document, size };
}

/**
 * Draws the SVG at exactly [size]. Browsers can't decode SVG in workers, so this runs on the main thread and
 * hands the pixels over as an ImageBitmap.
 */
export async function renderSvg(svg: SvgSource, size: Dimensions): Promise<ImageBitmap> {
  const width = Math.max(1, Math.round(size.width));
  const height = Math.max(1, Math.round(size.height));
  const root = svg.document.documentElement.cloneNode(true) as Element;
  // Without a viewBox, changing width/height would crop instead of scale. Firefox also refuses to draw SVGs
  // that have no explicit size, so always set both.
  if (!parseViewBox(root.getAttribute('viewBox'))) {
    root.setAttribute('viewBox', `0 0 ${svg.size.width} ${svg.size.height}`);
  }
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));

  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml' }),
  );
  try {
    const image = new Image(width, height);
    image.src = url;
    await image.decode().catch(() => {
      throw new ConversionError('unreadable');
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new ConversionError('too-large');
    context.drawImage(image, 0, 0, width, height);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
