import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { database, upstream } from '$lib/server/runtime';
import { pageAccess } from '$lib/server/gallery';
export const GET: RequestHandler = async event => {
  const page = database().get(event.params.id);
  if (!page) error(404, 'Image not found');
  const access = await pageAccess(event, page);
  if (event.params.type === 'branding') {
    if (!['logo', 'banner'].includes(event.params.item)) error(404, 'Image not found');
    const data = database().branding(page.id, event.params.item);
    if (!data) error(404, 'Image not found');
    return new Response(new Uint8Array(data), { headers: { 'content-type': 'image/webp', 'cache-control': 'private, no-store' } });
  }
  if (event.params.type !== 'album' || !page.albumIds.includes(event.params.item)) error(404, 'Cover not found');
  try {
    const client = upstream(access.preview ? event.request : undefined);
    const share = database().shares(page.id).find(s => s.albumId === event.params.item);
    const cookie = access.session?.tokens[event.params.item] || '';
    const album = access.preview ? await client.album(event.params.item) : share ? (await client.shared(share.key, cookie)).album : null;
    if (!album?.albumThumbnailAssetId) error(404, 'Cover not found');
    const response = await client.thumbnail(album.albumThumbnailAssetId, access.preview ? undefined : share!.key, cookie);
    return new Response(response.body, { headers: { 'content-type': response.headers.get('content-type') || 'image/jpeg', 'cache-control': 'private, no-store' } });
  } catch { error(404, 'Cover unavailable'); }
};
