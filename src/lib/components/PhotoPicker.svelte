<script lang="ts">
  import { labelDialog } from '$lib/actions/dialog-label';
  import {
    Modal,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Switch,
  } from '@immich/ui';
  import type { Album, Photo } from '$lib/contracts';
  import { readApiResponse } from '$lib/api-response';
  let {
    kind,
    albums,
    onchoose,
    onClose,
  }: {
    kind: 'logo' | 'banner';
    albums: Album[];
    onchoose: (id: string) => Promise<void>;
    onClose: () => void;
  } = $props();
  let view = $state<'photos' | 'albums'>('photos'),
    album = $state<Album | null>(null),
    search = $state(''),
    favorite = $state(false),
    items = $state<Photo[]>([]),
    cursor = $state<string | null>(null),
    selected = $state<string | null>(null),
    loading = $state(false),
    busy = $state(false),
    error = $state('');
  let controller: AbortController | undefined;
  let failedThumbs = $state<string[]>([]),
    thumbnailVersion = $state(0);
  async function load(reset = false) {
    if (reset) {
      controller?.abort();
      items = [];
      failedThumbs = [];
      thumbnailVersion++;
      cursor = null;
      selected = null;
    }
    const own = new AbortController();
    controller = own;
    loading = true;
    error = '';
    const query = new URLSearchParams({
      q: search,
      favorite: String(favorite),
    });
    if (album) query.set('albumId', album.id);
    if (!reset && cursor) query.set('cursor', cursor);
    try {
      const data = await readApiResponse<{
        items: Photo[];
        nextCursor: string | null;
      }>(await fetch(`/page/api/photos?${query}`, { signal: own.signal }));
      if (!own.signal.aborted) {
        items = reset ? data.items : [...items, ...data.items];
        cursor = data.nextCursor;
      }
    } catch (cause) {
      if (!own.signal.aborted)
        error =
          cause instanceof Error ? cause.message : 'Could not load photos';
    } finally {
      if (!own.signal.aborted) loading = false;
    }
  }
  $effect(() => {
    void search;
    void favorite;
    void album;
    const active = view === 'photos' || !!album;
    if (!active) {
      controller?.abort();
      loading = false;
      selected = null;
      cursor = null;
      return;
    }
    selected = null;
    loading = true;
    const timer = setTimeout(() => void load(true), 250);
    return () => {
      clearTimeout(timer);
      controller?.abort();
    };
  });
  async function choose() {
    if (!selected) return;
    busy = true;
    error = '';
    try {
      await onchoose(selected);
      onClose();
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Could not use this photo';
    } finally {
      busy = false;
    }
  }
</script>

