<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tick } from 'svelte';
  import { Icon } from '@immich/ui';
  import { mdiRestore } from '@mdi/js';
  let {
    value,
    defaultValue,
    label,
    onreset,
    disabled = false,
    children,
  }: {
    value: unknown;
    defaultValue: unknown;
    label: string;
    onreset: () => void;
    disabled?: boolean;
    children: Snippet;
  } = $props();
  const changed = $derived(
    JSON.stringify(value) !== JSON.stringify(defaultValue),
  );
  let root: HTMLDivElement;
  async function reset() {
    onreset();
    await tick();
    // The reset action disappears at the default value. Keep keyboard users
    // at the setting rather than dropping focus back to the document body.
    root
      .querySelector<HTMLElement>(
        '.control input:not(:disabled), .control select:not(:disabled), .control textarea:not(:disabled), .control button:not(:disabled):not([aria-disabled="true"])',
      )
      ?.focus({ preventScroll: true });
  }
</script>

<div class="reset-field" bind:this={root}>
  <div class="control">{@render children()}</div>
  <div class="reset-slot">
    {#if changed}<button
        type="button"
        {disabled}
        aria-label={`Reset ${label} to default`}
        title={`Reset ${label} to default`}
        onclick={reset}
      >
        <Icon icon={mdiRestore} size="18px" aria-hidden />
      </button>{/if}
  </div>
</div>

<style>
  .reset-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 32px;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .control {
    min-width: 0;
  }
  .reset-slot {
    width: 32px;
  }
  button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 36px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--pager-management-text-secondary, #aaa);
    cursor: pointer;
  }
  button:hover {
    background: var(--pager-management-hover, #8882);
    color: var(--pager-management-text, #eee);
  }
  button:focus-visible {
    outline: 2px solid var(--pager-management-accent, #accbfa);
    outline-offset: 2px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
