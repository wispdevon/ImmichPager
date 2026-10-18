import type { PageServerLoad } from './$types';
import { database } from '$lib/server/runtime';
import { editorPage } from '$lib/contracts';
export const load: PageServerLoad = (event) => ({
  pages: database().list(event.locals.user!.id).map(editorPage),
  user: event.locals.user!,
});
