<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Icon, ContextMenuButton } from '@immich/ui';
  import {
    mdiDrag,
    mdiArrowUp,
    mdiArrowDown,
    mdiTrashCanOutline,
    mdiImageOutline,
  } from '@mdi/js';
  import type { Album } from '$lib/contracts';
  import type { AlbumsBlock } from '$lib/blocks';
  import {
    albumOrderGroups,
    effectiveAlbumOrder,
    moveAlbumBy,
    moveAlbumsRelative,
  } from '$lib/album-order';
  let {
    block,
    albums,
    onchange,
  }: {
    block: AlbumsBlock;
    albums: Album[];
    onchange: (block: AlbumsBlock) => void;
  } = $props();
  const albumById = $derived(new Map(albums.map((album) => [album.id, album])));
  let failedCovers = $state<Record<string, string>>({});
  const displayedIds = $derived(
    effectiveAlbumOrder(block.albumIds, albums, block.order, block.grouping),
  );
  let selecting = $state(false);
  let selected = $state<string[]>([]);
  const selection = $derived(
    selected.filter((id) => block.albumIds.includes(id)),
  );
  let root: HTMLDivElement;
  let drag = $state<{
    pointer: number;
    baseline: string[];
    sourceIds: string[];
    order: AlbumsBlock['order'];
    grouping: AlbumsBlock['grouping'];
    groups: [string, string[]][];
    ids: string[];
    scope: string[];
    x: number;
    y: number;
    startX: number;
    startY: number;
    active: boolean;
    target: string;
    position: 'before' | 'after';
  } | null>(null);
  const groups = $derived(
    drag?.groups ??
      (block.grouping === 'year'
        ? albumOrderGroups(displayedIds, albums)
        : [['Albums', displayedIds] as [string, string[]]]),
  );
  let frame = 0;
  let announcement = $state('');
  const name = (id: string) =>
    albumById.get(id)?.albumName ?? 'Unavailable album';
  function watchCover(container: HTMLSpanElement, onUnavailable: () => void) {
    const image = container.querySelector('img')!;
    image.addEventListener('error', onUnavailable);
    // An SSR cover can fail before hydration attaches its error listener.
    if (image.complete && image.naturalWidth === 0) onUnavailable();
    return {
      destroy() {
        image.removeEventListener('error', onUnavailable);
      },
    };
  }
  const sameOrder = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((id, index) => id === b[index]);
  function actionBaseline() {
    // Preserve existing manual year slots; sorted rows adopt their visible order.
    return block.order === 'newest' ? displayedIds : block.albumIds;
  }
  function apply(
    ids: string[],
    description: string,
    baseline: readonly string[],
  ) {
    // A genuine move can equal the old stored IDs while changing the visible order.
    if (sameOrder(ids, baseline)) return;
    onchange({ ...block, albumIds: ids, order: 'manual' });
    announcement = `Moved ${description}`;
  }
  function move(id: string, by: number) {
    const scope = groups.find(([, ids]) => ids.includes(id))?.[1] ?? [];
    const target = scope[scope.indexOf(id) + by];
    if (!target) return;
    const baseline = actionBaseline();
    apply(
      block.grouping === 'year'
        ? moveAlbumBy(baseline, albums, id, by)
        : moveAlbumsRelative(
            baseline,
            [id],
            target,
            by < 0 ? 'before' : 'after',
          ),
      name(id),
      baseline,
    );
  }
  function cancel() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    drag = null;
  }
  $effect(() => {
    if (
      drag &&
      (!sameOrder(drag.sourceIds, block.albumIds) ||
        drag.order !== block.order ||
        drag.grouping !== block.grouping)
    )
      cancel();
  });
  onDestroy(cancel);
  function locate() {
    if (!drag?.active) return;
    const bounds = root.getBoundingClientRect();
    if (drag.x < bounds.left - 24 || drag.x > bounds.right + 24) {
      drag.target = '';
      return;
    }
    const rows = Array.from(
      root.querySelectorAll<HTMLElement>('[data-album-order-row]'),
    ).filter(
      (row) =>
        drag!.scope.includes(row.dataset.albumId!) &&
        !drag!.ids.includes(row.dataset.albumId!),
    );
    const row =
      rows.find(
        (row) =>
          drag!.y <
          row.getBoundingClientRect().top +
            row.getBoundingClientRect().height / 2,
      ) ?? rows.at(-1);
    if (!row) return;
    drag.target = row.dataset.albumId!;
    drag.position =
      drag.y <
      row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2
        ? 'before'
        : 'after';
  }
  function scroll() {
    if (!drag) return;
    if (drag.active) {
      const rect = root.getBoundingClientRect();
      const top = Math.max(rect.top, 0),
        bottom = Math.min(rect.bottom, window.innerHeight);
      const edge = 40;
      const delta =
        drag.y < top + edge
          ? -Math.min(16, (top + edge - drag.y) / 2)
          : drag.y > bottom - edge
            ? Math.min(16, (drag.y - bottom + edge) / 2)
            : 0;
      if (delta && drag.x >= rect.left - 24 && drag.x <= rect.right + 24) {
        const previous = root.scrollTop;
        root.scrollTop += delta;
        if (previous === root.scrollTop) {
          const inspector = root.closest<HTMLElement>('.inspector-content');
          if (inspector) inspector.scrollTop += delta;
        }
      }
      locate();
    }
    frame = requestAnimationFrame(scroll);
  }
  function start(event: PointerEvent, id: string, scope: string[]) {
    if (drag || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    const handle = event.currentTarget as HTMLButtonElement;
    handle.focus({ preventScroll: true });
    handle.setPointerCapture(event.pointerId);
    const moving = selection.includes(id)
      ? selection.filter((value) => scope.includes(value))
      : [id];
    if (selecting && !selection.includes(id)) selected = [id];
    drag = {
      pointer: event.pointerId,
      baseline: [...actionBaseline()],
      sourceIds: [...block.albumIds],
      order: block.order,
      grouping: block.grouping,
      groups: groups.map(([year, ids]) => [year, [...ids]]),
      ids: [...moving],
      scope: [...scope],
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      target: '',
      position: 'before',
    };
    frame = requestAnimationFrame(scroll);
  }
  function update(event: PointerEvent) {
    if (!drag || drag.pointer !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 4)
      drag.active = true;
    locate();
  }
  function finish(event: PointerEvent) {
    if (!drag || drag.pointer !== event.pointerId) return;
    update(event);
    const completed = drag;
    cancel();
    const bounds = root.getBoundingClientRect();
    const inspector = root
      .closest('.inspector-content')
      ?.getBoundingClientRect();
    const inside =
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= Math.max(bounds.top, inspector?.top ?? 0, 0) &&
      event.clientY <=
        Math.min(bounds.bottom, inspector?.bottom ?? innerHeight, innerHeight);
    if (
      completed.active &&
      completed.target &&
      inside &&
      sameOrder(completed.sourceIds, block.albumIds) &&
      completed.order === block.order &&
      completed.grouping === block.grouping
    )
      apply(
        moveAlbumsRelative(
          completed.baseline,
          completed.ids,
          completed.target,
          completed.position,
          completed.scope,
        ),
        completed.ids.length === 1
          ? name(completed.ids[0])
          : `${completed.ids.length} albums together`,
        completed.baseline,
      );
  }
</script>

<div class="album-selection">
  {#if block.albumIds.length}<div class="selection-tools">
      <button
        type="button"
        aria-pressed={selecting}
        onclick={() => {
          selecting = !selecting;
          selected = [];
        }}>{selecting ? 'Done selecting' : 'Select to reorder'}</button
      >
      {#if selecting}<button
          type="button"
          onclick={() =>
            (selected =
              selection.length === block.albumIds.length
                ? []
                : [...block.albumIds])}
          >{selection.length === block.albumIds.length
            ? 'Clear selection'
            : 'Select all'}</button
        >{/if}
      <span aria-live="polite"
        >{selecting
          ? `${selection.length} selected`
          : `${block.albumIds.length} albums`}</span
      >
    </div>
    {#if block.grouping === 'year'}<p class="order-hint">
        Move within each year. Choose No grouping to order across years.
      </p>{/if}
  {/if}
  <div class="album-order-list" bind:this={root}>
    {#each groups as [year, ids]}<div class="order-year">
        {#if block.grouping === 'year'}<h3>
            {year}
          </h3>{/if}
        {#each ids as id, index (id)}
          {@const cover = albumById.get(id)?.albumThumbnailAssetId}
          <div
            class="order-row"
            class:selected={selection.includes(id)}
            class:moving={drag?.active && drag.ids.includes(id)}
            class:drop-before={drag?.active &&
              drag.target === id &&
              drag.position === 'before'}
            class:drop-after={drag?.active &&
              drag.target === id &&
              drag.position === 'after'}
            data-album-order-row
            data-album-id={id}
            data-order-year={year}
          >
            <div class="cover-control">
              <button
                type="button"
                class="drag-handle"
                class:dragging={drag?.active && drag.ids.includes(id)}
                aria-label={`Reorder ${name(id)}. Use arrow keys or open album actions.`}
                onpointerdown={(event) => start(event, id, ids)}
                onpointermove={update}
                onpointerup={finish}
                onpointercancel={cancel}
                onlostpointercapture={cancel}
                onkeydown={(event) => {
                  if (event.key === 'Escape' && drag) {
                    event.preventDefault();
                    event.stopPropagation();
                    cancel();
                    announcement = 'Reordering cancelled';
                  }
                  if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
                    event.preventDefault();
                    move(id, event.key === 'ArrowUp' ? -1 : 1);
                  }
                }}
              >
                {#if cover && failedCovers[id] !== cover}
                  {#key cover}<span
                      class="cover-image"
                      use:watchCover={() => {
                        if (cover) failedCovers[id] = cover;
                      }}
                      ><img
                        class="album-cover-image"
                        src={`/page/api/albums/${id}/cover`}
                        alt=""
                        width="80"
                        height="80"
                        loading="lazy"
                        decoding="async"
                        draggable="false"
                      /></span
                    >{/key}
                {:else}
                  <span class="cover-fallback" aria-hidden="true"
                    ><Icon
                      icon={mdiImageOutline}
                      size="28px"
                      aria-hidden
                    /><span>No cover</span></span
                  >
                {/if}
                <span class="grip-badge" aria-hidden="true"
                  ><Icon icon={mdiDrag} size="18px" aria-hidden /></span
                >
              </button>
              {#if selecting}<input
                  type="checkbox"
                  aria-label={`Select ${name(id)} for reordering`}
                  checked={selection.includes(id)}
                  onchange={(event) =>
                    (selected = event.currentTarget.checked
                      ? [...selection, id]
                      : selection.filter((value) => value !== id))}
                />{/if}
            </div>
            <span title={name(id)}>{name(id)}</span>
            <ContextMenuButton
              class="album-actions"
              aria-label={`Actions for ${name(id)}`}
              size="small"
              items={[
                {
                  title: 'Move up',
                  icon: mdiArrowUp,
                  $if: () => index > 0,
                  onAction: () => move(id, -1),
                },
                {
                  title: 'Move down',
                  icon: mdiArrowDown,
                  $if: () => index < ids.length - 1,
                  onAction: () => move(id, 1),
                },
                {
                  title: 'Remove album',
                  icon: mdiTrashCanOutline,
                  onAction: () =>
                    onchange({
                      ...block,
                      albumIds: block.albumIds.filter((value) => value !== id),
                    }),
                },
              ]}
            />
          </div>{/each}
      </div>{/each}
  </div>
  <p class="visually-hidden" role="status">{announcement}</p>
</div>
{#if drag?.active}<div
    class="drag-preview"
    style:left={`${Math.min(drag.x + 12, window.innerWidth - 180)}px`}
    style:top={`${drag.y + 16}px`}
    aria-hidden="true"
  >
    <Icon icon={mdiDrag} size="18px" aria-hidden />{drag.ids.length === 1
      ? name(drag.ids[0])
      : `${drag.ids.length} albums`}
  </div>{/if}

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .album-selection {
    min-width: 0;
  }
  .selection-tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
  }
  .selection-tools span,
  .order-hint {
    color: var(--pager-management-text-secondary, #a6a8af);
  }
  .order-hint {
    font-size: 12px;
    line-height: 1.5;
    margin: 4px 0 12px;
  }
  .album-order-list {
    max-height: min(560px, 60dvh);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    padding: 2px;
  }
  .order-row {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 8px;
    min-height: 102px;
    padding: 10px 8px;
    margin-block: 4px;
    border: 1px solid var(--pager-management-border, #333);
    background: var(--pager-management-surface-quiet, #8881);
    font-size: 14px;
    border-radius: 6px;
  }
  .order-row.selected {
    background: color-mix(
      in srgb,
      var(--pager-management-accent, #accbfa) 12%,
      transparent
    );
  }
  .order-row.moving {
    opacity: 0.4;
  }
  .order-row.drop-before::before,
  .order-row.drop-after::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    height: 2px;
    background: var(--pager-management-accent, #accbfa);
    pointer-events: none;
  }
  .order-row.drop-before::before {
    top: 0;
  }
  .order-row.drop-after::after {
    bottom: 0;
  }
  .order-row > span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow-wrap: anywhere;
    line-height: 21px;
  }
  input[type='checkbox'] {
    appearance: auto;
    width: 24px;
    height: 24px;
    margin: 0;
    position: absolute;
    z-index: 1;
    top: 6px;
    left: 6px;
    cursor: pointer;
    box-shadow: 0 0 0 2px #0008;
    accent-color: var(--pager-management-accent, #accbfa);
  }
  h3 {
    margin: 12px 0 4px;
    font-size: 13px;
    color: var(--pager-management-text-secondary, #a6a8af);
  }
  button {
    display: inline-flex;
    flex: 0 0 auto;
    justify-content: center;
    align-items: center;
    min-width: 32px;
    min-height: 36px;
    border: 0;
    border-radius: 6px;
    padding: 6px;
    color: inherit;
    background: transparent;
    cursor: pointer;
    font: inherit;
  }
  button:hover {
    background: #8882;
  }
  button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid var(--pager-management-accent, currentColor);
  }
  .cover-control {
    position: relative;
    flex: 0 0 80px;
    width: 80px;
    height: 80px;
  }
  .cover-image,
  .album-cover-image {
    display: block;
    width: 100%;
    height: 100%;
  }
  .album-cover-image {
    object-fit: cover;
    pointer-events: none;
  }
  .cover-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    height: 100%;
    font-size: 10px;
    color: var(--pager-management-text-secondary, #aaa);
  }
  .grip-badge {
    position: absolute;
    bottom: 4px;
    left: 4px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 24px;
    border-radius: 5px;
    background: #0009;
    color: #fff;
    pointer-events: none;
  }
  .drag-handle {
    position: relative;
    width: 100%;
    height: 100%;
    padding: 0;
    overflow: hidden;
    border-radius: 8px;
    background: var(--pager-management-surface-raised, #212121);
    touch-action: none;
    cursor: grab;
    -webkit-user-select: none;
    user-select: none;
  }
  .drag-handle.dragging {
    cursor: grabbing;
  }
  .drag-preview {
    position: fixed;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
    padding: 8px 12px;
    border-radius: 8px;
    color: var(--pager-management-text, #eee);
    background: var(--pager-management-surface-raised, #212121);
    box-shadow: 0 4px 16px #0004;
    font-size: 13px;
  }
  @media (pointer: coarse) {
    .album-selection :global(.album-actions) {
      min-inline-size: 44px;
      min-block-size: 44px;
    }
    .selection-tools button {
      min-block-size: 44px;
    }
  }
</style>
