<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '@immich/ui';
  import type { ThemePreviewActions } from '$lib/theme-preview';
  let {
    preview,
    busy = false,
  }: { preview: ThemePreviewActions; busy?: boolean } = $props();
  let root: HTMLDialogElement;
  let cancelButton = $state<HTMLButtonElement | null>(null);
  const id = $props.id();
  onMount(() => {
    root.show();
    cancelButton?.focus({ preventScroll: true });
  });
</script>

<dialog
  class="theme-prompt"
  aria-modal="false"
  aria-labelledby={id}
  bind:this={root}
  onkeydown={(event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      preview.cancel();
    }
  }}
>
  <h2 {id}>Try {preview.name}?</h2>
  <p>Preview only. Apply to save this design to your private draft.</p>
  {#if preview.hasCustomCss}<label
      ><input
        type="checkbox"
        checked={preview.withoutCss}
        onchange={(event) => preview.setWithoutCss(event.currentTarget.checked)}
      />Preview and apply without my custom CSS</label
    >{/if}
  <div class="actions">
    <Button disabled={busy} onclick={preview.apply}>Apply theme</Button><Button
      bind:ref={cancelButton}
      variant="ghost"
      onclick={preview.cancel}>Cancel preview</Button
    >
  </div>
</dialog>

<style>
  .theme-prompt {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    translate: -50% -50%;
    width: min(380px, calc(100% - 32px));
    margin: 0;
    max-height: calc(100% - 32px);
    overflow: auto;
    box-sizing: border-box;
    z-index: 10;
    padding: 20px;
    border: 1px solid var(--pager-management-border);
    border-radius: 16px;
    background: var(--pager-management-background);
    color: var(--pager-management-text);
    box-shadow: 0 12px 48px #0004;
    outline: none;
  }
  h2 {
    font-size: 1.1rem;
    margin: 0 0 8px;
    overflow-wrap: anywhere;
  }
  p {
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--pager-management-text-secondary);
    margin: 0 0 16px;
  }
  label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 0.8rem;
    line-height: 1.5;
    margin-block: 12px;
  }
  input {
    accent-color: var(--pager-management-accent);
    margin-top: 3px;
  }
  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
</style>
