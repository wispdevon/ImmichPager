<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Pages · ImmichPager</title></svelte:head>
<main class="shell">
  <div class="bar">
    <div>
      <p class="eyebrow">IMMICH / PAGES</p>
      <h1>Client pages</h1>
      <p class="muted">One link for every chapter of your work.</p>
    </div>
    <a class="new-page primary" href="/page/manage/new">＋ Create page</a>
  </div>
  <div class="list-heading">
    <span>Page</span><span>Albums</span><span>Status</span>
  </div>
  {#each data.pages as page (page.id)}
    <a class="page-row" href={`/page/manage/${page.id}`}
      ><div>
        <h2>{page.title}</h2>
        <p class="muted">/page/{page.slug}</p>
      </div>
      <span>{page.albumIds.length}</span><span
        class:published={page.status === 'published'}
        >{page.status === 'error' ? 'Needs attention' : page.status}</span
      ></a
    >
  {:else}<div class="empty">
      <div class="empty-icon" aria-hidden="true">▦</div>
      <h2>Your first client page starts here</h2>
      <p class="muted">
        Choose albums from Immich, make it yours, and share one persistent link.
      </p>
      <a href="/page/manage/new">Create a page →</a>
    </div>{/each}
  <footer>
    <span class="muted">Signed in as {data.user.name}</span><a
      href="https://github.com/wispdevon/ImmichPager"
      >Source & contributions ↗</a
    >
  </footer>
</main>

<style>
  .eyebrow {
    font-size: 11px;
    letter-spacing: 2px;
    opacity: 0.5;
    margin-bottom: 12px;
  }
  .new-page {
    padding: 12px 18px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 14px;
  }
  .list-heading,
  .page-row {
    display: grid;
    grid-template-columns: 1fr 90px 150px;
    align-items: center;
    gap: 16px;
    border-bottom: 1px solid #292929;
  }
  .list-heading {
    padding: 20px 0;
    font-size: 12px;
    opacity: 0.5;
  }
  .page-row {
    padding: 24px 0;
    text-decoration: none;
  }
  .page-row h2 {
    margin: 0 0 6px;
    font-size: 19px;
  }
  .page-row p {
    margin: 0;
    font-size: 13px;
  }
  .page-row > span:last-child {
    text-transform: capitalize;
    font-size: 13px;
  }
  .published {
    color: #a5d6b3;
  }
  .page-row:hover h2 {
    color: #accbfa;
  }
  .empty {
    padding: 80px 20px;
    text-align: center;
  }
  .empty-icon {
    font-size: 52px;
    opacity: 0.3;
  }
  .empty p {
    max-width: 390px;
    margin: 12px auto 28px;
    line-height: 1.7;
  }
  footer {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding-top: 32px;
    font-size: 12px;
  }
  @media (max-width: 600px) {
    .list-heading,
    .page-row {
      grid-template-columns: 1fr 45px 95px;
      gap: 8px;
    }
    footer {
      flex-direction: column;
    }
  }
</style>
