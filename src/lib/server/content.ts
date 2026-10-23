import { error, json, type RequestEvent } from '@sveltejs/kit';
import { AppError, type DraftRecord, type PageRecord } from '../contracts';
import { pageBlocks, type PhotosBlock } from '../blocks';
import { database, upstream } from './runtime';
import { pageAccess } from './gallery';
import type { Immich } from './immich';

import type { PhotoPage } from '../contracts';

export type ContentSource = {
  page: DraftRecord | PageRecord;
  client: Immich;
  preview: boolean;
  kind: 'album' | 'photos';
  sourceId: string;
  block?: PhotosBlock;
  key?: string;
  cookie: string;
};
export async function contentSource(
  event: RequestEvent,
): Promise<ContentSource> {
  const { id, kind, source } = event.params;
  if (!id || !source || !['album', 'photos'].includes(kind ?? ''))
    error(404, 'Content not found');
  const preview = event.url.searchParams.get('preview') === '1';
  let page: DraftRecord | PageRecord;
  let cookie = '',
    key: string | undefined;
  const client = upstream(preview ? event.request : undefined);
  if (preview) {
    const user = await client.user();
    page = database().draft(id, user.id);
  } else {
    const live = database().get(id);
    if (!live) error(404, 'Content not found');
    const access = await pageAccess(event, live);
    page = live;
    const share =
      kind === 'album'
        ? database()
            .shares(id)
            .find((s) => s.albumId === source)
        : database()
            .photoShares(id)
            .find((s) => s.blockId === source);
    if (!share) error(404, 'Content unavailable');
    key = share.key;
    cookie =
      access.session?.tokens[kind === 'album' ? source : `photos:${source}`] ??
      '';
  }
  const blocks = pageBlocks(page);
  const block = blocks.find(
    (b): b is PhotosBlock => b.type === 'photos' && b.id === source,
  );
  if (kind === 'album') {
    if (!blocks.some((b) => b.type === 'albums' && b.albumIds.includes(source)))
      error(404, 'Album not on this page');
    if (preview && (await client.album(source)).ownerId !== page.ownerId)
      error(404, 'Album not found');
  } else if (!block) error(404, 'Photo block not found');
  return {
    page,
    client,
    preview,
    kind: kind as 'album' | 'photos',
    sourceId: source,
    block,
    key,
    cookie,
  };
}
export async function sourcePhotoPage(
  source: ContentSource,
  cursor: string | null,
): Promise<PhotoPage> {
  const { page, client, preview, key, cookie, kind, sourceId } = source;
  const match = /^(\d{1,8}):(\d{1,8})$/.exec(cursor ?? '0:0');
  if (!match) throw new AppError(400, 'Invalid photo cursor');
  let bucketIndex = Number(match[1]),
    offset = Number(match[2]);
  const items: {
    id: string;
    ratio: number;
    takenAt: string;
    caption?: string;
    alt?: string;
  }[] = [];
  let nextCursor: string | null = null;
  if (kind === 'album') {
    const buckets = await client.timeBuckets(sourceId, key, cookie);
    let visited = 0;
    while (bucketIndex < buckets.length && items.length < 60 && visited++ < 4) {
      const bucket = await client.timeBucket(
        sourceId,
        buckets[bucketIndex].timeBucket,
        key,
        cookie,
      );
      const chunk = bucket.slice(offset, offset + 60 - items.length);
      items.push(...chunk);
      offset += chunk.length;
      if (offset >= bucket.length) {
        bucketIndex++;
        offset = 0;
      }
      if (bucketIndex < buckets.length) nextCursor = `${bucketIndex}:${offset}`;
      else nextCursor = null;
    }
  } else {
    const selected = source.block!.photos.slice(offset, offset + 60);
    const shared = preview ? null : await client.shared(key!, cookie);
    for (let start = 0; start < selected.length; start += 6) {
      items.push(
        ...(
          await Promise.all(
            selected.slice(start, start + 6).map(async (photo) => {
              try {
                const asset = preview
                  ? await client.photo(photo.id, page.ownerId)
                  : shared?.assets?.find(
                      (a) => a.id === photo.id && a.type === 'IMAGE',
                    );
                if (!asset) return null;
                const width = asset.exifInfo?.exifImageWidth ?? 3,
                  height = asset.exifInfo?.exifImageHeight ?? 2;
                return {
                  ...photo,
                  ratio: width / (height || 2),
                  takenAt: asset.fileCreatedAt ?? '',
                };
              } catch {
                return null;
              }
            }),
          )
        ).filter((p): p is NonNullable<typeof p> => !!p),
      );
    }
    if (offset + 60 < source.block!.photos.length)
      nextCursor = `0:${offset + 60}`;
  }
  const suffix = preview ? '?preview=1' : '';
  const base = `/page/media/${page.id}/${kind}/${sourceId}`;
  return {
    items: items.map((photo) => ({
      ...photo,
      caption: photo.caption ?? '',
      alt: photo.alt ?? '',
      thumbnail: `${base}/${photo.id}/thumbnail${suffix}`,
      preview: `${base}/${photo.id}/preview${suffix}`,
      original: page.allowDownload
        ? `${base}/${photo.id}/original${suffix}`
        : null,
    })),
    nextCursor,
  };
}
export async function sourceAssetIds(source: ContentSource) {
  if (source.kind === 'photos') return source.block!.photos.map((p) => p.id);
  const buckets = await source.client.timeBuckets(
    source.sourceId,
    source.key,
    source.cookie,
  );
  const ids: string[] = [];
  for (let i = 0; i < buckets.length; i += 4) {
    const pages = await Promise.all(
      buckets
        .slice(i, i + 4)
        .map((b) =>
          source.client.timeBucket(
            source.sourceId,
            b.timeBucket,
            source.key,
            source.cookie,
          ),
        ),
    );
    ids.push(...pages.flatMap((p) => p.map((photo) => photo.id)));
  }
  return ids;
}
const previewMembership = new Map<
  string,
  { expires: number; ids: Promise<Set<string>> }
