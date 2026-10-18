import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { database, drafts } from '$lib/server/runtime';
export const GET: RequestHandler = (event) =>
  api(event, (owner) => database().editor(event.params.id, owner));
export const PUT: RequestHandler = (event) =>
  api(event, async (owner) =>
    drafts(event.request).save(
      owner,
      event.params.id,
      await body(event.request),
    ),
  );
export const DELETE: RequestHandler = (event) =>
  api(event, (owner) =>
    drafts(event.request).operation(owner, event.params.id, 'delete'),
  );
