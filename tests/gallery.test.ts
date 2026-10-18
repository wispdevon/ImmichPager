import { describe, expect, it } from 'vitest';
import { albumGroups, dateRange } from '../src/lib/gallery';
import type { GalleryPage } from '../src/lib/contracts';
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
