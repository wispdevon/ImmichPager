import { error, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { upstream } from '$lib/server/runtime';
import { AppError } from '$lib/contracts';

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  const managed = /^\/page\/(manage|api)(\/|$)/.test(path);
  event.locals.user = null;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)) {
    const expected = env.ORIGIN ? new URL(env.ORIGIN).origin : event.url.origin;
    if (event.request.headers.get('origin') !== expected)
      error(403, 'A same-origin request is required');
    const length = Number(event.request.headers.get('content-length') || 0);
    if (length > 6 * 1024 * 1024) error(413, 'Request is too large');
  }
  if (managed) {
    try {
      event.locals.user = await upstream(event.request).user();
    } catch (cause) {
      if (cause instanceof AppError) error(cause.status, cause.message);
      error(502, 'Could not verify your Immich session');
    }
  }
  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (!path.startsWith('/page/assets/'))
    response.headers.set('Cache-Control', 'private, no-store');
  return response;
};
