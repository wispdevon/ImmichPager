<script lang="ts">
  import { goto, replaceState, beforeNavigate } from '$app/navigation';
  import { untrack, onMount, tick } from 'svelte';
  import { Button, ConfirmModal, Icon, Toast } from '@immich/ui';
  import {
    mdiTextBoxEditOutline,
    mdiPaletteOutline,
    mdiShareVariantOutline,
    mdiClose,
    mdiMenu,
    mdiMonitor,
    mdiTablet,
    mdiCellphone,
  } from '@mdi/js';
  import BrandingSlot from '$lib/components/BrandingSlot.svelte';
  import PhotoPicker from '$lib/components/PhotoPicker.svelte';
  import PageOptions from '$lib/components/PageOptions.svelte';
  import BlockInspector from '$lib/components/BlockInspector.svelte';
  import { blockSchema, pageBlocks, type PageBlock } from '$lib/blocks';
  import CustomizePanel from '$lib/components/CustomizePanel.svelte';
  import ThemePreviewPrompt from '$lib/components/ThemePreviewPrompt.svelte';
  import { manualToast } from '$lib/actions/manual-toast';
  import type { ThemePreviewActions } from '$lib/theme-preview';
  import PublicationReview from '$lib/components/PublicationReview.svelte';
  import CopyLink from '$lib/components/CopyLink.svelte';
  import { resetCustomization } from '$lib/customization';
  import { readApiResponse } from '$lib/api-response';
  import {
    DEFAULT_GALLERY_STYLE,
    NEW_PAGE_CLIENT_UI,
    type DraftEditorPage,
    type GalleryPage,
    type PageInput,
  } from '$lib/contracts';
  import {
    composerChangeSchema,
    canvasReadySchema,
    inlinePreviewSyncSchema,
  } from '$lib/inline-preview';
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
    pageTheme: initial?.pageTheme ?? null,
    background: initial?.background ?? null,
    foreground: initial?.foreground ?? null,
    accent: initial?.accent ?? '#accbfa',
    alignment: initial?.alignment ?? 'left',
    bannerPosition: initial?.bannerPosition ?? 50,
    headerLayout: initial?.headerLayout ?? 'below',
    headerSize: initial?.headerSize ?? 'standard',
    bannerHeight: initial?.bannerHeight ?? null,
    blocks: pageBlocks(initial ?? { albumIds: [] }),
    logoSize: initial?.logoSize ?? 80,
    titleSize: initial?.titleSize ?? 3,
    descriptionSize: initial?.descriptionSize ?? 1.125,
    headerSpacing: initial?.headerSpacing ?? 2.5,
    clientUi: initial?.clientUi ?? NEW_PAGE_CLIENT_UI,
    galleryStyle: initial?.galleryStyle ?? DEFAULT_GALLERY_STYLE,
    customCss: initial?.customCss ?? '',
    albumIds: [...(initial?.albumIds ?? [])],
    order: initial?.order ?? 'newest',
    allowDownload: initial?.allowDownload ?? true,
    passwordMode: 'keep',
    password: '',
  });
  let editorReady = $state(false);
  let busy = $state(false),
    saving = $state(false),
    message = $state(''),
    success = $state(''),
    inspectorTab = $state<'Content' | 'Design'>('Content'),
    inspectorOpen = $state(false),
    sharingOpen = $state(false),
    selectedBlockId = $state(initial?.blocks?.[0]?.id ?? 'legacy-albums'),
    previewSize = $state<'desktop' | 'tablet' | 'phone'>('desktop'),
    photoKind = $state<'logo' | 'banner' | null>(null),
    brandingVersion = $state(0),
    publicationReview = $state<PublicationSummary | null>(null),
    slugLocked = $state(!!initial?.slug),
    conflict = $state(false),
    failedSnapshot = $state<string | null>(null);
  let currentPassword = $state('');
  let reviewSubmitting = $state(false);
  let retryReview = $state(false);
  let pendingAction = $state<'unpublish' | 'delete' | null>(null);
  let customizeSyncSequence = $state(0);
  const blockAlbumIds = $derived([
    ...new Set(
      (fields.blocks ?? []).flatMap((b) =>
        b.type === 'albums' ? b.albumIds : [],
      ),
    ),
  ]);
  let narrow = $state(false);
  let canvasSequence = $state(0);
  function insertBlock(index: number, type: PageBlock['type']) {
    if ((fields.blocks?.length ?? 0) >= 100) return;
    const block = blockSchema.parse({
      id: crypto.randomUUID(),
      type,
      ...(fields.pageTheme ? { presentationSource: 'theme' } : {}),
    });
    const next = [...(fields.blocks ?? [])];
    next.splice(index, 0, block);
    fields.blocks = next;
    selectedBlockId = block.id;
    inspectorTab = 'Content';
    inspectorOpen = true;
  }
  function snapshot() {
    const { password: _password, passwordMode: _mode, ...values } = fields;
    void _password;
    void _mode;
    return JSON.stringify({ ...values, albumIds: blockAlbumIds });
  }
  let acknowledged = $state(untrack(() => snapshot()));
  const dirty = $derived(snapshot() !== acknowledged);
  const canPublish = $derived(
    !saved?.publishedSlug ||
      dirty ||
      !!saved?.hasUnpublishedChanges ||
      fields.passwordMode !== 'keep',
  );
  const saveStatus = $derived(
    failedSnapshot
      ? 'Couldn’t save draft'
      : dirty
        ? 'Unsaved changes'
        : fields.passwordMode !== 'keep'
          ? 'Draft saved · password action pending'
          : 'All changes saved',
  );
  const selected = $derived(
    blockAlbumIds
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
  let themeAudition = $state<PageInput | null>(null);
  let themePreviewActions = $state<ThemePreviewActions | null>(null);
  $effect(() => {
    if (success) {
      const timer = setTimeout(() => (success = ''), 5000);
      return () => clearTimeout(timer);
    }
  });
  let themeUndo = $state<PageInput | null>(null);
  let systemColorMode = $state<'light' | 'dark'>('dark');
  const previewPage = $derived<GalleryPage>({
    ...(themeAudition ?? fields),
    id: saved?.id ?? 'preview',
    title: fields.title,
    logo,
    banner,
    albums: selected.map((a) => ({
      id: a.id,
      name: a.albumName,
      description: a.description?.slice(0, 20000) ?? '',
      count: a.assetCount,
      startDate: a.startDate,
      endDate: a.endDate,
      cover: a.albumThumbnailAssetId ? `/page/api/albums/${a.id}/cover` : null,
      href: null,
      available: true,
    })),
  });
  const canvasUrl = $derived(
    saved ? `/page/manage/${saved.id}/preview?inlineHeader=1` : null,
  );
  let customizePreviewFrame = $state<HTMLIFrameElement | null>(null);
  function syncCustomizePreview() {
    if (!saved || !customizePreviewFrame?.contentWindow) return;
    const page = previewPage;
    const syncSequence = customizeSyncSequence + 1;
    const syncMessage = inlinePreviewSyncSchema.safeParse({
      type: 'pager:inline-preview-sync',
      version: 1,
      pageId: saved.id,
      syncSequence,
      draftRevision: saved.draftRevision,
      selectedBlockId,
      ackSequence: canvasSequence,
      locked: busy || conflict || !!themeAudition,
      page: {
        id: page.id,
        title: page.title,
        description: page.description,
        theme:
          page.pageTheme && page.theme === 'system'
            ? systemColorMode
            : page.theme,
        pageTheme: page.pageTheme,
        background: page.background,
        foreground: page.foreground,
        accent: page.accent,
        alignment: page.alignment,
        bannerPosition: page.bannerPosition,
        headerLayout: page.headerLayout,
        headerSize: page.headerSize,
        blocks: page.blocks,
        bannerHeight: page.bannerHeight,
        allowDownload: page.allowDownload,
        revision: saved.draftRevision,
        persistedBlockIds: saved.blocks?.map((b) => b.id) ?? [],
        persistedPhotos:
          saved.blocks?.flatMap((b) =>
            b.type === 'photos'
              ? [{ blockId: b.id, photoIds: b.photos.map((p) => p.id) }]
              : [],
          ) ?? [],
        logoSize: page.logoSize,
        titleSize: page.titleSize,
        descriptionSize: page.descriptionSize,
        headerSpacing: page.headerSpacing,
        customCss: page.customCss,
        clientUi: page.clientUi,
        galleryStyle: page.galleryStyle,
        order: page.order,
        logo: page.logo,
        banner: page.banner,
        albums: page.albums,
      },
    });
    if (!syncMessage.success) {
      message =
        'Could not refresh the private canvas. Your edits are still available.';
      return;
    }
    customizeSyncSequence = syncSequence;
    customizePreviewFrame.contentWindow.postMessage(
      syncMessage.data,
      window.location.origin,
    );
  }
  $effect(() => {
    void snapshot();
    void themeAudition;
    void systemColorMode;
    void brandingVersion;
    void saved?.draftRevision;
    void selectedBlockId;
    void canvasSequence;
    void busy;
    void conflict;
    if (customizePreviewFrame) untrack(syncCustomizePreview);
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
        await tick();
        syncCustomizePreview();
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
    editorReady = true;
    const colorPreference = matchMedia('(prefers-color-scheme: dark)');
    const updateColorPreference = () =>
      (systemColorMode = colorPreference.matches ? 'dark' : 'light');
    updateColorPreference();
    colorPreference.addEventListener('change', updateColorPreference);
    const media = matchMedia('(max-width:700px)');
    narrow = media.matches;
    const resize = () => {
      if (media.matches && !narrow)
        inspectorOpen = !!document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"]:not(.inspector)',
        );
      narrow = media.matches;
    };
    media.addEventListener('change', resize);
    if (new URL(location.href).searchParams.get('options') === '1') {
      sharingOpen = true;
    }
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || saving) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    void flush(true).catch(() => {});
    const receiveInlineHeaderChange = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== location.origin ||
        event.source !== customizePreviewFrame?.contentWindow ||
        !saved ||
        busy ||
        conflict
      )
        return;
      const ready = canvasReadySchema.safeParse(event.data);
      if (ready.success && ready.data.pageId === saved.id) {
        syncCustomizePreview();
        return;
      }
      const parsed = composerChangeSchema.safeParse(event.data);
      if (
        !parsed.success ||
        parsed.data.pageId !== saved.id ||
        parsed.data.sequence <= canvasSequence
      )
        return;
      if (themeAudition) return;
      const change = parsed.data;
      canvasSequence = change.sequence;
      if (change.action === 'header') {
        if (change.field === 'title') editTitle(change.value);
        else fields.description = change.value;
      }
      if (change.action === 'size') fields[change.field] = change.value;
      if (
        change.action === 'block' &&
        fields.blocks?.some((b) => b.id === change.block.id)
      )
        fields.blocks = fields.blocks.map((b) =>
          b.id === change.block.id ? change.block : b,
        );
      if (
        change.action === 'select' &&
        fields.blocks?.some((b) => b.id === change.blockId)
      ) {
        selectedBlockId = change.blockId;
        inspectorTab = 'Content';
        inspectorOpen = true;
      }
      if (change.action === 'insert')
        insertBlock(change.index, change.blockType);
    };
    window.addEventListener('beforeunload', warn);
    window.addEventListener('message', receiveInlineHeaderChange);
    return () => {
      media.removeEventListener('change', resize);
      colorPreference.removeEventListener('change', updateColorPreference);
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('message', receiveInlineHeaderChange);
    };
  });
  let sheetWasOpen = false;
  let sheetReturnFocus: HTMLElement | null = null;
  $effect(() => {
    const open = narrow && inspectorOpen;
    if (open && !sheetWasOpen) {
      sheetReturnFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      void tick().then(() =>
        document
          .querySelector<HTMLButtonElement>(
            '.inspector-tabs button[aria-pressed="true"]',
          )
          ?.focus(),
      );
    }
    if (!open && sheetWasOpen && narrow)
      void tick().then(() => sheetReturnFocus?.focus());
    sheetWasOpen = open;
  });
  function inspectorKey(event: KeyboardEvent) {
    if (!narrow || !inspectorOpen) return;
    const nested =
      event.target instanceof HTMLElement
        ? event.target.closest('dialog, [role="dialog"]')
        : null;
    if (nested && nested !== event.currentTarget) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      inspectorOpen = false;
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  async function back() {
    try {
      await flush();
      await goto('/page/manage');
    } catch {
      /* Keep unsaved edits visible. */
    }
  }
  function editTitle(title: string) {
    fields.title = title;
    if (!slugLocked)
      fields.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
  }
  async function reviewPublication() {
    if (busy) return;
    busy = true;
    message = '';
    success = '';
    publicationReview = null;
    inspectorOpen = false;
    sharingOpen = false;
    retryReview = false;
    currentPassword = '';
    photoKind = null;
    try {
      await flush(true);
      if (!saved) throw Error('Save the draft before publishing');
      publicationReview = await api<PublicationSummary>(
        `/page/api/pages/${saved.id}/publication-review?expectedDraftRevision=${saved.draftRevision}&passwordMode=${fields.passwordMode}`,
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
    if (reviewSubmitting) return;
    reviewSubmitting = true;
    message = '';
    success = '';
    try {
      const result = await enqueue(() =>
        api<DraftEditorPage | { deleted: true }>(
          `/page/api/pages/${id}/${retryReview ? 'retry' : 'publish'}`,
          'POST',
          {
            password: review.requiresCurrentPassword
              ? currentPassword
              : fields.password,
            passwordMode: fields.passwordMode,
            expectedDraftRevision: review.draftRevision,
            expectedPublishedRevision: review.expectedPublishedRevision,
          },
        ),
      );
      if ('deleted' in result) {
        publicationReview = null;
        await goto('/page/manage');
        return;
      }
      saved = result;
      fields.password = '';
      fields.passwordMode = 'keep';
      currentPassword = '';
      publicationReview = null;
      success = retryReview
        ? 'Synchronization complete.'
        : 'Page published. Your client link is ready.';
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
      if (saved?.status === 'error') {
        retryReview = true;
        publicationReview = {
          ...review,
          requiresCurrentPassword:
            saved.intent === 'publish' && saved.hasPassword,
        };
      }
    } finally {
      reviewSubmitting = false;
      busy = !!publicationReview;
    }
  }
  function cancelPublicationReview() {
    if (reviewSubmitting) return;
    currentPassword = '';
    publicationReview = null;
    busy = false;
  }
  function requestAction(action: 'retry' | 'unpublish' | 'delete') {
    if (action !== 'retry') {
      pendingAction = action;
      return;
    }
    if (!saved) return;
    retryReview = true;
    currentPassword = '';
    message = '';
    busy = true;
    publicationReview = {
      draftRevision: saved.draftRevision,
      expectedPublishedRevision: null,
      currentlyPublished: false,
      previousSlug: null,
      nextSlug: saved.slug,
      addedAlbumIds: [],
      removedAlbumIds: [],
      appearanceChanges: [],
      passwordAction: 'keep',
      downloadChange: null,
      requiresCurrentPassword: saved.intent === 'publish' && saved.hasPassword,
    };
  }
  async function perform(action: 'publish' | 'retry' | 'unpublish' | 'delete') {
    if (action === 'publish') {
      await reviewPublication();
      return;
    }
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
<main
  class="composer"
  data-composer-ready={editorReady}
  aria-busy={!editorReady}
>
  <header class="composer-toolbar" inert={narrow && inspectorOpen}>
    <Button variant="ghost" color="secondary" onclick={back}>← Pages</Button>
    <div class="draft-status">
      <strong
        >{saved?.publishedSlug
          ? 'Live · draft changes stay private'
          : 'Private draft'}</strong
      ><small aria-live="polite" data-testid="save-state"
        >{!editorReady
          ? 'Loading editor…'
          : saving
            ? 'Saving…'
            : saveStatus}</small
      >
    </div>
    <div class="toolbar-actions">
      {#if failedSnapshot && !conflict}<Button
          variant="ghost"
          onclick={() => {
            failedSnapshot = null;
            void flush().catch(() => {});
          }}>Retry save</Button
        >{/if}
      <CopyLink slug={saved?.publishedSlug ?? null} />
      <Button
        variant="ghost"
        color="secondary"
        leadingIcon={mdiShareVariantOutline}
        disabled={!editorReady}
        onclick={() => {
          sharingOpen = true;
        }}>Page settings</Button
      >
      <Button
        shape="round"
        disabled={!editorReady ||
          busy ||
          conflict ||
          !canPublish ||
          !!themeAudition ||
          saved?.status === 'error'}
        onclick={reviewPublication}
        >{busy
          ? 'Working…'
          : saved?.publishedSlug
            ? 'Update live page'
            : 'Publish page'}</Button
      >
    </div>
  </header>
  {#if message && !photoKind && !publicationReview}<div
      class="notice error"
      role="alert"
    >
      {message}
    </div>{/if}
  {#if success}<div
      class="notice editor-toast"
      use:manualToast
      role="status"
      aria-atomic="true"
    >
      <Toast
        color="success"
        size="full"
        title={success}
        onClose={() => (success = '')}
      />
    </div>{/if}
  {#if saved?.status === 'error'}<div class="notice">
      This page is hidden until sharing synchronization finishes. <Button
        onclick={() => requestAction('retry')}>Retry synchronization</Button
      >
    </div>{/if}
  <div class="workspace" class:inspector-open={inspectorOpen}>
    <aside
      aria-label="Page inspector"
      class="inspector"
      role={narrow && inspectorOpen ? 'dialog' : undefined}
      aria-modal={narrow && inspectorOpen ? true : undefined}
      onkeydown={inspectorKey}
    >
      <nav class="inspector-tabs" aria-label="Page inspector tabs">
        {#each ['Content', 'Design'] as tab}<button
            aria-label={`${tab} inspector`}
            aria-pressed={inspectorTab === tab}
            onclick={() => (inspectorTab = tab as typeof inspectorTab)}
            ><Icon
              icon={tab === 'Content'
                ? mdiTextBoxEditOutline
                : mdiPaletteOutline}
              size="18px"
              aria-hidden
            />
            {tab}</button
          >{/each}
        <button
          class="mobile-close"
          aria-label="Close settings"
          onclick={() => (inspectorOpen = false)}
          ><Icon icon={mdiClose} size="20px" aria-hidden /></button
        >
      </nav>
      <div class="inspector-content">
        {#if inspectorTab === 'Content'}
          <details class="header-settings">
            <summary>Header and branding</summary>
            <label
              >Title <input
                aria-label="Page title"
                value={fields.title}
                maxlength="160"
                oninput={(event) => editTitle(event.currentTarget.value)}
              /></label
            >
            <label
              >Description <textarea
                aria-label="Page description"
                bind:value={fields.description}
                maxlength="2000"
              ></textarea></label
            >
            <BrandingSlot
              kind="logo"
              image={logo}
              {busy}
              onchoose={() => (photoKind = 'logo')}
              onfile={(file) => void branding('logo', file).catch(() => {})}
              onremove={() => void branding('logo', null).catch(() => {})}
            />
            <BrandingSlot
              kind="banner"
              image={banner}
              {busy}
              onchoose={() => (photoKind = 'banner')}
              onfile={(file) => void branding('banner', file).catch(() => {})}
              onremove={() => void branding('banner', null).catch(() => {})}
            />
          </details>
          <BlockInspector
            bind:fields
            albums={data.albums}
            bind:selectedId={selectedBlockId}
            disabled={!editorReady || busy || conflict}
          />
        {:else if inspectorTab === 'Design'}<CustomizePanel
            bind:fields
            bind:themeUndo
            {saved}
            {busy}
            onThemePreview={(value, actions) => {
              themeAudition = value;
              themePreviewActions = actions ?? null;
              if (value && narrow) inspectorOpen = false;
              else if (!value && narrow)
                void tick().then(() =>
                  document
                    .querySelector<HTMLButtonElement>('.mobile-settings')
                    ?.focus({ preventScroll: true }),
                );
            }}
            onTitleInput={editTitle}
            onResetAll={() => {
              themeUndo = null;
              themeAudition = null;
              themePreviewActions = null;
              fields = resetCustomization($state.snapshot(fields));
              success =
                'Customization reset to defaults. Content and sharing settings kept.';
            }}
          />
        {/if}
      </div>
    </aside>
    <section
      class="canvas"
      aria-label="Live page canvas"
      inert={narrow && inspectorOpen}
    >
      <div class="canvas-toolbar">
        <button
          class="mobile-settings"
          onclick={() => (inspectorOpen = !inspectorOpen)}
          ><Icon icon={mdiMenu} size="18px" aria-hidden />{inspectorTab}</button
        >
        <p>Live canvas · unpublished changes</p>
        <div role="group" aria-label="Canvas size">
          {#each ['desktop', 'tablet', 'phone'] as size}<button
              aria-label={`${size[0].toUpperCase() + size.slice(1)} canvas`}
              aria-pressed={previewSize === size}
              onclick={() => (previewSize = size as typeof previewSize)}
              ><Icon
                icon={size === 'desktop'
                  ? mdiMonitor
                  : size === 'tablet'
                    ? mdiTablet
                    : mdiCellphone}
                size="18px"
                aria-hidden
              /><span>{size[0].toUpperCase() + size.slice(1)}</span></button
            >{/each}
        </div>
      </div>
      <div
        class="canvas-stage"
        class:tablet={previewSize === 'tablet'}
        class:phone={previewSize === 'phone'}
      >
        {#if canvasUrl}<iframe
            data-testid="responsive-preview-frame"
            data-sync-sequence={customizeSyncSequence}
            bind:this={customizePreviewFrame}
            src={canvasUrl}
            title="Live page canvas"
            onload={() => {
              canvasSequence = 0;
              syncCustomizePreview();
            }}
            allow="fullscreen"
          ></iframe>{:else}<p role="status">
            Preparing your private canvas…
          </p>{/if}
        {#if themePreviewActions}<ThemePreviewPrompt
            preview={themePreviewActions}
            {busy}
          />{/if}
      </div>
    </section>
  </div>
  {#if photoKind}<PhotoPicker
      kind={photoKind}
      albums={data.albums}
      onClose={() => (photoKind = null)}
      onchoose={(id) => branding(photoKind!, id)}
    />{/if}
  {#if pendingAction}<ConfirmModal
      title={pendingAction === 'delete' ? 'Delete page' : 'Unpublish page'}
      prompt={pendingAction === 'delete'
        ? 'Delete this page and revoke its dedicated shares?'
        : 'Unpublish this page and revoke its dedicated shares?'}
      confirmText={pendingAction === 'delete'
        ? 'Delete page'
        : 'Unpublish page'}
      onClose={(confirmed) => {
        const action = pendingAction;
        pendingAction = null;
        if (confirmed && action) void perform(action);
      }}
    />{/if}
  {#if sharingOpen}<PageOptions
      bind:fields
      {saved}
      {message}
      {busy}
      {saving}
      {saveStatus}
      canPublish={canPublish && !conflict}
      onClose={() => {
        sharingOpen = false;
      }}
      onSlugEdit={() => (slugLocked = true)}
      onpublish={reviewPublication}
      onaction={requestAction}
    />
  {/if}
  {#if publicationReview}<PublicationReview
      review={publicationReview}
      bind:password={currentPassword}
      {message}
      submitting={reviewSubmitting}
      retry={retryReview}
      albums={data.albums}
      onClose={cancelPublicationReview}
      onConfirm={publishReviewed}
    />{/if}
</main>

<style>
  .composer {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    min-width: 0;
    color: var(--pager-management-text, #eee);
    background: var(--pager-management-background, #000);
  }
  .composer-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 20px;
    border-bottom: 1px solid var(--pager-management-border, #ffffff26);
    flex: 0 0 auto;
  }
  .draft-status {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .draft-status strong {
    font-size: 14px;
    font-weight: 500;
  }
  .draft-status small {
    font-size: 12px;
    opacity: 0.6;
  }
  .toolbar-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .workspace {
    display: grid;
    grid-template-columns: 400px minmax(0, 1fr);
    min-height: 0;
    flex: 1;
  }
  .inspector {
    min-width: 0;
    border-right: 1px solid var(--pager-management-border, #ffffff26);
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .inspector-tabs {
    display: flex;
    border-bottom: 1px solid var(--pager-management-border, #ffffff26);
    flex-shrink: 0;
  }
  .inspector-tabs button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 1;
    padding: 16px 8px;
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .inspector-tabs button[aria-pressed='true'] {
    color: var(--pager-management-accent, #accbfa);
    border-color: currentColor;
  }
  .inspector-content {
    min-width: 0;
    overflow: auto;
    min-height: 0;
    flex: 1;
  }
  .inspector-content :global(.customize-panel) {
    height: 100%;
    border: 0;
  }
  .inspector-content :global(.panel-header) {
    display: none;
  }
  .header-settings {
    margin: 20px 20px 0;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--pager-management-border, #ffffff26);
  }
  .header-settings summary {
    cursor: pointer;
    font-size: 14px;
    padding-block: 8px;
  }
  .header-settings label {
    display: grid;
    gap: 8px;
    margin: 16px 0;
    font-size: 14px;
  }
  .header-settings input,
  .header-settings textarea {
    border: 1px solid var(--pager-management-border, #ffffff26);
    border-radius: 8px;
    padding: 10px;
    width: 100%;
    box-sizing: border-box;
    background: transparent;
    color: inherit;
    font: inherit;
  }
  .header-settings :global(.branding-slot) {
    margin-top: 16px;
  }
  .canvas {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: #111216;
  }
  .canvas-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    gap: 12px;
    min-height: 48px;
    flex-shrink: 0;
  }
  .canvas-toolbar p {
    margin: 0;
    color: #a6a8af;
    font-size: 12px;
  }
  .canvas-toolbar div {
    display: flex;
    gap: 4px;
  }
  .canvas-toolbar button {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #aaa;
    border: 0;
    padding: 8px 12px;
    border-radius: 8px;
    background: transparent;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  .canvas-toolbar button[aria-pressed='true'] {
    background: #ffffff16;
    color: #dbe2ff;
  }
  .canvas-stage {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
    padding: 0 16px 16px;
    justify-content: center;
    overflow: auto;
  }
  .canvas-stage iframe {
    width: 100%;
    height: 100%;
    border: 0;
    box-shadow: 0 0 0 1px #ffffff20;
    border-radius: 12px;
    background: #000;
    flex-shrink: 0;
  }
  .canvas-stage.tablet iframe {
    width: min(100%, 820px);
  }
  .canvas-stage.phone iframe {
    width: min(100%, 390px);
  }
  .notice {
    padding: 12px 20px;
    background: var(--pager-management-surface, #17181b);
  }
  .editor-toast {
    border: 0;
    inset-block-end: auto;
    inset-inline-start: auto;
    position: fixed;
    inset-block-start: 16px;
    inset-inline-end: 16px;
    z-index: 2000;
    width: min(400px, calc(100vw - 32px));
    padding: 0;
    margin: 0;
    background: transparent;
  }
  .error {
    color: #ffb4ab;
  }
  .inspector-tabs .mobile-close,
  .canvas-toolbar .mobile-settings {
    display: none;
  }
  @media (max-width: 1000px) {
    .workspace {
      grid-template-columns: 360px minmax(0, 1fr);
    }
    .toolbar-actions {
      gap: 0;
    }
    .draft-status strong {
      display: none;
    }
    .canvas-toolbar button span {
      display: none;
    }
  }
  @media (max-width: 700px) {
    .workspace {
      display: flex;
      position: relative;
    }
    .canvas {
      flex: 1;
    }
    .inspector {
      display: none;
      position: absolute;
      inset: 0 auto 0 0;
      width: min(400px, 100%);
      z-index: 5;
      background: var(--pager-management-background, #000);
      box-shadow: 12px 0 32px #0006;
    }
    .inspector-open .inspector {
      display: flex;
    }
    .inspector-tabs .mobile-close {
      display: inline-flex;
      flex: 0 0 40px;
    }
    .canvas-toolbar .mobile-settings {
      display: inline-flex;
      color: #dbe2ff;
      border: 1px solid #ffffff26;
    }
    .canvas-toolbar p {
      display: none;
    }
    .composer-toolbar {
      padding: 8px;
      gap: 4px;
      flex-wrap: wrap;
    }
    .toolbar-actions {
      flex: 1;
      justify-content: flex-end;
    }
    .toolbar-actions :global(button) {
      padding-inline: 10px;
      font-size: 12px;
    }
    .canvas-stage {
      padding: 0 6px 6px;
    }
    .draft-status {
      order: 3;
      width: 100%;
      padding: 2px 12px;
    }
  }
</style>
