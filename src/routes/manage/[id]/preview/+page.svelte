<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Gallery from '$lib/components/Gallery.svelte';
  import type { GalleryPage } from '$lib/contracts';
  import {
    inlineHeaderChangeSchema,
    inlinePreviewSyncSchema,
  } from '$lib/inline-preview';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let page = $state<GalleryPage>(untrack(() => data.page));
  let editableFrame = $state(false);
  let draftRevision = $state(untrack(() => data.draftRevision));
  let syncSequence = $state(0);
  let pendingTitle = $state<string | null>(null);
  let pendingDescription = $state<string | null>(null);

  function sendHeaderChange(field: 'title' | 'description', value: string) {
    if (!editableFrame) return;
    const message = inlineHeaderChangeSchema.safeParse({
      type: 'pager:inline-header-change',
      version: 1,
      pageId: page.id,
      field,
      value,
    });
    if (!message.success) return;
    window.parent.postMessage(message.data, window.location.origin);
  }

  function updateTitle(value: string) {
    pendingTitle = value;
    page = { ...page, title: value };
    sendHeaderChange('title', value);
  }

  function updateDescription(value: string) {
    pendingDescription = value;
    page = { ...page, description: value };
    sendHeaderChange('description', value);
  }

  onMount(() => {
    editableFrame = data.inlineHeader && window.parent !== window;
    if (!editableFrame) return;
    const receivePreviewSync = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent
      )
        return;
      const parsed = inlinePreviewSyncSchema.safeParse(event.data);
      if (
        !parsed.success ||
        parsed.data.pageId !== page.id ||
        parsed.data.draftRevision < draftRevision ||
        parsed.data.syncSequence <= syncSequence
      )
        return;
      const synchronizedPage = parsed.data.page;
      if (pendingTitle === synchronizedPage.title) pendingTitle = null;
      if (pendingDescription === synchronizedPage.description)
        pendingDescription = null;
      page = {
        ...synchronizedPage,
        title: pendingTitle ?? synchronizedPage.title,
        description: pendingDescription ?? synchronizedPage.description,
      };
      draftRevision = parsed.data.draftRevision;
      syncSequence = parsed.data.syncSequence;
    };
    window.addEventListener('message', receivePreviewSync);
    return () => window.removeEventListener('message', receivePreviewSync);
  });
</script>

<svelte:head>
  <title>{page.title} · Private preview · ImmichPager</title>
</svelte:head>

<Gallery
  {page}
  preview
  inlineHeaderEdit={editableFrame}
  onTitleInput={updateTitle}
  onDescriptionInput={updateDescription}
/>
