<script lang="ts">
  import { goto, replaceState, beforeNavigate } from '$app/navigation';
  import { untrack, onMount } from 'svelte';
  import { Button, Textarea } from '@immich/ui';
  import Gallery from '$lib/components/Gallery.svelte';
  import AlbumPicker from '$lib/components/AlbumPicker.svelte';
  import BrandingSlot from '$lib/components/BrandingSlot.svelte';
  import PhotoPicker from '$lib/components/PhotoPicker.svelte';
  import PageOptions from '$lib/components/PageOptions.svelte';
  import PublicationReview from '$lib/components/PublicationReview.svelte';
  import CopyLink from '$lib/components/CopyLink.svelte';
  import { readApiResponse } from '$lib/api-response';
  import type { DraftEditorPage, GalleryPage, PageInput } from '$lib/contracts';
  import type { PublicationSummary } from '$lib/publication-summary';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const initial = untrack(() => data.page);
  let saved = $state<DraftEditorPage | null>(initial);
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
    headerLayout: initial?.headerLayout ?? 'below',
    customCss: initial?.customCss ?? '',
    albumIds: [...(initial?.albumIds ?? [])],
    order: initial?.order ?? 'newest',
    passwordMode: 'keep',
    password: '',
  });
  let busy = $state(false),
    saving = $state(false),
    message = $state(''),
    success = $state(''),
    preview = $state(false),
    optionsOpen = $state(false),
    albumsOpen = $state(false),
    photoKind = $state<'logo' | 'banner' | null>(null),
    brandingVersion = $state(0),
    publicationReview = $state<PublicationSummary | null>(null),
    slugLocked = $state(!!initial?.slug),
    conflict = $state(false),
    failedSnapshot = $state<string | null>(null);
  function snapshot() {
    const { password: _password, passwordMode: _mode, ...values } = fields;
    void _password;
    void _mode;
    return JSON.stringify(values);
  }
  let acknowledged = $state(untrack(() => snapshot()));
  const dirty = $derived(snapshot() !== acknowledged);
  const selected = $derived(
    fields.albumIds
      .map((id) => data.albums.find((a) => a.id === id))
      .filter((a) => !!a),
  );
  const logo = $derived(
    saved?.logo
      ? `/page/media/${saved.id}/branding/logo?preview=1&v=${brandingVersion}`
      : null,
  );
  const banner = $derived(
    saved?.banner
      ? `/page/media/${saved.id}/branding/banner?preview=1&v=${brandingVersion}`
      : null,
  );
  const previewPage = $derived<GalleryPage>({
    ...fields,
    id: saved?.id ?? 'preview',
    title: fields.title || 'Your client page',
    logo,
    banner,
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
  let queue: Promise<unknown> = Promise.resolve();
  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = queue.catch(() => {}).then(work);
    queue = next;
    return next;
  }
  async function api<T = DraftEditorPage>(
    url: string,
    method: string,
    body?: unknown,
  ) {
    const response = await fetch(url, {
      method,
      headers:
        body instanceof FormData
          ? undefined
          : { 'content-type': 'application/json', accept: 'application/json' },
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
    try {
      return await readApiResponse<T>(response);
    } catch (cause) {
      if (
        response.status === 409 &&
        cause instanceof Error &&
        cause.message.includes('another tab')
      )
        conflict = true;
      throw cause;
    }
  }
  async function flush(force = false) {
    return enqueue(async () => {
      const json = snapshot();
      if (json === acknowledged && (saved || !force)) return saved;
      if (conflict)
        throw Error(
          'This draft changed in another tab. Copy your edits before reloading.',
        );
      const wasNew = !saved;
      saving = true;
      message = '';
      try {
        saved = await api<DraftEditorPage>(
          saved ? `/page/api/pages/${saved.id}` : '/page/api/pages',
          saved ? 'PUT' : 'POST',
          { ...JSON.parse(json), expectedDraftRevision: saved?.draftRevision },
        );
        acknowledged = json;
        failedSnapshot = null;
        if (saved.slug) slugLocked = true;
        if (wasNew) replaceState(`/page/manage/${saved.id}`, {});
        return saved;
      } catch (cause) {
        failedSnapshot = json;
        message =
          cause instanceof Error ? cause.message : 'Could not save draft';
        throw cause;
      } finally {
        saving = false;
      }
    });
  }
  $effect(() => {
    const json = snapshot();
    if (json === acknowledged || json === failedSnapshot || busy || conflict)
      return;
    const timer = setTimeout(() => void flush().catch(() => {}), 650);
    return () => clearTimeout(timer);
  });
  beforeNavigate(({ cancel }) => {
    if (
      (dirty || saving) &&
      !busy &&
      !confirm('Some edits have not been saved. Leave this page?')
    )
      cancel();
  });
  onMount(() => {
    if (new URL(location.href).searchParams.get('options') === '1')
      optionsOpen = true;
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || saving) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  });
  async function back() {
    try {
      await flush();
      await goto('/page/manage');
    } catch {
      /* Keep unsaved edits visible. */
    }
  }
  function select(id: string) {
    fields.albumIds = fields.albumIds.includes(id)
      ? fields.albumIds.filter((x) => x !== id)
      : [...fields.albumIds, id];
  }
  async function reviewPublication() {
    if (busy) return;
    busy = true;
    message = '';
    success = '';
    publicationReview = null;
    optionsOpen = false;
    albumsOpen = false;
    photoKind = null;
    try {
      await flush(true);
      if (!saved) throw Error('Save the draft before publishing');
      publicationReview = await api<PublicationSummary>(
        `/page/api/pages/${saved.id}/publication-review?expectedDraftRevision=${saved.draftRevision}`,
        'GET',
      );
    } catch (cause) {
      message =
        cause instanceof Error
          ? cause.message
          : 'Could not prepare the publication review';
    } finally {
      if (!publicationReview) busy = false;
    }
  }
  async function publishReviewed() {
    const review = publicationReview;
    if (!review || !saved) return;
    const id = saved.id;
    publicationReview = null;
    message = '';
    success = '';
    try {
      saved = await enqueue(() =>
        api<DraftEditorPage>(`/page/api/pages/${id}/publish`, 'POST', {
          password: fields.password,
          passwordMode: fields.passwordMode,
          expectedDraftRevision: review.draftRevision,
          expectedPublishedRevision: review.expectedPublishedRevision,
        }),
      );
      fields.password = '';
      fields.passwordMode = 'keep';
      success = 'Page published. Your client link is ready.';
    } catch (cause) {
      message =
        cause instanceof Error
          ? cause.message
          : 'Could not complete this operation';
      if (saved) {
        try {
          saved = await api(`/page/api/pages/${saved.id}`, 'GET');
        } catch {
          /* Preserve the last known draft. */
        }
      }
      if (message.toLowerCase().includes('password')) optionsOpen = true;
    } finally {
      busy = false;
    }
  }
  function cancelPublicationReview() {
    publicationReview = null;
    busy = false;
  }
  async function perform(action: 'publish' | 'retry' | 'unpublish' | 'delete') {
    if (action === 'publish') {
      await reviewPublication();
      return;
    }
    if (
      action === 'delete' &&
      !confirm('Delete this page and revoke its dedicated album links?')
    )
      return;
    if (
      action === 'unpublish' &&
      !confirm('Unpublish this page and revoke its album links?')
    )
      return;
    busy = true;
    message = '';
    success = '';
    try {
      await queue.catch(() => {});
      if (!saved) return;
      const result = await enqueue(() =>
        api<DraftEditorPage | { deleted: true }>(
          `/page/api/pages/${saved!.id}${action === 'delete' ? '' : `/${action}`}`,
          action === 'delete' ? 'DELETE' : 'POST',
          {
            password: fields.password,
            passwordMode: fields.passwordMode,
            expectedDraftRevision: saved!.draftRevision,
          },
        ),
      );
      if ('deleted' in result) {
        await goto('/page/manage');
        return;
      }
      saved = result;
      if (action === 'retry') {
        fields.password = '';
        fields.passwordMode = 'keep';
      }
      success =
        action === 'unpublish'
          ? 'Page unpublished and album links revoked.'
          : 'Synchronization complete.';
    } catch (cause) {
      message =
        cause instanceof Error
          ? cause.message
          : 'Could not complete this operation';
      if (saved) {
        try {
          saved = await api(`/page/api/pages/${saved.id}`, 'GET');
        } catch {
          /* Preserve the last known draft. */
        }
      }
      if (message.toLowerCase().includes('password')) optionsOpen = true;
    } finally {
      busy = false;
    }
  }
  async function branding(
    kind: 'logo' | 'banner',
    source: File | string | null,
  ) {
    if (source instanceof File && source.size > 5 * 1024 * 1024) {
      message = 'Choose a branding image that is 5 MB or smaller.';
      throw Error(message);
    }
    busy = true;
    message = '';
    success = '';
    try {
      await flush(true);
      await enqueue(async () => {
        let body: unknown = { expectedDraftRevision: saved!.draftRevision };
        if (source instanceof File) {
          const form = new FormData();
          form.set('image', source);
          form.set('expectedDraftRevision', String(saved!.draftRevision));
          body = form;
        } else if (source)
          body = {
            assetId: source,
            expectedDraftRevision: saved!.draftRevision,
          };
        saved = await api(
          `/page/api/pages/${saved!.id}/branding/${kind}`,
          source === null ? 'DELETE' : 'POST',
          body,
        );
        brandingVersion++;
      });
    } catch (cause) {
      message =
        cause instanceof Error ? cause.message : 'Could not update branding';
      throw cause;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>{fields.title || 'New page'} · ImmichPager</title></svelte:head
>
{#if preview}<div class="preview-toolbar">
    <Button variant="ghost" onclick={() => (preview = false)}
      >← Back to editor</Button
    ><span>Private preview · includes your draft changes</span>
  </div>
  <Gallery page={previewPage} preview />
{:else}
  <main class="editor">
    <h1 class="sr-only">{fields.title || 'New client page'}</h1>
    <header class="editor-toolbar">
      <Button
        variant="ghost"
        color="secondary"
        aria-label="Back to client pages"
        onclick={back}>←</Button
      >
      <div class="draft-status">
        <span
          >{saved?.status === 'error'
            ? 'Needs attention'
            : saved?.publishedSlug
              ? 'Live'
              : 'Draft'}{#if saved?.publishedSlug && (dirty || saved.hasUnpublishedChanges)}
            · Draft changes{/if}</span
        ><small aria-live="polite" data-testid="save-state"
          >{saving
            ? 'Saving…'
            : failedSnapshot
              ? 'Couldn’t save'
              : dirty
                ? 'Unsaved changes'
                : 'All changes saved'}</small
        >
      </div>
      <div class="actions">
        {#if failedSnapshot && !conflict}<Button
            variant="ghost"
            onclick={() => {
              failedSnapshot = null;
              void flush().catch(() => {});
            }}>Retry save</Button
          >{/if}<CopyLink slug={saved?.publishedSlug ?? null} /><Button
          variant="ghost"
          color="secondary"
          onclick={() => (optionsOpen = true)}>Options</Button
        ><Button
          variant="ghost"
          color="secondary"
          onclick={() => (preview = true)}>Preview</Button
        ><Button
          shape="round"
          disabled={busy || conflict || saved?.status === 'error'}
          onclick={() => perform('publish')}
          >{busy
            ? 'Working…'
            : saved?.publishedSlug
              ? 'Update live page'
              : 'Publish page'}</Button
        >
      </div>
    </header>
    {#if message && !optionsOpen && !photoKind}<div
        class="notice error"
        role="alert"
      >
        {message}
      </div>{/if}
    {#if success}<div class="notice" role="status">{success}</div>{/if}
    {#if saved?.status === 'error'}<div class="notice">
        <p>
          This page is hidden while its album links need synchronization. Open
          Options to enter its password if protected.
        </p>
        <Button disabled={busy} onclick={() => perform('retry')}
          >Retry synchronization</Button
        >
      </div>{/if}
    <div class="branding-grid">
      <BrandingSlot
        kind="logo"
        image={logo}
        {busy}
        onchoose={() => (photoKind = 'logo')}
        onfile={(file) => void branding('logo', file).catch(() => {})}
        onremove={() => void branding('logo', null).catch(() => {})}
      /><BrandingSlot
        kind="banner"
        image={banner}
        {busy}
        onchoose={() => (photoKind = 'banner')}
        onfile={(file) => void branding('banner', file).catch(() => {})}
        onremove={() => void branding('banner', null).catch(() => {})}
      />
    </div>
    <section class="page-heading">
      <Textarea
        variant="ghost"
        class="page-title"
        aria-label="Title"
        placeholder="Add a title"
        maxlength={160}
        disabled={busy}
        bind:value={fields.title}
        oninput={(event) => {
          const title = event.currentTarget.value.replaceAll('\n', ' ');
          event.currentTarget.value = title;
          if (!slugLocked)
            fields.slug = title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .slice(0, 80);
        }}
      /><Textarea
        variant="ghost"
        class="page-description"
        aria-label="Description"
        placeholder="Add a description"
        maxlength={2000}
        disabled={busy}
        bind:value={fields.description}
      />
    </section>
    {#if selected.length}<section class="selected-albums">
        <div class="bar">
          <h2>
            {selected.length}
            {selected.length === 1 ? 'album' : 'albums'}
          </h2>
          <Button
            variant="ghost"
            disabled={busy}
            onclick={() => (albumsOpen = true)}>＋ Add albums</Button
          >
        </div>
        <div class="selected-grid">
          {#each selected as album (album.id)}<article class="selected-album">
              <div class="selected-cover">
                {#if album.albumThumbnailAssetId}<img
                    src={`/page/api/albums/${album.id}/cover`}
                    alt=""
                    width="320"
                    height="320"
                    loading="lazy"
                  />{:else}<span aria-hidden="true">▧</span>{/if}<button
                  class="remove-album"
                  disabled={busy}
                  aria-label={`Remove ${album.albumName}`}
                  onclick={() => select(album.id)}>×</button
                >
              </div>
              <h3>{album.albumName}</h3>
              <p class="muted">{album.assetCount} items</p>
            </article>{/each}
        </div>
      </section>
    {:else}<section class="empty-albums">
        <div>
          <p>ADD ALBUMS</p>
          <button
            class="add-albums"
            disabled={busy}
            onclick={() => (albumsOpen = true)}
            ><span aria-hidden="true">＋</span><span>Select albums</span
            ></button
          >
        </div>
      </section>{/if}
    <AlbumPicker
      albums={data.albums}
      bind:albumIds={fields.albumIds}
      bind:open={albumsOpen}
    />
    {#if optionsOpen}<PageOptions
        bind:fields
        {saved}
        albums={data.albums}
        {message}
        {busy}
        {saving}
        onClose={() => (optionsOpen = false)}
        onSlugEdit={() => (slugLocked = true)}
        onpublish={() => {
          optionsOpen = false;
          void perform('publish');
        }}
        onaction={(action) => {
          optionsOpen = false;
          void perform(action);
        }}
      />{/if}
    {#if photoKind}<PhotoPicker
        kind={photoKind}
        albums={data.albums}
        onClose={() => (photoKind = null)}
        onchoose={(id) => branding(photoKind!, id)}
      />{/if}
    {#if publicationReview}<PublicationReview
        review={publicationReview}
        albums={data.albums}
        onClose={cancelPublicationReview}
        onConfirm={publishReviewed}
      />{/if}
  </main>
{/if}

<style>
  .editor {
    padding: 0 40px 56px;
    max-width: 1800px;
    margin: auto;
    min-height: 100dvh;
  }
  .editor-toolbar {
    min-height: 80px;
    display: flex;
    align-items: center;
    gap: 14px;
    border-bottom: 1px solid #292a2d;
  }
  .editor-toolbar .actions {
    margin-left: auto;
    gap: 6px;
  }
  .draft-status {
    color: #9aa0a6;
    font-size: 13px;
    display: grid;
    gap: 4px;
    white-space: nowrap;
  }
  .draft-status small {
    font-size: 11px;
    color: #78818d;
  }
  .branding-grid {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 28px;
    margin-top: 40px;
  }
  .page-heading {
    padding-top: 40px;
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
    color: #accbfa;
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
    box-shadow: 0 2px #accbfa;
  }
  .empty-albums {
    margin-top: 80px;
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
    background: #101114;
    font-size: 18px;
    text-align: left;
  }
  .add-albums > span:first-child {
    color: #accbfa;
    font-size: 24px;
  }
  .add-albums:hover {
    background: #25272c;
    color: #accbfa;
  }
  .selected-albums {
    margin-top: 48px;
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
    background: #101114;
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
  .preview-toolbar {
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: #101114;
    position: sticky;
    top: 0;
    z-index: 2;
    font-size: 13px;
  }
  @media (max-width: 900px) {
    .editor-toolbar {
      flex-wrap: wrap;
      padding-block: 12px;
    }
    .editor-toolbar .actions {
      width: 100%;
      flex-wrap: wrap;
    }
    .branding-grid {
      grid-template-columns: 240px minmax(0, 1fr);
      gap: 16px;
    }
  }
  @media (max-width: 600px) {
    .editor {
      padding: 0 20px 32px;
    }
    .branding-grid {
      grid-template-columns: 1fr;
      margin-top: 24px;
    }
    .page-heading {
      padding-top: 28px;
    }
    .page-heading :global(.page-title) {
      font-size: 36px;
    }
    .editor-toolbar :global(button) {
      font-size: 12px;
      padding-inline: 10px;
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
