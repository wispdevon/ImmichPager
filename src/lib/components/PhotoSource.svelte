<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import type { PhotosBlock } from '$lib/blocks';
  import type { PhotoPage, ViewPhoto } from '$lib/contracts';
  import { readApiResponse } from '$lib/api-response';
  import PhotoViewer from './PhotoViewer.svelte';
  let {
    pageId,
    sourceId,
    kind,
    preview = false,
    revision = 0,
    block,
    allowDownload = true,
    ready = true,
    persistedIds,
  }: {
    pageId: string;
    sourceId: string;
    kind: 'album' | 'photos';
    preview?: boolean;
    revision?: number;
    block?: PhotosBlock;
    allowDownload?: boolean;
    ready?: boolean;
    persistedIds?: string[];
  } = $props();
  let items = $state<ViewPhoto[]>([]),
    nextCursor = $state<string | null>(null),
    loading = $state(false),
    message = $state('');
  let failedThumbnails = $state<string[]>([]);
  let viewer = $state<number | null>(null),
    prepared = $state<{ index: number; count: number; size: number }[] | null>(
      null,
    ),
    preparing = $state(false);
  let mounted = $state(false),
    visible = $state(false);
  let container: HTMLDivElement;
  let controller: AbortController | null = null;
  let archiveForm = $state<HTMLFormElement | null>(null);
  const suffix = $derived(preview ? '?preview=1' : '');
  const sourceUrl = $derived(
    `/page/content/${pageId}/${kind}/${sourceId}${suffix}`,
  );
  const downloadUrl = $derived(
    `/page/download/${pageId}/${kind}/${sourceId}${suffix}`,
  );
  const savedPhotos = $derived(
    persistedIds ?? (ready ? (block?.photos.map((p) => p.id) ?? []) : []),
  );
  const mediaBase = $derived(`/page/media/${pageId}/${kind}/${sourceId}`);
  const photos = $derived(
    preview && block
      ? block.photos.map((p) =>
          items.find((item) => item.id === p.id)
            ? {
                ...items.find((item) => item.id === p.id)!,
                caption: p.caption,
                alt: p.alt,
              }
            : {
                ...p,
                ratio: 1.5,
                takenAt: '',
                thumbnail: `/page/api/photos/${p.id}/thumbnail`,
                preview: savedPhotos.includes(p.id)
                  ? `${mediaBase}/${p.id}/preview?preview=1`
                  : `/page/api/photos/${p.id}/thumbnail`,
                original:
                  savedPhotos.includes(p.id) && allowDownload
                    ? `${mediaBase}/${p.id}/original?preview=1`
                    : null,
              },
        )
      : items,
  );
  async function load(reset = false) {
    if (loading && !reset) return;
    if (reset) {
      controller?.abort();
      failedThumbnails = [];
      nextCursor = null;
      prepared = null;
    }
    const own = new AbortController();
    controller = own;
    loading = true;
    message = '';
    try {
      const query = new URL(sourceUrl, location.origin);
      if (!reset && nextCursor) query.searchParams.set('cursor', nextCursor);
      const data = await readApiResponse<PhotoPage>(
        await fetch(query, { signal: own.signal }),
      );
      if (own.signal.aborted) return;
      items = reset
        ? data.items
        : [
            ...items,
            ...data.items.filter((p) => !items.some((old) => old.id === p.id)),
          ];
      nextCursor = data.nextCursor;
    } catch (cause) {
      if (!own.signal.aborted && !(preview && block?.photos.length))
        message =
          cause instanceof Error ? cause.message : 'Could not load photos';
    } finally {
      if (!own.signal.aborted) loading = false;
    }
  }
  onMount(() => {
    mounted = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          visible = true;
          observer.disconnect();
        }
      },
      { rootMargin: '600px' },
    );
    observer.observe(container);
    return () => {
      observer.disconnect();
      controller?.abort();
    };
  });
  $effect(() => {
    void revision;
    void sourceUrl;
    if (mounted && visible && ready) untrack(() => void load(true));
  });
  async function prepare() {
    preparing = true;
    message = '';
    try {
      const data = await readApiResponse<{
        parts: { index: number; count: number; size: number }[];
      }>(
        await fetch(downloadUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ revision }),
        }),
      );
      prepared = data.parts;
      await tick();
      if (prepared.length === 1) archiveForm?.requestSubmit();
    } catch (cause) {
      message =
        cause instanceof Error ? cause.message : 'Could not prepare ZIP';
    } finally {
      preparing = false;
    }
  }
</script>

<div
  bind:this={container}
  class="photo-source"
  class:large={block?.layout === 'large'}
