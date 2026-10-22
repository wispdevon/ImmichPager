import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLIENT_UI,
  DEFAULT_GALLERY_STYLE,
  type GalleryPage,
} from '../src/lib/contracts';
import {
  inlineHeaderChangeSchema,
  inlinePreviewSyncSchema,
} from '../src/lib/inline-preview';

const page: GalleryPage = {
  id: 'page-123',
  title: 'A client page',
  description: 'Photographs made together.',
  theme: 'dark',
  background: null,
  foreground: null,
  accent: '#accbfa',
  alignment: 'left',
  bannerPosition: 50,
  headerLayout: 'below',
  headerSize: 'standard',
  logoSize: 80,
  titleSize: 3,
  descriptionSize: 1.125,
  headerSpacing: 2.5,
  customCss: '',
  clientUi: DEFAULT_CLIENT_UI,
  galleryStyle: DEFAULT_GALLERY_STYLE,
  order: 'newest',
  logo: null,
  banner: null,
  albums: [],
};

describe('inline preview message boundaries', () => {
  it('accepts bounded title and description edits', () => {
    expect(
      inlineHeaderChangeSchema.safeParse({
        type: 'pager:inline-header-change',
        version: 1,
        pageId: page.id,
        field: 'title',
        value: 'A new title',
      }).success,
    ).toBe(true);
    expect(
      inlineHeaderChangeSchema.safeParse({
        type: 'pager:inline-header-change',
        version: 1,
        pageId: page.id,
        field: 'description',
        value: 'A new description',
      }).success,
    ).toBe(true);
  });

  it('rejects newline titles, oversized values, and extra message fields', () => {
    const message = {
      type: 'pager:inline-header-change',
      version: 1,
      pageId: page.id,
      field: 'title',
      value: 'A title',
    };
    expect(
      inlineHeaderChangeSchema.safeParse({ ...message, value: 'two\nlines' })
        .success,
    ).toBe(false);
    expect(
      inlineHeaderChangeSchema.safeParse({ ...message, value: 'x'.repeat(161) })
        .success,
    ).toBe(false);
    expect(
      inlineHeaderChangeSchema.safeParse({ ...message, password: 'secret' })
        .success,
    ).toBe(false);
    expect(
      inlineHeaderChangeSchema.safeParse({ ...message, pageId: '' }).success,
    ).toBe(false);
  });

  it('accepts a complete preview DTO without credentials or external assets', () => {
    expect(
      inlinePreviewSyncSchema.safeParse({
        type: 'pager:inline-preview-sync',
        version: 1,
        pageId: page.id,
        syncSequence: 1,
        draftRevision: 3,
        page,
      }).success,
    ).toBe(true);
  });

  it('rejects mismatched pages, private fields, external assets, and too many albums', () => {
    const message = {
      type: 'pager:inline-preview-sync',
      version: 1,
      pageId: page.id,
      syncSequence: 1,
      draftRevision: 3,
      page,
    };
    expect(
      inlinePreviewSyncSchema.safeParse({
        ...message,
        page: { ...page, id: 'other-page' },
      }).success,
    ).toBe(false);
    expect(
      inlinePreviewSyncSchema.safeParse({
        ...message,
        page: { ...page, password: 'secret' },
      }).success,
    ).toBe(false);
    expect(
      inlinePreviewSyncSchema.safeParse({
        ...message,
        page: { ...page, logo: 'https://example.com/logo.png' },
      }).success,
    ).toBe(false);
    expect(
      inlinePreviewSyncSchema.safeParse({
        ...message,
        page: {
          ...page,
          albums: Array.from({ length: 501 }, (_, index) => ({
            id: `album-${index}`,
            name: 'Album',
            count: 1,
            cover: null,
            href: null,
            available: true,
          })),
        },
      }).success,
    ).toBe(false);
  });
});
