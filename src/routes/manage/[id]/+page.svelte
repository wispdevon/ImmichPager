<script lang="ts">
  import { goto, replaceState } from '$app/navigation';
  import { untrack } from 'svelte';
  import { Button, PasswordInput, Textarea } from '@immich/ui';
  import AlbumPicker from '$lib/components/AlbumPicker.svelte';
  import Gallery from '$lib/components/Gallery.svelte';
  import type { EditorPage, GalleryPage, PageInput } from '$lib/contracts';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const initial = untrack(() => data.page);
  let saved = $state<EditorPage | null>(initial);
  let fields = $state<PageInput>({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    description: initial?.description ?? '',
    theme: initial?.theme ?? 'dark',
    background: initial?.background ?? null,
    foreground: initial?.foreground ?? null,
    accent: initial?.accent ?? '#accbfa',
    alignment: initial?.alignment ?? 'left',
    bannerPosition: initial?.bannerPosition ?? 50,
    albumIds: [...(initial?.albumIds ?? [])],
    order: initial?.order ?? 'newest',
    passwordMode: 'keep',
    password: '',
  });
  let busy = $state(false),
    message = $state(''),
    success = $state(''),
    preview = $state(false);
  let slugEdited = $state(!!initial),
    brandingVersion = $state(0);
  let albumPickerOpen = $state(false);
  let settingsDialog = $state<HTMLDialogElement>(null!);
  const selected = $derived(
    fields.albumIds
      .map((id) => data.albums.find((a) => a.id === id))
      .filter((a) => !!a),
  );
  const previewPage = $derived<GalleryPage>({
    ...fields,
    id: saved?.id ?? 'preview',
    title: fields.title || 'Your client page',
    logo: saved?.logo
      ? `/page/media/${saved.id}/branding/logo?preview=1&v=${brandingVersion}`
      : null,
    banner: saved?.banner
      ? `/page/media/${saved.id}/branding/banner?preview=1&v=${brandingVersion}`
      : null,
    albums: selected.map((a) => ({
      id: a.id,
      name: a.albumName,
      count: a.assetCount,
      startDate: a.startDate,
      endDate: a.endDate,
      cover: a.albumThumbnailAssetId ? `/page/api/albums/${a.id}/cover` : null,
      href: null,
      available: true,
    })),
  });
  async function request(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      headers:
        body instanceof FormData
          ? undefined
          : { 'content-type': 'application/json' },
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.message || 'The operation failed');
    return result;
  }
  function select(id: string) {
    fields.albumIds = fields.albumIds.includes(id)
      ? fields.albumIds.filter((x) => x !== id)
      : [...fields.albumIds, id];
  }
  function move(index: number, direction: number) {
    const next = index + direction;
    if (next < 0 || next >= fields.albumIds.length) return;
    const ids = [...fields.albumIds];
    [ids[index], ids[next]] = [ids[next], ids[index]];
    fields.albumIds = ids;
    fields.order = 'manual';
  }
  async function save() {
    const wasNew = !saved;
    saved = await request(
      saved ? `/page/api/pages/${saved.id}` : '/page/api/pages',
      saved ? 'PUT' : 'POST',
      fields,
    );
    fields.passwordMode = 'keep';
    if (wasNew) replaceState(`/page/manage/${saved!.id}`, {});
    return saved!;
  }
  async function perform(
    action: 'save' | 'publish' | 'retry' | 'unpublish' | 'delete',
  ) {
    if (
      action === 'delete' &&
      !confirm('Delete this page and revoke its dedicated album links?')
    )
      return;
    busy = true;
    message = '';
    success = '';
    try {
      if (action === 'save' || action === 'publish') await save();
      if (action === 'delete' && saved) {
        await request(`/page/api/pages/${saved.id}`, 'DELETE');
        await goto('/page/manage');
        return;
      }
      if (action !== 'save' && saved)
        saved = await request(`/page/api/pages/${saved.id}/${action}`, 'POST', {
          password: fields.password,
        });
      success =
        action === 'save'
          ? 'Changes saved.'
          : action === 'publish'
            ? 'Page published. Your client link is ready.'
            : action === 'unpublish'
              ? 'Page unpublished and album links revoked.'
              : 'Synchronization complete.';
      fields.password = '';
    } catch (cause) {
      message = cause instanceof Error ? cause.message : 'The operation failed';
      if (saved) {
        try {
          saved = await request(`/page/api/pages/${saved.id}`, 'GET');
        } catch {
          /* Preserve the last known state. */
        }
      }
    } finally {
      busy = false;
    }
  }
  async function upload(event: Event, kind: 'logo' | 'banner') {
    const input = event.currentTarget as HTMLInputElement,
      file = input.files?.[0];
    if (!file || !saved) return;
    busy = true;
    message = '';
    try {
      const form = new FormData();
      form.set('image', file);
      saved = await request(
        `/page/api/pages/${saved.id}/branding/${kind}`,
        'POST',
        form,
      );
      brandingVersion++;
    } catch (cause) {
      message = cause instanceof Error ? cause.message : 'Upload failed';
    } finally {
      busy = false;
      input.value = '';
    }
  }
  async function removeImage(kind: 'logo' | 'banner') {
    if (!saved) return;
    busy = true;
    message = '';
    try {
      saved = await request(
        `/page/api/pages/${saved.id}/branding/${kind}`,
        'DELETE',
      );
      brandingVersion++;
    } catch (cause) {
      message =
        cause instanceof Error ? cause.message : 'Could not remove image';
    } finally {
      busy = false;
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/page/${saved!.slug}`,
      );
      success = 'Link copied.';
    } catch {
      message = `Your page link: ${location.origin}/page/${saved!.slug}`;
    }
  }
</script>

<svelte:head
  ><title>{saved?.title || 'New page'} · ImmichPager</title></svelte:head
>
{#if preview}
  <div class="preview-toolbar">
    <button onclick={() => (preview = false)}>← Back to editor</button><span
      >Live preview · unsaved changes included</span
    >
  </div>
  <Gallery page={previewPage} preview />
{:else}
  <main class="editor">
    <h1 class="sr-only">{fields.title || 'New client page'}</h1>
    <header class="editor-toolbar">
      <a class="back" href="/page/manage" aria-label="Back to client pages">←</a
      >
      <span class="draft-status"
        >{saved?.status === 'published'
          ? 'Published'
          : saved?.status === 'error'
            ? 'Synchronization needed'
            : 'Draft'}</span
      >
      <div class="actions">
        <Button
          variant="ghost"
          color="secondary"
          onclick={() => settingsDialog.showModal()}>Page settings</Button
        >
        <Button
          variant="ghost"
          color="secondary"
          onclick={() => (preview = true)}>Preview</Button
        >
        <Button
          variant="ghost"
          onclick={() => perform('save')}
          disabled={busy || saved?.status === 'error'}>Save changes</Button
        >
        <Button
          shape="round"
          disabled={busy || saved?.status === 'error'}
          onclick={() => perform('publish')}
          >{busy
            ? 'Working…'
            : saved?.status === 'published'
              ? 'Publish changes'
              : 'Publish page'}</Button
        >
      </div>
    </header>
    {#if message}<div class="notice error" role="alert">{message}</div>{/if}
    {#if success}<div class="notice" role="status">{success}</div>{/if}
    {#if saved?.status === 'error'}<div class="notice">
        <p>
          This page is hidden until its album links are synchronized. Enter its
          current password in Page settings if protected, then retry.
        </p>
        <Button disabled={busy} onclick={() => perform('retry')}
          >Retry synchronization</Button
        >
      </div>{/if}
    <section class="page-heading">
      <Textarea
        variant="ghost"
        class="page-title"
        aria-label="Title"
        placeholder="Add a title"
        maxlength={160}
        bind:value={fields.title}
        oninput={(event) => {
          const title = event.currentTarget.value.replaceAll('\n', ' ');
          event.currentTarget.value = title;
          if (!slugEdited)
            fields.slug = title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .slice(0, 80);
        }}
      />
      <Textarea
        variant="ghost"
        class="page-description"
        aria-label="Description"
        placeholder="Add a description"
        maxlength={2000}
        bind:value={fields.description}
      />
    </section>
    {#if selected.length}
      <section class="selected-albums">
        <div class="bar">
          <h2>
            {selected.length}
            {selected.length === 1 ? 'album' : 'albums'}
          </h2>
          <Button variant="ghost" onclick={() => (albumPickerOpen = true)}
            >＋ Add albums</Button
          >
        </div>
        <div class="selected-grid">
          {#each selected as album (album.id)}
            <article class="selected-album">
              <div class="selected-cover">
                {#if album.albumThumbnailAssetId}<img
                    src={`/page/api/albums/${album.id}/cover`}
                    alt=""
                    width="320"
                    height="320"
                    loading="lazy"
                  />{:else}<span aria-hidden="true">▧</span>{/if}<button
                  class="remove-album"
                  aria-label={`Remove ${album.albumName}`}
                  onclick={() => select(album.id)}>×</button
                >
              </div>
              <h3>{album.albumName}</h3>
              <p class="muted">{album.assetCount} items</p>
            </article>
          {/each}
        </div>
      </section>
    {:else}
      <section class="empty-albums">
        <div>
          <p>ADD ALBUMS</p>
          <button class="add-albums" onclick={() => (albumPickerOpen = true)}
            ><span aria-hidden="true">＋</span><span>Select albums</span
            ></button
          >
        </div>
      </section>
    {/if}
    <AlbumPicker
      albums={data.albums}
      bind:albumIds={fields.albumIds}
      bind:open={albumPickerOpen}
    />
    <dialog
      bind:this={settingsDialog}
      class="settings-dialog"
      aria-labelledby="settings-dialog-title"
    >
      <header class="dialog-heading">
        <h2 id="settings-dialog-title">Page settings</h2>
        <Button
          variant="ghost"
          color="secondary"
          onclick={() => settingsDialog.close()}
          aria-label="Close page settings">×</Button
        >
      </header>
      <div class="settings-content">
        <section>
          <h2>Page link</h2>
          <label
            >Page URL<span class="url-input"
              ><span>/page/</span><input
                aria-label="Page slug"
                bind:value={fields.slug}
                oninput={() => (slugEdited = true)}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxlength="80"
                placeholder="acme"
              /></span
            ></label
          >
        </section>
        <section>
          <h2>Header & theme</h2>
          <div class="two">
            <label
              >Appearance<select bind:value={fields.theme}
                ><option value="dark">Dark</option><option value="light"
                  >Light</option
                ><option value="system">System</option></select
              ></label
            ><label
              >Header alignment<select bind:value={fields.alignment}
                ><option value="left">Left</option><option value="center"
                  >Centered</option
                ></select
              ></label
            >
          </div>
          <div class="colors">
            <label
              >Accent<input type="color" bind:value={fields.accent} /></label
            ><label
              >Background<input
                type="color"
                value={fields.background ||
                  (fields.theme === 'light' ? '#ffffff' : '#000000')}
                oninput={(e) => (fields.background = e.currentTarget.value)}
              /></label
            ><label
              >Text<input
                type="color"
                value={fields.foreground ||
                  (fields.theme === 'light' ? '#191919' : '#f5f5f5')}
                oninput={(e) => (fields.foreground = e.currentTarget.value)}
              /></label
            >
          </div>
          <button
            class="text-button"
            onclick={() => {
              fields.background = null;
              fields.foreground = null;
            }}>Reset theme colors</button
          >
          <div class="two">
            {#each ['logo', 'banner'] as imageKind}{@const kind = imageKind as
                | 'logo'
                | 'banner'}
              <div class="upload">
                <label
                  >{kind === 'logo' ? 'Logo' : 'Banner'}<input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={!saved || busy}
                    onchange={(e) => upload(e, kind)}
                  /></label
                >{#if saved?.[kind]}<button
                    type="button"
                    class="text-button"
                    onclick={() => removeImage(kind)}>Remove {kind}</button
                  >{/if}
              </div>{/each}
          </div>
          <small class="muted"
            >{saved
              ? 'JPEG, PNG, or WebP · up to 5 MB'
              : 'Save your page to upload branding images.'}</small
          >
          {#if saved?.banner}<label
              >Banner crop position<input
                type="range"
                min="0"
                max="100"
                bind:value={fields.bannerPosition}
              /></label
            >{/if}
        </section>
        <section>
          <h2>Sharing</h2>
          <label
            >Password protection<select bind:value={fields.passwordMode}
              ><option value="keep"
                >{saved?.hasPassword
                  ? 'Keep current password'
                  : 'No password'}</option
              ><option value="set">Set a password</option
              >{#if saved?.hasPassword}<option value="remove"
                  >Remove password</option
                >{/if}</select
            ></label
          >
          {#if fields.passwordMode === 'set' || (saved?.hasPassword && fields.passwordMode === 'keep')}<label
              >{fields.passwordMode === 'set'
                ? 'New password or PIN'
                : 'Current password (for synchronization)'}<PasswordInput
                bind:value={fields.password}
                autocomplete="new-password"
                placeholder="At least 4 characters"
              /></label
            >{/if}
          <p class="hint muted">
            The same password protects this page and its dedicated Immich album
            links. Immich may ask for it again when an album opens.
          </p>
          {#if saved?.status === 'published'}<div class="actions">
              <button onclick={copyLink}>Copy client link</button><a
                href={`/page/${saved.slug}`}
                target="_blank"
                rel="noreferrer">Open page ↗</a
              >
            </div>{/if}
          {#if saved}<div class="danger-zone">
              {#if saved.status === 'published'}<button
                  disabled={busy}
                  onclick={() => perform('unpublish')}>Unpublish</button
                >{/if}<button
                class="delete"
                disabled={busy}
                onclick={() => perform('delete')}>Delete page</button
              >
            </div>{/if}
        </section>

        <section>
          <label
            >Album order<select bind:value={fields.order}
              ><option value="newest">Newest first</option><option
                value="manual">Manual within year</option
              ></select
            ></label
          >
          {#if fields.order === 'manual' && selected.length}<div
              class="ordering"
            >
              <h3>Selected album order</h3>
              <p class="hint muted">
                Albums stay grouped by year. Move them to set their order within
                each year.
              </p>
              {#each selected as album, index (album.id)}<div class="order-row">
                  <span>{album.albumName}</span><button
                    aria-label={`Move ${album.albumName} up`}
                    disabled={index === 0}
                    onclick={() => move(index, -1)}>↑</button
                  ><button
                    aria-label={`Move ${album.albumName} down`}
                    disabled={index === selected.length - 1}
                    onclick={() => move(index, 1)}>↓</button
                  >
                </div>{/each}
            </div>{/if}
        </section>
      </div>
      <footer class="dialog-footer">
        <Button shape="round" onclick={() => settingsDialog.close()}
          >Done</Button
        >
      </footer>
    </dialog>
  </main>
{/if}

<style>
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .colors {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  input[type='color'] {
    height: 40px;
    padding: 4px;
    cursor: pointer;
  }
  .url-input {
    display: flex;
    align-items: center;
    border: 1px solid #555;
    border-radius: 8px;
  }
  .url-input > span {
    padding-left: 12px;
    opacity: 0.5;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .url-input input {
    border: 0;
    padding-left: 3px;
    min-width: 0;
  }
  .text-button {
    padding: 2px 0;
    border: 0;
    font-size: 12px;
    text-decoration: underline;
    opacity: 0.65;
  }
  .upload input {
    font-size: 11px;
    padding: 10px 6px;
  }
  .hint {
    font-size: 12px;
    line-height: 1.7;
  }
  .danger-zone {
    margin-top: 24px;
    display: flex;
    gap: 12px;
  }
  .delete {
    color: #ffb4ab;
  }
  .ordering {
    border-top: 1px solid #333;
    margin-top: 32px;
    padding-top: 20px;
  }
  .order-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 12px;
    font-size: 13px;
  }
  .order-row span {
    flex: 1;
  }
  .order-row button {
    padding: 6px 12px;
  }
  .preview-toolbar {
    padding: 14px 24px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    background: #161616;
    font-size: 12px;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .editor {
    padding: 0 40px 56px;
    max-width: 1800px;
    margin: auto;
    min-height: 100dvh;
  }
  .editor-toolbar {
    min-height: 76px;
    display: flex;
    align-items: center;
    gap: 20px;
    border-bottom: 1px solid #292a2d;
  }
  .editor-toolbar .actions {
    margin-left: auto;
    gap: 8px;
  }
  .back {
    font-size: 28px;
    text-decoration: none;
  }
  .draft-status {
    color: #9aa0a6;
    font-size: 14px;
  }
  .page-heading {
    padding-top: 84px;
    max-width: 1300px;
  }
  .page-heading :global(.page-title) {
    border: 0;
    border-radius: 0;
    padding: 0 0 8px;
    background: transparent;
    font-size: 60px;
    line-height: 1.2;
    font-weight: 410;
    color: var(--pager-primary);
  }
  .page-heading :global(.page-title::placeholder) {
    color: #53647c;
    opacity: 1;
  }
  .page-heading :global(.page-description) {
    border: 0;
    border-radius: 0;
    padding: 12px 0 8px;
    background: transparent;
    font-size: 16px;
    line-height: 1.5;
    font-weight: 410;
  }
  .page-heading :global(.page-description::placeholder) {
    color: #777;
    opacity: 1;
  }
  .page-heading :global(textarea:focus-visible) {
    outline: none;
    box-shadow: 0 2px var(--pager-primary);
  }
  .empty-albums {
    margin-top: 200px;
    display: flex;
    justify-content: center;
  }
  .empty-albums > div {
    width: 300px;
  }
  .empty-albums p {
    font-size: 12px;
    margin: 0 0 20px;
  }
  .add-albums {
    display: flex;
    align-items: center;
    gap: 24px;
    width: 100%;
    border: 0;
    border-radius: 16px;
    padding: 32px;
    background: var(--pager-surface);
    font-size: 18px;
    text-align: left;
  }
  .add-albums > span:first-child {
    color: var(--pager-primary);
    font-size: 24px;
  }
  .add-albums:hover {
    background: #25272c;
    color: var(--pager-primary);
  }
  .selected-albums {
    margin-top: 64px;
  }
  .selected-albums h2 {
    font-size: 18px;
  }
  .selected-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 36px;
  }
  .selected-cover {
    aspect-ratio: 1;
    position: relative;
    background: var(--pager-surface);
    border-radius: 16px;
    overflow: hidden;
    display: grid;
    place-items: center;
  }
  .selected-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .remove-album {
    position: absolute;
    right: 10px;
    top: 10px;
    border: 0;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    padding: 0;
    background: #000a;
    font-size: 24px;
  }
  .selected-album h3 {
    font-size: 18px;
    margin-top: 16px;
    overflow-wrap: anywhere;
  }
  .selected-album p {
    font-size: 14px;
    margin-top: 4px;
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
  .settings-dialog {
    width: min(640px, calc(100% - 40px));
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
  .settings-content section {
    border-top: 1px solid #303030;
    padding-block: 24px;
  }
  .settings-content h2 {
    font-size: 18px;
  }
  .settings-content label {
    font-size: 14px;
  }
  @media (max-width: 700px) {
    .editor {
      padding: 0 20px 32px;
    }
    .editor-toolbar {
      flex-wrap: wrap;
      padding-block: 12px;
      gap: 12px;
    }
    .editor-toolbar .actions {
      width: 100%;
      gap: 4px;
      justify-content: space-between;
    }
    .editor-toolbar :global(button) {
      font-size: 12px;
      padding-inline: 8px;
    }
    .page-heading {
      padding-top: 40px;
    }
    .page-heading :global(.page-title) {
      font-size: 36px;
    }
    .empty-albums {
      margin-top: 120px;
    }
    dialog {
      padding: 16px;
      width: calc(100% - 24px);
      max-height: calc(100dvh - 24px);
    }
    .selected-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px 16px;
    }
    .selected-album h3 {
      font-size: 16px;
    }
    .preview-toolbar {
      flex-wrap: wrap;
    }
  }
</style>
