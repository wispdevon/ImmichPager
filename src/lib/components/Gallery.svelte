<script lang="ts">
  import {
    mdiPencilOutline,
    mdiArrowUpDown,
    mdiImageSizeSelectLarge,
  } from '@mdi/js';
  import PageBlocks from './PageBlocks.svelte';
  import { themeStylesheet } from '$lib/theme-render';
  import '$lib/theme-layouts.css';
  import { blockSchema, hasContent, type PageBlock } from '$lib/blocks';
  import { tick } from 'svelte';
  import { Textarea, Icon } from '@immich/ui';
  import { compileCustomCss, stylesheetMarkup } from '$lib/custom-css';
  import type { GalleryPage } from '$lib/contracts';
  import { galleryStyleStylesheet } from '$lib/gallery-style';
  let {
    page,
    preview = false,
    compositionEdit = false,
    selectedBlockId = '',
    onBlockSelect = () => {},
    onBlockChange = () => {},
    onBlockInsert = () => {},
    onCompositionChange = () => {},
    editorHeader = false,
    inlineHeaderEdit = false,
    editDisabled = false,
    onTitleInput = () => {},
    onDescriptionInput = () => {},
  }: {
    page: GalleryPage;
    preview?: boolean;
    compositionEdit?: boolean;
    selectedBlockId?: string;
    onBlockSelect?: (id: string) => void;
    onBlockChange?: (block: PageBlock) => void;
    onBlockInsert?: (index: number, type: PageBlock['type']) => void;
    onCompositionChange?: (
      field: 'bannerHeight' | 'logoSize' | 'bannerPosition',
      value: number,
    ) => void;
    editorHeader?: boolean;
    inlineHeaderEdit?: boolean;
    editDisabled?: boolean;
    onTitleInput?: (value: string) => void;
    onDescriptionInput?: (value: string) => void;
  } = $props();
  let galleryRoot = $state<HTMLDivElement | null>(null);
  let editing = $state<'title' | 'description' | null>(null);
  let titleInput = $state<HTMLTextAreaElement | null>(null);
  let descriptionInput = $state<HTMLTextAreaElement | null>(null);
  let titleEditButton = $state<HTMLButtonElement | null>(null);
  let descriptionEditButton = $state<HTMLButtonElement | null>(null);
  const ui = $derived(page.clientUi);
  const navigationBlocks = $derived(
    (page.blocks ?? []).filter(
      (block) =>
        (compositionEdit || hasContent([block])) &&
        (block.heading || block.type !== 'text') &&
        (block.type !== 'albums' || ui.showAlbums || compositionEdit),
    ),
  );
  const clientHeaderVisible = $derived(
    editorHeader ||
      (inlineHeaderEdit && (ui.showTitle || ui.showDescription)) ||
      (ui.showBanner && !!page.banner) ||
      (ui.showLogo && !!page.logo) ||
      (ui.showTitle && !!page.title) ||
      (ui.showDescription && !!page.description),
  );
  const contentPage = $derived<GalleryPage>({
    ...page,
    blocks: page.blocks ?? [
      blockSchema.parse({
        id: 'legacy-albums',
        type: 'albums',
        albumIds: page.albums.map((a) => a.id),
        order: page.order,
      }),
    ],
  });
  const styling = $derived(
    compileCustomCss(editorHeader ? '' : (page.customCss ?? ''), page.id, {
      precedence: page.pageTheme ? 'page' : undefined,
    }),
  );
  const overlay = $derived(
    page.headerLayout === 'overlay' &&
      !!page.banner &&
      (editorHeader || ui.showBanner),
  );

  let drag: {
    id: number;
    y: number;
    value: number;
    field: 'bannerHeight' | 'logoSize' | 'bannerPosition';
  } | null = null;
  function startDrag(
    event: PointerEvent,
    field: 'bannerHeight' | 'logoSize' | 'bannerPosition',
  ) {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const banner = galleryRoot?.querySelector('.ip-banner');
    drag = {
      id: event.pointerId,
      y: event.clientY,
      value:
        field === 'logoSize'
          ? page.logoSize
          : field === 'bannerPosition'
            ? page.bannerPosition
            : (page.bannerHeight ??
              banner?.getBoundingClientRect().height ??
              360),
      field,
    };
  }
  function moveDrag(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientY - drag.y;
    const limits =
      drag.field === 'logoSize'
        ? [48, 160]
        : drag.field === 'bannerPosition'
          ? [0, 100]
          : [140, 900];
    const value = Math.round(
      Math.max(
        limits[0],
        Math.min(
          limits[1],
          drag.value + (drag.field === 'bannerPosition' ? -delta / 3 : delta),
        ),
      ),
    );
    onCompositionChange(drag.field, value);
  }
  function editField(field: 'title' | 'description') {
    if (
      editDisabled ||
      (inlineHeaderEdit &&
        !(field === 'title' ? ui.showTitle : ui.showDescription))
    )
      return;
    editing = field;
  }

  async function finishEditing(field: 'title' | 'description') {
    if (editing !== field) return;
    editing = null;
    await tick();
    const trigger = field === 'title' ? titleEditButton : descriptionEditButton;
    trigger?.focus();
  }

  function finishOnBlur(field: 'title' | 'description') {
    // Let the browser keep its natural Tab or pointer focus destination.
    if (editing === field) editing = null;
  }

  $effect(() => {
    const input = editing === 'title' ? titleInput : descriptionInput;
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });
</script>

