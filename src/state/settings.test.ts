import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../conversion/formats';
import { parseSettings } from './settings';

describe('parseSettings', () => {
  it('restores valid settings', () => {
    expect(parseSettings('{"format":"webp","quality":75,"size":2048}')).toEqual({
      format: 'webp',
      quality: 75,
      size: 2048,
    });
    expect(parseSettings('{"format":"png","quality":90,"size":null}').size).toBeNull();
  });

  it('uses defaults for missing or invalid values', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"format":"bmp","quality":73,"size":999}')).toEqual(DEFAULT_SETTINGS);
  });
});
