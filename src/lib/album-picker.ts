import { MAX_PAGE_ALBUMS, type Album } from './contracts';

export function sortAlbumsByRecentCreation(albums: readonly Album[]): Album[] {
  return albums
    .map((album, index) => {
      const parsed = album.createdAt ? Date.parse(album.createdAt) : Number.NaN;
      return {
        album,
        index,
        createdAt: Number.isFinite(parsed) ? parsed : null,
      };
    })
    .sort((a, b) => {
      if (a.createdAt === null)
        return b.createdAt === null ? a.index - b.index : 1;
      if (b.createdAt === null) return -1;
      return b.createdAt - a.createdAt || a.index - b.index;
    })
    .map(({ album }) => album);
}

export function addVisibleAlbumIds(
  selectedIds: readonly string[],
  visibleAlbums: readonly Pick<Album, 'id'>[],
): string[] | null {
  const result = new Set(selectedIds);
  for (const album of visibleAlbums) result.add(album.id);
  if (result.size > MAX_PAGE_ALBUMS) return null;
  return [...result];
}

export function removeVisibleAlbumIds(
  selectedIds: readonly string[],
  visibleAlbums: readonly Pick<Album, 'id'>[],
): string[] {
  const visibleIds = new Set(visibleAlbums.map((album) => album.id));
  return selectedIds.filter((id) => !visibleIds.has(id));
}
