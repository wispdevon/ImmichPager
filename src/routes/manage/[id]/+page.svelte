<script lang="ts">
  import { goto, replaceState } from '$app/navigation';
  import { untrack } from 'svelte';
  import { PasswordInput } from '@immich/ui';
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
    accent: initial?.accent ?? '#a3bfff',
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
    search = $state(''),
    preview = $state(false);
  let slugEdited = $state(!!initial),
    brandingVersion = $state(0);
  const visible = $derived(
    data.albums.filter((a) =>
      a.albumName.toLowerCase().includes(search.toLowerCase()),
    ),
  );
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
  <main class="editor shell">
    <a class="back" href="/page/manage">← Client pages</a>
    <div class="bar">
      <div>
        <h1>{saved ? saved.title : 'Create a client page'}</h1>
        <p class="muted">
          {saved?.status === 'published'
            ? 'Published'
            : saved?.status === 'error'
              ? 'Synchronization needed'
              : 'Draft'} · {fields.albumIds.length} albums
        </p>
      </div>
      <div class="actions">
        <button onclick={() => (preview = true)}>Preview</button><button
          disabled={busy || saved?.status === 'error'}
          onclick={() => perform('save')}>Save changes</button
        ><button
          class="primary"
          disabled={busy || saved?.status === 'error'}
          onclick={() => perform('publish')}
          >{busy
            ? 'Working…'
            : saved?.status === 'published'
              ? 'Publish changes'
              : 'Publish page'}</button
        >
      </div>
    </div>
    {#if message}<div class="notice error" role="alert">
        {message}
      </div>{/if}{#if success}<div class="notice" role="status">
        {success}
      </div>{/if}
    {#if saved?.status === 'error'}<div class="notice">
        <p>
          This page is hidden until its album links are synchronized. Enter its
          current password below if protected, then retry.
        </p>
        <button class="primary" disabled={busy} onclick={() => perform('retry')}
          >Retry synchronization</button
        >
      </div>{/if}
    <div class="editor-layout">
      <div class="settings">
        <section>
          <h2>Page details</h2>
          <label
            >Title<input
              maxlength="160"
              bind:value={fields.title}
              oninput={() => {
                if (!slugEdited)
                  fields.slug = fields.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '')
                    .slice(0, 80);
              }}
              placeholder="Acme · Photography"
            /></label
          >
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
          <label
            >Description<textarea
              rows="3"
              maxlength="2000"
              bind:value={fields.description}
              placeholder="A collection of our work together."
            ></textarea></label
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
      </div>
      <section class="album-picker">
        <div class="bar">
          <div>
            <h2>Albums</h2>
            <p class="muted">Choose the work this client should see.</p>
          </div>
          <label class="order-label"
            >Order<select bind:value={fields.order}
              ><option value="newest">Newest first</option><option
                value="manual">Manual within year</option
              ></select
            ></label
          >
        </div>
        <label
          ><span class="sr-only">Search your albums</span><input
            type="search"
            placeholder="Search your albums"
            bind:value={search}
          /></label
        >
        <div class="picker-grid">
          {#each visible as album (album.id)}<label
              class="pick"
              class:selected={fields.albumIds.includes(album.id)}
              ><div class="pick-cover">
                {#if album.albumThumbnailAssetId}<img
                    src={`/page/api/albums/${album.id}/cover`}
                    alt=""
                    width="240"
                    height="240"
                    loading="lazy"
                  />{:else}<span aria-hidden="true">▧</span>{/if}<input
                  type="checkbox"
                  checked={fields.albumIds.includes(album.id)}
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
                : 'No owned albums yet. Create an album in Immich first.'}
            </p>{/each}
        </div>
        {#if fields.order === 'manual' && selected.length}<div class="ordering">
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
  </main>
{/if}

<style>
  .editor {
    max-width: 1440px;
  }
  .back {
    display: inline-block;
    font-size: 13px;
    opacity: 0.65;
    margin-bottom: 24px;
    text-decoration: none;
  }
  .bar h1 {
    margin: 0;
  }
  .bar p {
    margin-top: 8px;
    font-size: 13px;
  }
  .editor-layout {
    display: grid;
    grid-template-columns: 350px minmax(0, 1fr);
    gap: 56px;
  }
  section {
    border-top: 1px solid #303030;
    padding-block: 24px;
  }
  section h2 {
    margin: 0;
    font-size: 18px;
  }
  label {
    font-size: 13px;
  }
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
  .album-picker .bar {
    margin-bottom: 8px;
  }
  .order-label {
    margin: 0;
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
    accent-color: #a3bfff;
  }
  .selected .pick-cover {
    border-color: #a3bfff;
  }
  .pick strong {
    font-size: 14px;
    font-weight: 550;
    overflow-wrap: anywhere;
  }
  .pick small {
    font-size: 12px;
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
  @media (max-width: 900px) {
    .editor-layout {
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .settings {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 24px;
    }
    .preview-toolbar {
      flex-wrap: wrap;
    }
  }
</style>
