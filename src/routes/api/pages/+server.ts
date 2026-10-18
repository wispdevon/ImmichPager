import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { database, drafts } from '$lib/server/runtime';
export const GET: RequestHandler = (event) =>
  api(event, (owner) => database().editors(owner));
export const POST: RequestHandler = (event) =>
  api(event, async (owner) =>
    drafts(event.request).save(owner, null, await body(event.request)),
  );
