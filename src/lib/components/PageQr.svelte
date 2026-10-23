<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Modal, ModalBody, ModalFooter } from '@immich/ui';
  import { mdiDownload } from '@mdi/js';
  import { labelDialog } from '$lib/actions/dialog-label';
  import { createPageQr } from '$lib/qr-code';
  let { slug, onClose }: { slug: string; onClose: () => void } = $props();
  let qr = $state<Awaited<ReturnType<typeof createPageQr>> | null>(null);
  let error = $state('');
  onMount(() => {
    let active = true;
    void createPageQr(location.origin, slug)
      .then((result) => {
        if (active) qr = result;
      })
      .catch(() => {
        if (active)
          error = 'Could not generate the QR code. Close and try again.';
      });
    return () => {
      active = false;
    };
  });
</script>

<Modal title="QR code" size="small" {onClose} focusOnOpen>
  <ModalBody>
    <div class="qr" use:labelDialog={'QR code'}>
      {#if error}<p role="alert">{error}</p>
      {:else if qr}
        <img
          src={qr.png}
          alt="QR code for the published client page"
          width="1024"
          height="1024"
        />
        <p>{qr.url}</p>
        <div class="downloads">
          <Button
            leadingIcon={mdiDownload}
            href={qr.png}
            download={`${qr.filename}.png`}>Download PNG</Button
          >
          <Button
            leadingIcon={mdiDownload}
            href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`}
            download={`${qr.filename}.svg`}>Download SVG</Button
          >
        </div>
      {:else}<p role="status">Generating QR code…</p>{/if}
    </div>
  </ModalBody>
  <ModalFooter
    ><Button variant="ghost" onclick={onClose}>Close</Button></ModalFooter
  >
</Modal>

<style>
  .qr {
    display: grid;
    gap: 16px;
    padding-block: 16px;
  }
  .qr img {
    width: 100%;
    height: auto;
    background: white;
  }
  .qr p {
    overflow-wrap: anywhere;
    font-size: 13px;
  }
  .downloads {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
