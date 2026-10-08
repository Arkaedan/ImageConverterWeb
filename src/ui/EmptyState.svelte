<script lang="ts">
  import Icon from './Icon.svelte';

  let { onpick }: { onpick: () => void } = $props();
</script>

<div class="empty">
  <div class="badge"><Icon name="image" size={60} /></div>
  <h2 class="headline-small">Convert images</h2>
  <p class="body-large">
    Pick photos, graphics or SVGs and convert them to JPEG, PNG or WebP. Everything happens in your browser, so
    your images are never uploaded.
  </p>
  <button class="button filled large has-icon" onclick={onpick}>
    <Icon name="add" />
    Choose images
  </button>
  <p class="hint body-medium">or drop or paste them here</p>
</div>

<style>
  .empty {
    min-height: calc(100dvh - var(--app-bar-height));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
  }
  .badge {
    display: grid;
    place-items: center;
    width: 128px;
    height: 128px;
    border-radius: 40px;
    background: var(--md-primary-container);
    color: var(--md-on-primary-container);
  }
  h2 {
    margin: 28px 0 8px;
  }
  p {
    margin: 0;
    max-width: 360px;
    color: var(--md-on-surface-variant);
  }
  .button {
    margin-top: 32px;
  }
  .hint {
    margin-top: 12px;
  }
</style>
