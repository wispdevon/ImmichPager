<script lang="ts">
  import { Icon } from '@immich/ui';
  import {
    mdiPlay,
    mdiPause,
    mdiDownload,
    mdiFullscreen,
    mdiClose,
    mdiChevronLeft,
    mdiChevronRight,
  } from '@mdi/js';
  import { onMount, untrack, tick } from 'svelte';
  import { pushState } from '$app/navigation';
  import { page as routePage } from '$app/state';
  import type { ViewPhoto } from '$lib/contracts';
  let {
    photos,
    start = 0,
    hasMore = false,
    onmore,
    onClose,
  }: {
    photos: ViewPhoto[];
    start?: number;
    hasMore?: boolean;
    onmore: () => Promise<void>;
    onClose: () => void;
  } = $props();
  let dialog: HTMLDialogElement;
  let generation = $state(0);
  let index = $state(untrack(() => start));
  let playing = $state(false),
    failed = $state(false),
    loaded = $state(false),
    closing = $state(false),
    advancing = $state(false);
  let fullSupported = $state(false);
  const photo = $derived(photos[index]);
  let returnFocus: HTMLElement | null = null;
  const historyId = `viewer-${Math.random().toString(36).slice(2)}`;
  async function close(fromHistory = false) {
    if (closing) return;
    closing = true;
    playing = false;
    if (!fromHistory && routePage.state.pagerViewer === historyId)
      history.back();
    if (document.fullscreenElement === dialog)
      await document.exitFullscreen().catch(() => {});
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
      await dialog
        .animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 250,
          easing: 'ease',
        })
        .finished.catch(() => {});
    dialog.close();
    returnFocus?.focus({ preventScroll: true });
    onClose();
  }
  async function go(delta: number) {
    if (advancing || closing) return;
    advancing = true;
    try {
      if (delta > 0 && index === photos.length - 1 && hasMore) await onmore();
      index = (index + delta + photos.length) % photos.length;
      failed = false;
      loaded = false;
      generation++;
    } finally {
      advancing = false;
    }
  }
  function key(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      void go(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      void go(-1);
    }
    if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      playing = !playing;
    }
  }
  function fullscreen() {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    else void dialog.requestFullscreen?.().catch(() => {});
  }
  onMount(() => {
    returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    fullSupported = document.fullscreenEnabled;
    dialog.showModal();
    dialog
      .querySelector<HTMLButtonElement>('[aria-label="Close photo viewer"]')
      ?.focus();
    document.documentElement.style.overflow = 'hidden';
    pushState('', { ...routePage.state, pagerViewer: historyId });
    const pop = () => {
      void tick().then(() => {
        if (routePage.state.pagerViewer !== historyId) void close(true);
      });
    };
    window.addEventListener('popstate', pop);
    return () => {
      window.removeEventListener('popstate', pop);
      document.documentElement.style.overflow = '';
    };
  });
  $effect(() => {
    if (!playing || !loaded) return;
    const timer = setTimeout(() => void go(1), 4500);
    return () => clearTimeout(timer);
  });
  $effect(() => {
    void index;
    for (const delta of [-1, 1]) {
      const adjacent = photos[(index + delta + photos.length) % photos.length];
      if (adjacent) {
        const image = new Image();
        image.src = adjacent.preview;
      }
    }
  });
  let pointer: { x: number; y: number; id: number } | null = null;
</script>

<dialog
  bind:this={dialog}
  class="photo-viewer"
  class:closing
  aria-label="Photo viewer"
  oncancel={(event) => {
    event.preventDefault();
    void close();
  }}
  onkeydown={key}
