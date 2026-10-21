import { compileCustomCss } from '../custom-css';
import { randomUUID } from 'node:crypto';
import {
  AppError,
  draftInputSchema,
  parsePageInput,
  type DraftRecord,
} from '../contracts';
import {
  summarizePublicationChanges,
  type PublicationSummary,
} from '../publication-summary';
import { Store } from './store';
import { Immich } from './immich';
import { PageService } from './pages';
import { exclusive, verifyPassword } from './security';

function sameImage(left: Uint8Array | null, right: Uint8Array | null) {
  return (
    left === right ||
    (!!left &&
      !!right &&
      left.length === right.length &&
      left.every((byte, index) => byte === right[index]))
  );
}

export class DraftService {
  constructor(
    private store: Store,
    private immich: Immich,
  ) {}
  check(id: string, owner: string, revision: number | undefined) {
    const draft = this.store.draft(id, owner);
    if (revision !== draft.revision)
      throw new AppError(
        409,
        'This page changed in another tab. Copy your edits before reloading.',
      );
    const live = this.store.get(id);
    if (live?.status === 'error' || live?.status === 'syncing')
      throw new AppError(
        409,
        'Retry the pending publication before editing this page.',
      );
    return draft;
  }
  review(
    owner: string,
    id: string,
    expectedDraftRevision: number,
  ): PublicationSummary {
    const draft = this.check(id, owner, expectedDraftRevision);
    const live = this.store.get(id);
    if (live && live.ownerId !== owner)
      throw new AppError(404, 'Page not found');
    const published = live?.status === 'published' ? live : null;
    return summarizePublicationChanges(
      draft,
      live,
      published
        ? {
            logo: !sameImage(
              this.store.draftBranding(id, 'logo'),
              this.store.branding(id, 'logo'),
            ),
            banner: !sameImage(
              this.store.draftBranding(id, 'banner'),
              this.store.branding(id, 'banner'),
            ),
          }
        : {},
    );
  }
  async save(owner: string, id: string | null, value: unknown) {
    const { expectedDraftRevision, ...settings } =
      draftInputSchema.parse(value);
    return exclusive(`draft:${id ?? owner}`, async () => {
      const previous = id ? this.check(id, owner, expectedDraftRevision) : null;
      // Only validate new membership; publication checks ownership again.
      for (const albumId of settings.albumIds.filter(
        (id) => !previous?.albumIds.includes(id),
      )) {
        if ((await this.immich.album(albumId)).ownerId !== owner)
          throw new AppError(403, 'Only albums you own can be added');
      }
      const now = new Date().toISOString();
      const draft: DraftRecord = {
        ...settings,
        id: previous?.id ?? randomUUID(),
        ownerId: owner,
        revision: (previous?.revision ?? 0) + 1,
        publishedDraftRevision: previous?.publishedDraftRevision ?? null,
        logo: previous?.logo ?? false,
        banner: previous?.banner ?? false,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      this.store.putDraft(draft);
      return this.store.editor(draft.id, owner);
    });
  }
  async duplicateDesign(owner: string, sourceId: string) {
    return exclusive(`draft:${sourceId}`, async () => {
      const source = this.store.draft(sourceId, owner),
        now = new Date().toISOString(),
        draft: DraftRecord = {
          id: randomUUID(),
          ownerId: owner,
          title: '',
          description: '',
          slug: '',
          albumIds: [],
          order: 'newest',
          theme: source.theme,
          background: source.background,
          foreground: source.foreground,
          accent: source.accent,
          alignment: source.alignment,
          headerLayout: source.headerLayout,
          headerSize: source.headerSize,
          logoSize: source.logoSize,
          titleSize: source.titleSize,
          descriptionSize: source.descriptionSize,
          headerSpacing: source.headerSpacing,
          customCss: source.customCss,
          bannerPosition: source.bannerPosition,
          revision: 1,
          publishedDraftRevision: null,
          logo: false,
          banner: false,
          createdAt: now,
          updatedAt: now,
        };
      this.store.copyDraftDesign(sourceId, owner, draft);
      return this.store.editor(draft.id, owner);
    });
  }
  async publish(
    owner: string,
    id: string,
    input: {
      password: string;
      passwordMode: 'keep' | 'set' | 'remove';
      expectedDraftRevision?: number;
      expectedPublishedRevision?: number | null;
    },
  ) {
    return exclusive(`draft:${id}`, async () => {
      const draft = this.check(id, owner, input.expectedDraftRevision);
      const settings = parsePageInput({ ...draft, ...input });
      const css = compileCustomCss(settings.customCss, id);
      if (css.error) throw new AppError(400, `Custom CSS: ${css.error}`);
      if (!settings.albumIds.length)
        throw new AppError(400, 'Select at least one album before publishing');
      const live = this.store.get(id),
        svc = new PageService(this.store, this.immich, (page) =>
          this.store.commitPublication(page, draft),
        );
      if (
        input.expectedPublishedRevision !== undefined &&
        input.expectedPublishedRevision !==
          (live?.status === 'published' ? live.revision : null)
      )
        throw new AppError(
          409,
          'The live page changed since this review. Review the changes again before publishing.',
        );
      if (
        live?.status === 'published' &&
        input.passwordMode === 'keep' &&
        live.albumIds.length === draft.albumIds.length &&
        live.albumIds.every((id) => draft.albumIds.includes(id))
      ) {
        for (const albumId of draft.albumIds) {
          if ((await this.immich.album(albumId)).ownerId !== owner)
            throw new AppError(403, 'Album ownership has changed');
        }
        const {
          password: _password,
          passwordMode: _mode,
          ...values
        } = settings;
        void _password;
        void _mode;
        this.store.commitPublication(
          {
            ...live,
            ...values,
            logo: draft.logo,
            banner: draft.banner,
            revision: live.revision + 1,
            updatedAt: new Date().toISOString(),
          },
          draft,
        );
        return this.store.editor(id, owner);
      }
      if (
        live?.passwordHash &&
        input.passwordMode === 'keep' &&
        !(await verifyPassword(input.password, live.passwordHash))
      )
        throw new AppError(
          400,
          'Enter the current page password to synchronize album links.',
        );
      // Persist the publication intent before touching native links or public media.
      const staged = await svc.save(owner, live ? id : null, settings, id);
      staged.logo = draft.logo;
      staged.banner = draft.banner;
      this.store.put(staged);
      await svc.publish(owner, id, input.password);
      return this.store.editor(id, owner);
    });
  }
  async operation(owner: string, id: string, operation: string, password = '') {
    return exclusive(`draft:${id}`, async () => {
      const draft = this.store.draft(id, owner),
        live = this.store.get(id),
        svc = new PageService(this.store, this.immich, (page) =>
          this.store.commitPublication(page, draft),
        );
      if (operation === 'delete') {
        if (live) await svc.remove(owner, id);
        this.store.deleteDraft(id);
        return { deleted: true };
      }
      if (!live) throw new AppError(400, 'Publish this page first');
      if (operation === 'unpublish') await svc.unpublish(owner, id);
      else if (operation === 'retry') {
        const result = await svc.retry(owner, id, password);
        if (!result) {
          this.store.deleteDraft(id);
          return { deleted: true };
        }
      } else throw new AppError(404, 'Unknown operation');
      return this.store.editor(id, owner);
    });
  }
}
