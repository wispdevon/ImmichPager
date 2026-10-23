<script lang="ts">
  import {
    albumOrderGroups,
    moveAlbumBy,
    moveAlbumRelative,
  } from '$lib/album-order';
  import { labelDialog } from '$lib/actions/dialog-label';
  import {
    Modal,
    ModalBody,
    ModalFooter,
    Button,
    Field,
    Select,
    Input,
    Switch,
    PasswordInput,
    IconButton,
    Icon,
  } from '@immich/ui';
  import {
    mdiOpenInNew,
    mdiQrcode,
    mdiDrag,
    mdiArrowUp,
    mdiArrowDown,
  } from '@mdi/js';
  import PageQr from './PageQr.svelte';
  import { pageInputSchema } from '$lib/contracts';
  import { onMount } from 'svelte';
  import CopyLink from './CopyLink.svelte';
  import type { PageInput, DraftEditorPage, Album } from '$lib/contracts';

  let {
    fields = $bindable(),
    saved,
    albums,
    message = '',
    busy = false,
    saving = false,
    saveStatus,
    canPublish,
    onClose,
    onpublish,
    onaction,
    onSlugEdit,
  }: {
    fields: PageInput;
    saved: DraftEditorPage | null;
    albums: Album[];
    message?: string;
    busy?: boolean;
    saving?: boolean;
    saveStatus: string;
    canPublish: boolean;
    onClose: () => void;
    onpublish: () => void;
    onaction: (action: 'unpublish' | 'delete' | 'retry') => void;
    onSlugEdit: () => void;
  } = $props();

  let editUrl = $state(false);
  let drag = $state<{ albumId: string; pointerId: number } | null>(null);
  let orderStatus = $state('');
  const orderGroups = $derived(albumOrderGroups(fields.albumIds, albums));
  let qrOpen = $state(false);
  let origin = $state('');
  onMount(() => {
    origin = location.origin;
  });
  const slugResult = $derived(
    pageInputSchema.shape.slug.safeParse(fields.slug),
  );
  function changeUrl() {
    editUrl = true;
  }
  function cancelPassword() {
    fields.passwordMode = 'keep';
    fields.password = '';
  }

  function applyOrder(next: string[], albumId: string) {
    if (next === fields.albumIds) return;
    fields.albumIds = next;
    const name =
      albums.find((album) => album.id === albumId)?.albumName ??
      'Unavailable album';
    const group = albumOrderGroups(next, albums).find(([, ids]) =>
      ids.includes(albumId),
    );
    if (group)
      orderStatus =
        'Moved ' +
        name +
        ' to position ' +
        (group[1].indexOf(albumId) + 1) +
        ' of ' +
        group[1].length +
        ' in ' +
        group[0] +
        '.';
  }

  function move(albumId: string, by: number) {
    applyOrder(moveAlbumBy(fields.albumIds, albums, albumId, by), albumId);
  }

  function startDrag(albumId: string, event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    (event.currentTarget as HTMLButtonElement).setPointerCapture(
      event.pointerId,
    );
    drag = { albumId, pointerId: event.pointerId };
  }

  function updateDrag(albumId: string, event: PointerEvent) {
    if (drag?.albumId !== albumId || drag.pointerId !== event.pointerId) return;
    const year = orderGroups.find(([, ids]) => ids.includes(albumId))?.[0];
    if (!year) return;
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>('[data-album-order-row]'),
    ).filter(
      (row) =>
        row.dataset.orderYear === year && row.dataset.albumId !== albumId,
    );
    if (!rows.length) return;
    for (const row of rows) {
      const bounds = row.getBoundingClientRect();
      if (event.clientY < bounds.top + bounds.height / 2) {
        const targetId = row.dataset.albumId;
        if (targetId)
          applyOrder(
            moveAlbumRelative(
              fields.albumIds,
              albums,
              albumId,
              targetId,
              'before',
            ),
            albumId,
          );
        return;
      }
    }
    const targetId = rows.at(-1)?.dataset.albumId;
    if (targetId)
      applyOrder(
        moveAlbumRelative(fields.albumIds, albums, albumId, targetId, 'after'),
        albumId,
      );
  }

  function endDrag(event: PointerEvent) {
    if (drag?.pointerId === event.pointerId) drag = null;
  }

  function handleReorderKey(event: KeyboardEvent, albumId: string) {
    const by = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (by) {
      event.preventDefault();
      move(albumId, by);
    }
  }
