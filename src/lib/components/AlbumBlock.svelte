<script lang="ts">
  import { Icon } from '@immich/ui';
  import { mdiImageOutline, mdiChevronRight } from '@mdi/js';
  import { onMount, tick } from 'svelte';
  import type { GalleryPage, GalleryAlbum } from '$lib/contracts';
  import type { AlbumsBlock } from '$lib/blocks';
  import {
    albumGroups,
    dateRange,
    filterAlbumGroups,
    itemCountLabel,
  } from '$lib/gallery';
  import PhotoSource from './PhotoSource.svelte';
  let {
    page: sourcePage,
    block,
    preview = false,
    revision = 0,
    embedded = false,
  }: {
    page: GalleryPage;
    block: AlbumsBlock;
    preview?: boolean;
    revision?: number;
    embedded?: boolean;
  } = $props();
  const page = $derived({
    ...sourcePage,
    order: block.order,
    albums: block.albumIds.flatMap((id) =>
      sourcePage.albums.filter((a) => a.id === id),
    ),
  });
  let failed = $state<string[]>([]),
    expanded = $state<string | null>(null);
  let galleryRoot = $state<HTMLDivElement | null>(null);
  let searchTerm = $state(''),
    selectedMonth = $state(''),
    selectedYear = $state(''),
    hasInteracted = $state(false),
    resultsAnnouncement = $state('');
  const groups = $derived(
    block.grouping === 'none'
      ? [
          [
            'Albums',
            block.order === 'newest'
              ? [...page.albums].sort((a, b) =>
                  (b.endDate ?? '').localeCompare(a.endDate ?? ''),
                )
              : page.albums,
          ] as [string, typeof page.albums],
        ]
      : albumGroups(page),
  );
  const visibleGroups = $derived(
    filterAlbumGroups(groups, searchTerm, selectedMonth),
  );
  const visibleAlbumCount = $derived(
    visibleGroups.reduce((count, [, albums]) => count + albums.length, 0),
  );
  const ui = $derived(
    block.grouping === 'year'
      ? page.clientUi
      : { ...page.clientUi, showYearHeadings: false, showYearCounts: false },
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
  const resultsId = $derived(`ip-album-results-${page.id}-${block.id}`);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Intl.DateTimeFormat('en', {
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2020, i, 1))),
  }));
  function yearId(year: string) {
    return block.id === 'legacy-albums'
      ? `ip-year-${year.toLowerCase()}`
      : `ip-year-${block.id}-${year.toLowerCase()}`;
  }
  let albumScroll = 0;
  async function openAlbum(id: string) {
    albumScroll = window.scrollY;
    expanded = id;
    await tick();
    galleryRoot?.querySelector('.expanded-album')?.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }
  async function closeAlbum() {
    const id = expanded;
    expanded = null;
    await tick();
    document
      .getElementById(`album-${block.id}-${id}`)
      ?.focus({ preventScroll: true });
    window.scrollTo({ top: albumScroll, behavior: 'auto' });
  }
  function markCoverFailed(id: string) {
    if (!failed.includes(id)) failed = [...failed, id];
  }
  onMount(() => {
    failed = Array.from(
      galleryRoot?.querySelectorAll<HTMLImageElement>(
        '.ip-album img[data-album-id]',
      ) ?? [],
    )
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.dataset.albumId!);
  });
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
    const target = document.getElementById(yearId(selectedYear));
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

