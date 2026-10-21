import { describe, expect, it } from 'vitest';
import {
  albumOrderGroups,
  moveAlbumBy,
  moveAlbumRelative,
} from '../src/lib/album-order';
import type { Album } from '../src/lib/contracts';

const albums = [
  { id: 'a', endDate: '2026-01-01' },
  { id: 'b', endDate: '2026-03-01' },
  { id: 'c', endDate: '2025-12-01' },
  { id: 'd' },
] as Album[];

describe('manual album order', () => {
  it('groups selected albums in the same year order as the gallery', () => {
    expect(albumOrderGroups(['a', 'c', 'b', 'd'], albums)).toEqual([
      ['2026', ['a', 'b']],
      ['2025', ['c']],
      ['Undated', ['d']],
    ]);
  });

  it('moves albums within a year and leaves year boundaries unchanged', () => {
    const ids = ['a', 'c', 'b', 'd'];

    expect(moveAlbumBy(ids, albums, 'a', 1)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveAlbumBy(ids, albums, 'a', -1)).toBe(ids);
    expect(moveAlbumBy(ids, albums, 'a', 2)).toBe(ids);
    expect(moveAlbumBy(ids, albums, 'c', 1)).toBe(ids);
  });

  it('moves a dragged album before or after a same-year target only', () => {
    const ids = ['a', 'c', 'b', 'd'];

    expect(moveAlbumRelative(ids, albums, 'b', 'a', 'before')).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
    expect(moveAlbumRelative(ids, albums, 'a', 'b', 'after')).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
    expect(moveAlbumRelative(ids, albums, 'a', 'c', 'before')).toBe(ids);
    expect(moveAlbumRelative(ids, albums, 'a', 'a', 'after')).toBe(ids);
  });
});
