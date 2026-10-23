<script lang="ts">
  import { labelDialog } from '$lib/actions/dialog-label';
  import {
    Modal,
    ModalBody,
    ModalFooter,
    Button,
    Field,
    Input,
    Switch,
    PasswordInput,
    IconButton,
    Icon,
  } from '@immich/ui';
  import { mdiOpenInNew, mdiQrcode } from '@mdi/js';
  import PublishedView from './PublishedView.svelte';
  import PageQr from './PageQr.svelte';
  import { pageInputSchema } from '$lib/contracts';
  import { onMount } from 'svelte';
  import CopyLink from './CopyLink.svelte';
  import type { PageInput, DraftEditorPage } from '$lib/contracts';

  let {
    fields = $bindable(),
    saved,
    message = '',
    busy = false,
    saving = false,
    saveStatus,
    canPublish,
    onClose,
    onpublish,
    onaction,
    onSlugEdit,
  }: {
    fields: PageInput;
    saved: DraftEditorPage | null;
    message?: string;
    busy?: boolean;
    saving?: boolean;
    saveStatus: string;
    canPublish: boolean;
    onClose: () => void;
    onpublish: () => void;
    onaction: (action: 'unpublish' | 'delete' | 'retry') => void;
    onSlugEdit: () => void;
  } = $props();

  let editUrl = $state(false);
  let qrOpen = $state(false);
  let origin = $state('');
  onMount(() => {
    origin = location.origin;
  });
  const slugResult = $derived(
    pageInputSchema.shape.slug.safeParse(fields.slug),
  );
  function changeUrl() {
    editUrl = true;
  }
  function cancelPassword() {
    fields.passwordMode = 'keep';
    fields.password = '';
  }
</script>

