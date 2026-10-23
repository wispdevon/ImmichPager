import { describe, expect, it } from 'vitest';
import { pageInputSchema } from '../src/lib/contracts';
import { blockSchema } from '../src/lib/blocks';
import {
  customizationDefaults,
  resetCustomization,
  resetClientUiValue,
} from '../src/lib/customization';

describe('customization defaults', () => {
  it('restores presentation while preserving content, media, and access policy', () => {
    const input = pageInputSchema.parse({
      title: 'My portfolio',
      slug: 'my-portfolio',
      description: 'Keep this',
      theme: 'light',
      titleSize: 4,
      customCss: '.page-title { color: red; }',
      passwordMode: 'set',
      password: 'secret',
      allowDownload: false,
      albumIds: ['a'],
      blocks: [
        blockSchema.parse({
          id: 'albums',
          type: 'albums',
          heading: 'Stories',
          albumIds: ['a'],
          layout: 'editorial',
          order: 'manual',
          grouping: 'none',
        }),
        blockSchema.parse({
          id: 'photos',
          type: 'photos',
          photos: [{ id: 'p', caption: 'Keep caption', alt: 'Keep alt' }],
          layout: 'square',
          gap: 32,
          columns: 5,
        }),
        blockSchema.parse({
          id: 'text',
          type: 'text',
          alignment: 'right',
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Keep text' }],
              },
            ],
          },
        }),
      ],
    });
    const reset = resetCustomization(input);
    expect(reset.titleSize).toBe(customizationDefaults.titleSize);
    expect(reset.theme).toBe('dark');
    expect(reset.customCss).toBe('');
    expect(reset.clientUi.showBrowsingControls).toBe(false);
    for (const key of [
      'title',
      'slug',
      'description',
      'passwordMode',
      'password',
      'allowDownload',
      'albumIds',
    ] as const)
      expect(reset[key]).toEqual(input[key]);
    expect(reset.blocks?.[0]).toEqual({
      ...input.blocks![0],
      layout: 'cards',
      order: 'newest',
      grouping: 'year',
    });
    expect(reset.blocks?.[1]).toEqual({
      ...input.blocks![1],
      layout: 'justified',
      gap: 16,
      columns: 3,
      rowHeight: 260,
    });
    expect(reset.blocks?.[2]).toEqual({
      ...input.blocks![2],
      alignment: 'left',
    });
    expect(input.blocks?.[0].type === 'albums' && input.blocks[0].layout).toBe(
      'editorial',
    );
    expect(pageInputSchema.safeParse(reset).success).toBe(true);
  });

  it('restoring album visibility also restores a usable album link', () => {
    const page = pageInputSchema.parse({ title: 'Page', slug: 'my-page' });
    const hidden = {
      ...page.clientUi,
      showAlbums: false,
      showAlbumCovers: false,
      showAlbumTitles: false,
    };
    const restored = resetClientUiValue(hidden, 'showAlbums');
    expect(restored.showAlbums).toBe(true);
    expect(restored.showAlbumCovers || restored.showAlbumTitles).toBe(true);
    expect(
      pageInputSchema.safeParse({ ...page, clientUi: restored }).success,
    ).toBe(true);
  });

  it('returns independent defaults so later edits cannot contaminate another page', () => {
    const page = pageInputSchema.parse({ title: 'Page', slug: 'my-page' });
    const first = resetCustomization(page);
    first.galleryStyle.fontFamily = 'merriweather';
    first.clientUi.showTitle = false;
    const second = resetCustomization(page);
    expect(second.galleryStyle).toEqual(customizationDefaults.galleryStyle);
    expect(second.clientUi.showTitle).toBe(true);
  });
});
