<script lang="ts">
  import '../app.css';
  import { TooltipProvider } from '@immich/ui';
  import { page } from '$app/state';
  let { children } = $props();
</script>

<TooltipProvider>
  {#key `${page.route.id}:${page.params.id || page.params.slug || ''}`}
    {@render children()}
  {/key}
</TooltipProvider>
