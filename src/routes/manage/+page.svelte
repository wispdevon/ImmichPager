<script lang="ts">
  import { Button, Field, Input, Select } from '@immich/ui';
  import CopyLink from '$lib/components/CopyLink.svelte';
  import PagePreviewThumbnail from '$lib/components/PagePreviewThumbnail.svelte';
  import {
    filterManagementPages,
    pageManagementFilters,
    type PageManagementFilter,
  } from '$lib/page-management';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let search = $state('');
  let filter = $state<PageManagementFilter>('all');
  const filterOptions = pageManagementFilters.map(({ value, label }) => ({
    value,
    label,
  }));
  const visible = $derived(filterManagementPages(data.pages, search, filter));
  const selectedFilter = $derived(
    pageManagementFilters.find((option) => option.value === filter)?.label ??
      'All pages',
  );
  const hasFilters = $derived(Boolean(search) || filter !== 'all');
</script>

<svelte:head><title>Pages · ImmichPager</title></svelte:head>
<main class="shell">
  <header class="pages-toolbar">
    <h1>Pages</h1>
    <div class="search">
      <Input
        type="search"
        aria-label="Search pages"
        placeholder="Search pages"
        bind:value={search}
      />
    </div>
    <Button shape="round" href="/page/manage/new">＋ Create page</Button>
  </header>

  <div class="page-controls">
    <Field label="Filter pages" class="filter-field">
      <Select bind:value={filter} options={filterOptions} />
    </Field>
    <p class="result-count">
      {visible.length}
      {visible.length === 1 ? 'page' : 'pages'}
    </p>
  </div>

  {#if visible.length}
    {#each visible as page (page.id)}
      <article class="page-row" data-testid="management-page-row">
        <a class="page-title" href={`/page/manage/${page.id}`}>
          <PagePreviewThumbnail {page} />
          <div class="page-copy">
            <h2>{page.title || 'Untitled page'}</h2>
            <p class="muted">
              {#if page.publishedSlug}
                /page/{page.publishedSlug}
              {:else if page.status === 'draft' && page.slug}
                /page/{page.slug}
              {:else if page.status === 'draft'}
                Add a title to set the URL
              {:else}
                Page link unavailable while synchronization is unresolved
              {/if}
            </p>
            <div class="page-meta">
              <span>{page.albumIds.length} albums</span>
              <span
                class:live={page.status === 'published'}
                class:attention={page.status === 'error'}
                class:updating={page.status === 'syncing'}
              >
                {#if page.status === 'error'}
                  Needs attention
                {:else if page.status === 'syncing'}
                  Updating
                {:else if page.status === 'published'}
                  Published
                {:else}
                  Draft
                {/if}
              </span>
              {#if page.status === 'published' && page.hasUnpublishedChanges}
                <span>Unpublished changes</span>
              {/if}
            </div>
          </div>
        </a>
        <div class="row-actions">
          <CopyLink slug={page.publishedSlug} />
          {#if page.publishedSlug}
            <Button
              variant="ghost"
              color="secondary"
              href={`/page/${page.publishedSlug}`}
              target="_blank"
              aria-label={`Open ${page.title}`}>↗</Button
            >
          {/if}
          <Button
            variant="ghost"
            color="secondary"
            href={`/page/manage/${page.id}?options=1`}
            aria-label={`Options for ${page.title || 'Untitled page'}`}
            >⋯</Button
          >
        </div>
      </article>
    {/each}
  {:else}
    <div class="empty" role="status">
      <h2>
        {hasFilters
          ? 'No matching pages'
          : 'Your first client page starts here'}
      </h2>
      <p class="muted">
        {#if search && filter !== 'all'}
          Try another title or URL, or choose All pages.
        {:else if search}
          Try another title or URL.
        {:else if filter !== 'all'}
          No {selectedFilter.toLowerCase()} pages yet. Choose All pages to see every
          page.
        {:else}
          Choose albums, add your branding, and share one persistent link.
        {/if}
      </p>
      {#if !data.pages.length}
        <Button variant="ghost" href="/page/manage/new">Create a page →</Button>
      {/if}
    </div>
  {/if}

  <footer>
    <span class="muted">Signed in as {data.user.name}</span>
    <a href="https://github.com/wispdevon/ImmichPager"
      >Source & contributions ↗</a
    >
  </footer>
</main>

<style>
  .pages-toolbar {
    display: flex;
    align-items: center;
    gap: 24px;
    padding-bottom: 28px;
    border-bottom: 1px solid #292a2d;
  }
  .pages-toolbar h1 {
    font-size: 24px;
    letter-spacing: 0;
    margin: 0;
  }
  .search {
    margin-left: auto;
    max-width: 360px;
    flex: 1;
  }
  .page-controls {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    padding-block: 16px;
  }
  :global(.filter-field) {
    max-width: 240px;
  }
  .result-count {
    margin: 0 0 10px auto;
    color: #9aa0a6;
    font-size: 12px;
  }
  .page-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 1px solid #292a2d;
    padding-block: 20px;
    min-width: 0;
  }
  .page-title {
    display: flex;
    align-items: center;
    gap: 18px;
    min-width: 0;
    text-decoration: none;
    flex: 1;
  }
  .page-copy {
    min-width: 0;
    flex: 1;
  }
  .page-title:hover h2 {
    color: #accbfa;
  }
  .page-title h2 {
    font-size: 19px;
    line-height: 1.4;
    margin: 0 0 8px;
    overflow-wrap: anywhere;
  }
  .page-title p {
    margin: 0;
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .page-meta {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #9aa0a6;
    margin-top: 12px;
  }
  .live {
    color: #a5d6b3;
  }
  .attention {
    color: #f3a69a;
  }
  .updating {
    color: #f1d58b;
  }
  .row-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .empty {
    padding: 80px 20px;
    text-align: center;
  }
  .empty p {
    margin: 16px auto;
    max-width: 390px;
    line-height: 1.7;
  }
  footer {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding-top: 32px;
    font-size: 12px;
  }
  @media (max-width: 650px) {
    .pages-toolbar {
      gap: 12px;
      flex-wrap: wrap;
    }
    .search {
      order: 3;
      flex-basis: 100%;
      max-width: none;
    }
    .pages-toolbar :global(a) {
      margin-left: auto;
    }
    .page-controls {
      align-items: stretch;
      flex-direction: column;
      gap: 8px;
    }
    :global(.filter-field) {
      max-width: none;
    }
    .result-count {
      align-self: flex-end;
      margin: 0;
    }
    .page-row {
      flex-wrap: wrap;
      gap: 14px;
    }
    .page-title {
      align-items: flex-start;
      flex-basis: 100%;
      gap: 12px;
    }
    .page-title h2 {
      margin-bottom: 6px;
    }
    .page-meta {
      gap: 10px;
      margin-top: 8px;
    }
    .row-actions {
      margin-left: auto;
    }
    footer {
      flex-direction: column;
    }
  }
</style>
