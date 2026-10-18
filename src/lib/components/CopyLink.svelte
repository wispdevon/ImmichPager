<script lang="ts">
  import { Button } from '@immich/ui';
  let { slug, label = 'Copy link' }: { slug: string | null; label?: string } =
    $props();
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
  <Button
    variant="ghost"
    shape="round"
    disabled={!slug}
    title={slug ? 'Copy client link' : 'Publish this page first'}
    aria-label={label}
    onclick={copy}
  >
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      aria-hidden="true"
      ><rect x="8" y="8" width="13" height="13" rx="2" /><path
        d="M16 8V3H3v13h5"
      /></svg
    >{copied ? 'Copied' : label}</Button
  >
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
