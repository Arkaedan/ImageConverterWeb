<script lang="ts">
  import { failureText } from '../conversion/errors';
  import { formatBytes, getFormat, sizeChange } from '../conversion/formats';
  import { download } from '../lib/download';
  import type { ImageItem } from '../state/converter.svelte';
  import Icon from './Icon.svelte';

  let { item, canRemove, onremove }: { item: ImageItem; canRemove: boolean; onremove: () => void } = $props();

  let summary = $derived.by(() => {
    if (item.loadState === 'loading') return 'Loading…';
    const parts = [item.formatLabel];
    if (item.width !== undefined && item.height !== undefined) parts.push(`${item.width} × ${item.height}`);
    parts.push(formatBytes(item.file.size));
    return parts.filter(Boolean).join(' · ');
  });

  let status = $derived.by((): { text: string; error: boolean } | null => {
    if (item.loadState === 'failed') return { text: failureText('unreadable'), error: true };
    const s = item.status;
    if (s.kind === 'failed') return { text: failureText(s.reason, s.message), error: true };
    if (s.kind !== 'done') return null;
    const { output } = s;
    const parts = [`Converted to ${getFormat(output.format).label}`, formatBytes(output.blob.size)];
    // A drawing's file size says nothing about its pixels, so only compare raster images.
    const change = item.isSvg ? null : sizeChange(item.file.size, output.blob.size);
    if (change) parts.push(change);
    return { text: parts.join(' · '), error: false };
  });

  let output = $derived(item.status.kind === 'done' ? item.status.output : null);
</script>

<li class="row">
  <div class="thumbnail">
    {#if item.thumbnailUrl}
      <img src={item.thumbnailUrl} alt="" />
    {:else}
      <Icon name="image" />
    {/if}
  </div>
  <div class="text">
    <div class="name body-large" title={item.name}>{item.name}</div>
    <div class="summary body-medium">{summary}</div>
    {#if status}
      <div class="status label-large" class:error={status.error}>
        <Icon name={status.error ? 'warning' : 'checkCircle'} size={16} />
        <span>{status.text}</span>
      </div>
    {/if}
  </div>
  <div class="actions">
    {#if item.status.kind === 'converting'}
      <div class="spinner" role="progressbar" aria-label="Converting {item.name}"></div>
    {:else}
      {#if output}
        <button
          class="icon-button"
          onclick={() => output && download(output.url, output.name)}
          aria-label="Download {output.name}"
          title="Download"
        >
          <Icon name="download" />
        </button>
      {/if}
      {#if canRemove}
        <button class="icon-button" onclick={onremove} aria-label="Remove {item.name}" title="Remove">
          <Icon name="close" />
        </button>
      {/if}
    {/if}
  </div>
</li>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 8px 12px 12px;
    background: var(--md-surface-container);
    border-radius: 6px;
  }
  /* Large outer corners and small inner ones, so consecutive rows read as one group. */
  .row:first-child {
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
  }
  .row:last-child {
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
  }
  .thumbnail {
    display: grid;
    place-items: center;
    flex: none;
    width: 56px;
    height: 56px;
    overflow: hidden;
    border-radius: 14px;
    background: var(--md-surface-container-highest);
    color: var(--md-on-surface-variant);
  }
  .thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .name,
  .summary {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .summary {
    color: var(--md-on-surface-variant);
  }
  .status {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin-top: 2px;
    color: var(--md-primary);
  }
  .status :global(svg) {
    margin-top: 2px;
  }
  .status.error {
    color: var(--md-error);
  }
  .actions {
    display: flex;
    align-items: center;
    min-width: 48px;
    justify-content: center;
  }
  .spinner {
    width: 24px;
    height: 24px;
    margin: 12px;
    border: 3px solid var(--md-secondary-container);
    border-top-color: var(--md-primary);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
