<script lang="ts">
  import { Button, IconButton } from '@immich/ui';
  import { mdiContentCopy } from '@mdi/js';
  let {
    slug,
    label = 'Copy link',
    compact = false,
  }: { slug: string | null; label?: string; compact?: boolean } = $props();
  let copied = $state(false),
    manual = $state('');
  async function copy() {
    if (!slug) return;
    const value = `${location.origin}/page/${slug}`;
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
      setTimeout(() => (copied = false), 2500);
    } catch {
      manual = value;
    }
  }
</script>

<div class="copy-link">
  {#if compact}
    <IconButton
      icon={mdiContentCopy}
      variant="ghost"
      aria-label="Copy client link"
      title={slug ? 'Copy client link' : 'Publish this page first'}
      disabled={!slug}
      onclick={copy}
    />
  {:else}
    <Button
      leadingIcon={mdiContentCopy}
      variant="ghost"
      shape="round"
      disabled={!slug}
      title={slug ? 'Copy client link' : 'Publish this page first'}
      aria-label={label}
      onclick={copy}
    >
      {copied ? 'Copied' : label}</Button
    >
  {/if}
  {#if manual}<label class="manual"
      >Select and copy your link<input
        aria-label="Client link"
        readonly
        value={manual}
        onclick={(event) => event.currentTarget.select()}
      /></label
    >{/if}
  {#if copied}<span class="sr-only" role="status">Client link copied</span>{/if}
</div>

<style>
  .copy-link {
    min-width: 0;
  }
  .manual {
    font-size: 12px;
    max-width: 320px;
  }
  .manual input {
    min-width: 0;
  }
</style>
