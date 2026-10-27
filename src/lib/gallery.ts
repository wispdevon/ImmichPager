import type { GalleryAlbum, GalleryPage } from './contracts';
import { albumYear, effectiveAlbumOrder } from './album-order';

export const DEFAULT_PAGE_ACCENT = '#accbfa';

export function albumGroups(page: GalleryPage) {
  const groups = new Map<string, GalleryAlbum[]>();
  const byId = new Map(page.albums.map((album) => [album.id, album]));
  const ids = effectiveAlbumOrder(
    page.albums.map((album) => album.id),
    page.albums,
    page.order,
    'year',
  );
  for (const id of ids) {
    const album = byId.get(id)!;
    const year = albumYear(album.endDate);
    const list = groups.get(year) ?? [];
    list.push(album);
    groups.set(year, list);
  }
  return [...groups.entries()];
}

function parsedDate(value?: string) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : undefined;
}

function albumMatchesMonth(album: GalleryAlbum, month: string) {
  if (!month) return true;
  const monthNumber = Number(month);
  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12)
    return false;

  const start = parsedDate(album.startDate) ?? parsedDate(album.endDate);
  const end = parsedDate(album.endDate) ?? parsedDate(album.startDate);
  if (!start || !end) return false;

  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  const firstYear = first.getUTCFullYear();
  const lastYear = last.getUTCFullYear();
  const firstMonth = first.getUTCMonth() + 1;
  const lastMonth = last.getUTCMonth() + 1;

  if (firstYear === lastYear)
    return monthNumber >= firstMonth && monthNumber <= lastMonth;
  if (lastYear - firstYear > 1) return true;
  return monthNumber >= firstMonth || monthNumber <= lastMonth;
}

export function filterAlbumGroups(
  groups: [string, GalleryAlbum[]][],
  search: string,
  month: string,
) {
  const query = search.trim().toLowerCase();
  return groups.flatMap(([year, albums]) => {
    const matches = albums.filter(
      (album) =>
        album.name.toLowerCase().includes(query) &&
        albumMatchesMonth(album, month),
    );
    return matches.length ? [[year, matches] as [string, GalleryAlbum[]]] : [];
  });
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

export function itemCountLabel(count: number) {
  return `${count.toLocaleString('en')} ${count === 1 ? 'item' : 'items'}`;
}
