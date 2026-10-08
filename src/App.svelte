<script lang="ts">
  import { ConverterStore, type UserMessage } from './state/converter.svelte';
  import ConvertBar from './ui/ConvertBar.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import Icon from './ui/Icon.svelte';
  import ImageRow from './ui/ImageRow.svelte';
  import SettingsCard from './ui/SettingsCard.svelte';

  const store = new ConverterStore();
  const SNACKBAR_DURATION = 4000;

  let fileInput: HTMLInputElement;
  let scrolled = $state(false);
  let dragging = $state(false);
  let snackbar = $state<string | null>(null);

  const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

  function messageText(message: UserMessage): string {
    if (message.kind === 'cancelled') return 'Conversion cancelled';
    if (message.failed === 0) return `Converted ${plural(message.succeeded, 'image')}`;
    return `Converted: ${message.succeeded} · Failed: ${message.failed}`;
  }

  $effect(() => {
    const message = store.message;
    if (!message) return;
    snackbar = messageText(message);
    const timer = setTimeout(() => {
      snackbar = null;
      store.message = null;
    }, SNACKBAR_DURATION);
    return () => clearTimeout(timer);
  });

  // Removing images can shorten the page and reset the scroll position without a scroll event.
  $effect(() => {
    void store.items.length;
    scrolled = window.scrollY > 0;
  });

  function pickImages() {
    fileInput.click();
  }

  function hasFiles(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes('Files') ?? false;
  }

  function onDragOver(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    dragging = true;
  }

  function onDragLeave(event: DragEvent) {
    // relatedTarget is null once the pointer leaves the window.
    if (event.relatedTarget === null) dragging = false;
  }

  function onDrop(event: DragEvent) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragging = false;
    if (event.dataTransfer) store.addFiles(event.dataTransfer.files);
  }

  function onPaste(event: ClipboardEvent) {
    const files = event.clipboardData?.files;
    if (files?.length) {
      event.preventDefault();
      store.addFiles(files);
    }
  }
</script>

<svelte:window
  onscroll={() => (scrolled = window.scrollY > 0)}
  ondragenter={onDragOver}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
  onpaste={onPaste}
/>

<header class="app-bar" class:scrolled>
  <h1 class="title-large">Image Converter</h1>
  {#if store.items.length > 0}
    <button class="icon-button" onclick={pickImages} aria-label="Add images" title="Add images">
      <Icon name="add" />
    </button>
    <button
      class="icon-button"
      onclick={() => store.clear()}
      disabled={store.isConverting}
      aria-label="Clear all"
      title="Clear all"
    >
      <Icon name="delete" />
    </button>
  {/if}
</header>

<main>
  {#if store.items.length === 0}
    <EmptyState onpick={pickImages} />
  {:else}
    <div class="layout">
      <section class="images" aria-labelledby="images-header">
        <h2 id="images-header" class="section-header title-small">{plural(store.items.length, 'image')}</h2>
        <ul class="image-list">
          {#each store.items as item (item.id)}
            <ImageRow {item} canRemove={!store.isConverting} onremove={() => store.remove(item.id)} />
          {/each}
        </ul>
      </section>
      <aside class="side">
        <h2 class="section-header title-small">Convert to</h2>
        <SettingsCard {store} />
        <div class="convert-bar">
          <ConvertBar {store} />
        </div>
      </aside>
    </div>
  {/if}
</main>

<input
  bind:this={fileInput}
  hidden
  type="file"
  accept="image/*,.svg,.heic,.heif,.avif"
  multiple
  onchange={(event) => {
    const input = event.currentTarget;
    if (input.files) store.addFiles(input.files);
    input.value = '';
  }}
/>

{#if snackbar}
  <div class="snackbar body-medium" role="status">{snackbar}</div>
{/if}

{#if dragging}
  <div class="drop-overlay" aria-hidden="true">
    <div class="drop-target">
      <Icon name="add" size={40} />
      <span class="title-large">Drop images to add them</span>
    </div>
  </div>
{/if}

<style>
  .app-bar {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 4px;
    height: var(--app-bar-height);
    padding: 0 8px 0 16px;
    background: var(--md-surface);
    transition: background-color 200ms linear;
  }
  .app-bar.scrolled {
    background: var(--md-surface-container);
  }
  h1 {
    flex: 1;
    margin: 0;
    padding-left: 4px;
  }
  .app-bar .icon-button {
    width: 48px;
    height: 48px;
    color: var(--md-on-surface-variant);
  }

  /*
   * One pane: images, then settings, with the convert bar stuck to the bottom of the screen. The settings
   * column uses display: contents so the bar is sticky relative to the whole layout, not just the column.
   */
  .layout {
    display: flex;
    flex-direction: column;
    padding: 0 16px;
  }
  .side {
    display: contents;
  }
  .side .section-header {
    margin-top: 24px;
  }
  .convert-bar {
    position: sticky;
    bottom: 0;
    margin: 0 -16px;
    padding: 12px 16px;
    background: var(--md-surface);
  }

  /* Two panes from 720px, like the Android app on tablets: settings stay in view beside the list. */
  @media (min-width: 720px) {
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 400px;
      align-items: start;
      gap: 0 16px;
      padding: 0 24px 24px;
    }
    .side {
      display: block;
      position: sticky;
      top: var(--app-bar-height);
      max-height: calc(100dvh - var(--app-bar-height));
      overflow-y: auto;
      padding-bottom: 16px;
    }
    .side .section-header {
      margin-top: 0;
    }
    .convert-bar {
      position: static;
      margin: 0;
      padding: 16px 0 0;
      background: none;
    }
  }

  .section-header {
    margin: 0;
    padding: 8px 4px 12px;
    color: var(--md-primary);
  }
  .image-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .snackbar {
    position: fixed;
    left: 50%;
    bottom: 96px;
    z-index: 3;
    transform: translateX(-50%);
    width: max-content;
    max-width: calc(100vw - 32px);
    padding: 14px 16px;
    border-radius: 4px;
    background: var(--md-inverse-surface);
    color: var(--md-inverse-on-surface);
    box-shadow:
      0 3px 5px rgb(0 0 0 / 0.2),
      0 6px 10px rgb(0 0 0 / 0.14);
    animation: enter 200ms var(--ease-standard);
  }
  @media (min-width: 720px) {
    .snackbar {
      bottom: 24px;
    }
  }
  @keyframes enter {
    from {
      opacity: 0;
      transform: translate(-50%, 8px);
    }
  }

  .drop-overlay {
    position: fixed;
    inset: 0;
    z-index: 4;
    display: grid;
    place-items: center;
    padding: 16px;
    background: color-mix(in srgb, var(--md-scrim) 32%, transparent);
    pointer-events: none;
  }
  .drop-target {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 64px;
    border: 2px dashed var(--md-primary);
    border-radius: 28px;
    background: var(--md-primary-container);
    color: var(--md-on-primary-container);
    text-align: center;
  }
</style>
