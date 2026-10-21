import { expect, it } from 'vitest';
import {
  parsePageInput,
  type DraftRecord,
  type PageRecord,
} from '../src/lib/contracts';
import { summarizePublicationChanges } from '../src/lib/publication-summary';

const settings = parsePageInput({
  title: 'Acme photography',
  slug: 'acme-photography',
  albumIds: ['album-a', 'album-b'],
});

function draft(overrides: Partial<DraftRecord> = {}): DraftRecord {
  return {
    ...settings,
    id: 'page-id',
    ownerId: 'alice',
    revision: 4,
    publishedDraftRevision: 3,
    logo: false,
    banner: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
    ...overrides,
  };
}

function published(overrides: Partial<PageRecord> = {}): PageRecord {
  return {
    ...settings,
    id: 'page-id',
    ownerId: 'alice',
    status: 'published',
    intent: null,
    revision: 3,
    passwordHash: 'do-not-return',
    logo: false,
    banner: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

it('summarizes the persisted draft against the currently published page', () => {
  const summary = summarizePublicationChanges(
    draft({
      title: 'Acme autumn photography',
      slug: 'acme-autumn',
      description: 'New season, new memories.',
      theme: 'light',
      alignment: 'center',
      headerLayout: 'overlay',
      background: '#123456',
      bannerPosition: 70,
      customCss: '.ip-title { font-size: 3rem; }',
      order: 'manual',
      albumIds: ['album-b', 'album-c'],
      logo: true,
      banner: true,
    }),
    published({
      background: null,
      albumIds: ['album-a', 'album-b'],
    }),
  );

  expect(summary).toEqual({
    draftRevision: 4,
    expectedPublishedRevision: 3,
    currentlyPublished: true,
    previousSlug: 'acme-photography',
    nextSlug: 'acme-autumn',
    addedAlbumIds: ['album-c'],
    removedAlbumIds: ['album-a'],
    appearanceChanges: [
      'title',
      'description',
      'url',
      'theme',
      'colors',
      'headerAlignment',
      'headerLayout',
      'bannerPosition',
      'customCss',
      'albumOrder',
      'logo',
      'banner',
    ],
  });
  expect(JSON.stringify(summary)).not.toMatch(
    /password|do-not-return|shareId|native/i,
  );
});

it('treats a first publication as all selected albums being included', () => {
  expect(summarizePublicationChanges(draft(), null)).toEqual({
    draftRevision: 4,
    expectedPublishedRevision: null,
    currentlyPublished: false,
    previousSlug: null,
    nextSlug: 'acme-photography',
    addedAlbumIds: ['album-a', 'album-b'],
    removedAlbumIds: [],
    appearanceChanges: [],
  });
});

it('reports no changes for an identical publication and ignores incidental order in newest mode', () => {
  const summary = summarizePublicationChanges(
    draft({ albumIds: ['album-b', 'album-a'], order: 'newest' }),
    published({ albumIds: ['album-a', 'album-b'], order: 'newest' }),
  );

  expect(summary.addedAlbumIds).toEqual([]);
  expect(summary.removedAlbumIds).toEqual([]);
  expect(summary.appearanceChanges).toEqual([]);
});

it('reports a manual album reorder only when manual order is active', () => {
  const summary = summarizePublicationChanges(
    draft({ albumIds: ['album-b', 'album-a'], order: 'manual' }),
    published({ albumIds: ['album-a', 'album-b'], order: 'manual' }),
  );

  expect(summary.appearanceChanges).toEqual(['albumOrder']);
});
