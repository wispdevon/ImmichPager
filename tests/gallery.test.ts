import { describe, expect, it } from 'vitest';
import { albumGroups, dateRange, filterAlbumGroups } from '../src/lib/gallery';
import type { GalleryAlbum, GalleryPage } from '../src/lib/contracts';
describe('Immich-style album grouping', () => {
  it('groups newest years first and preserves manual order within years', () => {
    const page = {
      order: 'manual',
      albums: [
        { id: 'a', endDate: '2025-01-01' },
        { id: 'b' },
        { id: 'c', endDate: '2026-01-01' },
        { id: 'd', endDate: '2026-08-01' },
      ],
    } as GalleryPage;
    expect(
      albumGroups(page).map(([year, albums]) => [
        year,
        albums.map((a) => a.id),
      ]),
    ).toEqual([
      ['2026', ['c', 'd']],
      ['2025', ['a']],
      ['Undated', ['b']],
    ]);
    expect(
      albumGroups({ ...page, order: 'newest' })[0][1].map((a) => a.id),
    ).toEqual(['d', 'c']);
  });
  it('formats one month, month ranges, and cross-year ranges', () => {
    expect(dateRange('2026-05-01', '2026-05-31')).toBe('May 2026');
    expect(dateRange('2026-08-01', '2026-10-01')).toBe('Aug – Oct 2026');
    expect(dateRange('2025-12-01', '2026-01-01')).toBe('Dec 2025 – Jan 2026');
    expect(dateRange()).toBe('');
  });
});

describe('public gallery browsing', () => {
  const groups: [string, GalleryAlbum[]][] = [
    [
      '2026',
      [
        {
          id: 'captured',
          name: 'Captured by Me',
          startDate: '2026-08-01',
          endDate: '2026-10-01',
        } as GalleryAlbum,
        {
          id: 'autumn',
          name: 'Autumn wedding',
          startDate: '2026-10-29',
          endDate: '2026-11-02',
        } as GalleryAlbum,
        { id: 'undated', name: 'No date available' } as GalleryAlbum,
      ],
    ],
    [
      '2025',
      [
        {
          id: 'winter',
          name: 'Winter celebration',
          startDate: '2025-12-31',
          endDate: '2026-01-02',
        } as GalleryAlbum,
      ],
    ],
  ];

  it('searches album names without case sensitivity and combines filters', () => {
    expect(filterAlbumGroups(groups, '  CAPTURED ', '')).toEqual([
      ['2026', [groups[0][1][0]]],
    ]);
    expect(filterAlbumGroups(groups, 'wedding', '10')).toEqual([
      ['2026', [groups[0][1][1]]],
    ]);
    expect(filterAlbumGroups(groups, 'winter', '10')).toEqual([]);
  });

  it('matches albums whose date range overlaps the selected month', () => {
    expect(filterAlbumGroups(groups, '', '10')).toEqual([
      ['2026', groups[0][1].slice(0, 2)],
    ]);
    expect(filterAlbumGroups(groups, '', '1')).toEqual([
      ['2025', [groups[1][1][0]]],
    ]);
    expect(filterAlbumGroups(groups, '', '12')).toEqual([
      ['2025', [groups[1][1][0]]],
    ]);
    expect(filterAlbumGroups(groups, '', '4')).toEqual([]);
  });
});
