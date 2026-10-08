<script lang="ts">
  import { downloadAll } from '../lib/download';
  import type { ConverterStore } from '../state/converter.svelte';
  import Icon from './Icon.svelte';

  let { store }: { store: ConverterStore } = $props();

  let pending = $derived(store.pendingItems.length);
  let outputs = $derived(store.outputs);
</script>

<div class="bar">
  {#if store.progress}
    {@const { completed, total } = store.progress}
    <div class="progress-row">
      <span class="title-medium" aria-live="polite">Converting {Math.min(completed + 1, total)} of {total}…</span>
      <button class="button text" onclick={() => store.cancel()}>Cancel</button>
    </div>
    <div
      class="progress"
      role="progressbar"
      aria-label="Conversion progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
    >
      <div class="indicator" style:width="{(completed / total) * 100}%"></div>
    </div>
  {:else}
    <div class="buttons">
      {#if outputs.length > 0}
        <button class="button outlined large has-icon" onclick={() => downloadAll(outputs)}>
          <Icon name="download" size={18} />
          {outputs.length === 1 ? 'Download' : 'Download all'}
        </button>
      {/if}
      <button
        class="button filled large convert"
        disabled={pending === 0 || store.isLoading}
        onclick={() => store.convert()}
      >
        {#if pending === 0 && outputs.length > 0}
          All images converted
        {:else}
          Convert {pending} {pending === 1 ? 'image' : 'images'}
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .progress-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
  }
  .progress {
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
    background: var(--md-secondary-container);
  }
  .indicator {
    height: 100%;
    border-radius: 2px;
    background: var(--md-primary);
    transition: width 300ms var(--ease-standard);
  }
  .buttons {
    display: flex;
    gap: 8px;
  }
  .convert {
    flex: 1;
    min-width: 0;
  }
</style>