<div bind:this={galleryRoot} class="album-block" class:embedded>
  {#snippet albumItems(
    year: string,
    albums: GalleryAlbum[],
    groupIndex: number,
  )}
    <ul
      class="album-grid ip-album-grid"
      aria-label={`${year} albums`}
      role="list"
    >
      {#each albums as album, index (album.id)}
        <li class="album-list-item">
          <button
            class="album ip-album"
            type="button"
            id={`album-${block.id}-${album.id}`}
            aria-expanded={expanded === album.id}
            onclick={() => {
              if (expanded === album.id) closeAlbum();
              else void openAlbum(album.id);
            }}
            aria-label={album.name}
            disabled={!album.available}
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
                {:else}<span class="placeholder" aria-hidden="true"
                    ><Icon
                      icon={mdiImageOutline}
                      size="40px"
                      aria-hidden
                    /></span
                  >{/if}
              </div>{/if}
            <div
              class="album-info ip-album-info"
              class:no-cover={!ui.showAlbumCovers}
            >
              {#if ui.showAlbumTitles}<h3 title={album.name}>
                  {album.name}
                </h3>{/if}
              {#if block.layout === 'editorial' && album.description}<p
                  class="album-description"
                >
                  {album.description}
                </p>{/if}
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
          </button>
        </li>
      {/each}
    </ul>
  {/snippet}

  <div
    class="albums ip-albums"
    class:tiles={block.layout === 'tiles'}
    class:editorial={block.layout === 'editorial'}
    aria-label="Albums"
  >
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
              for={`ip-album-search-${page.id}-${block.id}`}
            >
              Album name
              <input
                id={`ip-album-search-${page.id}-${block.id}`}
                type="search"
                autocomplete="off"
                value={searchTerm}
                oninput={updateSearch}
              />
            </label>{/if}
          {#if ui.showMonthFilter}<label
              for={`ip-album-month-${page.id}-${block.id}`}
            >
              Month
              <select
                id={`ip-album-month-${page.id}-${block.id}`}
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
              for={`ip-album-year-${page.id}-${block.id}`}
            >
              Jump to year
              <select
                id={`ip-album-year-${page.id}-${block.id}`}
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
            <button class="clear-filters" type="button" onclick={clearFilters}
              >Clear filters</button
            >
          </div>
        {:else}
          {#each visibleGroups as [year, albums], groupIndex (year)}
            {#if ui.showYearHeadings && ui.allowYearCollapse}<details
                id={yearId(year)}
                class="ip-year-group"
                open
              >
                <summary class="ip-year-heading">
                  <span class="chevron" aria-hidden="true"
                    ><Icon
                      icon={mdiChevronRight}
                      size="24px"
                      aria-hidden
                    /></span
                  >
                  <span class="year-title">{year}</span>
                  {#if ui.showYearCounts}<span class="group-count"
                      >({albums.length}
                      {albums.length === 1 ? 'Album' : 'Albums'})</span
                    >{/if}
                </summary>
                {@render albumItems(year, albums, groupIndex)}
              </details>{:else}<section
                id={yearId(year)}
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
      <span class="visually-hidden" role="status">{resultsAnnouncement}</span>
    {/if}
  </div>
  {#if expanded}<section class="expanded-album" aria-label="Expanded album">
      <div class="expanded-heading">
        <h2>{page.albums.find((a) => a.id === expanded)?.name}</h2>
        <button type="button" onclick={closeAlbum}>Close album</button>
      </div>
      {#key expanded}<PhotoSource
          pageId={page.id}
          sourceId={expanded}
          kind="album"
          {preview}
          {revision}
          allowDownload={page.allowDownload ?? true}
        />{/key}
    </section>{/if}
</div>

<style>
  .albums {
    padding: 0 var(--pager-gallery-inline-padding, 16px) 40px;
    max-width: var(--pager-content-width, 1600px);
    margin-inline: auto;
  }
  .embedded .albums {
    padding: 0;
    max-width: none;
  }
  .embedded .album-grid {
    column-gap: 24px;
  }
  .embedded .albums:not(.editorial) .album {
    padding: 0;
    border: 0;
  }
  .embedded .browse-controls,
  .embedded .browse-summary {
    padding-inline: 0;
  }
  .embedded .expanded-album {
    margin-inline: 0;
  }
  .browse-controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr));
    align-items: end;
    gap: 16px;
    padding: 0 8px 8px;
  }
  .browse-controls label {
    display: grid;
    min-width: 0;
    gap: 8px;
    margin: 0;
    font-size: var(--pager-control-font-size, 0.875rem);
    font-weight: 500;
    opacity: 0.78;
  }
  .browse-controls input,
  .browse-controls select {
    box-sizing: border-box;
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
  @media (prefers-reduced-motion: reduce) {
    .album:hover,
    .album:focus-visible {
      transform: none;
    }
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
  @media (max-width: 600px) {
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
  }
  .album {
    color: inherit;
    width: 100%;
    text-align: left;
    font: inherit;
    background: transparent;
    cursor: pointer;
  }
  .tiles .album-grid {
    gap: 16px;
  }
  .tiles .album {
    position: relative;
    padding: 0;
    overflow: hidden;
  }
  .tiles .cover {
    aspect-ratio: 0.8;
  }
  .tiles .album-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 48px 18px 18px;
    background: linear-gradient(transparent, #000c);
    color: #fff;
  }
  .editorial .album-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .editorial .album {
    display: grid;
    grid-template-columns: minmax(160px, 280px) minmax(0, 1fr);
    gap: 24px;
    padding: 16px;
    align-items: center;
  }
  .editorial .cover {
    aspect-ratio: 4 / 3;
    max-width: 320px;
  }
  .editorial .album-info {
    margin: 0;
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  .editorial h3 {
    font-size: max(1.125rem, var(--pager-card-title-size, 1.125rem));
  }
  .editorial .album-description {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
    white-space: pre-line;
    max-width: 65ch;
  }
  .expanded-album {
    margin: 24px var(--pager-gallery-inline-padding, 16px);
    padding: 24px 8px 0;
    border-top: 1px solid #8885;
  }
  .expanded-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .expanded-heading h2 {
    font-size: 1.3em;
  }
  .expanded-heading button {
    border: 1px solid #8885;
    border-radius: 24px;
    padding: 8px 16px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  @media (max-width: 600px) {
    .editorial .album {
      grid-template-columns: minmax(100px, 34%) minmax(0, 1fr);
      gap: 16px;
      padding: 12px;
    }
  }
</style>
