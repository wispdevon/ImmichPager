<script lang="ts">
  import { tick } from 'svelte';
  import { Button, Icon } from '@immich/ui';
  import {
    mdiPlus,
    mdiDrag,
    mdiArrowUp,
    mdiArrowDown,
    mdiClose,
  } from '@mdi/js';
  import type { Album, PageInput } from '$lib/contracts';
  import { resolveBlockTheme } from '$lib/themes';
  import { blockSchema, type PageBlock } from '$lib/blocks';
  import LayoutPicker from './LayoutPicker.svelte';
  import ResetField from './ResetField.svelte';
  import AlbumSelectionList from './AlbumSelectionList.svelte';
  import AlbumPicker from './AlbumPicker.svelte';
  import PhotoPicker from './PhotoPicker.svelte';
  let {
    fields = $bindable(),
    albums,
    selectedId = $bindable(''),
    disabled = false,
  }: {
    fields: PageInput;
    albums: Album[];
    selectedId?: string;
    disabled?: boolean;
  } = $props();
  let albumPicker = $state(false),
    photoPicker = $state(false),
    pickIds = $state<string[]>([]),
    pickBlock = $state('');
  let announcement = $state('');
  let dragged = $state<string | null>(null);
  const blocks = $derived(fields.blocks ?? []);
  $effect(() => {
    if (albumPicker) {
      const block = blocks.find((b) => b.id === pickBlock);
      if (
        block?.type === 'albums' &&
        JSON.stringify(block.albumIds) !== JSON.stringify(pickIds)
      )
        update({ ...block, albumIds: [...pickIds] });
    }
  });
  function update(block: PageBlock) {
    const previous = blocks.find((b) => b.id === block.id);
    const old =
      previous && resolveBlockTheme(previous, fields.pageTheme?.definition);
    if (
      old &&
      ['layout', 'gap', 'columns', 'rowHeight'].some(
        (key) =>
          key in old &&
          key in block &&
          (old as unknown as Record<string, unknown>)[key] !==
            (block as unknown as Record<string, unknown>)[key],
      )
    )
      block = { ...block, presentationSource: 'custom' };
    fields.blocks = blocks.map((b) => (b.id === block.id ? block : b));
  }
  function add(type: PageBlock['type']) {
    const block = blockSchema.parse({
      id: crypto.randomUUID(),
      type,
      ...(fields.pageTheme ? { presentationSource: 'theme' } : {}),
    });
    fields.blocks = [...blocks, block];
    selectedId = block.id;
  }
  function move(id: string, by: number) {
    const next = [...blocks],
      from = next.findIndex((b) => b.id === id),
      to = from + by;
    if (from < 0 || to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]];
    fields.blocks = next;
    announcement = `Moved row to position ${to + 1}`;
  }
  function select(id: string) {
    selectedId = id;
  }
  async function remove(id: string) {
    fields.blocks = blocks.filter((b) => b.id !== id);
    if (selectedId === id) selectedId = fields.blocks[0]?.id ?? '';
    await tick();
    document.querySelector<HTMLButtonElement>('[data-add-row]')?.focus();
  }
  function duplicate(block: PageBlock) {
    const copy = {
      ...structuredClone($state.snapshot(block)),
      id: crypto.randomUUID(),
    };
    const index = blocks.findIndex((b) => b.id === block.id);
    fields.blocks = [
      ...blocks.slice(0, index + 1),
      copy,
      ...blocks.slice(index + 1),
    ];
    selectedId = copy.id;
  }
  function reorderItems(block: PageBlock, index: number, by: number) {
    if (block.type === 'photos') {
      const photos = [...block.photos];
      const to = index + by;
      if (to < 0 || to >= photos.length) return;
      [photos[index], photos[to]] = [photos[to], photos[index]];
      update({ ...block, photos });
    }
  }
</script>

