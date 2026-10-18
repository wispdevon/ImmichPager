<script lang="ts">
  import { Button } from '@immich/ui';
  import type { Album } from '$lib/contracts';

  let {
    albums,
    albumIds = $bindable(),
    open = $bindable(false),
  }: {
    albums: Album[];
    albumIds: string[];
    open?: boolean;
  } = $props();
  let dialog = $state<HTMLDialogElement>(null!);
  let search = $state('');
  let albumFilter = $state<'all' | 'selected'>('all');
  const visible = $derived(
    albums.filter(
      (album) =>
        album.albumName.toLowerCase().includes(search.toLowerCase()) &&
        (albumFilter === 'all' || albumIds.includes(album.id)),
    ),
  );
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
  function select(id: string) {
    albumIds = albumIds.includes(id)
      ? albumIds.filter((value) => value !== id)
      : [...albumIds, id];
  }
</script>

<dialog
  bind:this={dialog}
  class="album-dialog"
  aria-labelledby="album-dialog-title"
  onclose={() => (open = false)}
>
  <header class="dialog-heading">
    <h2 id="album-dialog-title">Add albums</h2>
    <Button
      variant="ghost"
      color="secondary"
      onclick={() => dialog.close()}
      aria-label="Close album picker">×</Button
    >
  </header>
  <div class="picker-content">
    <search class="album-toolbar">
      <span>Albums</span>
      <div class="segments" role="group" aria-label="Filter albums">
        <button
          aria-pressed={albumFilter === 'all'}
          onclick={() => (albumFilter = 'all')}>Owned</button
        ><button
          aria-pressed={albumFilter === 'selected'}
          onclick={() => (albumFilter = 'selected')}>Selected</button
        >
      </div>
      <div class="album-search">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
          ><path
            d="m21 21-5-5m2-6a8 8 0 1 1-16 0 8 8 0 0 1 16 0"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          /></svg
        ><input
          type="search"
          aria-label="Search albums"
          placeholder="Search albums"
          bind:value={search}
        />
      </div>
    </search>
    <p class="picker-help">Select albums you own to share with this client.</p>
    <div class="picker-grid">
      {#each visible as album (album.id)}<label
          class="pick"
          class:selected={albumIds.includes(album.id)}
          ><div class="pick-cover">
            {#if album.albumThumbnailAssetId}<img
                src={`/page/api/albums/${album.id}/cover`}
                alt=""
                width="240"
                height="240"
                loading="lazy"
              />{:else}<span aria-hidden="true">▧</span>{/if}<input
              type="checkbox"
              checked={albumIds.includes(album.id)}
              onchange={() => select(album.id)}
              aria-label={`Include ${album.albumName}`}
            />
          </div>
          <strong>{album.albumName}</strong><small class="muted"
            >{album.assetCount} items</small
          ></label
        >{:else}<p class="muted">
          {search
            ? 'No matching albums.'
            : albumFilter === 'selected'
              ? 'No selected albums yet.'
              : 'No owned albums yet. Create an album in Immich first.'}
        </p>{/each}
    </div>
  </div>
  <footer class="dialog-footer">
    <span>{albumIds.length} selected</span><Button
      shape="round"
      onclick={() => dialog.close()}>Done</Button
    >
  </footer>
</dialog>

<style>
  dialog[open] {
    display: flex;
    flex-direction: column;
  }
  .picker-content {
    overflow-y: auto;
    min-height: 0;
  }
  .dialog-heading,
  .dialog-footer {
    flex-shrink: 0;
  }

  .picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 24px 16px;
    margin-top: 24px;
  }
  .pick {
    margin: 0;
    cursor: pointer;
    align-content: start;
    gap: 6px;
    min-width: 0;
  }
  .pick-cover {
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    background: #171717;
    border: 2px solid transparent;
    display: grid;
    place-items: center;
  }
  .pick-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .pick-cover input {
    position: absolute;
    right: 10px;
    top: 10px;
    width: 20px;
    height: 20px;
    accent-color: #accbfa;
  }
  .selected .pick-cover {
    border-color: #accbfa;
  }
  .pick strong {
    font-size: 14px;
    font-weight: 550;
    overflow-wrap: anywhere;
  }
  .pick small {
    font-size: 12px;
  }
  .album-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    border-block: 1px solid #303030;
    padding: 12px 0;
  }
  .segments {
    display: flex;
    background: var(--pager-secondary);
    border-radius: 16px;
    overflow: hidden;
  }
  .segments button {
    border: 0;
    border-radius: 0;
    padding: 12px 16px;
  }
  .segments button[aria-pressed='true'] {
    background: #364152;
  }
  .album-search {
    display: flex;
    align-items: center;
    gap: 16px;
    background: #1e2939;
    padding: 0 16px;
    border-radius: 16px;
    flex: 1;
    min-width: 150px;
  }
  .album-search input {
    background: transparent;
    border: 0;
    padding: 12px 0;
    min-width: 0;
  }
  .album-search svg {
    flex-shrink: 0;
  }
  .picker-help {
    font-size: 13px;
    color: #9aa0a6;
    margin-top: 16px;
  }
  dialog {
    background: #000;
    color: var(--pager-fg);
    border: 1px solid #34363b;
    border-radius: 20px;
    padding: 24px;
    margin: auto;
    width: min(1100px, calc(100% - 40px));
    max-height: calc(100dvh - 48px);
  }
  dialog::backdrop {
    background: #000b;
  }
  .dialog-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 20px;
  }
  .dialog-heading h2 {
    font-size: 22px;
    margin: 0;
  }
  .dialog-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 24px;
    padding-top: 24px;
  }
  @media (max-width: 700px) {
    .album-toolbar {
      flex-wrap: wrap;
      gap: 12px;
    }
    .album-search {
      flex-basis: 100%;
    }
    .picker-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px 12px;
    }
    dialog {
      padding: 16px;
      width: calc(100% - 24px);
      max-height: calc(100dvh - 24px);
    }
  }
</style>