>();
export async function sourceMedia(
  source: ContentSource,
  assetId: string,
  variant: string,
) {
  if (!['thumbnail', 'preview', 'original'].includes(variant))
    throw new AppError(404, 'Image not found');
  if (variant === 'original' && !source.page.allowDownload)
    throw new AppError(403, 'Downloads are disabled');
  if (
    source.kind === 'photos' &&
    !source.block!.photos.some((p) => p.id === assetId)
  )
    throw new AppError(404, 'Photo not in this block');
  if (source.preview) {
    await source.client.photo(assetId, source.page.ownerId);
    if (source.kind === 'album') {
      const cacheKey = `${source.page.ownerId}:${source.page.id}:${source.page.revision}:${source.sourceId}`;
      let members = previewMembership.get(cacheKey);
      if (!members || members.expires < Date.now()) {
        members = {
          expires: Date.now() + 10000,
          ids: sourceAssetIds(source).then((ids) => new Set(ids)),
        };
        if (previewMembership.size >= 32)
          previewMembership.delete(previewMembership.keys().next().value!);
        previewMembership.set(cacheKey, members);
      }
      try {
        if (!(await members.ids).has(assetId))
          throw new AppError(404, 'Photo not in this album');
      } catch (cause) {
        if (previewMembership.get(cacheKey) === members)
          previewMembership.delete(cacheKey);
        throw cause;
      }
    }
  }
  // Immich rechecks actual native-share membership for each public media request.
  return source.client.assetMedia(
    assetId,
    variant as 'thumbnail' | 'preview' | 'original',
    source.key ? (source.cookie ? { cookie: source.cookie } : {}) : undefined,
    source.key,
  );
}
export async function contentResponse(
  work: () => Promise<Response | object>,
): Promise<Response> {
  try {
    const result = await work();
    return result instanceof Response ? result : json(result);
  } catch (cause) {
    if (cause instanceof AppError) error(cause.status, cause.message);
    throw cause;
  }
}