<section class="block-inspector" aria-label="Page content">
  <div class="add-buttons">
    {#each ['photos', 'albums', 'text'] as type}<Button
        data-add-row
        class="add-row-button"
        variant="ghost"
        disabled={disabled || blocks.length >= 100}
        onclick={() => add(type as PageBlock['type'])}
        ><Icon icon={mdiPlus} size="18px" aria-hidden />{type[0].toUpperCase() +
          type.slice(1)}</Button
      >{/each}
  </div>
  <div class="list-heading">
    <h2>Blocks</h2>
    <span>Drag to reorder</span>
  </div>
  <fieldset {disabled}>
    {#each blocks as rawBlock, index (rawBlock.id)}
      {@const block = resolveBlockTheme(rawBlock, fields.pageTheme?.definition)}
      <article
        class:active={selectedId === block.id}
        ondragover={(event) => event.preventDefault()}
        ondrop={(event) => {
          event.preventDefault();
          if (!dragged || dragged === block.id) return;
          const next = [...blocks],
            from = next.findIndex((b) => b.id === dragged);
          const [moving] = next.splice(from, 1);
          next.splice(index, 0, moving);
          fields.blocks = next;
          dragged = null;
        }}
      >
        <div class="block-bar">
          <button
            class="drag-handle"
            draggable="true"
            aria-label={`Reorder ${block.type} row ${index + 1}`}
            ondragstart={(event) => {
              dragged = block.id;
              event.dataTransfer?.setData('text/plain', block.id);
            }}
            ondragend={() => (dragged = null)}
            onkeydown={(event) => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                move(block.id, event.key === 'ArrowUp' ? -1 : 1);
              }
            }}><Icon icon={mdiDrag} size="20px" aria-hidden /></button
          >
          <button
            class="select-row"
            aria-expanded={selectedId === block.id}
            onclick={() => select(selectedId === block.id ? '' : block.id)}
            ><strong>{block.type[0].toUpperCase() + block.type.slice(1)}</strong
            ><small
              >{block.type === 'albums'
                ? `${block.albumIds.length} albums`
                : block.type === 'photos'
                  ? `${block.photos.length} photos`
                  : block.heading || 'Text row'}</small
            ></button
          >
          <button
            aria-label={`Move row ${index + 1} up`}
            disabled={index === 0}
            onclick={() => move(block.id, -1)}
            ><Icon icon={mdiArrowUp} size="18px" aria-hidden /></button
          ><button
            aria-label={`Move row ${index + 1} down`}
            disabled={index === blocks.length - 1}
            onclick={() => move(block.id, 1)}
            ><Icon icon={mdiArrowDown} size="18px" aria-hidden /></button
          >
        </div>
        {#if selectedId === block.id}<div class="block-settings">
            {#if fields.pageTheme}<label class="theme-layout-toggle"
                ><input
                  type="checkbox"
                  checked={block.presentationSource === 'theme'}
                  onchange={(e) =>
                    update({
                      ...block,
                      presentationSource: e.currentTarget.checked
                        ? 'theme'
                        : 'custom',
                    })}
                />Use theme layout</label
              >{/if}
            <label
              >Heading <input
                aria-label="Row heading"
                maxlength="160"
                value={block.heading}
                oninput={(event) =>
                  update({ ...block, heading: event.currentTarget.value })}
                placeholder="Optional heading"
              /></label
            >
            {#if block.type === 'albums'}
              <Button
                class="block-picker"
                variant="ghost"
                onclick={() => {
                  pickBlock = block.id;
                  pickIds = [...block.albumIds];
                  albumPicker = true;
                }}
                leadingIcon={mdiPlus}>Add albums</Button
              >
              <ResetField
                value={block.layout}
                defaultValue={fields.pageTheme?.definition.rows.albums ??
                  'cards'}
                label="Album style"
                onreset={() =>
                  update({
                    ...block,
                    layout: fields.pageTheme?.definition.rows.albums ?? 'cards',
                  })}
              >
                <div class="layout-setting">
                  <span>Style</span><LayoutPicker
                    label="Album style"
                    value={block.layout}
                    options={[
                      {
                        value: 'cards',
                        label: 'Cards',
                        description: 'Album covers with titles below',
                      },
                      {
                        value: 'tiles',
                        label: 'Tiles',
                        description: 'Titles over album covers',
                      },
                      {
                        value: 'editorial',
                        label: 'Editorial',
                        description: 'Album cover beside its description',
                      },
                    ]}
                    onchange={(value) =>
                      update({
                        ...block,
                        layout: value as typeof block.layout,
                      })}
                  />
                </div>
              </ResetField>
              {#if block.layout === 'editorial'}<p class="hint">
                  Uses album descriptions from Immich.
                </p>{/if}
              <ResetField
                value={block.order}
                defaultValue={'newest'}
                label="Order"
                onreset={() => update({ ...block, order: 'newest' })}
                ><label
                  >Order <select
                    value={block.order}
                    onchange={(e) =>
                      update({
                        ...block,
                        order: e.currentTarget.value as typeof block.order,
                      })}
                    ><option value="newest">Newest first</option><option
                      value="manual">Manual</option
                    ></select
                  ></label
                ></ResetField
              >
              <ResetField
                value={block.grouping}
                defaultValue={'year'}
                label="Group albums"
                onreset={() => update({ ...block, grouping: 'year' })}
                ><label
                  >Group albums <select
                    value={block.grouping}
                    onchange={(e) =>
                      update({
                        ...block,
                        grouping: e.currentTarget
                          .value as typeof block.grouping,
                      })}
                    ><option value="year">By year</option><option value="none"
                      >No grouping</option
                    ></select
                  ></label
                ></ResetField
              >
              <AlbumSelectionList {block} {albums} onchange={update} />
            {:else if block.type === 'photos'}
              <Button
                class="block-picker"
                variant="ghost"
                onclick={() => {
                  pickBlock = block.id;
                  photoPicker = true;
                }}
                leadingIcon={mdiPlus}>Add photos</Button
              >
              {#each block.photos as photo, i (photo.id)}<details
                  class="photo-settings"
                >
                  <summary
                    ><img
                      src={`/page/api/photos/${photo.id}/thumbnail`}
                      alt=""
                      width="44"
                      height="44"
                    /><span>{photo.caption || `Photo ${i + 1}`}</span></summary
                  ><label
                    >Caption <input
                      maxlength="1000"
                      value={photo.caption}
                      oninput={(e) =>
                        update({
                          ...block,
                          photos: block.photos.map((p) =>
                            p.id === photo.id
                              ? { ...p, caption: e.currentTarget.value }
                              : p,
                          ),
                        })}
                    /></label
                  ><label
                    >Alternative text <input
                      maxlength="1000"
                      value={photo.alt}
                      oninput={(e) =>
                        update({
                          ...block,
                          photos: block.photos.map((p) =>
                            p.id === photo.id
                              ? { ...p, alt: e.currentTarget.value }
                              : p,
                          ),
                        })}
                    /></label
                  >
                  <div class="item-actions">
                    <button
                      aria-label={`Move photo ${i + 1} up`}
                      disabled={i === 0}
                      onclick={() => reorderItems(block, i, -1)}
                      ><Icon icon={mdiArrowUp} size="16px" aria-hidden />Move up</button
                    ><button
                      aria-label={`Move photo ${i + 1} down`}
                      disabled={i === block.photos.length - 1}
                      onclick={() => reorderItems(block, i, 1)}
                      ><Icon icon={mdiArrowDown} size="16px" aria-hidden />Move
                      down</button
                    ><button
                      onclick={() =>
                        update({
                          ...block,
                          photos: block.photos.filter((p) => p.id !== photo.id),
                        })}
                      ><Icon
                        icon={mdiClose}
                        size="16px"
                        aria-hidden
                      />Remove</button
                    >
                  </div>
                </details>{/each}
              <ResetField
                value={block.layout}
                defaultValue={fields.pageTheme?.definition.rows.photos ??
                  'justified'}
                label="Photo layout"
                onreset={() =>
                  update({
                    ...block,
                    layout:
                      fields.pageTheme?.definition.rows.photos ?? 'justified',
                  })}
              >
                <div class="layout-setting">
                  <span>Layout</span><LayoutPicker
                    label="Photo layout"
                    value={block.layout}
                    options={[
                      'justified',
                      'masonry',
                      'square',
                      'large',
                      'carousel',
                    ].map((value) => ({
                      value,
                      label: value[0].toUpperCase() + value.slice(1),
                      description: `${value} photo layout`,
                    }))}
                    onchange={(value) =>
                      update({
                        ...block,
                        layout: value as typeof block.layout,
                      })}
                  />
                </div>
              </ResetField>
              {#if ['square', 'masonry'].includes(block.layout)}<ResetField
                  value={block.columns}
                  defaultValue={fields.pageTheme?.definition.rows.columns ?? 3}
                  label="Columns"
                  onreset={() =>
                    update({
                      ...block,
                      columns: fields.pageTheme?.definition.rows.columns ?? 3,
                    })}
                  ><label
                    >Columns <input
                      type="range"
                      min="1"
                      max="6"
                      value={block.columns}
                      oninput={(e) =>
                        update({
                          ...block,
                          columns: Number(e.currentTarget.value),
                        })}
                    /><output>{block.columns}</output></label
                  ></ResetField
                >{/if}
              {#if ['justified', 'carousel'].includes(block.layout)}<ResetField
                  value={block.rowHeight}
                  defaultValue={fields.pageTheme?.definition.rows.rowHeight ??
                    260}
                  label="Photo height"
                  onreset={() =>
                    update({
                      ...block,
                      rowHeight:
                        fields.pageTheme?.definition.rows.rowHeight ?? 260,
                    })}
                  ><label
                    >Photo height <input
                      type="range"
                      min="120"
                      max="600"
                      step="10"
                      value={block.rowHeight}
                      oninput={(e) =>
                        update({
                          ...block,
                          rowHeight: Number(e.currentTarget.value),
                        })}
                    /><output>{block.rowHeight}px</output></label
                  ></ResetField
                >{/if}
              <ResetField
                value={block.gap}
                defaultValue={fields.pageTheme?.definition.rows.gap ?? 16}
                label="Spacing"
                onreset={() =>
                  update({
                    ...block,
                    gap: fields.pageTheme?.definition.rows.gap ?? 16,
                  })}
                ><label
                  >Spacing <input
                    type="range"
                    min="0"
                    max="64"
                    value={block.gap}
                    oninput={(e) =>
                      update({ ...block, gap: Number(e.currentTarget.value) })}
                  /><output>{block.gap}px</output></label
                ></ResetField
              >
            {:else}<p class="hint">
                Click the text on the canvas to write and format it.
              </p>
              <ResetField
                value={block.alignment}
                defaultValue={'left'}
                label="Alignment"
                onreset={() => update({ ...block, alignment: 'left' })}
                ><label
                  >Alignment <select
                    value={block.alignment}
                    onchange={(e) =>
                      update({
                        ...block,
                        alignment: e.currentTarget
                          .value as typeof block.alignment,
                      })}
                    ><option value="left">Left</option><option value="center"
                      >Center</option
                    ><option value="right">Right</option></select
                  ></label
                ></ResetField
              >{/if}
            <div class="block-actions">
              <Button
                variant="ghost"
                disabled={blocks.length >= 100}
                onclick={() => duplicate(block)}>Duplicate row</Button
              ><Button
                variant="ghost"
                color="danger"
                onclick={() => remove(block.id)}>Delete row</Button
              >
            </div>
          </div>{/if}
      </article>
    {/each}
  </fieldset>
  {#if !blocks.length}<p class="hint">
      Add a Photos, Albums or Text row to start your page.
    </p>{/if}
  <p class="visually-hidden" aria-live="polite">{announcement}</p>
</section>
<AlbumPicker {albums} bind:albumIds={pickIds} bind:open={albumPicker} />
{#if photoPicker}<PhotoPicker
    kind="photos"
    {albums}
    multiple
    exclude={blocks.find((b) => b.id === pickBlock)?.type === 'photos'
      ? (
          blocks.find((b) => b.id === pickBlock) as Extract<
            PageBlock,
            { type: 'photos' }
          >
        ).photos.map((p) => p.id)
      : []}
    onchoose={async () => {}}
    onmany={async (ids) => {
      const block = blocks.find((b) => b.id === pickBlock);
      if (block?.type === 'photos')
        update({
          ...block,
          photos: [
            ...block.photos,
            ...ids
              .filter((id) => !block.photos.some((p) => p.id === id))
              .map((id) => ({ id, caption: '', alt: '' })),
          ],
        });
    }}
    onClose={() => (photoPicker = false)}
  />{/if}

<style>
  .layout-setting {
    display: grid;
    gap: 10px;
    min-width: 0;
  }
  :global(.block-picker) {
    color: var(--pager-management-accent, #accbfa);
    background: var(--pager-management-background, #000);
  }
  :global(.block-picker:hover) {
    background: var(--pager-management-surface-raised, #212121);
  }
  :global(.block-picker:focus-visible) {
    outline: 2px solid var(--pager-management-accent, #accbfa);
    outline-offset: 2px;
  }
  .block-inspector {
    padding: 20px;
    font-size: 14px;
    min-width: 0;
  }
  .add-buttons {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
  }
  :global(.add-row-button) {
    min-width: 0;
    padding-inline: 6px;
    gap: 4px;
    font-size: 13px;
  }
  .list-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 24px 0 12px;
  }
  h2 {
    margin: 0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .list-heading span,
  .hint {
    color: var(--pager-management-muted, #9ca0a8);
    font-size: 12px;
  }
  fieldset {
    border: 0;
    padding: 0;
    min-width: 0;
    margin: 0;
  }
  article {
    border: 1px solid var(--pager-management-border, #ffffff26);
    border-radius: 14px;
    margin-bottom: 10px;
    overflow: hidden;
    min-width: 0;
  }
  article.active {
    border-color: var(--pager-management-accent, #accbfa);
  }
  .block-bar {
    display: flex;
    align-items: center;
    padding: 12px 8px;
    gap: 4px;
  }
  button {
    font: inherit;
    color: inherit;
    border: 0;
    background: transparent;
    border-radius: 8px;
    padding: 7px;
    cursor: pointer;
  }
  button:hover {
    background: #8882;
  }
  button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid var(--pager-management-accent, #accbfa);
  }
  .drag-handle {
    cursor: grab;
  }
  .select-row {
    flex: 1;
    min-width: 0;
    text-align: left;
  }
  small {
    display: block;
    opacity: 0.6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 3px;
  }
  .block-settings {
    border-top: 1px solid var(--pager-management-border, #ffffff26);
    padding: 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 16px;
  }
  label {
    display: grid;
    min-width: 0;
    gap: 8px;
  }
  .theme-layout-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    min-block-size: 44px;
    cursor: pointer;
  }
  .theme-layout-toggle input {
    inline-size: 1.125em;
    block-size: 1.125em;
    flex: none;
    margin: 0;
    accent-color: var(--pager-management-accent, #accbfa);
  }
  input:not([type='range'], [type='checkbox']),
  select {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    background: transparent;
    color: inherit;
    padding: 10px;
    border: 1px solid var(--pager-management-border, #ffffff26);
    border-radius: 8px;
    font: inherit;
  }
  select {
    background: var(--pager-management-background, #000);
  }
  input[type='range'] {
    width: 100%;
    accent-color: var(--pager-management-accent, #accbfa);
  }
  output {
    font-size: 12px;
    opacity: 0.6;
  }
  .block-actions,
  .item-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .photo-settings summary {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
  }
  .photo-settings img {
    object-fit: cover;
    border-radius: 6px;
  }
  .photo-settings label {
    margin-top: 12px;
  }
</style>
