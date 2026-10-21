<script lang="ts">
  import { compileCustomCss, stylesheetMarkup } from '$lib/custom-css';
  import type { GalleryPage } from '$lib/contracts';
  import { albumGroups, dateRange, filterAlbumGroups } from '$lib/gallery';
  let { page, preview = false }: { page: GalleryPage; preview?: boolean } =
    $props();
  let failed = $state<string[]>([]);
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
  const styling = $derived(compileCustomCss(page.customCss ?? '', page.id));
  const overlay = $derived(page.headerLayout === 'overlay' && !!page.banner);

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
    if (!(target instanceof HTMLDetailsElement)) return;
    target.open = true;
    target.querySelector('summary')?.focus({ preventScroll: true });
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

<div class="gallery-boundary">
  {@html stylesheetMarkup(styling.css)}
  <div
    class="gallery ip-gallery"
    data-pager-gallery={page.id}
    class:overlay
    class:light={page.theme === 'light'}
    class:system={page.theme === 'system'}
    style:--custom-bg={page.background || undefined}
    style:--custom-fg={page.foreground || undefined}
    style:--accent={page.accent}
  >
    <div class="hero ip-hero">
      {#if page.banner}<div class="banner ip-banner">
          <img
            src={page.banner}
            alt=""
            fetchpriority="high"
            style:object-position={`center ${page.bannerPosition}%`}
          />
        </div>{/if}
      <header class="ip-header" class:centered={page.alignment === 'center'}>
        {#if page.logo}<img
            class="logo ip-logo"
            src={page.logo}
            alt=""
            width="80"
            height="80"
          />{/if}
        <h1 class="ip-title">{page.title}</h1>
        {#if page.description}<p class="description ip-description">
            {page.description}
          </p>{/if}
      </header>
    </div>
    <main class="albums ip-albums" aria-label="Albums">
      {#if page.albums.length === 0}<div class="empty">
          <h2>No albums yet</h2>
          <p>The next chapter is on its way.</p>
        </div>
      {:else}
        <div
          class="browse-controls ip-browse-controls"
          role="search"
          aria-label="Filter albums and jump to a year"
          aria-controls={resultsId}
        >
          <label class="search-control" for={`ip-album-search-${page.id}`}>
            Album name
            <input
              id={`ip-album-search-${page.id}`}
              type="search"
              autocomplete="off"
              value={searchTerm}
              oninput={updateSearch}
            />
          </label>
          <label for={`ip-album-month-${page.id}`}>
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
          </label>
          {#if visibleGroups.length > 1}
            <label for={`ip-album-year-${page.id}`}>
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
            </label>
          {/if}
          {#if hasActiveFilters && visibleAlbumCount > 0}
            <button class="clear-filters" type="button" onclick={clearFilters}
              >Clear filters</button
            >
          {/if}
        </div>
        <div class="browse-summary">
          <p>
            {#if hasActiveFilters}
              {visibleAlbumCount} of {page.albums.length} albums
            {:else}
              {page.albums.length} albums
            {/if}
          </p>
        </div>
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
              <details
                id={`ip-year-${year.toLowerCase()}`}
                class="ip-year-group"
                open
              >
                <summary class="ip-year-heading">
                  <span class="chevron" aria-hidden="true">›</span>
                  <span class="year-title">{year}</span>
                  <span class="group-count"
                    >({albums.length}
                    {albums.length === 1 ? 'Album' : 'Albums'})</span
                  >
                </summary>
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
                        aria-disabled={!album.available || preview}
                        tabindex={preview || !album.available ? -1 : 0}
                      >
                        <div class="cover ip-cover">
                          {#if album.cover && !failed.includes(album.id)}
                            <img
                              src={album.cover}
                              alt=""
                              width="400"
                              height="400"
                              loading={groupIndex === 0 && index < 4
                                ? 'eager'
                                : 'lazy'}
                              fetchpriority={!page.banner &&
                              groupIndex === 0 &&
                              index === 0
                                ? 'high'
                                : undefined}
                              onerror={() => (failed = [...failed, album.id])}
                            />
                          {:else}<span class="placeholder" aria-hidden="true"
                              >▧</span
                            >{/if}
                        </div>
                        <div class="album-info ip-album-info">
                          <h3 title={album.name}>{album.name}</h3>
                          {#if dateRange(album.startDate, album.endDate)}<p>
                              {dateRange(album.startDate, album.endDate)}
                            </p>{/if}
                          <p>
                            {album.available
                              ? `${album.count.toLocaleString('en')} items`
                              : 'Currently unavailable'}{#if album.available}<span
                                class="shared"
                              >
                                · Shared</span
                              >{/if}
                          </p>
                        </div>
                      </a>
                    </li>
                  {/each}
                </ul>
              </details>
            {/each}
          {/if}
        </div>
        <span class="visually-hidden" role="status">{resultsAnnouncement}</span>
      {/if}
    </main>
    <footer class="ip-footer">
      <a
        href="https://github.com/wispdevon/ImmichPager"
        target="_blank"
        rel="noreferrer">ImmichPager</a
      >
      ·
      <a
        href="https://github.com/wispdevon/ImmichPager/blob/main/LICENSE"
        target="_blank"
        rel="noreferrer">Source & license</a
      >
    </footer>
  </div>
</div>

<style>
  .gallery-boundary {
    contain: layout paint;
    isolation: isolate;
    min-height: 100dvh;
  }
  .gallery {
    --base-bg: #000;
    --base-fg: #f5f5f5;
    background: var(--pager-background, var(--custom-bg, var(--base-bg)));
    color: var(--pager-foreground, var(--custom-fg, var(--base-fg)));
    min-height: 100dvh;
    color-scheme: dark;
  }
  .gallery.light {
    --base-bg: #fff;
    --base-fg: #191919;
    color-scheme: light;
  }
  @media (prefers-color-scheme: light) {
    .gallery.system {
      --base-bg: #fff;
      --base-fg: #191919;
      color-scheme: light;
    }
  }
  .hero {
    position: relative;
  }
  .overlay .hero {
    display: grid;
    min-height: clamp(260px, 32vw, 460px);
    margin-block-end: 32px;
  }
  .overlay .banner {
    position: absolute;
    inset: 0;
    height: 100%;
  }
  .overlay .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgb(0 0 0 / 25%), rgb(0 0 0 / 78%));
    pointer-events: none;
  }
  .overlay header {
    position: relative;
    z-index: 1;
    align-self: end;
    width: 100%;
    box-sizing: border-box;
    color: #fff;
  }
  .banner {
    width: 100%;
    height: clamp(180px, 26vw, 360px);
    overflow: hidden;
  }
  .banner img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  header {
    padding: 52px 40px 40px;
    max-width: 1600px;
    margin: auto;
  }
  header.centered {
    text-align: center;
  }
  .logo {
    object-fit: contain;
    margin-block-end: 20px;
    display: inline-block;
  }
  h1 {
    font-size: clamp(30px, 3.4vw, 48px);
    line-height: 1.15;
    font-weight: 650;
    letter-spacing: -1.3px;
    margin: 0;
    overflow-wrap: anywhere;
  }
  .description {
    font-size: 18px;
    opacity: 0.72;
    max-width: 720px;
    white-space: pre-line;
    line-height: 1.6;
    margin-block: 16px 0;
  }
  .centered .description {
    margin-inline: auto;
  }
  .albums {
    padding: 0 16px 40px;
    max-width: 1600px;
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
    font-size: 14px;
    font-weight: 600;
  }
  .browse-controls input,
  .browse-controls select {
    width: 100%;
    min-width: 0;
    min-height: 48px;
    padding: 0 12px;
    border: 1px solid color-mix(in srgb, currentColor 24%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, currentColor 6%, transparent);
    color: inherit;
    font-size: 16px;
  }
  .clear-filters {
    min-height: 48px;
    padding: 0 16px;
    border: 1px solid color-mix(in srgb, currentColor 24%, transparent);
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .clear-filters:hover {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
  .browse-summary {
    padding: 0 8px 8px;
    font-size: 14px;
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
    align-items: baseline;
    gap: 12px;
    list-style: none;
    border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    padding: 16px 8px 12px;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .chevron {
    display: inline-block;
    font-size: 34px;
    line-height: 1;
  }
  .year-title {
    font-size: 42px;
    line-height: 1.1;
    font-weight: 700;
    letter-spacing: -0.8px;
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
    font-size: 24px;
    opacity: 0.85;
  }
  .album-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    column-gap: 24px;
    row-gap: 46px;
    padding: 30px 0 42px;
    margin: 0;
    list-style: none;
  }
  .album-list-item {
    min-width: 0;
  }
  .album {
    display: block;
    min-width: 0;
    text-decoration: none;
    padding: 12px;
    border: 1px solid transparent;
    border-radius: 18px;
  }
  .album:hover {
    background: color-mix(in srgb, currentColor 5%, transparent);
    border-color: color-mix(in srgb, currentColor 12%, transparent);
  }
  .album:hover h3 {
    color: var(--pager-accent, var(--accent));
  }
  .cover {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 16px;
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
    margin-block-start: 18px;
  }
  h3 {
    font-size: 26px;
    line-height: 1.28;
    font-weight: 600;
    margin: 0 0 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  .album-info p {
    font-size: 20px;
    line-height: 1.4;
    opacity: 0.86;
    margin: 0;
  }
  .empty {
    padding: 70px 24px;
    text-align: center;
  }
  footer {
    padding: 28px 40px;
    font-size: 12px;
    opacity: 0.5;
  }
  @media (max-width: 600px) {
    header {
      padding: 32px 20px;
    }
    .albums {
      padding-inline: 8px;
    }
    .browse-controls {
      padding-inline: 8px;
    }
    .browse-controls label {
      font-size: 13px;
    }
    .browse-controls input,
    .browse-controls select {
      padding-inline: 10px;
    }
    .browse-summary {
      padding-inline: 8px;
    }
    .album-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px 2px;
      padding-top: 18px;
    }
    .album {
      padding: 8px;
      border-radius: 12px;
    }
    .cover {
      border-radius: 12px;
    }
    h3 {
      font-size: 17px;
    }
    .album-info p {
      font-size: 13px;
    }
    .album-info {
      margin-top: 12px;
    }
    h2 {
      font-size: 28px;
    }
    .year-title {
      font-size: 28px;
    }
    .group-count {
      font-size: 16px;
    }
    .shared {
      display: none;
    }
    footer {
      padding: 24px;
    }
  }
</style>
