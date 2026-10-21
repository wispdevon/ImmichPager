<script lang="ts">
  import { Button } from '@immich/ui';
  let { slug, hasPassword }: { slug: string; hasPassword: boolean } = $props();
</script>

<aside class="published-view" aria-label="Client view">
  <Button
    variant="ghost"
    color="secondary"
    href={`/page/${encodeURIComponent(slug)}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-describedby="published-view-guidance"
    >Open published page<span class="sr-only"> (opens in a new tab)</span> ↗</Button
  >
  <p id="published-view-guidance">
    Opens the published version. Draft changes stay private.
    {#if hasPassword}
      Password protected. A previous unlock may skip the prompt in this browser.
      Use a private window to check a first visit. Immich may ask for the
      password again when opening an album.
    {:else}
      No page password is set on the published version.
    {/if}
  </p>
</aside>

<style>
  .published-view {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem 1rem;
    margin-block: 0.5rem 1rem;
  }
  p {
    flex: 1 1 22rem;
    margin: 0;
    color: var(--immich-fg-muted, #b2b2b2);
    font-size: 0.875rem;
    line-height: 1.5;
  }
</style>