>
  <header>
    <span aria-live="polite"
      >{index + 1} / {photos.length}{hasMore ? '+' : ''}</span
    >
    <div class="tools">
      <button
        aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
        aria-pressed={playing}
        onclick={() => (playing = !playing)}
        ><Icon
          icon={playing ? mdiPause : mdiPlay}
          size="24px"
          aria-hidden
        /></button
      >
      {#if photo?.original}<a
          href={photo.original}
          download
          aria-label="Download original"
          ><Icon icon={mdiDownload} size="24px" aria-hidden /></a
        >{/if}
      {#if fullSupported}<button aria-label="Full screen" onclick={fullscreen}
          ><Icon icon={mdiFullscreen} size="24px" aria-hidden /></button
        >{/if}
      <button aria-label="Close photo viewer" onclick={() => void close()}
        ><Icon icon={mdiClose} size="24px" aria-hidden /></button
      >
    </div>
  </header>
  <div
    class="stage"
    role="presentation"
    onclick={(event) => {
      if (event.target === event.currentTarget) void close();
    }}
    onpointerdown={(event) => {
      if (event.pointerType !== 'mouse')
        pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
    }}
    onpointercancel={() => (pointer = null)}
    onpointerup={(event) => {
      if (
        pointer?.id === event.pointerId &&
        Math.abs(event.clientX - pointer.x) > 50 &&
        Math.abs(event.clientX - pointer.x) >
          Math.abs(event.clientY - pointer.y)
      )
        void go(event.clientX < pointer.x ? 1 : -1);
      pointer = null;
    }}
  >
    <button
      class="previous"
      aria-label="Previous photo"
      disabled={advancing}
      onclick={() => void go(-1)}
      ><Icon icon={mdiChevronLeft} size="28px" aria-hidden /></button
    >
    {#key `${photo?.id}:${generation}`}
      {#if photo}<img
          class:loaded
          class:failed
          src={photo.preview}
          alt={photo.alt || photo.caption || 'Photo'}
          onload={() => (loaded = true)}
          onerror={() => {
            failed = true;
            loaded = true;
          }}
          draggable="false"
        />{/if}
    {/key}
    {#if failed}<p role="status">
        Photo unavailable. <button
          class="retry"
          onclick={() => {
            failed = false;
            loaded = false;
            generation++;
          }}>Retry photo</button
        >
      </p>{:else if !loaded}<p class="loading" role="status">
        Loading photo…
      </p>{/if}
    <button
      class="next"
      aria-label="Next photo"
      disabled={advancing}
      onclick={() => void go(1)}
      ><Icon icon={mdiChevronRight} size="28px" aria-hidden /></button
    >
  </div>
  <footer>
    <p>{photo?.caption || ''}</p>
    {#if photo?.takenAt}<small
        >{new Date(photo.takenAt).toLocaleDateString()}</small
      >{/if}
    {#if playing}<span class="progress" aria-hidden="true"></span>{/if}
  </footer>
</dialog>

<style>
  .retry {
    width: auto;
    border: 1px solid #888;
    border-radius: 8px;
    padding-inline: 16px;
    font-size: 15px;
  }
  .photo-viewer {
    position: fixed;
    inset: 0;
    margin: 0;
    border: 0;
    padding: 0;
    max-width: none;
    max-height: none;
    width: 100%;
    height: 100dvh;
    background: rgb(10 10 10 / 98.5%);
    color: #fff;
    font:
      15px 'GoogleSans',
      sans-serif;
  }
  .photo-viewer[open] {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    animation: enter 250ms ease;
  }
  .photo-viewer::backdrop {
    background: #000;
    animation: enter 250ms ease;
  }
  .photo-viewer.closing::backdrop {
    animation: enter 250ms ease reverse forwards;
  }
  header,
  .tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  header {
    padding: 10px 12px;
  }
  button,
  a {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 26px;
    text-decoration: none;
    cursor: pointer;
  }
  button:hover,
  a:hover {
    background: #ffffff20;
  }
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid #accbfa;
    outline-offset: -2px;
  }
  .stage {
    position: relative;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    touch-action: pan-y pinch-zoom;
  }
  .stage img {
    max-width: calc(100% - 24px);
    max-height: 100%;
    object-fit: contain;
    opacity: 0;
    transform: scale(0.985);
    transition:
      opacity 300ms ease,
      transform 300ms ease;
  }
  .stage img.failed {
    display: none;
  }
  .stage img.loaded {
    opacity: 1;
    transform: scale(1);
  }
  .previous,
  .next {
    position: absolute;
    top: 50%;
    translate: 0 -50%;
    z-index: 1;
    background: #0006;
  }
  .previous {
    left: 12px;
  }
  .next {
    right: 12px;
  }
  .loading {
    position: absolute;
    background: #111;
    padding: 12px;
  }
  footer {
    position: relative;
    min-height: 56px;
    padding: 12px 20px;
    text-align: center;
    overflow-wrap: anywhere;
  }
  footer p {
    margin: 0 0 4px;
  }
  small {
    color: #aaa;
  }
  .progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #accbfa;
    transform-origin: left;
    animation: progress 4500ms linear infinite;
  }
  @keyframes enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes progress {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .photo-viewer[open],
    .photo-viewer::backdrop {
      animation: none;
    }
    .stage img {
      transform: none;
      transition: opacity 100ms ease;
    }
    .progress {
      animation: none;
    }
  }
</style>
