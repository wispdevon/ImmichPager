import type { GalleryAlbum, GalleryPage } from './contracts';
import { albumYear } from './album-order';
export function albumGroups(page: GalleryPage) {
  const groups = new Map<string, GalleryAlbum[]>();
  const albums = [...page.albums];
  if (page.order === 'newest')
    albums.sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));
  for (const album of albums) {
    const year = albumYear(album.endDate);
    const list = groups.get(year) ?? [];
    list.push(album);
    groups.set(year, list);
  }
  return [...groups.entries()].sort(([a], [b]) =>
    a === 'Undated' ? 1 : b === 'Undated' ? -1 : Number(b) - Number(a),
  );
}
export function dateRange(start?: string, end?: string) {
  if (!start || !end) return '';
  const a = new Date(start),
    b = new Date(end);
  const format = new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  if (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth()
  )
    return format.format(b);
  if (a.getUTCFullYear() === b.getUTCFullYear())
    return `${new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(a)} – ${format.format(b)}`;
  return `${format.format(a)} – ${format.format(b)}`;
}
