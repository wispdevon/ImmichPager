import {
  normalizeContent,
  hasContent,
  pageBlocks,
  photoSources,
} from '../blocks';
import { randomUUID } from 'node:crypto';
import { AppError, type PageInput, type PageRecord } from '../contracts';
import { Store } from './store';
import { Immich } from './immich';
import { requiresShareSynchronization } from '../publication-summary';
import { exclusive, hashPassword, verifyPassword } from './security';

export class PageService {
  constructor(
    private store: Store,
    private immich: Immich,
    private onPublished?: (page: PageRecord) => void,
  ) {}
  async save(
    ownerId: string,
    id: string | null,
    input: PageInput,
    stagingId?: string,
  ) {
    return exclusive(id ?? `new:${ownerId}`, async () => {
      input = normalizeContent(input);
      const previous = id ? this.store.owned(id, ownerId) : null;
      if (previous?.status === 'syncing' || previous?.status === 'error')
        throw new AppError(
          409,
          'Retry the pending operation before editing this page',
        );
      for (const albumId of input.albumIds) {
        const album = await this.immich.album(albumId);
        if (album.ownerId !== ownerId)
          throw new AppError(403, 'Only albums you own can be added');
      }
      const { password, passwordMode, ...settings } = input;
      let passwordHash = previous?.passwordHash ?? null;
      if (passwordMode === 'set') passwordHash = await hashPassword(password);
      if (passwordMode === 'remove') passwordHash = null;
      const accessChanged =
        previous &&
        requiresShareSynchronization(settings, previous, passwordMode);
      const now = new Date().toISOString();
      const page: PageRecord = {
        ...settings,
        id: previous?.id ?? stagingId ?? randomUUID(),
        ownerId,
        passwordHash,
        status: previous?.status ?? 'draft',
        intent: null,
        revision: (previous?.revision ?? 0) + 1,
        logo: previous?.logo ?? false,
        banner: previous?.banner ?? false,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      if (accessChanged && previous.status === 'published') {
        page.status = 'error';
        page.intent = 'publish';
      }
      if (stagingId) {
        page.status = 'error';
        page.intent = 'publish';
      }
      this.store.put(page);
      return page;
    });
  }
  async publish(ownerId: string, id: string, password: string) {
    return this.synchronize(ownerId, id, 'publish', password);
  }
  async unpublish(ownerId: string, id: string) {
    return this.synchronize(ownerId, id, 'unpublish', '');
  }
  async remove(ownerId: string, id: string) {
    return this.synchronize(ownerId, id, 'delete', '');
  }
  async retry(ownerId: string, id: string, password: string) {
    const page = this.store.owned(id, ownerId);
    if (!page.intent) throw new AppError(409, 'There is no pending operation');
    return this.synchronize(ownerId, id, page.intent, password);
  }
  private async synchronize(
    ownerId: string,
    id: string,
    intent: 'publish' | 'unpublish' | 'delete',
    password: string,
  ) {
    return exclusive(id, async () => {
      const page = this.store.owned(id, ownerId);
      if (intent === 'publish') {
        if (!hasContent(pageBlocks(page)))
          throw new AppError(
            400,
            'Add at least one nonempty content block before publishing',
          );
        if (
          page.passwordHash &&
          !(await verifyPassword(password, page.passwordHash))
        )
          throw new AppError(
            400,
            'Enter the current page password to synchronize its album links',
          );
        for (const albumId of page.albumIds) {
          if ((await this.immich.album(albumId)).ownerId !== ownerId)
            throw new AppError(403, 'Album ownership has changed');
        }
      }
      if (intent === 'publish')
        for (const block of photoSources(page))
          for (const photo of block.photos)
            await this.immich.photo(photo.id, ownerId);
      page.status = 'syncing';
      page.intent = intent;
      page.revision++;
      this.store.put(page);
      try {
        // Deterministic native slugs recover create requests whose response was lost.
        const native = await this.immich.listShares();
        for (const share of native) {
          const prefix = `pager-${page.id}-`;
          if (
            share.slug?.startsWith(prefix) &&
            share.album?.id &&
            share.slug === prefix + share.album.id
          ) {
            this.store.putShare({
              pageId: id,
              albumId: share.album.id,
              shareId: share.id,
              key: share.key,
              slug: share.slug,
            });
          }
        }
        const photoPrefix = `pager-${page.id}-photos-`;
        for (const share of native) {
          if (share.slug?.startsWith(photoPrefix)) {
            const blockId = share.slug.slice(photoPrefix.length);
            if (/^[a-zA-Z0-9_-]{1,100}$/.test(blockId))
              this.store.putPhotoShare({
                pageId: id,
                blockId,
                shareId: share.id,
                key: share.key,
                slug: share.slug,
              });
          }
        }
        const photoBlocks = photoSources(page);
        for (const share of this.store.photoShares(id)) {
          if (
            intent !== 'publish' ||
            !photoBlocks.some((b) => b.id === share.blockId)
          ) {
            await this.immich.deleteShare(share.shareId);
            this.store.deletePhotoShare(id, share.blockId);
          }
        }
        if (intent === 'publish')
          for (const block of photoBlocks) {
            let share = this.store
              .photoShares(id)
              .find((s) => s.blockId === block.id);
            if (share && !native.some((s) => s.id === share!.shareId)) {
              this.store.deletePhotoShare(id, block.id);
              share = undefined;
            }
            if (!share) {
              const slug = photoPrefix + block.id;
              const created = await this.immich.createPhotoShare(
                block.photos.map((p) => p.id),
                slug,
                page.passwordHash ? password : null,
                page.allowDownload,
              );
              share = {
                pageId: id,
                blockId: block.id,
                shareId: created.id,
                key: created.key,
                slug,
              };
              this.store.putPhotoShare(share);
            }
            await this.immich.syncPhotoShare(
              share.shareId,
              block.photos.map((p) => p.id),
            );
            await this.immich.updateShare(
              share.shareId,
              page.passwordHash ? password : null,
              share.slug,
              page.allowDownload,
            );
          }
        for (const share of this.store.shares(id)) {
          if (intent !== 'publish' || !page.albumIds.includes(share.albumId)) {
            await this.immich.deleteShare(share.shareId);
            this.store.deleteShare(id, share.albumId);
          }
        }
        if (intent === 'publish') {
          const nativeIds = new Set(native.map((s) => s.id));
          for (const albumId of page.albumIds) {
            let share = this.store
              .shares(id)
              .find((s) => s.albumId === albumId);
            if (share && !nativeIds.has(share.shareId)) {
              this.store.deleteShare(id, albumId);
              share = undefined;
            }
            if (!share) {
              const slug = `pager-${page.id}-${albumId}`;
              const created = await this.immich.createShare(
                albumId,
                slug,
                page.passwordHash ? password : null,
                page.allowDownload,
              );
              share = {
                pageId: id,
                albumId,
                shareId: created.id,
                key: created.key,
                slug,
              };
              this.store.putShare(share);
            }
            await this.immich.updateShare(
              share.shareId,
              page.passwordHash ? password : null,
              share.slug,
              page.allowDownload,
            );
          }
        }
        if (intent === 'delete') {
          this.store.delete(id);
          return null;
        }
        page.status = intent === 'publish' ? 'published' : 'draft';
        page.intent = null;
        page.updatedAt = new Date().toISOString();
        if (page.status === 'published' && this.onPublished)
          this.onPublished(page);
        else this.store.put(page);
        return page;
      } catch {
        page.status = 'error';
        this.store.put(page);
        throw new AppError(
          502,
          'Immich sharing is incomplete. This page is hidden; retry to finish safely.',
        );
      }
    });
  }
}