<Modal title={`Choose ${kind} from Immich`} size="giant" {onClose} focusOnOpen>
  <ModalBody
    ><div class="photo-picker" use:labelDialog={`Choose ${kind} from Immich`}>
      <div class="picker-toolbar">
        <div class="tabs" role="group" aria-label="Browse library">
          <Button
            variant={view === 'photos' ? 'filled' : 'ghost'}
            shape="round"
            onclick={() => {
              view = 'photos';
              album = null;
              search = '';
              selected = null;
            }}>Photos</Button
          ><Button
            variant={view === 'albums' ? 'filled' : 'ghost'}
            shape="round"
            onclick={() => {
              view = 'albums';
              album = null;
              search = '';
              selected = null;
            }}>Albums</Button
          >
        </div>
        <Input
          type="search"
          aria-label={view === 'albums' && !album
            ? 'Search albums'
            : 'Search filenames'}
          placeholder={view === 'albums' && !album
            ? 'Search albums'
            : 'Search filenames'}
          bind:value={search}
        />
      </div>
      {#if view === 'photos' || album}<div class="filter-line">
          {#if album}<Button variant="ghost" onclick={() => (album = null)}
              >← {album.albumName}</Button
            >{/if}<span>Favorites only</span><Switch
            aria-label="Favorites only"
            bind:checked={favorite}
          />
        </div>{/if}
      {#if error}<div role="alert" class="notice error">
          {error}
          <Button variant="ghost" onclick={() => load(true)} disabled={busy}
            >Retry</Button
          >
        </div>{/if}
      <div class="photo-grid" aria-busy={loading}>
        {#if view === 'albums' && !album}
          {#each albums.filter((a) => a.albumName
              .toLowerCase()
              .includes(search.toLowerCase())) as item}<button
              class="photo-tile"
              onclick={() => {
                album = item;
                search = '';
              }}
              ><img
                src={`/page/api/albums/${item.id}/cover`}
                alt=""
                width="200"
                height="200"
                loading="lazy"
              /><span>{item.albumName}</span></button
            >{:else}<p class="muted">No matching albums.</p>{/each}
        {:else}
          {#each items as photo (photo.id)}<button
              class="photo-tile"
              disabled={loading || busy}
              class:selected={selected === photo.id}
              aria-pressed={selected === photo.id}
              aria-label={`Select ${photo.name}`}
              onclick={() => (selected = photo.id)}
              >{#if failedThumbs.includes(photo.id)}<span class="unavailable"
                  >Preview unavailable</span
                >{:else}<img
                  src={`${photo.thumbnail}?v=${thumbnailVersion}`}
                  onerror={() => (failedThumbs = [...failedThumbs, photo.id])}
                  alt=""
                  width="200"
                  height="200"
                  loading="lazy"
                />{/if}<span>{photo.name}</span>{#if selected === photo.id}<span
                  class="check"
                  aria-hidden="true">✓</span
                >{/if}</button
            >{:else}{#if !loading && !error}<p class="muted">
                No photos found. Try another search or album.
              </p>{/if}{/each}
        {/if}
      </div>
      {#if loading}<p role="status" class="muted">Loading photos…</p>{/if}
      {#if failedThumbs.length}<Button
          variant="ghost"
          onclick={() => load(true)}>Retry image previews</Button
        >{/if}
      {#if cursor && !loading}<Button variant="ghost" onclick={() => load()}
          >Load more photos</Button
        >{/if}
    </div></ModalBody
  >
  <ModalFooter
    ><div class="picker-footer">
      <span class="muted"
        >{selected ? '1 photo selected' : 'Select a photo to continue'}</span
      ><Button
        variant="ghost"
        color="secondary"
        onclick={onClose}
        disabled={busy}>Cancel</Button
      ><Button
        shape="round"
        disabled={!selected || busy || loading}
        onclick={choose}>{busy ? 'Adding…' : `Use as ${kind}`}</Button
      >
    </div></ModalFooter
  >
</Modal>

<style>
  .photo-picker {
    padding-block: 20px;
    min-height: 280px;
  }
  .picker-toolbar {
    display: flex;
    gap: 20px;
    align-items: center;
  }
  .tabs {
    display: flex;
    flex-shrink: 0;
  }
  .filter-line {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-block: 20px;
    font-size: 14px;
  }
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
    gap: 20px 14px;
    margin-top: 20px;
  }
  .photo-tile {
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
    min-width: 0;
    position: relative;
  }
  .unavailable {
    aspect-ratio: 1;
    display: grid !important;
    place-items: center;
    background: #212121;
    border-radius: 12px;
    white-space: normal !important;
    text-align: center;
    padding: 12px;
    color: #9aa0a6;
  }
  .photo-tile img {
    aspect-ratio: 1;
    width: 100%;
    height: auto;
    object-fit: cover;
    border: 3px solid transparent;
    border-radius: 12px;
    background: #212121;
  }
  .photo-tile span:not(.check) {
    display: block;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 6px;
  }
  .photo-tile.selected img {
    border-color: #accbfa;
  }
  .check {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #accbfa;
    color: #101114;
    border-radius: 50%;
    width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
  }
  .picker-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    width: 100%;
  }
  .picker-footer > span {
    margin-right: auto;
    font-size: 12px;
  }
  @media (max-width: 600px) {
    .picker-toolbar {
      flex-wrap: wrap;
      gap: 12px;
    }
    .photo-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .picker-footer {
      flex-wrap: wrap;
    }
    .picker-footer > span {
      width: 100%;
    }
  }
</style>
