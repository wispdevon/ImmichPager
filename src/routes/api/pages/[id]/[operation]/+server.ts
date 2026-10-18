import { z } from 'zod';
import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { service } from '$lib/server/runtime';
import { AppError, editorPage } from '$lib/contracts';
export const POST: RequestHandler = event => api(event, async owner => {
  const { password } = z.object({ password: z.string().max(256).default('') }).parse(await body(event.request));
  const svc = service(event.request);
  const operation = event.params.operation;
  const page = operation === 'publish' ? await svc.publish(owner, event.params.id, password)
    : operation === 'unpublish' ? await svc.unpublish(owner, event.params.id)
    : operation === 'retry' ? await svc.retry(owner, event.params.id, password)
    : null;
  if (!page) throw new AppError(404, 'Unknown operation');
  return editorPage(page);
});
