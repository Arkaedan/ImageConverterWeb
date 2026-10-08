<script lang="ts">
  import {
    FORMATS,
    OUTPUT_SIZES,
    QUALITY_MAX,
    QUALITY_MIN,
    QUALITY_STEP,
    getFormat,
    usesQuality,
  } from '../conversion/formats';
  import type { ConverterStore } from '../state/converter.svelte';
  import Icon from './Icon.svelte';

  let { store }: { store: ConverterStore } = $props();

  let settings = $derived(store.settings);
  let disabled = $derived(store.isConverting);
  let unavailable = $derived(FORMATS.filter((format) => !store.isFormatSupported(format.id)));
</script>

<div class="card">
  <fieldset>
    <legend class="title-medium">Format</legend>
    <div class="chips">
      {#each FORMATS as format (format.id)}
        <label class="chip label-large" class:selected={settings.format === format.id}>
          <input
            type="radio"
            name="format"
            value={format.id}
            checked={settings.format === format.id}
            disabled={disabled || !store.isFormatSupported(format.id)}
            onchange={() => store.updateSettings({ format: format.id })}
          />
          {#if settings.format === format.id}<Icon name="check" size={18} />{/if}
          {format.label}
        </label>
      {/each}
    </div>
    <p class="supporting body-medium">{getFormat(settings.format).description}</p>
    {#each unavailable as format (format.id)}
      <p class="supporting body-medium">{format.label} isn't supported by this browser.</p>
    {/each}
  </fieldset>

  {#if usesQuality(settings)}
    <div>
      <div class="quality-label">
        <label class="title-medium" for="quality">Quality</label>
        <span class="label-large quality-value">{settings.quality}</span>
      </div>
      <input
        id="quality"
        type="range"
        min={QUALITY_MIN}
        max={QUALITY_MAX}
        step={QUALITY_STEP}
        value={settings.quality}
        {disabled}
        oninput={(event) => store.updateSettings({ quality: event.currentTarget.valueAsNumber })}
      />
    </div>
  {/if}

  <fieldset>
    <legend class="title-medium">Size</legend>
    <div class="segmented">
      {#each OUTPUT_SIZES as size (size)}
        <label class="segment label-large" class:selected={settings.size === size}>
          <input
            type="radio"
            name="size"
            value={size ?? 'original'}
            checked={settings.size === size}
            disabled={disabled || !store.isSizeUseful(size)}
            onchange={() => store.updateSettings({ size })}
          />
          {size ?? 'Original'}
        </label>
      {/each}
    </div>
    <p class="supporting body-medium">
      {#if store.hasSvg}
        Maximum length of the longest side, in pixels. Photos are never enlarged; SVGs are drawn at exactly this
        size.
      {:else}
        Maximum length of the longest side, in pixels. Sizes that wouldn't shrink any of your images are greyed
        out.
      {/if}
    </p>
  </fieldset>
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px;
    border-radius: 24px;
    background: var(--md-surface-container);
  }
  fieldset {
    margin: 0;
    padding: 0;
    border: none;
    min-width: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 8px;
  }
  .supporting {
    margin: 4px 0 0;
    color: var(--md-on-surface-variant);
  }

  /* Radio inputs stay in the DOM, visually hidden, so keyboard and screen reader support come for free. */
  input[type='radio'] {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
    margin: 0;
  }
  .chip,
  .segment {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    isolation: isolate;
    user-select: none;
    color: var(--md-on-surface-variant);
  }
  .chip::before,
  .segment::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    transition: opacity 150ms linear;
    z-index: -1;
  }
  .chip:hover:not(:has(input:disabled))::before,
  .segment:hover:not(:has(input:disabled))::before {
    opacity: var(--state-hover);
  }
  .chip:has(input:focus-visible),
  .segment:has(input:focus-visible) {
    outline: 2px solid var(--md-secondary);
    outline-offset: 2px;
    z-index: 1;
  }
  .chip:has(input:disabled),
  .segment:has(input:disabled) {
    cursor: default;
    color: color-mix(in srgb, var(--md-on-surface) 38%, transparent);
  }
  .selected {
    background: var(--md-secondary-container);
    color: var(--md-on-secondary-container);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    height: 32px;
    padding: 0 16px;
    border: 1px solid var(--md-outline-variant);
    border-radius: 8px;
  }
  .chip.selected {
    padding-left: 8px;
    border-color: transparent;
  }
  .chip:has(input:disabled) {
    border-color: color-mix(in srgb, var(--md-on-surface) 12%, transparent);
  }

  .segmented {
    display: flex;
  }
  .segment {
    flex: 1;
    min-width: 0;
    height: 40px;
    padding: 0 8px;
    border: 1px solid var(--md-outline);
    white-space: nowrap;
  }
  .segment + .segment {
    margin-left: -1px;
  }
  .segment:first-child {
    border-radius: var(--shape-full) 0 0 var(--shape-full);
  }
  .segment:last-child {
    border-radius: 0 var(--shape-full) var(--shape-full) 0;
  }
  .segment:has(input:disabled) {
    border-color: color-mix(in srgb, var(--md-on-surface) 12%, var(--md-surface-container));
  }

  .quality-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .quality-value {
    color: var(--md-primary);
  }
  input[type='range'] {
    width: 100%;
    margin: 0;
    height: 24px;
    accent-color: var(--md-primary);
    cursor: pointer;
  }
  input[type='range']:disabled {
    cursor: default;
  }
</style>
