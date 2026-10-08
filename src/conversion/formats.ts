export type FormatId = 'jpeg' | 'png' | 'webp';

/** An output format the app can write. */
export interface ImageFormat {
  id: FormatId;
  label: string;
  extension: string;
  mimeType: string;
  isLossy: boolean;
  supportsTransparency: boolean;
  description: string;
}

export const FORMATS: readonly ImageFormat[] = [
  {
    id: 'jpeg',
    label: 'JPEG',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    isLossy: true,
    supportsTransparency: false,
    description: 'Small files, no transparency. Best for photos.',
  },
  {
    id: 'png',
    label: 'PNG',
    extension: 'png',
    mimeType: 'image/png',
    isLossy: false,
    supportsTransparency: true,
    description: 'Lossless with transparency. Best for graphics and screenshots.',
  },
  {
    id: 'webp',
    label: 'WebP',
    extension: 'webp',
    mimeType: 'image/webp',
    isLossy: true,
    supportsTransparency: true,
    description: 'Smaller than JPEG and PNG, with transparency.',
  },
];

export function getFormat(id: FormatId): ImageFormat {
  return FORMATS.find((format) => format.id === id)!;
}

/** Longest-side limits offered for the output. `null` keeps the source size. */
export type OutputSize = number | null;

export const OUTPUT_SIZES: readonly OutputSize[] = [null, 4096, 2048, 1024];

export const QUALITY_MIN = 10;
export const QUALITY_MAX = 100;
export const QUALITY_STEP = 5;

export interface ConversionSettings {
  format: FormatId;
  /** 10–100, only used by lossy formats. */
  quality: number;
  size: OutputSize;
}

export const DEFAULT_SETTINGS: ConversionSettings = { format: 'jpeg', quality: 90, size: null };

export function usesQuality(settings: ConversionSettings): boolean {
  return getFormat(settings.format).isLossy;
}

/** Whether two settings produce the same output. Quality is ignored for lossless formats. */
export function sameOutput(a: ConversionSettings, b: ConversionSettings): boolean {
  return a.format === b.format && a.size === b.size && (!usesQuality(a) || a.quality === b.quality);
}

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Scales [source] so its longest side is [longEdge], keeping the aspect ratio. Raster images are never
 * enlarged, so pass `enlarge` only for vector sources. A `null` limit keeps the source size.
 */
export function fitWithin(source: Dimensions, longEdge: OutputSize, enlarge = false): Dimensions {
  const longest = Math.max(source.width, source.height);
  if (longEdge === null || longest === 0 || (longest <= longEdge && !enlarge)) {
    return { width: source.width, height: source.height };
  }
  const scale = longEdge / longest;
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

/** "holiday.photo.HEIC" -> "holiday.photo.jpg" */
export function outputFileName(inputName: string, format: FormatId): string {
  const dot = inputName.lastIndexOf('.');
  const base = dot > 0 ? inputName.slice(0, dot) : inputName || 'image';
  return `${base}.${getFormat(format).extension}`;
}

const LABELS_BY_MIME: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
  'image/png': 'PNG',
  'image/apng': 'PNG',
  'image/webp': 'WebP',
  'image/heif': 'HEIF',
  'image/heic': 'HEIF',
  'image/heif-sequence': 'HEIF',
  'image/heic-sequence': 'HEIF',
  'image/avif': 'AVIF',
  'image/gif': 'GIF',
  'image/bmp': 'BMP',
  'image/x-ms-bmp': 'BMP',
  'image/svg+xml': 'SVG',
  'image/x-icon': 'ICO',
  'image/vnd.microsoft.icon': 'ICO',
  'image/tiff': 'TIFF',
  'image/jxl': 'JPEG XL',
};

const LABELS_BY_EXTENSION: Record<string, string> = {
  jpg: 'JPEG',
  jpeg: 'JPEG',
  jfif: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  heic: 'HEIF',
  heif: 'HEIF',
  avif: 'AVIF',
  gif: 'GIF',
  bmp: 'BMP',
  svg: 'SVG',
  ico: 'ICO',
  tif: 'TIFF',
  tiff: 'TIFF',
  jxl: 'JPEG XL',
};

/**
 * Short, human-friendly name for an input file's format, e.g. "image/svg+xml" -> "SVG". Browsers leave the
 * MIME type empty for formats the OS doesn't know (often HEIC on Windows), so fall back to the extension.
 */
export function formatLabel(mimeType: string, fileName: string): string | null {
  const type = mimeType.toLowerCase();
  if (LABELS_BY_MIME[type]) return LABELS_BY_MIME[type];
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase() : '';
  if (LABELS_BY_EXTENSION[extension]) return LABELS_BY_EXTENSION[extension];
  const subtype = type.split('/')[1]?.split('+')[0];
  return subtype ? subtype.toUpperCase() : null;
}

export function isSvgFile(file: { type: string; name: string }): boolean {
  return file.type === 'image/svg+xml' || (!file.type && file.name.toLowerCase().endsWith('.svg'));
}

/** Short file size using SI units, like Android's `formatShortFileSize`: "840 B", "2.1 MB", "340 KB". */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** How the output size compares to the input, e.g. "84% smaller". `null` when they're about the same. */
export function sizeChange(inputBytes: number, outputBytes: number): string | null {
  if (inputBytes <= 0) return null;
  const ratio = outputBytes / inputBytes;
  if (ratio >= 2) return `${Math.round(ratio)}× larger`;
  const percent = Math.round((1 - ratio) * 100);
  if (percent === 0) return null;
  return percent > 0 ? `${percent}% smaller` : `${-percent}% larger`;
}
