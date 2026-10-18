<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head
  ><title
    >{page.status === 401 ? 'Sign in required' : 'Page unavailable'} · ImmichPager</title
  ></svelte:head
>
<main class="shell">
  <h1>
    {page.status === 401
      ? 'Sign in to Immich'
      : page.status === 404
        ? 'Page not found'
        : 'Something went wrong'}
  </h1>
  <p class="muted">{page.error?.message || 'Please try again shortly.'}</p>
  {#if page.status === 401}<a href="/auth/login">Continue to Immich →</a
    >{:else}<a href="/">Return to Immich →</a>{/if}
</main>
