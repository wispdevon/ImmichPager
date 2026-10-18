<script lang="ts">
  import type { GalleryPage } from '$lib/contracts';
  import { albumGroups, dateRange } from '$lib/gallery';
  let { page, preview = false }: { page: GalleryPage; preview?: boolean } =
    $props();
  let failed = $state<string[]>([]);
  const groups = $derived(albumGroups(page));
</script>

<div
  class="gallery"
  class:light={page.theme === 'light'}
  class:system={page.theme === 'system'}
  style:--custom-bg={page.background || undefined}
  style:--custom-fg={page.foreground || undefined}
  style:--accent={page.accent}
>
  {#if page.banner}<div class="banner">
      <img
        src={page.banner}
        alt=""
        fetchpriority="high"
        style:object-position={`center ${page.bannerPosition}%`}
      />
    </div>{/if}
  <header class:centered={page.alignment === 'center'}>
    {#if page.logo}<img
        class="logo"
        src={page.logo}
        alt=""
        width="80"
        height="80"
      />{/if}
    <h1>{page.title}</h1>
    {#if page.description}<p class="description">{page.description}</p>{/if}
  </header>
  <main class="albums" aria-label="Albums">
    {#each groups as [year, albums], groupIndex (year)}
      <details open>
        <summary
          ><span class="chevron" aria-hidden="true">›</span>
          <h2>{year}</h2>
          <span class="group-count"
            >({albums.length} {albums.length === 1 ? 'Album' : 'Albums'})</span
          ></summary
        >
        <div class="album-grid">
          {#each albums as album, index (album.id)}
            <a
              class="album"
              href={preview ? undefined : album.href || undefined}
              aria-disabled={!album.available || preview}
              tabindex={preview || !album.available ? -1 : 0}
            >
              <div class="cover">
                {#if album.cover && !failed.includes(album.id)}
                  <img
                    src={album.cover}
                    alt=""
                    width="400"
                    height="400"
                    loading={groupIndex === 0 && index < 4 ? 'eager' : 'lazy'}
                    fetchpriority={!page.banner &&
                    groupIndex === 0 &&
                    index === 0
                      ? 'high'
                      : undefined}
                    onerror={() => (failed = [...failed, album.id])}
                  />
                {:else}<span class="placeholder" aria-hidden="true">▧</span
                  >{/if}
              </div>
              <div class="album-info">
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
          {/each}
        </div>
      </details>
    {:else}<div class="empty">
        <h2>No albums yet</h2>
        <p>The next chapter is on its way.</p>
      </div>{/each}
  </main>
  <footer>
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

<style>
  .gallery {
    --base-bg: #000;
    --base-fg: #f5f5f5;
    background: var(--custom-bg, var(--base-bg));
    color: var(--custom-fg, var(--base-fg));
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
    color: var(--accent);
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
