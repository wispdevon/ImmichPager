import type { RequestHandler } from './$types';
import {
  contentSource,
  sourceMedia,
  contentResponse,
} from '$lib/server/content';
export const GET: RequestHandler = (event) =>
  contentResponse(async () => {
    const response = await sourceMedia(
      await contentSource(event),
      event.params.asset,
      event.params.variant,
    );
    return new Response(response.body, {
      headers: {
        'content-type': response.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'private, no-store',
        ...(event.params.variant === 'original'
          ? { 'content-disposition': 'attachment; filename="photo"' }
          : {}),
      },
    });
  });
