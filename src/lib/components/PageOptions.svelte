<script lang="ts">
  import { compileCustomCss, CUSTOM_CSS_LIMIT } from '$lib/custom-css';
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
  } from '@immich/ui';
  import CopyLink from './CopyLink.svelte';
  import type { PageInput, DraftEditorPage, Album } from '$lib/contracts';
  let {
    fields = $bindable(),
    saved,
    albums,
    message = '',
    busy = false,
    saving = false,
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
    onClose: () => void;
    onpublish: () => void;
    onaction: (action: 'unpublish' | 'delete' | 'retry') => void;
    onSlugEdit: () => void;
  } = $props();
  let editUrl = $state(false);
  let drag = $state<{ albumId: string; pointerId: number } | null>(null);
  let orderStatus = $state('');
  const orderGroups = $derived(albumOrderGroups(fields.albumIds, albums));
  const cssValidation = $derived(
    compileCustomCss(fields.customCss, saved?.id ?? 'preview'),
  );
  const protectedPage = $derived(
    fields.passwordMode === 'set' ||
      (fields.passwordMode === 'keep' && !!saved?.hasPassword),
  );
  function changeUrl() {
    if (
      !saved?.publishedSlug ||
      confirm(
        'Changing this URL will stop the existing client link working when you publish. Continue?',
      )
    )
      editUrl = true;
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
      orderStatus = `Moved ${name} to position ${group[1].indexOf(albumId) + 1} of ${group[1].length} in ${group[0]}.`;
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

<Modal title="Options" size="small" {onClose} focusOnOpen>
  <ModalBody
    ><div class="options-body" use:labelDialog={'Options'}>
      {#if message}<div role="alert" class="notice error">{message}</div>{/if}
      <section>
        <h2>Appearance</h2>
        <Field label="Appearance"
          ><Select
            bind:value={fields.theme}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'System' },
            ]}
          /></Field
        ><Field label="Header alignment"
          ><Select
            bind:value={fields.alignment}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Centered' },
            ]}
          /></Field
        >
        <Field label="Header layout"
          ><Select
            bind:value={fields.headerLayout}
            options={[
              { value: 'below', label: 'Below banner' },
              { value: 'overlay', label: 'Over banner' },
            ]}
          /></Field
        >
        {#if fields.headerLayout === 'overlay' && !saved?.banner}<p
            class="hint"
          >
            Add a banner to place your logo, title and description over it.
          </p>{/if}
        {#if saved?.banner}<label
            >Banner crop position<input
              type="range"
              min="0"
              max="100"
              bind:value={fields.bannerPosition}
            /></label
          >{/if}
        <details>
          <summary>Custom colors</summary>
          <div class="colors">
            <label
              >Accent<input type="color" bind:value={fields.accent} /><small
                >Album title color on hover.</small
              ></label
            ><label
              >Background<input
                type="color"
                value={fields.background ||
                  (fields.theme === 'light' ? '#ffffff' : '#000000')}
                oninput={(event) =>
                  (fields.background = event.currentTarget.value)}
              /></label
            ><label
              >Text<input
                type="color"
                value={fields.foreground ||
                  (fields.theme === 'light' ? '#191919' : '#e5e7eb')}
                oninput={(event) =>
                  (fields.foreground = event.currentTarget.value)}
              /></label
            >
          </div>
          <Button
            variant="ghost"
            onclick={() => {
              fields.background = null;
              fields.foreground = null;
            }}>Reset colors</Button
          >
        </details>
      </section>
      <section>
        <details class="advanced-css">
          <summary>Advanced · Custom CSS</summary>
          <p class="hint">
            Style this gallery only. Changes autosave privately and go live when
            you publish.
          </p>
          <label for="custom-css">Custom CSS</label>
          <textarea
            id="custom-css"
            class="css-editor"
            bind:value={fields.customCss}
            maxlength={CUSTOM_CSS_LIMIT}
            rows="10"
            spellcheck="false"
            autocapitalize="off"
            aria-invalid={!!cssValidation.error}
            aria-describedby="css-feedback css-count"
            placeholder={':scope { --pager-accent: #f0b67f; }\n.ip-title { font-family: Georgia, serif; }'}
          ></textarea>
          <small id="css-count"
            >{fields.customCss.length.toLocaleString('en')} / 20,000 characters</small
          >
          <p
            id="css-feedback"
            class:error={!!cssValidation.error}
            role={cssValidation.error ? 'alert' : undefined}
          >
            {cssValidation.error
              ? `${cssValidation.error} Saved privately; omitted from preview. Fix before publishing.`
              : 'Use Preview to check your styling. External resources and imports are blocked.'}
          </p>
          <div class="css-actions">
            <a
              href="https://github.com/wispdevon/ImmichPager/blob/dev/docs/customization.md"
              target="_blank"
              rel="noreferrer">CSS guide and examples ↗</a
            ><Button
              variant="ghost"
              disabled={!fields.customCss}
              onclick={() => (fields.customCss = '')}>Clear custom CSS</Button
            >
          </div>
        </details>
      </section>
      <section>
        <h2>Albums</h2>
        <Field label="Album order"
          ><Select
            bind:value={fields.order}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'manual', label: 'Manual within year' },
            ]}
          /></Field
        >
        {#if fields.order === 'manual'}<p id="album-order-help" class="hint">
            Drag albums within a year, or use the arrow controls. Year groups
            stay in chronological order.
          </p>
          {#each orderGroups as [year, ids] (year)}<div class="order-year">
              <h3>{year}</h3>
              {#each ids as id, index (id)}{@const name =
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
                    aria-label={`Reorder ${name}. Use arrow keys or the adjacent move buttons.`}
                    aria-describedby="album-order-help"
                    onpointerdown={(event) => startDrag(id, event)}
                    onpointermove={(event) => updateDrag(id, event)}
                    onpointerup={endDrag}
                    onpointercancel={endDrag}
                    onlostpointercapture={endDrag}
                    onkeydown={(event) => handleReorderKey(event, id)}
                    ><span aria-hidden="true">⠿</span></button
                  >
                  <span>{name}</span>
                  <Button
                    size="small"
                    variant="ghost"
                    disabled={index === 0}
                    aria-label={`Move ${name} up within ${year}`}
                    onclick={() => move(id, -1)}>↑</Button
                  ><Button
                    size="small"
                    variant="ghost"
                    disabled={index === ids.length - 1}
                    aria-label={`Move ${name} down within ${year}`}
                    onclick={() => move(id, 1)}>↓</Button
                  >
                </div>
              {/each}
            </div>{/each}
          <p class="visually-hidden" role="status" aria-live="polite">
            {orderStatus}
          </p>{/if}
      </section>
      <section>
        <h2>Sharing</h2>
        <div class="link-row">
          <div>
            <strong
              >{saved?.publishedSlug
                ? 'Client link'
                : 'Draft — not shared yet'}</strong
            >
            <p class="muted">
              /page/{saved?.publishedSlug || fields.slug || 'your-client'}
            </p>
          </div>
          <CopyLink slug={saved?.publishedSlug ?? null} />
        </div>
        {#if saved?.publishedSlug}<Button
            variant="ghost"
            href={`/page/${saved.publishedSlug}`}
            target="_blank">Open page ↗</Button
          >{/if}
        {#if saved?.publishedSlug && !editUrl}<Button
            variant="ghost"
            color="secondary"
            onclick={changeUrl}>Change page URL</Button
          >{:else}<Field label="Page URL"
            ><div class="url-input">
              <Input
                maxlength={80}
                bind:value={fields.slug}
                oninput={onSlugEdit}
              />
            </div></Field
          >{/if}
        <div class="protection-row">
          <div>
            <strong>Password protection</strong>
            <p class="hint">Applied when you publish.</p>
          </div>
          <Switch
            aria-label="Password protection"
            checked={protectedPage}
            onCheckedChange={(checked) => {
              fields.passwordMode = checked
                ? saved?.hasPassword
                  ? 'keep'
                  : 'set'
                : saved?.hasPassword
                  ? 'remove'
                  : 'keep';
              fields.password = '';
            }}
          />
        </div>
        {#if protectedPage}<Field
            label={fields.passwordMode === 'set'
              ? 'New password or PIN'
              : 'Current password (when album links change)'}
            ><PasswordInput
              bind:value={fields.password}
              autocomplete={fields.passwordMode === 'set'
                ? 'new-password'
                : 'current-password'}
              placeholder="At least 4 characters"
            /></Field
          >
          <p class="hint">
            Passwords are not included in autosaved drafts. Enter it again after
            reloading if album links need to change.
          </p>{/if}
        {#if saved?.hasPassword && protectedPage}<Button
            variant="ghost"
            onclick={() => (fields.passwordMode = 'set')}
            >Change password</Button
          >{/if}
      </section>
      {#if saved}<section class="danger-zone">
          {#if saved.status === 'error'}<Button
              variant="ghost"
              onclick={() => onaction('retry')}
              disabled={busy}>Retry synchronization</Button
            >{/if}{#if saved.publishedSlug}<Button
              variant="ghost"
              onclick={() => onaction('unpublish')}
              disabled={busy}>Unpublish page</Button
            >{/if}<Button
            color="danger"
            variant="ghost"
            onclick={() => onaction('delete')}
            disabled={busy}>Delete page</Button
          >
        </section>{/if}
    </div></ModalBody
  >
  <ModalFooter
    ><div class="options-footer">
      <span class="hint"
        >{saving ? 'Saving draft…' : 'Changes autosave privately'}</span
      ><Button variant="ghost" color="secondary" onclick={onClose}>Done</Button
      ><Button
        shape="round"
        onclick={onpublish}
        disabled={busy || saved?.status === 'error'}
        >{saved?.publishedSlug ? 'Update live page' : 'Publish page'}</Button
      >
    </div></ModalFooter
  >
</Modal>

<style>
  .advanced-css summary {
    cursor: pointer;
  }
  .css-editor {
    width: 100%;
    box-sizing: border-box;
    padding: 12px;
    border: 1px solid #49505b;
    border-radius: 8px;
    background: #171c24;
    color: #e5e7eb;
    font:
      13px/1.6 ui-monospace,
      monospace;
    resize: vertical;
    margin-block: 8px;
  }
  .css-editor:focus-visible {
    outline: 2px solid #accbfa;
    outline-offset: 2px;
  }
  .css-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  .css-actions a {
    color: #accbfa;
    font-size: 13px;
  }
  #css-feedback {
    font-size: 13px;
    line-height: 1.5;
  }
  #css-feedback.error {
    color: #ffb4ab;
  }

  .options-body {
    padding-block: 8px;
  }
  .options-body section {
    padding-block: 20px;
    display: grid;
    gap: 18px;
    border-bottom: 1px solid #ffffff12;
  }
  .options-body section:last-child {
    border: 0;
  }
  .options-body h2 {
    font-size: 18px;
    margin: 0;
  }
  .options-body label {
    font-size: 13px;
    margin: 0;
  }
  .hint {
    font-size: 12px;
    color: #9aa0a6;
    line-height: 1.6;
  }
  .colors {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 16px;
  }
  .colors input {
    height: 38px;
    padding: 3px;
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
    gap: 16px;
    justify-content: space-between;
    align-items: center;
    min-width: 0;
  }
  .link-row p {
    font-size: 13px;
    margin-top: 6px;
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
  .protection-row strong,
  .link-row strong {
    font-size: 14px;
    font-weight: 500;
  }
  .options-footer {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
    justify-content: flex-end;
  }
  .options-footer > span {
    margin-right: auto;
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
    color: #9aa0a6;
    font-size: 12px;
    font-weight: 600;
  }
  .drag-handle {
    display: grid;
    flex: 0 0 34px;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 1px solid #ffffff24;
    border-radius: 6px;
    color: #e5e7eb;
    background: #ffffff08;
    cursor: grab;
    touch-action: pan-x pinch-zoom;
    -webkit-user-select: none;
    user-select: none;
  }
  .drag-handle:active,
  .order-row.dragging .drag-handle {
    cursor: grabbing;
  }
  .drag-handle:focus-visible {
    outline: 2px solid #accbfa;
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
  details summary {
    font-size: 13px;
    color: #9aa0a6;
  }
  details[open] summary {
    color: #e5e7eb;
  }
</style>
