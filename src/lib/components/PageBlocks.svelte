<script lang="ts">
  import { Icon } from '@immich/ui';
  import { resolveBlockTheme } from '$lib/themes';
  import { mdiPlus, mdiPencilOutline } from '@mdi/js';
  import AlbumBlock from './AlbumBlock.svelte';
  import type { GalleryPage } from '$lib/contracts';
  import { hasContent, richTextHtml, type PageBlock } from '$lib/blocks';
  import PhotoSource from './PhotoSource.svelte';
  import type RichTextEditor from './RichTextEditor.svelte';
  let TextEditor = $state<typeof RichTextEditor | null>(null);
  let editorRequested = false;
  $effect(() => {
    if (editable && !editorRequested) {
      editorRequested = true;
      void import('./RichTextEditor.svelte').then(
        (module) => (TextEditor = module.default),
      );
    }
  });
  let {
    page,
    preview = false,
    revision = 0,
    editable = false,
    selectedId = '',
    onselect = () => {},
    onchange = () => {},
    oninsert = () => {},
  }: {
    page: GalleryPage;
    preview?: boolean;
    revision?: number;
    editable?: boolean;
    selectedId?: string;
    onselect?: (id: string) => void;
    onchange?: (block: PageBlock) => void;
    oninsert?: (index: number, type: PageBlock['type']) => void;
  } = $props();
  const ui = $derived(page.clientUi);
  const blocks = $derived(page.blocks ?? []);
</script>

{#snippet insert(index: number)}
  {#if editable}<div
      class="insert"
      data-pager-editor-ui
      aria-label="Insert block"
    >
      <span>Add row</span>{#each ['photos', 'albums', 'text'] as type}<button
          disabled={blocks.length >= 100}
          onclick={() => oninsert(index, type as PageBlock['type'])}
          ><Icon
            icon={mdiPlus}
            size="16px"
            aria-hidden
          />{type[0].toUpperCase() + type.slice(1)}</button
        >{/each}
    </div>{/if}
{/snippet}
<div class="page-blocks">
  {@render insert(0)}
  {#each blocks as rawBlock, index (rawBlock.id)}
    {@const block = resolveBlockTheme(rawBlock, page.pageTheme?.definition)}
    {#if editable || hasContent([block])}
      <section
        class="page-block ip-block"
        class:legacy={block.id === 'legacy-albums' &&
          block.type === 'albums' &&
          !block.heading}
        class:selected={selectedId === block.id && editable}
        data-block-id={block.id}
        id={`block-${block.id}`}
        aria-label={`${block.type} block`}
      >
        {#if editable}<div class="block-toolbar" data-pager-editor-ui>
            <button
              class="block-handle"
              data-pager-editor-ui
              aria-label={`Edit ${block.type} block ${index + 1}`}
              onclick={() => onselect(block.id)}
              ><Icon
                icon={mdiPencilOutline}
                size="14px"
                aria-hidden
              />{block.type[0].toUpperCase() + block.type.slice(1)}</button
            >
          </div>{/if}
        {#if editable && selectedId === block.id}<input
            class="block-heading"
            data-pager-editor-ui
            aria-label="Block heading"
            placeholder="Add a heading"
            value={block.heading}
            maxlength="160"
            oninput={(event) =>
              onchange({ ...block, heading: event.currentTarget.value })}
          />{:else if block.heading}<h2 class="block-heading">
            {block.heading}
          </h2>{/if}
        {#if block.type === 'text'}
          <div class="text-block ip-text" style:text-align={block.alignment}>
            {#if editable && TextEditor}<TextEditor
                value={block.content}
                onchange={(content) => onchange({ ...block, content })}
              />{:else}{@html richTextHtml(block.content)}{/if}
          </div>
        {:else if block.type === 'photos'}
          {#if block.photos.length}<PhotoSource
              pageId={page.id}
              sourceId={block.id}
              persistedIds={page.persistedPhotos?.find(
                (source) => source.blockId === block.id,
              )?.photoIds}
              ready={!preview ||
                !page.persistedBlockIds ||
                page.persistedBlockIds.includes(block.id)}
              kind="photos"
              {preview}
              {revision}
              {block}
              allowDownload={page.allowDownload ?? true}
            />{:else}<div class="empty">
              Add photos to this row in Content.
            </div>{/if}
        {:else if ui.showAlbums || editable}
          <AlbumBlock
            {page}
            {block}
            {preview}
            {revision}
            embedded={block.id !== 'legacy-albums' || !!block.heading}
          />
        {/if}
      </section>
    {/if}
    {@render insert(index + 1)}
  {/each}
</div>

<style>
  .page-blocks {
    min-width: 0;
  }
  .page-block {
    position: relative;
    max-width: var(--pager-content-width, 1600px);
    margin-inline: auto;
    padding: 24px var(--pager-page-padding, 40px);
    scroll-margin-top: 24px;
    min-width: 0;
  }
  .page-block.legacy {
    padding: 0;
    max-width: none;
  }
  .page-block.selected {
    outline: 1px dashed #6b84e5;
    outline-offset: -1px;
  }
  .block-toolbar {
    display: flex;
    align-items: center;
    min-height: 28px;
    margin-bottom: 12px;
  }
  .legacy .block-toolbar {
    padding-inline: var(--pager-gallery-inline-padding, 16px);
  }
  .legacy .block-heading {
    margin-inline: var(--pager-gallery-inline-padding, 16px);
    width: calc(100% - 2 * var(--pager-gallery-inline-padding, 16px));
  }
  .block-handle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    border-radius: 20px;
    padding: 6px 10px;
    background: #4564ca;
    color: #fff;
    font:
      12px 'GoogleSans',
      sans-serif;
    cursor: pointer;
  }
  .block-heading {
    font: inherit;
    font-size: 1.6em;
    font-weight: 650;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    display: block;
    line-height: 1.3;
    box-sizing: border-box;
    margin: 0 0 24px;
    padding: 4px 0;
    color: inherit;
    background: transparent;
    border: 0;
  }
  input.block-heading:focus {
    outline: 1px dashed currentColor;
  }
  .text-block {
    max-width: 900px;
    margin-inline: auto;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
  .text-block :global(a) {
    color: var(--pager-accent, #accbfa);
    text-decoration: underline;
  }
  .text-block :global(ul),
  .text-block :global(ol) {
    padding-inline-start: 1.5em;
  }
  .text-block :global(p) {
    white-space: pre-wrap;
  }
  .empty {
    padding: 64px 16px;
    text-align: center;
    opacity: 0.65;
    border: 1px dashed #8885;
    border-radius: 16px;
  }
  .insert {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    opacity: 0.7;
    padding: 8px;
    font:
      12px 'GoogleSans',
      sans-serif;
  }
  .insert:hover,
  .insert:focus-within {
    opacity: 1;
  }
  .insert button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font: inherit;
    border: 1px solid #8885;
    border-radius: 20px;
    color: inherit;
    background: transparent;
    padding: 6px 10px;
    cursor: pointer;
  }
  @media (max-width: 600px) {
    .page-block {
      padding: 20px var(--pager-mobile-page-padding, 16px);
    }
    .insert span {
      display: none;
    }
  }
</style>