>
  {#if message}<p role="alert">
      {message} <button onclick={() => void load(true)}>Retry</button>
    </p>{/if}
  {#if allowDownload && photos.length}<div class="source-tools">
      <button disabled={preparing} onclick={prepare}
        >{preparing ? 'Preparing ZIP…' : 'Download all'}</button
      >
      {#if prepared}<form
          bind:this={archiveForm}
          method="POST"
          action={downloadUrl}
        >
          <input type="hidden" name="revision" value={revision} />
          {#each prepared as part}<button name="part" value={part.index}
              >Download ZIP{prepared.length > 1 ? ` ${part.index + 1}` : ''} · {part.count}
              photos</button
            >{/each}
          {#if prepared.length === 1}<input
              type="hidden"
              name="part"
              value="0"
            />{/if}
        </form>{/if}
    </div>{/if}
  <div
    class="photo-grid"
    class:justified={!block || block.layout === 'justified'}
    class:masonry={block?.layout === 'masonry'}
    class:square={block?.layout === 'square'}
    class:carousel={block?.layout === 'carousel'}
    class:large={block?.layout === 'large'}
    style={`--photo-gap:${block?.gap ?? 16}px;--photo-columns:${block?.columns ?? 3};--photo-row-height:${block?.rowHeight ?? 260}px`}
  >
    {#each photos as photo, index (photo.id)}
      <button
        class="photo-tile ip-photo"
        style={`--photo-ratio:${Math.max(0.3, Math.min(3, photo.ratio))}`}
        aria-label={`Open photo ${photo.alt || photo.caption || index + 1}`}
        onclick={() => (viewer = index)}
      >
        {#if failedThumbnails.includes(photo.id)}<span class="unavailable"
            >Preview unavailable</span
          >{:else}<img
            onerror={() => (failedThumbnails = [...failedThumbnails, photo.id])}
            src={photo.thumbnail}
            alt={photo.alt}
            loading="lazy"
            width={Math.round(photo.ratio * 400)}
            height="400"
            draggable="false"
          />{/if}
        {#if photo.caption && ['large', 'carousel'].includes(block?.layout ?? '')}<span
            >{photo.caption}</span
          >{/if}
      </button>
    {/each}
  </div>
  {#if loading}<p role="status">
      Loading photos…
    </p>{:else if !photos.length && !message}<p class="empty">
      No photos available.
    </p>{/if}
  {#if nextCursor && !(preview && block)}<button
      class="load-more"
      disabled={loading}
      onclick={() => load()}>Load more photos</button
    >{/if}
</div>
{#if viewer !== null && photos.length}<PhotoViewer
    {photos}
    start={viewer}
    hasMore={!!nextCursor && !(preview && block)}
    onmore={() => load()}
    onClose={() => (viewer = null)}
  />{/if}

<style>
  .photo-source {
    padding-block: 12px 24px;
  }
  .source-tools {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
    margin-bottom: 16px;
  }
  button {
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .source-tools button,
  .load-more,
  p button {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid #8886;
    border-radius: 24px;
  }
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(var(--photo-columns), minmax(0, 1fr));
    gap: var(--photo-gap);
  }
  .photo-tile {
    min-width: 0;
    border: 0;
    padding: 0;
    background: transparent;
    text-align: left;
    overflow: hidden;
    border-radius: var(--pager-card-radius, 16px);
    align-self: start;
  }
  .unavailable {
    display: grid;
    place-items: center;
    aspect-ratio: var(--photo-ratio);
    background: #8882;
    min-height: 120px;
  }
  .photo-tile img {
    width: 100%;
    height: auto;
    display: block;
    aspect-ratio: var(--photo-ratio);
    object-fit: cover;
    transition: filter 150ms;
  }
  .photo-tile:hover img {
    filter: brightness(0.9);
  }
  .photo-tile:focus-visible {
    outline: 2px solid var(--pager-accent, #accbfa);
    outline-offset: 4px;
  }
  .photo-tile span {
    display: block;
    padding: 10px;
    line-height: 1.5;
  }
  .square img {
    aspect-ratio: 1;
  }
  .justified {
    display: flex;
    flex-wrap: wrap;
  }
  .justified .photo-tile {
    flex: calc(var(--photo-ratio)) 1
      calc(var(--photo-row-height) * var(--photo-ratio));
    max-width: 100%;
  }
  .justified img {
    height: auto;
    aspect-ratio: var(--photo-ratio);
  }
  .masonry {
    display: block;
    columns: var(--photo-columns);
    column-gap: var(--photo-gap);
  }
  .masonry .photo-tile {
    width: 100%;
    break-inside: avoid;
    margin-bottom: var(--photo-gap);
  }
  .large {
    grid-template-columns: minmax(0, 1fr);
  }
  .carousel {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 12px;
  }
  .carousel .photo-tile {
    flex: 0 0 min(80%, calc(var(--photo-row-height) * var(--photo-ratio)));
    scroll-snap-align: start;
  }
  .carousel img {
    height: var(--photo-row-height);
  }
  .empty {
    padding: 48px 16px;
    text-align: center;
    opacity: 0.65;
  }
  @media (max-width: 600px) {
    .photo-grid:not(.large):not(.justified):not(.masonry):not(.carousel) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .masonry {
      columns: 2;
    }
    .justified .photo-tile {
      flex-basis: calc(
        min(var(--photo-row-height), 220px) * var(--photo-ratio)
      );
    }
  }
</style>
