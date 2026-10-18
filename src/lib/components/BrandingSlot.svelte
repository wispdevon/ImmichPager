<script lang="ts">
  import { Button } from '@immich/ui';
  let {
    kind,
    image,
    busy = false,
    onchoose,
    onfile,
    onremove,
  }: {
    kind: 'logo' | 'banner';
    image: string | null;
    busy?: boolean;
    onchoose: () => void;
    onfile: (file: File) => void;
    onremove: () => void;
  } = $props();
  let input: HTMLInputElement,
    dragging = $state(false);
  const name = $derived(kind === 'logo' ? 'Logo' : 'Banner');
  function receive(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) onfile(file);
  }
</script>

<section
  class:banner={kind === 'banner'}
  class="branding-slot"
  aria-label={`${name} branding`}
>
  <button
    class="drop-area"
    class:dragging
    disabled={busy}
    aria-label={`Choose ${kind} from Immich`}
    onclick={onchoose}
    ondragover={(event) => {
      event.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={receive}
  >
    {#if image}<img
        src={image}
        alt={`${name} preview`}
        width={kind === 'logo' ? 150 : 960}
        height={kind === 'logo' ? 96 : 240}
      /><span class="replace">Replace {kind}</span>
    {:else}<svg
        width="25"
        height="25"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
        ><rect x="3" y="3" width="18" height="18" rx="3" /><path
          d="m3 17 5-5 4 4 4-6 5 7"
        /><circle cx="8" cy="8" r="1" /></svg
      ><strong>Add {kind}</strong><small
        >Choose from Immich or drop an image</small
      >{/if}
  </button>
  <div class="slot-actions">
    <Button size="small" variant="ghost" onclick={onchoose} disabled={busy}
      >Choose from Immich</Button
    ><Button
      size="small"
      variant="ghost"
      color="secondary"
      onclick={() => input.click()}
      disabled={busy}>Upload image</Button
    >{#if image}<Button
        size="small"
        variant="ghost"
        color="danger"
        onclick={onremove}
        disabled={busy}>Remove {kind}</Button
      >{/if}
  </div>
  <input
    bind:this={input}
    type="file"
    class="sr-only"
    tabindex="-1"
    aria-label={name}
    accept="image/jpeg,image/png,image/webp"
    disabled={busy}
    onchange={(event) => {
      const file = event.currentTarget.files?.[0];
      if (file) onfile(file);
      event.currentTarget.value = '';
    }}
  />
</section>

<style>
  .branding-slot {
    min-width: 0;
    width: min(100%, 330px);
  }
  .branding-slot.banner {
    width: 100%;
  }
  .drop-area {
    width: 100%;
    min-height: 150px;
    border: 1px dashed #424852;
    border-radius: 16px;
    background: #101114;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    position: relative;
    overflow: hidden;
    padding: 24px;
    color: #9aa0a6;
  }
  .drop-area:hover,
  .dragging {
    border-color: #accbfa;
    background: #1d2634;
    color: #accbfa;
  }
  .drop-area strong {
    font-size: 16px;
    color: #e5e7eb;
    font-weight: 500;
  }
  .drop-area small {
    font-size: 12px;
  }
  .drop-area img {
    width: auto;
    max-width: 100%;
    height: 96px;
    object-fit: contain;
  }
  .banner .drop-area {
    min-height: 180px;
  }
  .banner img {
    width: 100%;
    height: 180px;
    object-fit: cover;
  }
  .banner .drop-area:has(img) {
    padding: 0;
  }
  .replace {
    position: absolute;
    bottom: 10px;
    right: 12px;
    background: #000a;
    padding: 5px 10px;
    border-radius: 16px;
    font-size: 12px;
    color: white;
  }
  .slot-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    margin-top: 4px;
  }
  .slot-actions :global(button) {
    padding-inline: 10px;
    font-size: 12px;
  }
</style>
