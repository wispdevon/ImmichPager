import type { DraftRecord, PageRecord } from './contracts';

export type PublicationAppearanceChange =
  | 'title'
  | 'description'
  | 'url'
  | 'theme'
  | 'colors'
  | 'headerAlignment'
  | 'headerLayout'
  | 'headerSize'
  | 'logoSize'
  | 'titleSize'
  | 'descriptionSize'
  | 'headerSpacing'
  | 'bannerPosition'
  | 'customCss'
  | 'albumOrder'
  | 'logo'
  | 'banner';

export type PublicationSummary = {
  draftRevision: number;
  expectedPublishedRevision: number | null;
  currentlyPublished: boolean;
  previousSlug: string | null;
  nextSlug: string;
  addedAlbumIds: string[];
  removedAlbumIds: string[];
  appearanceChanges: PublicationAppearanceChange[];
};

/** Compare the owner-checked draft with the page currently available to clients. */
export function summarizePublicationChanges(
  draft: DraftRecord,
  live: PageRecord | null,
  changedBranding: { logo?: boolean; banner?: boolean } = {},
): PublicationSummary {
  const published = live?.status === 'published' ? live : null;
  const previousAlbumIds = published?.albumIds ?? [];
  const draftAlbumIds = new Set(draft.albumIds);
  const publishedAlbumIds = new Set(previousAlbumIds);
  const retainedDraftAlbumIds = draft.albumIds.filter((id) =>
    publishedAlbumIds.has(id),
  );
  const retainedPublishedAlbumIds = previousAlbumIds.filter((id) =>
    draftAlbumIds.has(id),
  );
  const appearanceChanges: PublicationAppearanceChange[] = [];

  if (published) {
    if (draft.title !== published.title) appearanceChanges.push('title');
    if (draft.description !== published.description)
      appearanceChanges.push('description');
    if (draft.slug !== published.slug) appearanceChanges.push('url');
    if (draft.theme !== published.theme) appearanceChanges.push('theme');
    if (
      draft.background !== published.background ||
      draft.foreground !== published.foreground ||
      draft.accent !== published.accent
    )
      appearanceChanges.push('colors');
    if (draft.alignment !== published.alignment)
      appearanceChanges.push('headerAlignment');
    if (draft.headerLayout !== published.headerLayout)
      appearanceChanges.push('headerLayout');
    if (draft.headerSize !== published.headerSize)
      appearanceChanges.push('headerSize');
    if (draft.logoSize !== published.logoSize)
      appearanceChanges.push('logoSize');
    if (draft.titleSize !== published.titleSize)
      appearanceChanges.push('titleSize');
    if (draft.descriptionSize !== published.descriptionSize)
      appearanceChanges.push('descriptionSize');
    if (draft.headerSpacing !== published.headerSpacing)
      appearanceChanges.push('headerSpacing');
    if (draft.bannerPosition !== published.bannerPosition)
      appearanceChanges.push('bannerPosition');
    if (draft.customCss !== published.customCss)
      appearanceChanges.push('customCss');
    if (
      draft.order !== published.order ||
      (draft.order === 'manual' &&
        published.order === 'manual' &&
        retainedDraftAlbumIds.some(
          (id, index) => id !== retainedPublishedAlbumIds[index],
        ))
    )
      appearanceChanges.push('albumOrder');
    if (draft.logo !== published.logo || changedBranding.logo)
      appearanceChanges.push('logo');
    if (draft.banner !== published.banner || changedBranding.banner)
      appearanceChanges.push('banner');
  }

  return {
    draftRevision: draft.revision,
    expectedPublishedRevision: published?.revision ?? null,
    currentlyPublished: !!published,
    previousSlug: published?.slug ?? null,
    nextSlug: draft.slug,
    addedAlbumIds: draft.albumIds.filter((id) => !publishedAlbumIds.has(id)),
    removedAlbumIds: previousAlbumIds.filter((id) => !draftAlbumIds.has(id)),
    appearanceChanges,
  };
}
