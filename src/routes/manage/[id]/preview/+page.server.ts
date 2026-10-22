import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { AppError } from '$lib/contracts';
import { database } from '$lib/server/runtime';
import { gallery } from '$lib/server/gallery';

export const load: PageServerLoad = async (event) => {
  try {
    const draft = database().editor(event.params.id, event.locals.user!.id);
    return {
      page: await gallery(draft, event, { preview: true, session: null }),
    };
  } catch (cause) {
    if (cause instanceof AppError) error(cause.status, cause.message);
    throw cause;
  }
};
