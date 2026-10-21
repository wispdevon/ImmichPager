import type { GalleryAlbum, GalleryPage } from './contracts';
export function albumGroups(page: GalleryPage) {
  const groups = new Map<string, GalleryAlbum[]>();
  const albums = [...page.albums];
  if (page.order === 'newest')
    albums.sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));
  for (const album of albums) {
    const year = album.endDate
      ? new Date(album.endDate).getUTCFullYear().toString()
      : 'Undated';
    const list = groups.get(year) ?? [];
    list.push(album);
    groups.set(year, list);
  }
  return [...groups.entries()].sort(([a], [b]) =>
    a === 'Undated' ? 1 : b === 'Undated' ? -1 : Number(b) - Number(a),
  );
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
