<script lang="ts">
  import Gallery from '$lib/components/Gallery.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.page.title} · Private preview · ImmichPager</title>
</svelte:head>

<Gallery page={data.page} preview />
