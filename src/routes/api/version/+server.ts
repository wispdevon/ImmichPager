import type { RequestHandler } from './$types';
import { api } from '$lib/server/http';
import { versions } from '$lib/server/version-runtime';
export const GET: RequestHandler = (event) =>
  api(event, async () => ({
    ...(await versions.check()),
    userId: event.locals.user!.id,
    isAdmin: event.locals.user!.isAdmin === true,
  }));