</script>

<Modal
  title="Page settings"
  size="medium"
  class="page-settings-dialog"
  {onClose}
  focusOnOpen
>
  <ModalBody class="page-settings-scroll">
    <div class="options-body" use:labelDialog={'Page settings'}>
      {#if message}<div role="alert" class="notice error">{message}</div>{/if}
      <section>
        <h2>Page status</h2>
        <strong
          >{saved?.status === 'error'
            ? 'Synchronization error'
            : saved?.publishedSlug
              ? canPublish
                ? 'Unpublished changes'
                : 'Published'
              : 'Draft'}</strong
        >
        <p class="hint">
          {saved?.publishedSlug
            ? 'Your live page stays unchanged until you publish. Draft changes are private.'
            : 'This page is private until published.'}
        </p>
        {#if saved?.status === 'error'}
          <p role="alert">
            This page is hidden until synchronization finishes.
          </p>
          <Button disabled={busy} onclick={() => onaction('retry')}
            >Retry synchronization</Button
          >
        {/if}
      </section>
      <section>
        <h2>Client link</h2>
        <div class="link-row">
          <p>
            {saved?.publishedSlug
              ? `${origin}/page/${saved.publishedSlug}`
              : 'Publish this page first.'}
          </p>
          <div class="link-actions">
            <CopyLink compact slug={saved?.publishedSlug ?? null} />
            <IconButton
              icon={mdiOpenInNew}
              variant="ghost"
              aria-label="Open client page"
              title={saved?.publishedSlug
                ? 'Open client page'
                : 'Publish this page first'}
              disabled={!saved?.publishedSlug}
              onclick={() => {
                if (saved?.publishedSlug)
                  window.open(
                    `${origin}/page/${saved.publishedSlug}`,
                    '_blank',
                    'noopener,noreferrer',
                  );
              }}
            />
            <IconButton
              icon={mdiQrcode}
              variant="ghost"
              aria-label="QR code"
              title={saved?.publishedSlug
                ? 'QR code'
                : 'Publish this page first'}
              disabled={!saved?.publishedSlug}
              onclick={() => (qrOpen = true)}
            />
          </div>
        </div>
        {#if saved?.publishedSlug && fields.slug !== saved.publishedSlug}
          <p class="hint">
            Pending URL (unpublished): {origin}/page/{fields.slug}
          </p>
        {/if}
        {#if saved?.publishedSlug && !editUrl}
          <Button variant="ghost" color="secondary" onclick={changeUrl}
            >Change page URL</Button
          >
        {:else}
          <Field label="Page URL">
            <div class="url-input">
              <span>/page/</span><Input
                maxlength={80}
                bind:value={fields.slug}
                oninput={onSlugEdit}
                aria-invalid={!slugResult.success}
                aria-describedby="slug-feedback"
              />
            </div>
          </Field>
          <p id="slug-feedback" class="hint">
            {slugResult.success
              ? 'Use lowercase letters, numbers, and single hyphens.'
              : fields.slug
                ? 'Use lowercase letters, numbers, and single hyphens; reserved URLs are unavailable.'
                : 'Enter a URL before publishing.'}
          </p>
          {#if saved?.publishedSlug}<p class="hint">
              The old link stops working after you publish the new URL.
            </p>{/if}
        {/if}
      </section>
      <section>
        <h2>Access</h2>
        <div>
          <strong>Password protection</strong>
          <p class="hint">
            {saved?.hasPassword
              ? 'The current page is password protected.'
              : 'No password is set.'} Changes apply when published.
          </p>
        </div>
        {#if fields.passwordMode === 'set'}
          <Field label="New password or PIN"
            ><PasswordInput
              bind:value={fields.password}
              autocomplete="new-password"
              placeholder="At least 4 characters"
            /></Field
          >
          <p class="hint">
            This password is kept only for this editing session and is excluded
            from autosave.
          </p>
          <Button variant="ghost" onclick={cancelPassword}
            >Cancel password change</Button
          >
        {:else if fields.passwordMode === 'remove'}
          <p>Password protection will be removed when published.</p>
          <Button variant="ghost" onclick={cancelPassword}
            >Cancel password removal</Button
          >
        {:else}
          <div class="link-actions">
            <Button
              variant="ghost"
              onclick={() => {
                fields.password = '';
                fields.passwordMode = 'set';
              }}
              >{saved?.hasPassword ? 'Change password' : 'Set password'}</Button
            >
            {#if saved?.hasPassword}<Button
                variant="ghost"
                onclick={() => {
                  fields.password = '';
                  fields.passwordMode = 'remove';
                }}>Remove password</Button
              >{/if}
          </div>
        {/if}
        <div class="protection-row">
          <div>
            <strong>Allow downloads</strong>
            <p class="hint">
              Applies to all page albums when published. Controls Immich’s
              download feature; it cannot prevent screenshots or saving
              displayed images.
            </p>
          </div>
          <Switch
            aria-label="Allow downloads"
            bind:checked={fields.allowDownload}
          />
        </div>
      </section>
      <section>
        <h2>Albums</h2>
        <Field label="Album order">
          <Select
            bind:value={fields.order}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'manual', label: 'Manual within year' },
            ]}
          />
        </Field>
        {#if fields.order === 'manual'}
          <p id="album-order-help" class="hint">
            Drag albums within a year, or use the arrow controls. Year groups
            stay in chronological order.
          </p>
          {#each orderGroups as [year, ids] (year)}
            <div class="order-year">
              <h3>{year}</h3>
              {#each ids as id, index (id)}
                {@const name =
                  albums.find((a) => a.id === id)?.albumName ||
                  'Unavailable album'}
                <div
                  class="order-row"
                  class:dragging={drag?.albumId === id}
                  data-album-order-row
                  data-album-id={id}
                  data-order-year={year}
                >
                  <button
                    type="button"
                    class="drag-handle"
                    aria-label={'Reorder ' +
                      name +
                      '. Use arrow keys or the adjacent move buttons.'}
                    aria-describedby="album-order-help"
                    onpointerdown={(event) => startDrag(id, event)}
                    onpointermove={(event) => updateDrag(id, event)}
                    onpointerup={endDrag}
                    onpointercancel={endDrag}
                    onlostpointercapture={endDrag}
                    onkeydown={(event) => handleReorderKey(event, id)}
                    ><Icon icon={mdiDrag} aria-hidden /></button
                  >
                  <span>{name}</span>
                  <Button
                    size="small"
                    variant="ghost"
                    disabled={index === 0}
                    aria-label={'Move ' + name + ' up within ' + year}
                    onclick={() => move(id, -1)}
                    ><Icon icon={mdiArrowUp} aria-hidden /></Button
                  >
                  <Button
                    size="small"
                    variant="ghost"
                    disabled={index === ids.length - 1}
                    aria-label={'Move ' + name + ' down within ' + year}
                    onclick={() => move(id, 1)}
                    ><Icon icon={mdiArrowDown} aria-hidden /></Button
                  >
                </div>
              {/each}
            </div>
          {/each}
          <p class="visually-hidden" role="status" aria-live="polite">
            {orderStatus}
          </p>
        {/if}
      </section>

      {#if saved}
        <section>
          <details>
            <summary>Page management</summary>
            <div class="danger-zone">
              {#if saved.publishedSlug}<Button
                  variant="ghost"
                  disabled={busy}
                  onclick={() => onaction('unpublish')}>Unpublish page</Button
                >{/if}
              <Button
                color="danger"
                variant="ghost"
                disabled={busy}
                onclick={() => onaction('delete')}>Delete page</Button
              >
            </div>
          </details>
        </section>
      {/if}
    </div>
  </ModalBody>
  <ModalFooter class="page-settings-footer">
    <div class="options-footer">
      <span class="hint" role="status"
        >{saving ? 'Saving draft…' : saveStatus}</span
      >
      <Button variant="ghost" color="secondary" onclick={onClose}>Close</Button>
      <Button
        shape="round"
        onclick={onpublish}
        disabled={busy || !canPublish || saved?.status === 'error'}
        >{saved?.publishedSlug ? 'Review changes' : 'Publish page'}</Button
      >
    </div>
  </ModalFooter>
</Modal>
{#if qrOpen && saved?.publishedSlug}<PageQr
    slug={saved.publishedSlug}
    onClose={() => (qrOpen = false)}
  />{/if}

<style>
  :global(.page-settings-dialog) {
    max-block-size: calc(100dvh - 32px);
    min-block-size: 0;
  }
  :global(.page-settings-scroll) {
    overflow-y: auto;
    overscroll-behavior: contain;
    min-block-size: 0;
  }
  :global(.page-settings-footer) {
    flex-shrink: 0;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }
  .link-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .link-row > p {
    min-width: 0;
    flex: 1;
  }
  summary {
    cursor: pointer;
    font-weight: 500;
  }
  .danger-zone {
    padding-top: 16px;
  }
  .url-input > span {
    white-space: nowrap;
  }
  @media (max-width: 639px) {
    :global(.page-settings-dialog) {
      block-size: 100dvh;
      max-block-size: 100dvh;
      border-radius: 0;
    }
    .options-footer > span {
      flex-basis: 100%;
    }
    .link-row {
      flex-wrap: wrap;
    }
  }

  .options-body {
    padding-block: 8px;
  }

  .options-body section {
    display: grid;
    gap: 18px;
    padding-block: 20px;
    border-bottom: 1px solid var(--pager-management-border);
  }

  .options-body section:last-child {
    border: 0;
  }

  .options-body h2 {
    margin: 0;
    font-size: 18px;
  }

  .hint {
    color: var(--pager-management-text-secondary);
    font-size: 12px;
    line-height: 1.6;
  }

  .url-input {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .url-input :global(> div) {
    min-width: 0;
  }

  .protection-row,
  .link-row {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .link-row p {
    margin-top: 6px;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .link-row > div:first-child {
    min-width: 0;
  }

  .link-row :global(button) {
    padding-inline: 8px;
    white-space: nowrap;
  }

  .protection-row p {
    margin: 5px 0 0;
  }

  .protection-row strong {
    font-size: 14px;
    font-weight: 500;
  }

  .options-footer {
    display: flex;
    width: 100%;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  .options-footer > span {
    margin-inline-end: auto;
  }

  .order-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .order-year {
    display: grid;
    gap: 8px;
  }

  .order-year h3 {
    margin: 0;
    color: var(--pager-management-text-secondary);
    font-size: 12px;
    font-weight: 600;
  }

  .drag-handle {
    display: grid;
    flex: 0 0 34px;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 1px solid var(--pager-management-border);
    border-radius: 6px;
    color: var(--pager-management-text);
    background: var(--pager-management-surface-quiet);
    cursor: grab;
    touch-action: pan-x pinch-zoom;
    user-select: none;
  }

  .drag-handle:active,
  .order-row.dragging .drag-handle {
    cursor: grabbing;
  }

  .drag-handle:focus-visible {
    outline: 2px solid var(--pager-management-focus);
    outline-offset: 2px;
  }

  .order-row.dragging {
    opacity: 0.65;
  }

  .order-row > span {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .danger-zone {
    display: flex !important;
    flex-wrap: wrap;
    gap: 10px !important;
  }
</style>
