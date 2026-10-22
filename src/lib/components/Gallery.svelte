<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Textarea } from '@immich/ui';
  import { compileCustomCss, stylesheetMarkup } from '$lib/custom-css';
  import type { GalleryAlbum, GalleryPage } from '$lib/contracts';
  import { galleryStyleStylesheet } from '$lib/gallery-style';
  import {
    albumGroups,
    dateRange,
    filterAlbumGroups,
    itemCountLabel,
  } from '$lib/gallery';
  let {
    page,
    preview = false,
    editorHeader = false,
    editDisabled = false,
    onTitleInput = () => {},
    onDescriptionInput = () => {},
  }: {
    page: GalleryPage;
    preview?: boolean;
    editorHeader?: boolean;
    editDisabled?: boolean;
    onTitleInput?: (value: string) => void;
    onDescriptionInput?: (value: string) => void;
  } = $props();
  let failed = $state<string[]>([]);
  let galleryRoot = $state<HTMLDivElement | null>(null);
  let editing = $state<'title' | 'description' | null>(null);
  let titleInput = $state<HTMLTextAreaElement | null>(null);
  let descriptionInput = $state<HTMLTextAreaElement | null>(null);
  let titleEditButton = $state<HTMLButtonElement | null>(null);
  let descriptionEditButton = $state<HTMLButtonElement | null>(null);
  let searchTerm = $state('');
  let selectedMonth = $state('');
  let selectedYear = $state('');
  let hasInteracted = $state(false);
  let resultsAnnouncement = $state('');
  const groups = $derived(albumGroups(page));
  const visibleGroups = $derived(
    filterAlbumGroups(groups, searchTerm, selectedMonth),
  );
  const visibleAlbumCount = $derived(
    visibleGroups.reduce((count, [, albums]) => count + albums.length, 0),
  );
  const ui = $derived(page.clientUi);
  const clientHeaderVisible = $derived(
    editorHeader ||
      (ui.showBanner && !!page.banner) ||
      (ui.showLogo && !!page.logo) ||
      (ui.showTitle && !!page.title) ||
      (ui.showDescription && !!page.description),
  );
  const browseFiltersVisible = $derived(
    ui.showBrowsingControls &&
      (ui.showAlbumSearch ||
        ui.showMonthFilter ||
        (ui.showYearNavigation && visibleGroups.length > 1)),
  );
  const totalAlbumLabel = $derived(
    `${page.albums.length} ${page.albums.length === 1 ? 'album' : 'albums'}`,
  );
  const hasActiveFilters = $derived(
    searchTerm.trim().length > 0 || selectedMonth !== '',
  );
  const resultsId = $derived(`ip-album-results-${page.id}`);
  const months = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: new Intl.DateTimeFormat('en', {
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2020, index, 1))),
  }));
  const styling = $derived(
    compileCustomCss(editorHeader ? '' : (page.customCss ?? ''), page.id),
  );
  const overlay = $derived(
    page.headerLayout === 'overlay' &&
      !!page.banner &&
      (editorHeader || ui.showBanner),
  );

  function markCoverFailed(albumId: string) {
    if (!failed.includes(albumId)) failed = [...failed, albumId];
  }

  onMount(() => {
    const failedImageIds = Array.from(
      galleryRoot?.querySelectorAll<HTMLImageElement>(
        '.ip-album img[data-album-id]',
      ) ?? [],
    )
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.dataset.albumId)
      .filter((albumId): albumId is string => !!albumId);
    if (failedImageIds.length)
      failed = [...new Set([...failed, ...failedImageIds])];
  });

  function editField(field: 'title' | 'description') {
    if (editDisabled) return;
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

  function updateSearch(event: Event) {
    searchTerm = (event.currentTarget as HTMLInputElement).value;
    selectedYear = '';
    hasInteracted = true;
  }

  function updateMonth(event: Event) {
    selectedMonth = (event.currentTarget as HTMLSelectElement).value;
    selectedYear = '';
    hasInteracted = true;
  }

  function updateYear(event: Event) {
    selectedYear = (event.currentTarget as HTMLSelectElement).value;
    const target = document.getElementById(`ip-year-${selectedYear}`);
    if (!(target instanceof HTMLElement)) return;
    const details =
      target instanceof HTMLDetailsElement
        ? target
        : target.querySelector('details');
    if (details) details.open = true;
    const heading =
      details?.querySelector('summary') ??
      target.querySelector('.ip-year-heading');
    if (heading instanceof HTMLElement) heading.focus({ preventScroll: true });
    else target.focus({ preventScroll: true });
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
      ? 'auto'
      : 'smooth';
    target.scrollIntoView({ behavior, block: 'start' });
  }

  function clearFilters() {
    searchTerm = '';
    selectedMonth = '';
    selectedYear = '';
    hasInteracted = true;
  }

  $effect(() => {
    const input = editing === 'title' ? titleInput : descriptionInput;
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });

  $effect(() => {
    if (!hasInteracted) return;
    const count = visibleAlbumCount;
    const query = searchTerm.trim();
    const month = months.find(({ value }) => value === selectedMonth)?.label;
    const timeout = window.setTimeout(() => {
      resultsAnnouncement = `${count} ${count === 1 ? 'album' : 'albums'} shown${query ? ` for ${query}` : ''}${month ? ` in ${month}` : ''}`;
    }, 300);
    return () => window.clearTimeout(timeout);
  });
</script>

{#snippet albumItems(year: string, albums: GalleryAlbum[], groupIndex: number)}
  <ul
    class="album-grid ip-album-grid"
    aria-label={`${year} albums`}
    role="list"
  >
    {#each albums as album, index (album.id)}
      <li class="album-list-item">
        <a
          class="album ip-album"
          href={preview ? undefined : album.href || undefined}
          aria-label={album.name}
          aria-disabled={!album.available || preview}
          tabindex={preview || !album.available ? -1 : 0}
        >
          {#if ui.showAlbumCovers}<div class="cover ip-cover">
              {#if album.cover && !failed.includes(album.id)}
                <img
                  src={album.cover}
                  alt=""
                  data-album-id={album.id}
                  width="400"
                  height="400"
                  loading={groupIndex === 0 && index < 4 ? 'eager' : 'lazy'}
                  fetchpriority={!(ui.showBanner && page.banner) &&
                  groupIndex === 0 &&
                  index === 0
                    ? 'high'
                    : undefined}
                  onerror={() => markCoverFailed(album.id)}
                />
              {:else}<span class="placeholder" aria-hidden="true">▧</span>{/if}
            </div>{/if}
          <div
            class="album-info ip-album-info"
            class:no-cover={!ui.showAlbumCovers}
          >
            {#if ui.showAlbumTitles}<h3 title={album.name}>
                {album.name}
              </h3>{/if}
            {#if ui.showAlbumDates && dateRange(album.startDate, album.endDate)}
              <p>{dateRange(album.startDate, album.endDate)}</p>
            {/if}
            {#if album.available}
              {#if ui.showAlbumItemCounts || ui.showSharedLabels}<p
                  class="album-metadata"
                >
                  {#if ui.showAlbumItemCounts}<span class="item-count"
                      >{itemCountLabel(album.count)}</span
                    >{/if}
                  {#if ui.showSharedLabels}<span class="shared">
                      {#if ui.showAlbumItemCounts}<span
                          class="shared-separator"
                          aria-hidden="true">•</span
                        >{/if}
                      <span>Shared</span>
                    </span>{/if}
                </p>{/if}
            {:else}<p class="album-metadata">Currently unavailable</p>{/if}
          </div>
        </a>
      </li>
    {/each}
  </ul>
{/snippet}

<div class="gallery-boundary" class:header-editor={editorHeader}>
  {@html galleryStyleStylesheet(page, { editorHeader })}
  {@html stylesheetMarkup(styling.css)}
  <div
    class="gallery ip-gallery"
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
          </div>{/if}
        <header class="ip-header" class:centered={page.alignment === 'center'}>
          {#if page.logo && (editorHeader || ui.showLogo)}<img
              class="logo ip-logo"
              src={page.logo}
              alt=""
              width={page.logoSize}
              height={page.logoSize}
            />{/if}
          {#if editorHeader && editing === 'title'}<Textarea
              bind:ref={titleInput}
              variant="ghost"
              class="ip-title ip-title-editor"
              aria-label="Title"
              placeholder="Add a title"
              maxlength={160}
              disabled={editDisabled}
              value={page.title}
              oninput={(event) => {
                const title = event.currentTarget.value.replaceAll('\n', ' ');
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
              aria-label={editorHeader
                ? page.title || 'Add a title'
                : undefined}
            >
              {#if editorHeader}<button
                  type="button"
                  class="header-edit-field title-edit-field"
                  class:is-placeholder={!page.title}
                  bind:this={titleEditButton}
                  aria-label={`Edit title, ${page.title || 'Add a title'}`}
                  disabled={editDisabled}
                  onclick={() => editField('title')}
                  >{page.title || 'Add a title'}<span
                    class="edit-hint"
                    aria-hidden="true">✎</span
                  ></button
                >{:else}{page.title}{/if}
            </h1>{/if}
          {#if editorHeader}
            {#if editing === 'description'}<div
                class="description ip-description description-editor"
              >
                <Textarea
                  bind:ref={descriptionInput}
                  variant="ghost"
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
                  class:is-placeholder={!page.description}
                  bind:this={descriptionEditButton}
                  aria-label={`Edit description, ${page.description || 'Add a description'}`}
                  disabled={editDisabled}
                  onclick={() => editField('description')}
                  >{page.description || 'Add a description'}<span
                    class="edit-hint"
                    aria-hidden="true">✎</span
                  ></button
                >
              </p>{/if}
          {:else if ui.showDescription && page.description}<p
              class="description ip-description"
            >
              {page.description}
            </p>{/if}
        </header>
      </div>{/if}
    {#if !editorHeader}
      {#if ui.showAlbums}<main class="albums ip-albums" aria-label="Albums">
          {#if page.albums.length === 0}<div class="empty">
              <h2>No albums yet</h2>
              <p>The next chapter is on its way.</p>
            </div>
          {:else}
            {#if browseFiltersVisible}<div
                class="browse-controls ip-browse-controls"
                role="search"
                aria-label="Filter albums and jump to a year"
                aria-controls={resultsId}
              >
                {#if ui.showAlbumSearch}<label
                    class="search-control"
                    for={`ip-album-search-${page.id}`}
                  >
                    Album name
                    <input
                      id={`ip-album-search-${page.id}`}
                      type="search"
                      autocomplete="off"
                      value={searchTerm}
                      oninput={updateSearch}
                    />
                  </label>{/if}
                {#if ui.showMonthFilter}<label
                    for={`ip-album-month-${page.id}`}
                  >
                    Month
                    <select
                      id={`ip-album-month-${page.id}`}
                      value={selectedMonth}
                      onchange={updateMonth}
                    >
                      <option value="">All months</option>
                      {#each months as month (month.value)}
                        <option value={month.value}>{month.label}</option>
                      {/each}
                    </select>
                  </label>{/if}
                {#if ui.showYearNavigation && visibleGroups.length > 1}<label
                    for={`ip-album-year-${page.id}`}
                  >
                    Jump to year
                    <select
                      id={`ip-album-year-${page.id}`}
                      value={selectedYear}
                      onchange={updateYear}
                    >
                      <option value="">Choose</option>
                      {#each visibleGroups as [year] (year)}
                        <option value={year.toLowerCase()}>{year}</option>
                      {/each}
                    </select>
                  </label>{/if}
                {#if hasActiveFilters && visibleAlbumCount > 0}<button
                    class="clear-filters"
                    type="button"
                    onclick={clearFilters}>Clear filters</button
                  >{/if}
              </div>{/if}
            {#if ui.showBrowsingControls && ui.showResultsCount}<div
                class="browse-summary"
              >
                <p>
                  {#if hasActiveFilters}
                    {visibleAlbumCount} of {totalAlbumLabel}
                  {:else}
                    {totalAlbumLabel}
                  {/if}
                </p>
              </div>{/if}
            <div id={resultsId} class="album-results">
              {#if visibleGroups.length === 0}
                <div class="empty filter-empty">
                  <h2>No matching albums</h2>
                  <p>Try a different album name or month.</p>
                  <button
                    class="clear-filters"
                    type="button"
                    onclick={clearFilters}>Clear filters</button
                  >
                </div>
              {:else}
                {#each visibleGroups as [year, albums], groupIndex (year)}
                  {#if ui.showYearHeadings && ui.allowYearCollapse}<details
                      id={`ip-year-${year.toLowerCase()}`}
                      class="ip-year-group"
                      tabindex="-1"
                      open
                    >
                      <summary class="ip-year-heading">
                        <span class="chevron" aria-hidden="true">›</span>
                        <span class="year-title">{year}</span>
                        {#if ui.showYearCounts}<span class="group-count"
                            >({albums.length}
                            {albums.length === 1 ? 'Album' : 'Albums'})</span
                          >{/if}
                      </summary>
                      {@render albumItems(year, albums, groupIndex)}
                    </details>{:else}<section
                      id={`ip-year-${year.toLowerCase()}`}
                      class="ip-year-group"
                      tabindex="-1"
                      aria-label={`${year} albums`}
                    >
                      {#if ui.showYearHeadings}<h2
                          class="ip-year-heading"
                          tabindex="-1"
                        >
                          <span class="year-title">{year}</span>
                          {#if ui.showYearCounts}<span class="group-count"
                              >({albums.length}
                              {albums.length === 1 ? 'Album' : 'Albums'})</span
                            >{/if}
                        </h2>{:else if ui.showYearCounts}<p
                          class="group-count ip-year-count"
                        >
                          {albums.length}
                          {albums.length === 1 ? 'Album' : 'Albums'}
                        </p>{/if}
                      {@render albumItems(year, albums, groupIndex)}
                    </section>{/if}
                {/each}
              {/if}
            </div>
            <span class="visually-hidden" role="status"
              >{resultsAnnouncement}</span
            >
          {/if}
        </main>{/if}
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
  .logo {
    width: var(--pager-logo-size, 80px);
    height: var(--pager-logo-size, 80px);
    object-fit: contain;
    margin-block-end: 20px;
    display: inline-block;
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
    display: inline-block;
    margin-inline-start: 0.5em;
    font-size: 0.55em;
    vertical-align: top;
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
    .edit-hint,
    .album {
      transition: none;
    }
    .album:hover,
    .album:focus-visible {
      transform: none;
    }
  }
  .albums {
    padding: 0 var(--pager-gallery-inline-padding, 16px) 40px;
    max-width: var(--pager-content-width, 1600px);
    margin-inline: auto;
  }
  .browse-controls {
    display: grid;
    grid-template-columns:
      minmax(180px, 1.5fr) minmax(135px, 0.75fr) minmax(150px, 0.85fr)
      auto;
    align-items: end;
    gap: 16px;
    padding: 0 8px 8px;
  }
  .browse-controls label {
    gap: 8px;
    margin: 0;
    font-size: var(--pager-control-font-size, 0.875rem);
    font-weight: 500;
    opacity: 0.78;
  }
  .browse-controls input,
  .browse-controls select {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    color: inherit;
    font-size: var(--pager-control-font-size, 0.875rem);
  }
  .browse-controls input:focus-visible,
  .browse-controls select:focus-visible,
  .clear-filters:focus-visible,
  summary:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  .clear-filters {
    min-height: 44px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    color: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .clear-filters:hover {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
  .browse-summary {
    padding: 0 8px 8px;
    font-size: var(--pager-control-font-size, 0.875rem);
    opacity: 0.72;
  }
  .browse-summary p {
    margin: 0;
  }
  .visually-hidden {
    position: absolute !important;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  .filter-empty {
    padding: 48px 24px;
  }
  .filter-empty .clear-filters {
    margin-block-start: 20px;
  }
  @media (max-width: 760px) {
    .browse-controls {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .browse-controls .search-control,
    .browse-controls > .clear-filters {
      grid-column: 1 / -1;
    }
  }
  summary {
    display: flex;
    align-items: center;
    gap: 8px;
    list-style: none;
    border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    margin-block-start: 8px;
    padding: 8px;
    cursor: pointer;
  }
  .ip-year-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    margin-block-start: 8px;
    padding: 8px;
  }
  h2.ip-year-heading {
    display: flex;
    font-size: inherit;
    letter-spacing: normal;
    line-height: inherit;
    font-weight: inherit;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .chevron {
    display: inline-block;
    font-size: 24px;
    line-height: 1;
  }
  .year-title {
    font-size: 30px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  details[open] .chevron {
    transform: rotate(90deg);
  }
  h2 {
    display: inline;
    font-size: 42px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.8px;
  }
  .group-count {
    font-size: 16px;
    opacity: 0.85;
  }
  .ip-year-count {
    margin: 8px 0 0;
    padding: 8px;
  }
  .album-grid {
    display: grid;
    grid-template-columns: repeat(
      auto-fill,
      minmax(min(var(--pager-grid-min-width, 224px), 100%), 1fr)
    );
    column-gap: var(--pager-grid-column-gap, 0px);
    row-gap: var(--pager-grid-row-gap, 16px);
    padding: 0 0 16px;
    margin: 16px 0 0;
    list-style: none;
  }
  .album-list-item {
    min-width: 0;
  }
  .album {
    display: block;
    min-width: 0;
    text-decoration: none;
    padding: 20px;
    border: 1px solid transparent;
    border-radius: var(--pager-card-radius, 16px);
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      transform 120ms ease;
  }
  .album:hover,
  .album:focus-visible {
    background: color-mix(
      in srgb,
      currentColor var(--pager-hover-surface-opacity, 5%),
      transparent
    );
    border-color: color-mix(
      in srgb,
      currentColor var(--pager-hover-border-opacity, 12%),
      transparent
    );
    transform: translateY(var(--pager-hover-lift, 0px));
  }
  .album:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  .album:hover h3,
  .album:focus-visible h3 {
    color: var(--pager-hover-title-color, var(--pager-accent, currentColor));
    text-decoration: var(--pager-hover-text-decoration, none);
  }
  .cover {
    width: 100%;
    aspect-ratio: var(--pager-cover-aspect-ratio, 1);
    border-radius: var(--pager-card-radius, 16px);
    overflow: hidden;
    background: color-mix(in srgb, currentColor 8%, transparent);
    display: grid;
    place-items: center;
  }
  .cover img {
    height: 100%;
    width: 100%;
    object-fit: cover;
  }
  .placeholder {
    font-size: 42px;
    opacity: 0.35;
  }
  .album-info {
    margin-block-start: 16px;
  }
  .album-info.no-cover {
    margin-block-start: 0;
  }
  h3 {
    font-size: var(--pager-card-title-size, 1.125rem);
    line-height: 1.333;
    font-weight: var(--pager-card-title-weight, 600);
    margin: 0 0 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .album-info p {
    font-size: var(--pager-card-meta-size, 0.875rem);
    line-height: 1.4;
    opacity: 0.86;
    margin: 0;
  }
  .album-info .album-metadata {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 0.5rem;
    row-gap: 0.5rem;
  }
  .shared {
    display: inline-flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .empty {
    padding: 70px 24px;
    text-align: center;
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
    .albums {
      padding-inline: var(--pager-mobile-gallery-inline-padding, 8px);
    }
    .browse-controls {
      padding-inline: 8px;
    }
    .browse-controls label {
      font-size: var(--pager-mobile-control-font-size, 13px);
    }
    .browse-controls input,
    .browse-controls select {
      padding-inline: 10px;
    }
    .browse-summary {
      padding-inline: 8px;
    }
    h2 {
      font-size: 28px;
    }
    footer {
      padding: 24px var(--pager-mobile-footer-inline-padding, 24px);
    }
  }
</style>
