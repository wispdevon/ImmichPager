import type { RequestHandler } from './$types';
import { api } from '$lib/server/http';
import { drafts } from '$lib/server/runtime';

export const POST: RequestHandler = (event) =>
  api(event, (owner) =>
    drafts(event.request).duplicateDesign(owner, event.params.id),
  );
