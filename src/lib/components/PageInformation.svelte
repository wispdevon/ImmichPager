<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '@immich/ui';
  import { mdiInformationOutline, mdiClose } from '@mdi/js';
  let { children }: { children: Snippet } = $props();
  let dialog: HTMLDialogElement;
  const headingId = $props.id();
</script>

<button
  class="page-info"
  type="button"
  aria-label="Page info"
  title="Page info"
  onclick={() => dialog.showModal()}
  ><Icon icon={mdiInformationOutline} size="20px" aria-hidden /></button
>
<dialog bind:this={dialog} aria-labelledby={headingId}>
  <header>
    <h2 id={headingId}>Page info</h2>
    <button
      type="button"
      aria-label="Close page info"
      onclick={() => dialog.close()}
      ><Icon icon={mdiClose} size="20px" aria-hidden /></button
    >
  </header>
  <p>{@render children()}</p>
</dialog>

<style>
  button {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 50%;
    background: #18191c;
    color: #f5f5f5;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid #accbfa;
    outline-offset: 2px;
  }
  .page-info {
    position: fixed;
    inset-inline-end: 16px;
    inset-block-end: 16px;
    z-index: 10;
    box-shadow: 0 2px 12px #0003;
  }
  dialog {
    position: fixed;
    inset: 0;
    margin: auto;
    height: fit-content;
    width: min(420px, calc(100% - 32px));
    box-sizing: border-box;
    max-height: calc(100dvh - 32px);
    overflow: auto;
    padding: 16px 20px 24px;
    border: 1px solid #ffffff30;
    border-radius: 16px;
    background: #18191c;
    color: #f5f5f5;
  }
  dialog::backdrop {
    background: #0009;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  h2 {
    font:
      600 18px 'GoogleSans',
      sans-serif;
    margin: 0;
  }
  p {
    font:
      14px/1.7 'GoogleSans',
      sans-serif;
    margin: 16px 0 0;
    overflow-wrap: anywhere;
  }
  p :global(a) {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
