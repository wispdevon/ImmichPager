import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { upstream } from '$lib/server/runtime';
import { AppError } from '$lib/contracts';
export const GET: RequestHandler = async (event) => {
  try {
    const client = upstream(event.request);
    const album = await client.album(event.params.id);
    if (album.ownerId !== event.locals.user?.id || !album.albumThumbnailAssetId)
      error(404, 'Cover not found');
    const response = await client.thumbnail(album.albumThumbnailAssetId);
    return new Response(response.body, {
      headers: {
        'content-type': response.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'private, no-store',
      },
    });
  } catch (cause) {
    if (cause instanceof AppError) error(cause.status, cause.message);
    error(404, 'Cover not found');
  }
};
