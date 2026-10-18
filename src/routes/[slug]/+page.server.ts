import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { database, upstream } from '$lib/server/runtime';
import { gallery, pageAccess, cookieName } from '$lib/server/gallery';
import { verifyPassword, tokenHash } from '$lib/server/security';
import { AppError } from '$lib/contracts';

export const load: PageServerLoad = async (event) => {
  const row = database()
    .db.prepare('SELECT id FROM pages WHERE slug=?')
    .get(event.params.slug) as { id: string } | undefined;
  const page = row && database().get(row.id);
  if (!page) error(404, 'Page not found');
  try {
    const access = await pageAccess(event, page);
    return {
      locked: false,
      page: await gallery(page, event, access),
      preview: access.preview,
    };
  } catch (cause) {
    if (
      cause &&
      typeof cause === 'object' &&
      'status' in cause &&
      cause.status === 401
    )
      return { locked: true, page: null, preview: false };
    throw cause;
  }
};
export const actions: Actions = {
  default: async (event) => {
    const page = database().publicPage(event.params.slug);
    if (!page?.passwordHash) return fail(404, { message: 'Page not found' });
    const bucket = tokenHash(`${page.id}:${event.getClientAddress()}`);
    if (!database().allowAttempt(bucket))
      return fail(429, {
        message: 'Too many attempts. Try again in 15 minutes.',
      });
    const value = (await event.request.formData()).get('password');
    if (
      typeof value !== 'string' ||
      value.length > 256 ||
      !(await verifyPassword(value, page.passwordHash))
    )
      return fail(401, { message: 'Incorrect password' });
    const tokens: Record<string, string> = {};
    const client = upstream();
    try {
      for (const share of database().shares(page.id)) {
        try {
          tokens[share.albumId] = await client.loginShare(share.key, value);
        } catch (cause) {
          if (!(cause instanceof AppError && cause.status === 404)) throw cause;
        }
      }
    } catch {
      return fail(502, {
        message:
          'Could not unlock the album links. Ask the photographer to synchronize this page.',
      });
    }
    const token = database().createSession(page, tokens);
    event.cookies.set(cookieName(page), token, {
      path: '/page',
      httpOnly: true,
      secure: event.url.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60,
    });
    return { message: '' };
  },
};
