<script lang="ts">
  import '../app.css';
  import '../lib/management-theme.css';
  import { TooltipProvider } from '@immich/ui';
  import { page } from '$app/state';
  import { installHostTheme, isManagementEditorPath } from '$lib/host-theme';
  let { children } = $props();

  $effect(() => {
    if (isManagementEditorPath(page.url.pathname)) return installHostTheme();
  });
</script>

<TooltipProvider>
  {#key `${page.route.id}:${page.params.id || page.params.slug || ''}`}
    {@render children()}
  {/key}
</TooltipProvider>
