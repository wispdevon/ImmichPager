import type { PageServerLoad } from './$types';
import { database } from '$lib/server/runtime';
export const load: PageServerLoad = (event) => ({
  pages: database().editors(event.locals.user!.id),
  user: event.locals.user!,
});
