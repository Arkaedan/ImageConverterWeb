import {
  DEFAULT_SETTINGS,
  FORMATS,
  OUTPUT_SIZES,
  QUALITY_MAX,
  QUALITY_MIN,
  QUALITY_STEP,
  type ConversionSettings,
} from '../conversion/formats';

const STORAGE_KEY = 'settings';

/** Restores saved settings, ignoring anything missing or invalid (e.g. from an older version). */
export function parseSettings(json: string | null): ConversionSettings {
  let saved: Partial<Record<keyof ConversionSettings, unknown>> = {};
  try {
    const parsed: unknown = json ? JSON.parse(json) : null;
    if (parsed && typeof parsed === 'object') saved = parsed;
  } catch {
    // Fall through to the defaults.
  }
  const settings = { ...DEFAULT_SETTINGS };
  const format = FORMATS.find((f) => f.id === saved.format);
  if (format) settings.format = format.id;
  const quality = saved.quality;
  if (
    typeof quality === 'number' &&
    quality >= QUALITY_MIN &&
    quality <= QUALITY_MAX &&
    (quality - QUALITY_MIN) % QUALITY_STEP === 0
  ) {
    settings.quality = quality;
  }
  const size = OUTPUT_SIZES.find((s) => s === saved.size);
  if (size !== undefined) settings.size = size;
  return settings;
}

export function loadSettings(): ConversionSettings {
  try {
    return parseSettings(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can be unavailable, e.g. when blocked by privacy settings.
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: ConversionSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Not being able to remember settings isn't worth bothering the user about.
  }
}
