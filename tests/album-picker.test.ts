import { describe, expect, it } from 'vitest';
import type { Album } from '../src/lib/contracts';
import {
  addVisibleAlbumIds,
  removeVisibleAlbumIds,
  sortAlbumsByRecentCreation,
} from '../src/lib/album-picker';

const albums: Album[] = [
  {
    id: 'older',
    albumName: 'Older',
    ownerId: 'alice',
    assetCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    endDate: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'newer',
    albumName: 'Newer',
    ownerId: 'alice',
    assetCount: 1,
    createdAt: '2026-03-01T00:00:00.000Z',
    endDate: '2020-01-01T00:00:00.000Z',
  },
  { id: 'unknown', albumName: 'Unknown', ownerId: 'alice', assetCount: 1 },
  {
    id: 'invalid',
    albumName: 'Invalid',
    ownerId: 'alice',
    assetCount: 1,
    createdAt: 'not-a-date',
  },
];

describe('album picker selection helpers', () => {
  it('sorts by Immich album creation date, not photo dates, and leaves unknown dates last', () => {
    expect(sortAlbumsByRecentCreation(albums).map((album) => album.id)).toEqual(
      ['newer', 'older', 'unknown', 'invalid'],
    );
  });

  it('adds visible albums while keeping selections hidden by the current search or filter', () => {
    expect(
      addVisibleAlbumIds(['hidden', 'selected'], [albums[0], albums[1]]),
    ).toEqual(['hidden', 'selected', 'older', 'newer']);
  });

  it('allows adding exactly the 500th album and preserves hidden selections', () => {
    const selected = Array.from(
      { length: 498 },
      (_, index) => `selected-${index}`,
    );
    const result = addVisibleAlbumIds(
      ['hidden', ...selected],
      [{ id: 'last-slot' }],
    );

    expect(result).toHaveLength(500);
    expect(result).toContain('hidden');
    expect(result).toContain('last-slot');
  });

  it('refuses a bulk addition that would exceed the 500-album limit', () => {
    const selected = Array.from(
      { length: 500 },
      (_, index) => `selected-${index}`,
    );

    expect(
      addVisibleAlbumIds(['hidden', ...selected], [{ id: 'too-many' }]),
    ).toBe(null);
  });

  it('does not count already included visible albums against remaining capacity', () => {
    const selected = Array.from(
      { length: 500 },
      (_, index) => `selected-${index}`,
    );
    const visible = [{ id: 'selected-499' }, { id: 'selected-0' }];

    expect(addVisibleAlbumIds(selected, visible)).toHaveLength(500);
  });

  it('removes only visible albums and preserves every selection outside the visible scope', () => {
    expect(
      removeVisibleAlbumIds(
        ['hidden', 'older', 'selected', 'newer'],
        [albums[0], albums[1]],
      ),
    ).toEqual(['hidden', 'selected']);
  });
});
