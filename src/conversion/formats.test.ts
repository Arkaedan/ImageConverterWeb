import { describe, expect, it } from 'vitest';
import { fitWithin, formatBytes, formatLabel, isSvgFile, outputFileName, sameOutput, sizeChange } from './formats';

describe('fitWithin', () => {
  it('keeps the size without a limit', () => {
    expect(fitWithin({ width: 4032, height: 3024 }, null)).toEqual({ width: 4032, height: 3024 });
  });

  it('scales the longest side down to the limit', () => {
    expect(fitWithin({ width: 4032, height: 3024 }, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin({ width: 3000, height: 6000 }, 2048)).toEqual({ width: 1024, height: 2048 });
  });

  it('never enlarges unless asked to', () => {
    expect(fitWithin({ width: 800, height: 600 }, 1024)).toEqual({ width: 800, height: 600 });
    expect(fitWithin({ width: 800, height: 600 }, 1024, true)).toEqual({ width: 1024, height: 768 });
  });

  it('keeps at least one pixel on each side', () => {
    expect(fitWithin({ width: 10000, height: 1 }, 1024)).toEqual({ width: 1024, height: 1 });
  });

  it('reads dimensions from getters, like ImageBitmap', () => {
    const bitmapLike = Object.create({ get width() { return 200; }, get height() { return 100; } });
    expect(fitWithin(bitmapLike, null)).toEqual({ width: 200, height: 100 });
  });
});

describe('outputFileName', () => {
  it('replaces the last extension', () => {
    expect(outputFileName('holiday.photo.HEIC', 'jpeg')).toBe('holiday.photo.jpg');
    expect(outputFileName('logo.svg', 'webp')).toBe('logo.webp');
  });

  it('adds an extension when there is none', () => {
    expect(outputFileName('scan', 'png')).toBe('scan.png');
    expect(outputFileName('.hidden', 'png')).toBe('.hidden.png');
  });
});

describe('formatLabel', () => {
  it('uses the MIME type', () => {
    expect(formatLabel('image/svg+xml', 'a.svg')).toBe('SVG');
    expect(formatLabel('image/heic', 'a.heic')).toBe('HEIF');
  });

  it('falls back to the extension when the type is empty', () => {
    expect(formatLabel('', 'IMG_0001.HEIC')).toBe('HEIF');
  });

  it('derives a label from unknown types', () => {
    expect(formatLabel('image/x-portable-pixmap', 'a.ppm')).toBe('X-PORTABLE-PIXMAP');
    expect(formatLabel('', 'notes')).toBeNull();
  });
});

describe('isSvgFile', () => {
  it('recognises SVGs by type, or by name when the type is missing', () => {
    expect(isSvgFile({ type: 'image/svg+xml', name: 'x' })).toBe(true);
    expect(isSvgFile({ type: '', name: 'Logo.SVG' })).toBe(true);
    expect(isSvgFile({ type: 'image/png', name: 'x.svg' })).toBe(false);
  });
});

describe('sameOutput', () => {
  it('ignores quality for lossless formats', () => {
    expect(sameOutput({ format: 'png', quality: 50, size: null }, { format: 'png', quality: 90, size: null })).toBe(true);
    expect(sameOutput({ format: 'jpeg', quality: 50, size: null }, { format: 'jpeg', quality: 90, size: null })).toBe(false);
  });

  it('compares format and size', () => {
    expect(sameOutput({ format: 'png', quality: 90, size: null }, { format: 'webp', quality: 90, size: null })).toBe(false);
    expect(sameOutput({ format: 'png', quality: 90, size: null }, { format: 'png', quality: 90, size: 1024 })).toBe(false);
  });
});

describe('formatBytes', () => {
  it('uses SI units and short precision', () => {
    expect(formatBytes(840)).toBe('840 B');
    expect(formatBytes(2_140_000)).toBe('2.1 MB');
    expect(formatBytes(340_400)).toBe('340 KB');
  });
});

describe('sizeChange', () => {
  it('describes the difference', () => {
    expect(sizeChange(1000, 160)).toBe('84% smaller');
    expect(sizeChange(1000, 1500)).toBe('50% larger');
    expect(sizeChange(1000, 1001)).toBeNull();
    expect(sizeChange(100, 54_800)).toBe('548× larger');
  });
});