<div class="gallery-boundary" class:header-editor={editorHeader}>
  {@html galleryStyleStylesheet(page, { editorHeader })}
  {@html themeStylesheet(page)}
  {@html stylesheetMarkup(styling.css)}
  <div
    class={`gallery ip-gallery ${page.pageTheme ? `pager-theme family-${page.pageTheme.definition.layout}` : ''}`}
    bind:this={galleryRoot}
    class:header-editor={editorHeader}
    data-pager-gallery={page.id}
    class:overlay
    class:header-compact={page.headerSize === 'compact'}
    class:header-tall={page.headerSize === 'tall'}
    class:light={page.theme === 'light'}
    class:system={page.theme === 'system'}
  >
    {#if clientHeaderVisible}<div class="hero ip-hero">
        {#if page.banner && (editorHeader || ui.showBanner)}<div
            class="banner ip-banner"
          >
            <img src={page.banner} alt="" fetchpriority="high" />
            {#if compositionEdit}<div
                class="banner-handles"
                data-pager-editor-ui
              >
                <button
                  onpointerdown={(e) => startDrag(e, 'bannerPosition')}
                  onpointermove={moveDrag}
                  onpointerup={() => (drag = null)}
                  onpointercancel={() => (drag = null)}
                  aria-label="Drag banner crop"
                  onkeydown={(e) => {
                    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
                      e.preventDefault();
                      onCompositionChange(
                        'bannerPosition',
                        Math.max(
                          0,
                          Math.min(
                            100,
                            page.bannerPosition +
                              (e.key === 'ArrowUp' ? -1 : 1),
                          ),
                        ),
                      );
                    }
                  }}
                  ><Icon
                    icon={mdiArrowUpDown}
                    size="14px"
                    aria-hidden
                  />Crop</button
                ><button
                  onpointerdown={(e) => startDrag(e, 'bannerHeight')}
                  onpointermove={moveDrag}
                  onpointerup={() => (drag = null)}
                  onpointercancel={() => (drag = null)}
                  aria-label="Drag banner height"
                  onkeydown={(e) => {
                    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
                      e.preventDefault();
                      onCompositionChange(
                        'bannerHeight',
                        Math.max(
                          140,
                          Math.min(
                            900,
                            (page.bannerHeight ?? 360) +
                              (e.key === 'ArrowUp' ? -10 : 10),
                          ),
                        ),
                      );
                    }
                  }}
                  ><Icon
                    icon={mdiImageSizeSelectLarge}
                    size="14px"
                    aria-hidden
                  />Height</button
                >
              </div>{/if}
          </div>{/if}
        <header class="ip-header" class:centered={page.alignment === 'center'}>
          <div
            class="header-content"
            class:left-logo={page.galleryStyle.logoPosition === 'left' &&
              !!page.logo &&
              (editorHeader || ui.showLogo)}
          >
            {#if page.logo && (editorHeader || ui.showLogo)}<div
                class="logo-wrap"
              >
                <img
                  class="logo ip-logo"
                  src={page.logo}
                  alt=""
                  width={page.logoSize}
                  height={page.logoSize}
                />{#if compositionEdit}<button
                    class="logo-handle"
                    data-pager-editor-ui
                    onpointerdown={(e) => startDrag(e, 'logoSize')}
                    onpointermove={moveDrag}
                    onpointerup={() => (drag = null)}
                    onpointercancel={() => (drag = null)}
                    aria-label="Drag logo size"
                    onkeydown={(e) => {
                      if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
                        e.preventDefault();
                        onCompositionChange(
                          'logoSize',
                          Math.max(
                            48,
                            Math.min(
                              160,
                              page.logoSize + (e.key === 'ArrowUp' ? -1 : 1),
                            ),
                          ),
                        );
                      }
                    }}
                    ><Icon icon={mdiArrowUpDown} size="14px" aria-hidden />Logo
                    size</button
                  >{/if}
              </div>{/if}
            <div class="header-copy">
              {#if (editorHeader || inlineHeaderEdit) && editing === 'title' && (editorHeader || ui.showTitle)}<Textarea
                  bind:ref={titleInput}
                  variant="ghost"
                  data-pager-editor-ui
                  class="ip-title ip-title-editor"
                  aria-label="Title"
                  placeholder="Add a title"
                  maxlength={160}
                  disabled={editDisabled}
                  value={page.title}
                  oninput={(event) => {
                    const title = event.currentTarget.value.replaceAll(
                      '\n',
                      ' ',
                    );
                    event.currentTarget.value = title;
                    onTitleInput(title);
                  }}
                  onblur={() => finishOnBlur('title')}
                  onkeydown={(event) => {
                    if (event.key === 'Enter') {
                      if (event.isComposing || event.keyCode === 229) return;
                      event.preventDefault();
                      void finishEditing('title');
                    } else if (event.key === 'Escape') {
                      event.preventDefault();
                      void finishEditing('title');
                    }
                  }}
                />{:else if editorHeader || ui.showTitle}<h1
                  class="ip-title"
                  aria-label={editorHeader || inlineHeaderEdit
                    ? page.title || 'Add a title'
                    : undefined}
                >
                  {#if editorHeader || inlineHeaderEdit}<button
                      type="button"
                      class="header-edit-field title-edit-field"
                      data-pager-editor-ui
                      class:is-placeholder={!page.title}
                      bind:this={titleEditButton}
                      aria-label={`Edit title, ${page.title || 'Add a title'}`}
                      disabled={editDisabled}
                      onclick={() => editField('title')}
                      >{page.title || 'Add a title'}<span
                        class="edit-hint"
                        aria-hidden="true"
                        ><Icon
                          icon={mdiPencilOutline}
                          size="16px"
                          aria-hidden
                        /></span
                      ></button
                    >{:else}{page.title}{/if}
                </h1>{/if}
              {#if editorHeader || (inlineHeaderEdit && ui.showDescription)}
                {#if editing === 'description'}<div
                    class="description ip-description description-editor"
                  >
                    <Textarea
                      bind:ref={descriptionInput}
                      variant="ghost"
                      data-pager-editor-ui
                      class="ip-description ip-description-editor"
                      aria-label="Description"
                      placeholder="Add a description"
                      maxlength={2000}
                      disabled={editDisabled}
                      value={page.description}
                      oninput={(event) =>
                        onDescriptionInput(event.currentTarget.value)}
                      onblur={() => finishOnBlur('description')}
                      onkeydown={(event) => {
                        if (event.key === 'Enter' && event.ctrlKey) {
                          event.preventDefault();
                          void finishEditing('description');
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          void finishEditing('description');
                        }
                      }}
                    />
                  </div>{:else}<p class="description ip-description">
                    <button
                      type="button"
                      class="header-edit-field description-edit-field"
                      data-pager-editor-ui
                      class:is-placeholder={!page.description}
                      bind:this={descriptionEditButton}
                      aria-label={`Edit description, ${page.description || 'Add a description'}`}
                      disabled={editDisabled}
                      onclick={() => editField('description')}
                      >{page.description || 'Add a description'}<span
                        class="edit-hint"
                        aria-hidden="true"
                        ><Icon
                          icon={mdiPencilOutline}
                          size="16px"
                          aria-hidden
                        /></span
                      ></button
                    >
                  </p>{/if}
              {:else if ui.showDescription && page.description}<p
                  class="description ip-description"
                >
                  {page.description}
                </p>{/if}
            </div>
          </div>
        </header>
        {#if page.pageTheme && page.pageTheme.definition.layout !== 'classic' && navigationBlocks.length > 0}
          <nav
            class="theme-section-nav ip-navigation"
            aria-label="Page sections"
          >
            {#each navigationBlocks as block, i}
              {#if block.heading || block.type !== 'text'}<a
                  href={`#block-${block.id}`}
                  >{block.heading ||
                    `${block.type === 'albums' ? 'Albums' : block.type === 'photos' ? 'Photos' : 'Text'} ${i + 1}`}</a
                >{/if}
            {/each}
          </nav>
        {/if}
      </div>{/if}
    {#if !editorHeader}
      <PageBlocks
        page={contentPage}
        {preview}
        revision={page.revision ?? 0}
        editable={compositionEdit}
        selectedId={selectedBlockId}
        onselect={onBlockSelect}
        onchange={onBlockChange}
        oninsert={onBlockInsert}
      />
      <footer class="ip-footer">
        {#if ui.showBranding}<a
            href="https://gitlab.com/wispd/ImmichPager"
            target="_blank"
            rel="noreferrer">ImmichPager</a
          > ·
        {/if}
        <a
          href="https://gitlab.com/wispd/ImmichPager/-/blob/main/LICENSE"
          target="_blank"
          rel="noreferrer">Source & license</a
        >
      </footer>
    {/if}
  </div>
</div>

<style>
  .banner {
    position: relative;
  }
  .banner-handles {
    position: absolute;
    inset: auto 12px 10px;
    display: flex;
    justify-content: center;
    gap: 8px;
    z-index: 3;
  }
  .banner-handles button,
  .logo-handle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    border-radius: 16px;
    padding: 4px 12px;
    background: #4564ca;
    color: #fff;
    font:
      12px 'GoogleSans',
      sans-serif;
    cursor: ns-resize;
    touch-action: none;
  }
  .logo-wrap {
    position: relative;
    width: var(--pager-logo-size, 80px);
    height: var(--pager-logo-size, 80px);
    flex: 0 0 auto;
  }
  .centered .header-content:not(.left-logo) .logo-wrap {
    align-self: center;
  }
  .logo-handle {
    position: absolute;
    bottom: -8px;
    left: 50%;
    translate: -50% 0;
    white-space: nowrap;
  }

  .gallery-boundary {
    contain: layout paint;
    isolation: isolate;
    min-height: 100dvh;
  }
  .gallery-boundary.header-editor {
    min-height: 0;
    margin-inline: -40px;
  }
  .gallery {
    --base-bg: #000;
    --base-fg: #f5f5f5;
    background: var(--pager-background, var(--custom-bg, var(--base-bg)));
    color: var(--pager-foreground, var(--custom-fg, var(--base-fg)));
    min-height: 100dvh;
    color-scheme: var(--pager-color-scheme, dark);
    font-family: var(--pager-font-family, 'GoogleSans', sans-serif);
    font-size: var(--pager-body-font-size, 1rem);
    font-weight: var(--pager-body-font-weight, 400);
  }
  .gallery.header-editor {
    min-height: 0;
  }
  .gallery.light {
    --base-bg: #fff;
    --base-fg: #191919;
    --gallery-hover-accent: #4250af;
  }
  @media (prefers-color-scheme: light) {
    .gallery.system {
      --base-bg: #fff;
      --base-fg: #191919;
      --gallery-hover-accent: #4250af;
    }
  }
  .hero {
    position: relative;
    display: var(--pager-hero-display, block);
    min-height: var(--pager-hero-min-height, auto);
    margin-block-end: var(--pager-hero-margin-block-end, 0px);
  }
  .overlay .banner {
    position: var(--pager-banner-placement, absolute);
    inset: 0;
    height: 100%;
  }
  .overlay .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgb(0 0 0 / 25%), rgb(0 0 0 / 78%));
    pointer-events: none;
    display: var(--pager-overlay-decoration-display, block);
  }
  .overlay header {
    position: relative;
    z-index: 1;
    align-self: var(--pager-header-align-self, end);
    width: 100%;
    box-sizing: border-box;
    color: var(--pager-overlay-header-color, var(--pager-foreground, #fff));
  }
  .banner {
    position: var(--pager-banner-placement, static);
    width: 100%;
    height: var(--pager-banner-height, clamp(180px, 26vw, 360px));
    overflow: hidden;
  }
  .banner img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .header-compact:not(.overlay) .banner {
    height: var(--pager-banner-height, clamp(140px, 18vw, 240px));
  }
  .header-tall:not(.overlay) .banner {
    height: var(--pager-banner-height, clamp(240px, 35vw, 480px));
  }
  .banner img {
    object-position: center var(--pager-banner-position, 50%);
  }
  header {
    padding: calc(var(--pager-header-spacing, 2.5rem) + 0.75rem)
      var(--pager-page-padding, 40px) var(--pager-header-spacing, 2.5rem);
    max-width: var(--pager-content-width, 1600px);
    margin: auto;
    text-align: var(--pager-header-alignment, left);
  }
  header.centered {
    text-align: var(--pager-header-alignment, center);
  }
  .header-content {
    display: flex;
    flex-direction: var(--pager-logo-layout, column);
    align-items: stretch;
    gap: var(--pager-logo-gap, 20px);
  }
  .header-content.left-logo {
    align-items: center;
    justify-content: var(--pager-logo-justify, flex-start);
  }
  .header-copy {
    min-width: 0;
    max-width: 100%;
  }
  .logo {
    display: block;
    flex: 0 0 auto;
    width: var(--pager-logo-size, 80px);
    height: var(--pager-logo-size, 80px);
    object-fit: contain;
    border-radius: var(--pager-logo-radius, 16px);
  }
  .centered .header-content:not(.left-logo) .logo {
    align-self: center;
  }
  h1 {
    font-size: clamp(
      var(--pager-title-min-size, 1.875rem),
      var(--pager-title-fluid-size, 3.4vw),
      var(--pager-title-size, 3rem)
    );
    line-height: 1.15;
    font-weight: var(--pager-title-font-weight, 650);
    letter-spacing: -1.3px;
    margin: 0;
    overflow-wrap: anywhere;
  }
  .description {
    font-size: var(--pager-description-size, 1.125rem);
    opacity: 0.72;
    max-width: 720px;
    white-space: pre-line;
    overflow-wrap: anywhere;
    line-height: 1.6;
    margin-block: 16px 0;
  }
  .centered .description {
    margin-inline: auto;
  }
  .header-edit-field {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: inherit;
    overflow-wrap: anywhere;
    cursor: text;
  }
  .header-edit-field:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 5px;
  }
  .description-edit-field {
    white-space: pre-line;
  }
  .header-edit-field.is-placeholder {
    opacity: 0.7;
  }
  .edit-hint {
    position: absolute;
    inset-inline-end: 0;
    bottom: 100%;
    pointer-events: none;
    font-size: 0.55em;
    opacity: 0;
    transition: opacity 120ms ease;
  }
  .header-edit-field:hover .edit-hint,
  .header-edit-field:focus-visible .edit-hint {
    opacity: 0.7;
  }
  :global(textarea.ip-title-editor) {
    width: 100%;
    min-height: 1.15em;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: inherit;
    font-size: clamp(
      var(--pager-title-min-size, 1.875rem),
      var(--pager-title-fluid-size, 3.4vw),
      var(--pager-title-size, 3rem)
    );
    font-weight: var(--pager-title-font-weight, 650);
    letter-spacing: -1.3px;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }
  :global(textarea.ip-title-editor::placeholder) {
    color: #8798b0;
    opacity: 1;
  }
  :global(textarea.ip-description-editor) {
    width: 100%;
    max-width: 720px;
    min-height: 1.6em;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: inherit;
    font-size: var(--pager-description-size, 1.125rem);
    font-weight: 410;
    line-height: 1.6;
    opacity: 0.72;
    white-space: pre-line;
  }
  :global(textarea.ip-description-editor::placeholder) {
    color: #a1a1aa;
    opacity: 1;
  }
  .description-editor {
    margin-block: 16px 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .edit-hint {
      transition: none;
    }
  }
  footer {
    padding: 28px var(--pager-page-padding, 40px);
    font-size: 12px;
    opacity: 0.5;
  }
  @media (max-width: 600px) {
    .gallery-boundary.header-editor {
      margin-inline: -20px;
    }
    header {
      padding: var(--pager-mobile-header-spacing, 2rem)
        var(--pager-mobile-page-padding, 20px);
    }
    .header-content.left-logo {
      flex-direction: var(--pager-mobile-logo-layout, column);
      align-items: stretch;
    }
    .header-content.left-logo .logo-wrap {
      align-self: flex-start;
    }
    .centered .header-content.left-logo .logo-wrap {
      align-self: center;
    }
    footer {
      padding: 24px var(--pager-mobile-footer-inline-padding, 24px);
    }
  }
</style>
