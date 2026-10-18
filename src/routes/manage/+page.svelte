<script lang="ts">
  import { Button, Input } from '@immich/ui';
  import CopyLink from '$lib/components/CopyLink.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let search = $state('');
  const visible = $derived(
    data.pages.filter((p) =>
      `${p.title} ${p.slug}`.toLowerCase().includes(search.toLowerCase()),
    ),
  );
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
  {#each visible as page (page.id)}<article class="page-row">
      <a class="page-title" href={`/page/manage/${page.id}`}
        ><h2>{page.title || 'Untitled page'}</h2>
        <p class="muted">
          {page.publishedSlug
            ? `/page/${page.publishedSlug}`
            : page.slug
              ? `/page/${page.slug}`
              : 'Add a title to set the URL'}
        </p>
        <div class="page-meta">
          <span>{page.albumIds.length} albums</span><span
            class:live={!!page.publishedSlug}
            >{page.status === 'error'
              ? 'Needs attention'
              : page.publishedSlug
                ? 'Published'
                : 'Draft'}</span
          >{#if page.publishedSlug && page.hasUnpublishedChanges}<span
              >Unpublished changes</span
            >{/if}
        </div></a
      >
      <div class="row-actions">
        <CopyLink slug={page.publishedSlug} />{#if page.publishedSlug}<Button
            variant="ghost"
            color="secondary"
            href={`/page/${page.publishedSlug}`}
            target="_blank"
            aria-label={`Open ${page.title}`}>↗</Button
          >{/if}<Button
          variant="ghost"
          color="secondary"
          href={`/page/manage/${page.id}?options=1`}
          aria-label={`Options for ${page.title || 'Untitled page'}`}>⋯</Button
        >
      </div>
    </article>
  {:else}<div class="empty">
      <h2>
        {search ? 'No matching pages' : 'Your first client page starts here'}
      </h2>
      <p class="muted">
        {search
          ? 'Try another title or URL.'
          : 'Choose albums, add your branding, and share one persistent link.'}
      </p>
      {#if !search}<Button variant="ghost" href="/page/manage/new"
          >Create a page →</Button
        >{/if}
    </div>{/each}
  <footer>
    <span class="muted">Signed in as {data.user.name}</span><a
      href="https://github.com/wispdevon/ImmichPager"
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
  .page-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 1px solid #292a2d;
    padding-block: 26px;
    min-width: 0;
  }
  .page-title {
    min-width: 0;
    text-decoration: none;
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
    .page-row {
      flex-wrap: wrap;
      gap: 14px;
    }
    .page-title {
      flex-basis: 100%;
    }
    .row-actions {
      margin-left: auto;
    }
    footer {
      flex-direction: column;
    }
  }
</style>
