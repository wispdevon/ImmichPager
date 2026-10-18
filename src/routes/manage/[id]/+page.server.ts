import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { database, upstream } from '$lib/server/runtime';
import { AppError, editorPage } from '$lib/contracts';
export const load: PageServerLoad = async (event) => {
  try {
    return {
      page:
        event.params.id === 'new'
          ? null
          : editorPage(
              database().owned(event.params.id, event.locals.user!.id),
            ),
      albums: (await upstream(event.request).albums()).filter(
        (a) => a.ownerId === event.locals.user!.id,
      ),
    };
  } catch (cause) {
    if (cause instanceof AppError) error(cause.status, cause.message);
    throw cause;
  }
};
