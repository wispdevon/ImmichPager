<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Gallery from '$lib/components/Gallery.svelte';
  import type { GalleryPage } from '$lib/contracts';
  import {
    composerChangeSchema,
    inlinePreviewSyncSchema,
    type ComposerChange,
  } from '$lib/inline-preview';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let page = $state<GalleryPage>(untrack(() => data.page));
  let editable = $state(false),
    selectedBlockId = $state('');
  let revision = $state(untrack(() => data.draftRevision)),
    syncSequence = $state(0);
  let locked = $state(false);
  let sequence = 0;
  let pending: ComposerChange[] = [];
  function apply(change: ComposerChange) {
    if (change.action === 'header')
      page = { ...page, [change.field]: change.value };
    if (change.action === 'size')
      page = { ...page, [change.field]: change.value };
    if (change.action === 'block')
      page = {
        ...page,
        blocks: page.blocks?.map((b) =>
          b.id === change.block.id ? change.block : b,
        ),
      };
    if (change.action === 'select') selectedBlockId = change.blockId;
  }
  function send(command: Record<string, unknown>) {
    if (!editable || locked) return;
    const parsed = composerChangeSchema.safeParse({
      ...command,
      type: 'pager:composer-change',
      version: 1,
      pageId: page.id,
      sequence: ++sequence,
    });
    if (!parsed.success) return;
    apply(parsed.data);
    pending.push(parsed.data);
    window.parent.postMessage(parsed.data, location.origin);
  }
  onMount(() => {
    editable = data.inlineHeader && window.parent !== window;
    if (!editable) return;
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== location.origin || event.source !== window.parent)
        return;
      const parsed = inlinePreviewSyncSchema.safeParse(event.data);
      if (
        !parsed.success ||
        parsed.data.pageId !== page.id ||
        parsed.data.draftRevision < revision ||
        parsed.data.syncSequence <= syncSequence
      )
        return;
      locked = parsed.data.locked ?? false;
      const active = document.activeElement;
      const activeText = active instanceof HTMLTextAreaElement ? active : null;
      const editingTitle = activeText?.classList.contains('ip-title-editor');
      const editingDescription = activeText?.classList.contains(
        'ip-description-editor',
      );
      const richBlockId =
        active instanceof HTMLElement && active.closest('.tiptap')
          ? active.closest('[data-block-id]')?.getAttribute('data-block-id')
          : null;
      const oldPage = page;
      page = parsed.data.page;
      if (editingTitle) page.title = oldPage.title;
      if (editingDescription) page.description = oldPage.description;
      if (richBlockId) {
        const old = oldPage.blocks?.find((b) => b.id === richBlockId);
        if (old?.type === 'text')
          page.blocks = page.blocks?.map((b) =>
            b.id === old.id && b.type === 'text'
              ? { ...b, content: old.content }
              : b,
          );
      }
      selectedBlockId = parsed.data.selectedBlockId ?? selectedBlockId;
      pending = pending.filter(
        (change) => change.sequence > (parsed.data.ackSequence ?? 0),
      );
      pending.forEach(apply);
      revision = parsed.data.draftRevision;
      syncSequence = parsed.data.syncSequence;
    };
    window.addEventListener('message', receive);
    window.parent.postMessage(
      { type: 'pager:canvas-ready', version: 1, pageId: page.id },
      location.origin,
    );
    return () => window.removeEventListener('message', receive);
  });
  let lastSelected = '';
  $effect(() => {
    if (selectedBlockId && selectedBlockId !== lastSelected) {
      if (!lastSelected) {
        lastSelected = selectedBlockId;
        return;
      }
      lastSelected = selectedBlockId;
      document.getElementById(`block-${selectedBlockId}`)?.scrollIntoView({
        block: 'nearest',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
    }
  });
</script>

<svelte:head
  ><title>{page.title} · Private canvas · ImmichPager</title></svelte:head
>
<Gallery
  {page}
  preview
  inlineHeaderEdit={editable}
  compositionEdit={editable && !locked}
  editDisabled={locked}
  {selectedBlockId}
  onTitleInput={(value) => send({ action: 'header', field: 'title', value })}
  onDescriptionInput={(value) =>
    send({ action: 'header', field: 'description', value })}
  onBlockSelect={(blockId) => send({ action: 'select', blockId })}
  onBlockChange={(block) => send({ action: 'block', block })}
  onBlockInsert={(index, blockType) =>
    send({ action: 'insert', index, blockType })}
  onCompositionChange={(field, value) => send({ action: 'size', field, value })}
/>
