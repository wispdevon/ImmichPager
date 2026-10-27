import { describe, expect, it } from 'vitest';
import {
  albumOrderGroups,
  effectiveAlbumOrder,
  albumYear,
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

describe('effective album order', () => {
  it('matches newest-first display order without mutating stored selection or metadata', () => {
    const ids = Object.freeze(['a', 'missing', 'c', 'b', 'd']);
    expect(effectiveAlbumOrder(ids, albums, 'newest', 'none')).toEqual([
      'b',
      'a',
      'c',
      'missing',
      'd',
    ]);
    expect(ids).toEqual(['a', 'missing', 'c', 'b', 'd']);
    expect(albums.map((album) => album.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('preserves visible ties and puts undated selections last', () => {
    const dates = [...albums, { id: 'tie', endDate: '2026-03-01' }];
    expect(
      effectiveAlbumOrder(['tie', 'd', 'b', 'a'], dates, 'newest', 'year'),
    ).toEqual(['tie', 'b', 'a', 'd']);
  });

  it('preserves manual order within each year and permits free order without groups', () => {
    const ids = ['d', 'a', 'c', 'b'];
    expect(effectiveAlbumOrder(ids, albums, 'manual', 'year')).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(effectiveAlbumOrder(ids, albums, 'manual', 'none')).toEqual(ids);
  });

  it('moves from the displayed baseline, even when the result equals the old stored IDs', () => {
    const stored = ['a', 'b'];
    const displayed = effectiveAlbumOrder(stored, albums, 'newest', 'none');
    expect(displayed).toEqual(['b', 'a']);
    expect(moveAlbumBy(displayed, albums, 'b', 1)).toEqual(stored);
    expect(moveAlbumBy(displayed, albums, 'b', -1)).toBe(displayed);
  });

  it('compares instants, preserves equivalent-time ties and handles invalid dates as undated', () => {
    const dates = [
      { id: 'offset', endDate: '2026-01-01T01:00:00+02:00' },
      { id: 'utc', endDate: '2025-12-31T23:30:00Z' },
      { id: 'tie', endDate: '2025-12-31T23:00:00Z' },
      { id: 'invalid', endDate: 'invalid' },
    ];
    expect(
      effectiveAlbumOrder(
        ['offset', 'invalid', 'tie', 'utc'],
        dates,
        'newest',
        'year',
      ),
    ).toEqual(['utc', 'offset', 'tie', 'invalid']);
    expect(albumYear(dates[0].endDate)).toBe('2025');
    expect(albumYear('invalid')).toBe('Undated');
  });
});

it('moves several selected albums directly to a distant destination as one operation', async () => {
  const { moveAlbumsRelative } = await import('../src/lib/album-order');
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  expect(moveAlbumsRelative(ids, ['b', 'a'], 'f', 'after')).toEqual([
    'c',
    'd',
    'e',
    'f',
    'a',
    'b',
  ]);
  expect(moveAlbumsRelative(ids, ['e', 'f'], 'b', 'before')).toEqual([
    'a',
    'e',
    'f',
    'b',
    'c',
    'd',
  ]);
  expect(moveAlbumsRelative(ids, ['a', 'b'], 'a', 'after')).toBe(ids);
  expect(moveAlbumsRelative(ids, ['missing'], 'f', 'after')).toBe(ids);
});

it('keeps a dragged selection in its year group while preserving other groups and selection order', async () => {
  const { moveAlbumsRelative } = await import('../src/lib/album-order');
  const ids = ['a', 'old', 'b', 'c', 'd'];
  const year = ['a', 'b', 'c', 'd'];
  expect(moveAlbumsRelative(ids, ['a', 'b'], 'd', 'after', year)).toEqual([
    'c',
    'old',
    'd',
    'a',
    'b',
  ]);
  expect(moveAlbumsRelative(ids, ['a'], 'old', 'before', year)).toBe(ids);
});
