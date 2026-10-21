<script lang="ts">
  import type { DraftEditorPage } from '$lib/contracts';

  let {
    page,
  }: {
    page: Pick<DraftEditorPage, 'id' | 'banner' | 'logo' | 'draftRevision'>;
  } = $props();

  let failedBannerAtRevision = $state<number | null>(null);
  let failedLogoAtRevision = $state<number | null>(null);
  const showBanner = $derived(
    page.banner && failedBannerAtRevision !== page.draftRevision,
  );
  const showLogo = $derived(
    page.logo && failedLogoAtRevision !== page.draftRevision,
  );
  const kind = $derived(showBanner ? 'banner' : showLogo ? 'logo' : 'generic');
</script>

<div
  class="page-preview"
  class:logo-only={!showBanner && showLogo}
  data-testid="page-preview-{page.id}"
  data-preview-kind={kind}
  aria-hidden="true"
>
  <div class="preview-fallback">
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path d="m5 18 5-5 3 3 2-2 4 4" stroke="currentColor" />
    </svg>
  </div>
  {#if showBanner}
    <img
      class="preview-banner"
      src={`/page/media/${page.id}/branding/banner?preview=1`}
      alt=""
      width="160"
      height="90"
      loading="lazy"
      onerror={() => (failedBannerAtRevision = page.draftRevision)}
    />
  {/if}
  {#if showLogo}
    <img
      class="preview-logo"
      src={`/page/media/${page.id}/branding/logo?preview=1`}
      alt=""
      width="48"
      height="48"
      loading="lazy"
      onerror={() => (failedLogoAtRevision = page.draftRevision)}
    />
  {/if}
</div>

<style>
  .page-preview {
    position: relative;
    display: grid;
    flex: 0 0 168px;
    aspect-ratio: 16 / 9;
    place-items: center;
    overflow: hidden;
    border: 1px solid #292a2d;
    border-radius: 8px;
    background: #202124;
    color: #74777d;
  }
  .preview-fallback {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .preview-banner {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .preview-logo {
    position: absolute;
    left: 8px;
    bottom: 8px;
    width: 40px;
    height: 40px;
    padding: 4px;
    border-radius: 6px;
    background: rgb(0 0 0 / 56%);
    object-fit: contain;
  }
  .page-preview.logo-only .preview-logo {
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 18px;
    border-radius: 0;
    background: transparent;
  }

  @media (max-width: 650px) {
    .page-preview {
      flex-basis: 104px;
    }
  }
</style>
