import { error, type RequestEvent } from '@sveltejs/kit';
import type { GalleryPage, PageRecord } from '../contracts';
import { AppError } from '../contracts';
import { database, upstream } from './runtime';
import type { PageSession } from './store';

type GallerySource = Omit<GalleryPage, 'logo' | 'banner' | 'albums'> &
  Pick<PageRecord, 'ownerId' | 'albumIds' | 'logo' | 'banner'>;

export const cookieName = (page: PageRecord) =>
  `pager_${page.id.replaceAll('-', '')}`;
export async function pageAccess(
  event: RequestEvent,
  page: PageRecord,
): Promise<{ preview: boolean; session: PageSession | null }> {
  if (event.url.searchParams.get('preview') === '1') {
    try {
      const user = await upstream(event.request).user();
      if (user.id === page.ownerId) return { preview: true, session: null };
    } catch {
      /* Continue with ordinary public authorization. */
    }
  }
  if (page.status !== 'published') error(404, 'Page not found');
  if (!page.passwordHash) return { preview: false, session: null };
  const session = database().session(event.cookies.get(cookieName(page)), page);
  if (!session) error(401, 'Password required');
  return { preview: false, session };
}
export async function gallery(
  page: GallerySource,
  event: RequestEvent,
  access: Awaited<ReturnType<typeof pageAccess>>,
): Promise<GalleryPage> {
  const client = upstream(access.preview ? event.request : undefined);
  const shares = database().shares(page.id);
  const {
    id,
    title,
    description,
    theme,
    background,
    foreground,
    accent,
    alignment,
    bannerPosition,
    headerLayout,
    headerSize,
    logoSize,
    customCss,
    order,
  } = page;
  const suffix = access.preview ? '?preview=1' : '';
  const result: GalleryPage = {
    id,
    title,
    description,
    theme,
    background,
    foreground,
    accent,
    alignment,
    bannerPosition,
    headerLayout,
    headerSize,
    logoSize,
    customCss,
    order,
    logo: page.logo ? `/page/media/${id}/branding/logo${suffix}` : null,
    banner: page.banner ? `/page/media/${id}/branding/banner${suffix}` : null,
    albums: [],
  };
  // Bound concurrency to avoid flooding a small Immich server.
  for (let i = 0; i < page.albumIds.length; i += 6) {
    result.albums.push(
      ...(await Promise.all(
        page.albumIds.slice(i, i + 6).map(async (albumId) => {
          const share = shares.find((s) => s.albumId === albumId);
          try {
            const album = access.preview
              ? await client.album(albumId)
              : share
                ? (
                    await client.shared(
                      share.key,
                      access.session?.tokens[albumId],
                    )
                  ).album
                : undefined;
            if (!album || (access.preview && album.ownerId !== page.ownerId))
              throw new AppError(404, 'Album unavailable');
            return {
              id: albumId,
              name: album.albumName,
              startDate: album.startDate ?? undefined,
              endDate: album.endDate ?? undefined,
              count: album.assetCount,
              cover: album.albumThumbnailAssetId
                ? `/page/media/${id}/album/${albumId}${suffix}`
                : null,
              href: access.preview
                ? `/albums/${albumId}`
                : `/s/${encodeURIComponent(share!.slug)}`,
              available: true,
            };
          } catch {
            return {
              id: albumId,
              name: 'Album unavailable',
              count: 0,
              cover: null,
              href: null,
              available: false,
            };
          }
        }),
      )),
    );
  }
  return result;
}