{#snippet settingsBody()}
  <div class="options-body" use:labelDialog={'Page settings'}>
    {#if message}<div role="alert" class="notice error">{message}</div>{/if}
    <section>
      <h2>Page status</h2>
      <strong
        >{saved?.status === 'error'
          ? 'Synchronization error'
          : saved?.publishedSlug
            ? canPublish
              ? 'Unpublished changes'
              : 'Published'
            : 'Draft'}</strong
      >
      <p class="hint">
        {saved?.publishedSlug
          ? 'Your live page stays unchanged until you publish. Draft changes are private.'
          : 'This page is private until published.'}
      </p>
      {#if saved?.status === 'error'}
        <p role="alert">This page is hidden until synchronization finishes.</p>
        <Button disabled={busy} onclick={() => onaction('retry')}
          >Retry synchronization</Button
        >
      {/if}
    </section>
    <section>
      <h2>Client link</h2>
      {#if saved?.publishedSlug}<PublishedView
          slug={saved.publishedSlug}
          hasPassword={saved.hasPassword}
        />{/if}
      <div class="link-row">
        <p>
          {saved?.publishedSlug
            ? `${origin}/page/${saved.publishedSlug}`
            : 'Publish this page first.'}
        </p>
        <div class="link-actions">
          <CopyLink compact slug={saved?.publishedSlug ?? null} />
          <IconButton
            icon={mdiOpenInNew}
            variant="ghost"
            aria-label="Open client page"
            title={saved?.publishedSlug
              ? 'Open client page'
              : 'Publish this page first'}
            disabled={!saved?.publishedSlug}
            onclick={() => {
              if (saved?.publishedSlug)
                window.open(
                  `${origin}/page/${saved.publishedSlug}`,
                  '_blank',
                  'noopener,noreferrer',
                );
            }}
          />
          <IconButton
            icon={mdiQrcode}
            variant="ghost"
            aria-label="QR code"
            title={saved?.publishedSlug ? 'QR code' : 'Publish this page first'}
            disabled={!saved?.publishedSlug}
            onclick={() => (qrOpen = true)}
          />
        </div>
      </div>
      {#if saved?.publishedSlug && fields.slug !== saved.publishedSlug}
        <p class="hint">
          Pending URL (unpublished): {origin}/page/{fields.slug}
        </p>
      {/if}
      {#if saved?.publishedSlug && !editUrl}
        <Button variant="ghost" color="secondary" onclick={changeUrl}
          >Change page URL</Button
        >
      {:else}
        <Field label="Page URL">
          <div class="url-input">
            <span>/page/</span><Input
              maxlength={80}
              bind:value={fields.slug}
              oninput={onSlugEdit}
              aria-invalid={!slugResult.success}
              aria-describedby="slug-feedback"
            />
          </div>
        </Field>
        <p id="slug-feedback" class="hint">
          {slugResult.success
            ? 'Use lowercase letters, numbers, and single hyphens.'
            : fields.slug
              ? 'Use lowercase letters, numbers, and single hyphens; reserved URLs are unavailable.'
              : 'Enter a URL before publishing.'}
        </p>
        {#if saved?.publishedSlug}<p class="hint">
            The old link stops working after you publish the new URL.
          </p>{/if}
      {/if}
    </section>
    <section>
      <h2>Access</h2>
      <div>
        <strong>Password protection</strong>
        <p class="hint">
          {saved?.hasPassword
            ? 'The current page is password protected.'
            : 'No password is set.'} Changes apply when published.
        </p>
      </div>
      {#if fields.passwordMode === 'set'}
        <Field label="New password or PIN"
          ><PasswordInput
            bind:value={fields.password}
            autocomplete="new-password"
            placeholder="At least 4 characters"
          /></Field
        >
        <p class="hint">
          This password is kept only for this editing session and is excluded
          from autosave.
        </p>
        <Button variant="ghost" onclick={cancelPassword}
          >Cancel password change</Button
        >
      {:else if fields.passwordMode === 'remove'}
        <p>Password protection will be removed when published.</p>
        <Button variant="ghost" onclick={cancelPassword}
          >Cancel password removal</Button
        >
      {:else}
        <div class="link-actions">
          <Button
            variant="ghost"
            onclick={() => {
              fields.password = '';
              fields.passwordMode = 'set';
            }}>{saved?.hasPassword ? 'Change password' : 'Set password'}</Button
          >
          {#if saved?.hasPassword}<Button
              variant="ghost"
              onclick={() => {
                fields.password = '';
                fields.passwordMode = 'remove';
              }}>Remove password</Button
            >{/if}
        </div>
      {/if}
      <div class="protection-row">
        <div>
          <strong>Allow downloads</strong>
          <p class="hint">
            Applies to all page albums when published. Controls Immich’s
            download feature; it cannot prevent screenshots or saving displayed
            images.
          </p>
        </div>
        <Switch
          aria-label="Allow downloads"
          bind:checked={fields.allowDownload}
        />
      </div>
    </section>
    {#if saved}
      <section>
        <details>
          <summary>Page management</summary>
          <div class="danger-zone">
            {#if saved.publishedSlug}<Button
                variant="ghost"
                disabled={busy}
                onclick={() => onaction('unpublish')}>Unpublish page</Button
              >{/if}
            <Button
              color="danger"
              variant="ghost"
              disabled={busy}
              onclick={() => onaction('delete')}>Delete page</Button
            >
          </div>
        </details>
      </section>
    {/if}
  </div>
{/snippet}
{#snippet optionsFooter()}
  <div class="options-footer">
    <span class="hint" role="status"
      >{saving ? 'Saving draft…' : saveStatus}</span
    >
    <Button variant="ghost" color="secondary" onclick={onClose}>Close</Button>
    <Button
      shape="round"
      onclick={onpublish}
      disabled={busy || !canPublish || saved?.status === 'error'}
      >{saved?.publishedSlug ? 'Review changes' : 'Publish page'}</Button
    >
  </div>
{/snippet}
<Modal
  title="Page settings"
  size="medium"
  class="page-settings-dialog"
  {onClose}
  focusOnOpen
>
  <ModalBody class="page-settings-scroll">
    {@render settingsBody()}
  </ModalBody>
  <ModalFooter class="page-settings-footer">
    {@render optionsFooter()}
  </ModalFooter>
</Modal>
{#if qrOpen && saved?.publishedSlug}<PageQr
    slug={saved.publishedSlug}
    onClose={() => (qrOpen = false)}
  />{/if}

<style>
  :global(.page-settings-dialog) {
    max-block-size: calc(100dvh - 32px);
    min-block-size: 0;
  }
  :global(.page-settings-scroll) {
    overflow-y: auto;
    overscroll-behavior: contain;
    min-block-size: 0;
  }
  :global(.page-settings-footer) {
    flex-shrink: 0;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }
  .link-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .link-row > p {
    min-width: 0;
    flex: 1;
  }
  summary {
    cursor: pointer;
    font-weight: 500;
  }
  .danger-zone {
    padding-top: 16px;
  }
  .url-input > span {
    white-space: nowrap;
  }
  @media (max-width: 639px) {
    :global(.page-settings-dialog) {
      block-size: 100dvh;
      max-block-size: 100dvh;
      border-radius: 0;
    }
    .options-footer > span {
      flex-basis: 100%;
    }
    .link-row {
      flex-wrap: wrap;
    }
  }

  .options-body {
    padding-block: 8px;
  }

  .options-body section {
    display: grid;
    gap: 18px;
    padding-block: 20px;
    border-bottom: 1px solid var(--pager-management-border);
  }

  .options-body section:last-child {
    border: 0;
  }

  .options-body h2 {
    margin: 0;
    font-size: 18px;
  }

  .hint {
    color: var(--pager-management-text-secondary);
    font-size: 12px;
    line-height: 1.6;
  }

  .url-input {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .url-input :global(> div) {
    min-width: 0;
  }

  .protection-row,
  .link-row {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .link-row p {
    margin-top: 6px;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .link-row > div:first-child {
    min-width: 0;
  }

  .link-row :global(button) {
    padding-inline: 8px;
    white-space: nowrap;
  }

  .protection-row p {
    margin: 5px 0 0;
  }

  .protection-row strong {
    font-size: 14px;
    font-weight: 500;
  }

  .options-footer {
    display: flex;
    width: 100%;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  .options-footer > span {
    margin-inline-end: auto;
  }

  .danger-zone {
    display: flex !important;
    flex-wrap: wrap;
    gap: 10px !important;
  }
</style>
