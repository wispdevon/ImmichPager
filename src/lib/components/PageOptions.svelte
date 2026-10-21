<script lang="ts">
  import { compileCustomCss, CUSTOM_CSS_LIMIT } from '$lib/custom-css';
  import {
    APPEARANCE_FILE_MAX_BYTES,
    parseAppearanceFile,
    serializeAppearanceFile,
    type AppearanceSettings,
  } from '$lib/appearance-file';
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
  let appearanceFileError = $state('');
  let appearanceFileStatus = $state('');
  const cssValidation = $derived(
    compileCustomCss(fields.customCss, saved?.id ?? 'preview'),
  );
  const bannerCropPreview = $derived(
    saved?.banner ? `/page/media/${saved.id}/branding/banner?preview=1` : null,
  );
  const protectedPage = $derived(
    fields.passwordMode === 'set' ||
      (fields.passwordMode === 'keep' && !!saved?.hasPassword),
  );
  function bannerCropDrag(node: HTMLDivElement) {
    let drag: {
      pointerId: number;
      startY: number;
      startPosition: number;
      overflowY: number;
    } | null = null;

    function start(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0) return;
      const image = node.querySelector('img');
      if (!image?.naturalWidth || !image.naturalHeight) return;

      const scale = Math.max(
        node.clientWidth / image.naturalWidth,
        node.clientHeight / image.naturalHeight,
      );
      const overflowY = image.naturalHeight * scale - node.clientHeight;
      if (overflowY <= 0) return;

      drag = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startPosition: fields.bannerPosition,
        overflowY,
      };
      node.setPointerCapture(event.pointerId);
      node.classList.add('dragging');
      event.preventDefault();
    }

    function move(event: PointerEvent) {
      if (drag?.pointerId !== event.pointerId) return;
      const position =
        drag.startPosition -
        ((event.clientY - drag.startY) / drag.overflowY) * 100;
      fields.bannerPosition = Math.max(0, Math.min(100, Math.round(position)));
    }

    function stop(event: PointerEvent) {
      if (drag?.pointerId !== event.pointerId) return;
      drag = null;
      node.classList.remove('dragging');
    }

    node.addEventListener('pointerdown', start);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', stop);
    node.addEventListener('pointercancel', stop);
    node.addEventListener('lostpointercapture', stop);

    return {
      destroy() {
        node.removeEventListener('pointerdown', start);
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', stop);
        node.removeEventListener('pointercancel', stop);
        node.removeEventListener('lostpointercapture', stop);
      },
    };
  }
  function changeUrl() {
    if (
      !saved?.publishedSlug ||
      confirm(
        'Changing this URL will stop the existing client link working when you publish. Continue?',
      )
    )
      editUrl = true;
  }
  function move(index: number, by: number) {
    const next = index + by;
    if (next < 0 || next >= fields.albumIds.length) return;
    const ids = [...fields.albumIds];
    [ids[index], ids[next]] = [ids[next], ids[index]];
    fields.albumIds = ids;
  }
  function currentAppearance(): AppearanceSettings {
    return {
      theme: fields.theme,
      background: fields.background,
      foreground: fields.foreground,
      accent: fields.accent,
      alignment: fields.alignment,
      bannerPosition: fields.bannerPosition,
      headerLayout: fields.headerLayout,
      customCss: fields.customCss,
    };
  }
  function exportAppearance() {
    appearanceFileError = '';
    appearanceFileStatus = '';
    try {
      const file = new Blob([serializeAppearanceFile(currentAppearance())], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'immichpager-appearance.json';
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      appearanceFileStatus = 'Appearance file downloaded.';
    } catch (cause) {
      appearanceFileError =
        cause instanceof Error ? cause.message : 'Could not export appearance.';
    }
  }
  async function importAppearance(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    appearanceFileError = '';
    appearanceFileStatus = '';
    try {
      if (file.size > APPEARANCE_FILE_MAX_BYTES)
        throw new Error('This appearance file is too large.');
      const imported = parseAppearanceFile(await file.text());
      Object.assign(fields, imported);
      appearanceFileStatus =
        'Appearance imported into this private draft. Publish when you are ready to share it.';
    } catch (cause) {
      appearanceFileError =
        cause instanceof Error ? cause.message : 'Could not import appearance.';
    } finally {
      input.value = '';
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
        <Field label="Header size"
          ><Select
            bind:value={fields.headerSize}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'standard', label: 'Standard' },
              { value: 'tall', label: 'Tall' },
            ]}
          /></Field
        >
        {#if !saved?.banner}<p class="hint">
            Banner height applies when you add a banner.
          </p>{/if}
        <label class="range-setting"
          >Logo size
          <div class="range-control">
            <input
              type="range"
              min="48"
              max="160"
              step="8"
              aria-label="Logo size"
              bind:value={fields.logoSize}
            />
            <output>{fields.logoSize}px</output>
          </div>
        </label>
        {#if !saved?.logo}<p class="hint">
            Logo size applies when you add a logo.
          </p>{/if}
        {#if fields.headerLayout === 'overlay' && !saved?.banner}<p
            class="hint"
          >
            Add a banner to place your logo, title and description over it.
          </p>{/if}
        {#if bannerCropPreview}<div class="banner-crop-control">
            <span class="crop-label">Banner crop preview</span>
            <div
              class="banner-crop-preview"
              role="group"
              aria-label="Banner crop preview"
              aria-describedby="banner-crop-hint"
              use:bannerCropDrag
            >
              <img
                src={bannerCropPreview}
                alt=""
                draggable="false"
                style:object-position={`center ${fields.bannerPosition}%`}
              />
              <span class="crop-guides" aria-hidden="true"></span>
            </div>
            <small id="banner-crop-hint" class="hint">
              Drag the image up or down to choose the crop. The slider supports
              keyboard controls.
            </small>
            <label for="banner-crop-position">Banner crop position</label>
            <input
              id="banner-crop-position"
              type="range"
              min="0"
              max="100"
              step="1"
              aria-describedby="banner-crop-hint"
              aria-valuetext={`${fields.bannerPosition}% from top`}
              bind:value={fields.bannerPosition}
            />
          </div>{/if}
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
        <details class="appearance-file">
          <summary>Import or export appearance</summary>
          <p class="hint">
            Move visual settings between pages. Files contain colors, layout,
            banner crop, and custom CSS; they do not contain page content or
            branding images.
          </p>
          <Button variant="ghost" onclick={exportAppearance} disabled={busy}
            >Export appearance JSON</Button
          >
          <label for="appearance-file">Import appearance JSON</label>
          <input
            id="appearance-file"
            type="file"
            accept="application/json,.json"
            aria-describedby="appearance-file-help appearance-file-status"
            onchange={importAppearance}
            disabled={busy}
          />
          <small id="appearance-file-help">
            Choose an ImmichPager appearance file up to 96 KiB. Imported
            settings autosave privately; this does not publish the page.
          </small>
          <p
            id="appearance-file-status"
            class:error={!!appearanceFileError}
            role={appearanceFileError
              ? 'alert'
              : appearanceFileStatus
                ? 'status'
                : undefined}
          >
            {appearanceFileError || appearanceFileStatus}
          </p>
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
              href="https://gitlab.com/wispd/ImmichPager/-/blob/dev/docs/customization.md"
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
        {#if fields.order === 'manual'}<p class="hint">
            Albums remain grouped by year.
          </p>
          {#each fields.albumIds as id, index}<div class="order-row">
              <span
                >{albums.find((a) => a.id === id)?.albumName ||
                  'Unavailable album'}</span
              ><Button
                size="small"
                variant="ghost"
                disabled={index === 0}
                aria-label={`Move album ${index + 1} up`}
                onclick={() => move(index, -1)}>↑</Button
              ><Button
                size="small"
                variant="ghost"
                disabled={index === fields.albumIds.length - 1}
                aria-label={`Move album ${index + 1} down`}
                onclick={() => move(index, 1)}>↓</Button
              >
            </div>{/each}{/if}
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
  .appearance-file[open] {
    display: grid;
    gap: 12px;
  }
  .appearance-file p {
    margin: 0;
  }
  .appearance-file #appearance-file-status.error {
    color: #ffb4ab;
  }
  .appearance-file input[type='file'] {
    max-width: 100%;
    font-size: 13px;
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
  .banner-crop-control {
    display: grid;
    gap: 8px;
  }
  .crop-label {
    font-size: 13px;
  }
  .banner-crop-preview {
    position: relative;
    width: 100%;
    max-block-size: 10rem;
    aspect-ratio: 16 / 5;
    overflow: hidden;
    border: 1px solid #49505b;
    border-radius: 8px;
    background: #171c24;
    cursor: grab;
    touch-action: pan-x pinch-zoom;
    -webkit-user-select: none;
    user-select: none;
  }
  .banner-crop-preview:global(.dragging) {
    cursor: grabbing;
  }
  .banner-crop-preview img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
  .crop-guides {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(
        to right,
        transparent calc(33.333% - 0.5px),
        rgb(255 255 255 / 58%) 33.333%,
        transparent calc(33.333% + 0.5px),
        transparent calc(66.666% - 0.5px),
        rgb(255 255 255 / 58%) 66.666%,
        transparent calc(66.666% + 0.5px)
      ),
      linear-gradient(
        to bottom,
        transparent calc(33.333% - 0.5px),
        rgb(255 255 255 / 58%) 33.333%,
        transparent calc(33.333% + 0.5px),
        transparent calc(66.666% - 0.5px),
        rgb(255 255 255 / 58%) 66.666%,
        transparent calc(66.666% + 0.5px)
      );
  }
  .range-control {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 4.5rem;
    align-items: center;
    gap: 12px;
  }
  .range-control input {
    width: 100%;
    min-height: 32px;
    accent-color: #accbfa;
  }
  .range-control output {
    color: #9aa0a6;
    font-size: 12px;
    text-align: end;
    font-variant-numeric: tabular-nums;
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
  .order-row > span {
    flex: 1;
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
