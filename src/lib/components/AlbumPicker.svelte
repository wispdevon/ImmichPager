<script lang="ts">
  import { Button } from '@immich/ui';
  import { MAX_PAGE_ALBUMS, type Album } from '$lib/contracts';
  import {
    addVisibleAlbumIds,
    removeVisibleAlbumIds,
    sortAlbumsByRecentCreation,
  } from '$lib/album-picker';

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
  let albumSort = $state<'recent' | 'name'>('recent');
  const filtered = $derived(
    albums.filter(
      (album) =>
        album.albumName.toLowerCase().includes(search.toLowerCase()) &&
        (albumFilter === 'all' || albumIds.includes(album.id)),
    ),
  );
  const visible = $derived(
    albumSort === 'recent'
      ? sortAlbumsByRecentCreation(filtered)
      : [...filtered].sort((a, b) =>
          a.albumName.localeCompare(b.albumName, undefined, {
            sensitivity: 'base',
          }),
        ),
  );
  const visibleSelectedCount = $derived(
    visible.filter((album) => albumIds.includes(album.id)).length,
  );
  const visibleAdditionCount = $derived(
    visible.filter((album) => !albumIds.includes(album.id)).length,
  );
  const includeWouldExceedLimit = $derived(
    albumIds.length + visibleAdditionCount > MAX_PAGE_ALBUMS,
  );
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
  function select(id: string) {
    if (albumIds.includes(id)) {
      albumIds = albumIds.filter((value) => value !== id);
    } else if (albumIds.length < MAX_PAGE_ALBUMS) {
      albumIds = [...albumIds, id];
    }
  }
  function includeVisible() {
    const next = addVisibleAlbumIds(albumIds, visible);
    if (next) albumIds = next;
  }
  function removeVisible() {
    albumIds = removeVisibleAlbumIds(albumIds, visible);
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
    <search class="album-toolbar" aria-label="Owned albums">
      <span class="toolbar-label">Albums</span>
      <div class="album-sort">
        <label for="album-sort">Sort by</label>
        <select id="album-sort" bind:value={albumSort}>
          <option value="recent">Recently added</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </div>
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
          name="albumSearch"
          placeholder="Search albums"
          bind:value={search}
        />
      </div>
    </search>
    <p class="picker-help">Select albums you own to share with this client.</p>
    <div class="bulk-row">
      <p role="status" aria-live="polite">
        {visibleSelectedCount} of {visible.length} shown included. Albums hidden
        by search or filter stay selected.
      </p>
      <div role="group" aria-label="Bulk album selection" class="bulk-actions">
        <Button
          variant="ghost"
          size="small"
          disabled={visible.length === 0 ||
            visibleSelectedCount === visible.length ||
            includeWouldExceedLimit}
          onclick={includeVisible}>Include visible</Button
        ><Button
          variant="ghost"
          size="small"
          disabled={visibleSelectedCount === 0}
          onclick={removeVisible}>Remove visible</Button
        >
      </div>
    </div>
    {#if includeWouldExceedLimit || albumIds.length >= MAX_PAGE_ALBUMS}
      <p id="album-selection-limit" class="limit-notice" role="status">
        {#if includeWouldExceedLimit}
          Including all {visibleAdditionCount} visible albums would exceed this page's
          {MAX_PAGE_ALBUMS}-album limit. Narrow the search or remove selected
          albums before including them.
        {:else}
          This page has reached the {MAX_PAGE_ALBUMS}-album limit. Remove an
          included album before adding another.
        {/if}
      </p>
    {/if}
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
              name="albumIds"
              checked={albumIds.includes(album.id)}
              disabled={!albumIds.includes(album.id) &&
                albumIds.length >= MAX_PAGE_ALBUMS}
              onchange={() => select(album.id)}
              aria-label={`Include ${album.albumName}`}
              aria-describedby={albumIds.length >= MAX_PAGE_ALBUMS
                ? 'album-selection-limit'
                : undefined}
            />
            {#if albumIds.includes(album.id)}<span class="included-badge"
                >✓ Included</span
              >{/if}
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
  .included-badge {
    position: absolute;
    inset-inline-start: 8px;
    inset-block-start: 8px;
    border-radius: 6px;
    padding: 4px 8px;
    background: #accbfa;
    color: #142344;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.25;
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
  .toolbar-label {
    flex: 0 0 auto;
  }
  .album-sort {
    margin: 0;
    min-width: 190px;
    display: grid;
    gap: 4px;
    color: #d7d7d7;
    font-size: 13px;
  }
  .album-sort select {
    min-height: 40px;
    width: 100%;
    border: 1px solid #34363b;
    border-radius: 10px;
    padding: 0 12px;
    background: #1e2939;
    color: var(--pager-fg);
    color-scheme: dark;
  }
  .album-sort select:focus-visible {
    outline: 2px solid #accbfa;
    outline-offset: 2px;
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
  .bulk-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-block: 12px -4px;
  }
  .bulk-row p {
    margin: 0;
    color: #9aa0a6;
    font-size: 13px;
  }
  .limit-notice {
    margin: 8px 0 0;
    color: #ffd88a;
    font-size: 13px;
  }
  .bulk-actions {
    display: flex;
    flex: 0 0 auto;
    gap: 4px;
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
      align-items: stretch;
    }
    .toolbar-label {
      flex-basis: 100%;
    }
    .album-search {
      flex-basis: 100%;
    }
    .album-search input,
    .segments button,
    .album-sort select,
    .bulk-actions :global(button) {
      min-height: 48px;
    }
    .album-sort {
      min-width: 0;
      flex: 1 1 100%;
    }
    .segments {
      flex: 1 1 100%;
    }
    .segments button {
      flex: 1 1 0;
      padding-inline: 8px;
    }
    .bulk-row {
      align-items: flex-start;
      flex-direction: column;
    }
    .bulk-actions {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
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
