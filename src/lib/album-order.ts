import type { Album } from './contracts';

type AlbumDate = Pick<Album, 'id' | 'endDate'>;

export function albumYear(endDate?: string) {
  return endDate ? new Date(endDate).getUTCFullYear().toString() : 'Undated';
}

function albumYears(albums: readonly AlbumDate[]) {
  return new Map(albums.map(({ id, endDate }) => [id, albumYear(endDate)]));
}

function orderGroups(
  albumIds: readonly string[],
  years: ReadonlyMap<string, string>,
) {
  const groups = new Map<string, string[]>();
  for (const id of albumIds) {
    const year = years.get(id) ?? 'Undated';
    const group = groups.get(year) ?? [];
    group.push(id);
    groups.set(year, group);
  }

  return [...groups.entries()].sort(([a], [b]) =>
    a === 'Undated' ? 1 : b === 'Undated' ? -1 : Number(b) - Number(a),
  );
}

export function albumOrderGroups(
  albumIds: readonly string[],
  albums: readonly AlbumDate[],
) {
  return orderGroups(albumIds, albumYears(albums));
}

export function moveAlbumRelative(
  albumIds: string[],
  albums: readonly AlbumDate[],
  albumId: string,
  targetId: string,
  position: 'before' | 'after',
) {
  const years = albumYears(albums);
  const year = years.get(albumId) ?? 'Undated';
  if (
    !albumIds.includes(albumId) ||
    !albumIds.includes(targetId) ||
    albumId === targetId ||
    year !== (years.get(targetId) ?? 'Undated')
  )
    return albumIds;

  const group = orderGroups(albumIds, years).find(([key]) => key === year)?.[1];
  if (!group) return albumIds;
  const reordered = [...group];
  reordered.splice(reordered.indexOf(albumId), 1);
  const targetIndex = reordered.indexOf(targetId);
  reordered.splice(targetIndex + (position === 'after' ? 1 : 0), 0, albumId);

  const next = [...albumIds];
  let groupIndex = 0;
  for (let index = 0; index < next.length; index++)
    if ((years.get(next[index]) ?? 'Undated') === year)
      next[index] = reordered[groupIndex++];
  return next.every((id, index) => id === albumIds[index]) ? albumIds : next;
}

export function moveAlbumBy(
  albumIds: string[],
  albums: readonly AlbumDate[],
  albumId: string,
  by: number,
) {
  if (by !== -1 && by !== 1) return albumIds;
  const years = albumYears(albums);
  const year = years.get(albumId) ?? 'Undated';
  const group = orderGroups(albumIds, years).find(([key]) => key === year)?.[1];
  const index = group?.indexOf(albumId) ?? -1;
  const targetId = group?.[index + by];
  if (index < 0 || !targetId) return albumIds;
  return moveAlbumRelative(
    albumIds,
    albums,
    albumId,
    targetId,
    by < 0 ? 'before' : 'after',
  );
}
