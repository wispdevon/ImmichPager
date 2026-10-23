<script lang="ts">
  import {
    Button,
    Modal,
    ModalBody,
    ModalFooter,
    Field,
    PasswordInput,
  } from '@immich/ui';
  import { labelDialog } from '$lib/actions/dialog-label';
  import type { Album } from '$lib/contracts';
  import type { PublicationSummary } from '$lib/publication-summary';

  let {
    review,
    albums,
    password = $bindable(''),
    message = '',
    submitting = false,
    retry = false,
    onClose,
    onConfirm,
  }: {
    review: PublicationSummary;
    albums: Album[];
    password?: string;
    message?: string;
    submitting?: boolean;
    retry?: boolean;
    onClose: () => void;
    onConfirm: () => void;
  } = $props();

  const labels = {
    title: 'Page title',
    description: 'Page description',
    url: 'Client page URL',
    theme: 'Theme',
    colors: 'Custom colors',
    headerAlignment: 'Header alignment',
    headerLayout: 'Header layout',
    headerSize: 'Banner size',
    logoSize: 'Logo size',
    titleSize: 'Title size',
    descriptionSize: 'Description size',
    headerSpacing: 'Header spacing',
    bannerPosition: 'Banner crop position',
    customCss: 'Custom CSS',
    visibility: 'Visible page elements',
    galleryStyle: 'Gallery styling',
    albumOrder: 'Album order',
    logo: 'Logo image',
    banner: 'Banner image',
  } satisfies Record<PublicationSummary['appearanceChanges'][number], string>;

  function albumName(id: string) {
    return (
      albums.find((album) => album.id === id)?.albumName ?? 'Album unavailable'
    );
  }
</script>

<Modal title="Review publication" size="small" {onClose} focusOnOpen>
  <ModalBody>
    <div class="review" use:labelDialog={'Review publication'}>
      {#if message}<p role="alert">{message}</p>{/if}
      {#if retry}<p>
          Retry the pending synchronization to restore this page.
        </p>{/if}
      <section>
        <h3>Access</h3>
        <p>
          {review.passwordAction === 'keep'
            ? 'Keep existing password settings.'
            : review.passwordAction === 'remove'
              ? 'Remove password protection.'
              : review.passwordAction === 'change'
                ? 'Change page and album passwords.'
                : 'Set a page and album password.'}
        </p>
        {#if review.downloadChange}<p>
            {review.downloadChange.after
              ? 'Allow downloads'
              : 'Disable downloads'} on all page albums.
          </p>{/if}
        {#if review.requiresCurrentPassword}
          <p>
            Enter the current password so Immich can synchronize the protected
            album links. Appearance-only changes do not need it.
          </p>
          <Field label="Current page password"
            ><PasswordInput
              bind:value={password}
              autocomplete="current-password"
            /></Field
          >
        {/if}
      </section>
      {#if !retry}
        {#if review.currentlyPublished}
          <p>
            Review what will change on <strong
              >/page/{review.previousSlug}</strong
            >
            before updating the live page.
          </p>
        {:else}
          <p>
            This page has no live version. Publishing will make its selected
            albums available at <strong>/page/{review.nextSlug}</strong>.
          </p>
        {/if}

        {#if review.addedAlbumIds.length}
          <section>
            <h3>
              {review.currentlyPublished ? 'Added albums' : 'Albums to publish'}
            </h3>
            <ul>
              {#each review.addedAlbumIds as id (id)}<li>
                  {albumName(id)}
                </li>{/each}
            </ul>
          </section>
        {/if}

        {#if review.currentlyPublished && review.removedAlbumIds.length}
          <section>
            <h3>Removed albums</h3>
            <ul>
              {#each review.removedAlbumIds as id (id)}<li>
                  {albumName(id)}
                </li>{/each}
            </ul>
          </section>
        {/if}

        {#if review.currentlyPublished}
          <section>
            <h3>Page details and appearance</h3>
            {#if review.appearanceChanges.length}
              <ul>
                {#each review.appearanceChanges as change (change)}
                  <li>
                    <strong>{labels[change]}</strong>
                    {#if change === 'url'}
                      <span
                        >/page/{review.previousSlug} → /page/{review.nextSlug}</span
                      >
                    {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p>No page appearance changes detected.</p>
            {/if}
          </section>
        {:else}
          <section>
            <h3>Page details and appearance</h3>
            <p>
              The current draft title, description, branding, and appearance
              settings will be published.
            </p>
          </section>
        {/if}
      {/if}
    </div>
  </ModalBody>
  <ModalFooter>
    <div class="review-footer">
      <Button
        variant="ghost"
        color="secondary"
        disabled={submitting}
        onclick={onClose}>Cancel</Button
      >
      <Button
        shape="round"
        disabled={submitting || (review.requiresCurrentPassword && !password)}
        onclick={onConfirm}
      >
        {submitting
          ? 'Working…'
          : retry
            ? 'Retry synchronization'
            : review.currentlyPublished
              ? 'Update live page'
              : 'Publish page'}
      </Button>
    </div>
  </ModalFooter>
</Modal>

<style>
  .review {
    display: grid;
    gap: 16px;
    padding-block: 8px;
    color: var(--pager-management-text);
    font-size: 14px;
    line-height: 1.55;
  }
  .review p {
    margin: 0;
    color: var(--pager-management-text-secondary);
  }
  .review strong {
    color: var(--pager-management-text);
    font-weight: 550;
  }
  .review section {
    display: grid;
    gap: 8px;
    border-top: 1px solid var(--pager-management-border);
    padding-top: 14px;
  }
  .review h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }
  .review ul {
    display: grid;
    gap: 6px;
    margin: 0;
    padding-left: 20px;
    color: var(--pager-management-text-secondary);
    overflow-wrap: anywhere;
  }
  .review li span {
    display: block;
    color: var(--pager-management-text-secondary);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .review-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
  }
</style>
