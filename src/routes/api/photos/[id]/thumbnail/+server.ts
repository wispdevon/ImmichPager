import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { upstream } from '$lib/server/runtime';
import { AppError } from '$lib/contracts';
export const GET: RequestHandler = async (event) => {
  try {
    const client = upstream(event.request);
    await client.photo(event.params.id, event.locals.user!.id);
    const response = await client.assetMedia(event.params.id, 'thumbnail');
    return new Response(response.body, {
      headers: {
        'content-type': response.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'private, no-store',
      },
    });
  } catch (cause) {
    if (cause instanceof AppError) error(cause.status, cause.message);
    error(502, 'Photo unavailable');
  }
};
