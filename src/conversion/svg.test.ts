import { describe, expect, it } from 'vitest';
import { parseLength, parseViewBox, svgIntrinsicSize } from './svg';

describe('parseLength', () => {
  it('parses unitless and absolute lengths into pixels', () => {
    expect(parseLength('120')).toBe(120);
    expect(parseLength(' 64px ')).toBe(64);
    expect(parseLength('1in')).toBe(96);
    expect(parseLength('72pt')).toBe(96);
    expect(parseLength('1e2')).toBe(100);
  });

  it('rejects relative, invalid and non-positive lengths', () => {
    expect(parseLength('100%')).toBeNull();
    expect(parseLength('2em')).toBeNull();
    expect(parseLength('auto')).toBeNull();
    expect(parseLength('0')).toBeNull();
    expect(parseLength(null)).toBeNull();
  });
});

describe('parseViewBox', () => {
  it('accepts spaces or commas', () => {
    expect(parseViewBox('0 0 24 12')).toEqual({ width: 24, height: 12 });
    expect(parseViewBox('-5,-5,10,20')).toEqual({ width: 10, height: 20 });
  });

  it('rejects malformed boxes', () => {
    expect(parseViewBox('0 0 24')).toBeNull();
    expect(parseViewBox('0 0 0 10')).toBeNull();
  });
});

describe('svgIntrinsicSize', () => {
  it('prefers width and height', () => {
    expect(svgIntrinsicSize('200', '100', '0 0 24 24')).toEqual({ width: 200, height: 100 });
  });

  it('derives a missing side from the viewBox aspect ratio', () => {
    expect(svgIntrinsicSize('200', null, '0 0 40 20')).toEqual({ width: 200, height: 100 });
    expect(svgIntrinsicSize('100%', '50', '0 0 40 20')).toEqual({ width: 100, height: 50 });
  });

  it('falls back to the viewBox, then the browser default size', () => {
    expect(svgIntrinsicSize(null, null, '0 0 24 24')).toEqual({ width: 24, height: 24 });
    expect(svgIntrinsicSize(null, null, null)).toEqual({ width: 300, height: 150 });
  });
});
