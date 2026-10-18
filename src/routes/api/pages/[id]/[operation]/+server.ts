import { z } from 'zod';
import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { drafts } from '$lib/server/runtime';
export const POST: RequestHandler = (event) =>
  api(event, async (owner) => {
    const input = z
      .object({
        password: z.string().max(256).default(''),
        passwordMode: z.enum(['keep', 'set', 'remove']).default('keep'),
        expectedDraftRevision: z.number().int().nonnegative().optional(),
      })
      .parse(await body(event.request));
    const svc = drafts(event.request);
    return event.params.operation === 'publish'
      ? svc.publish(owner, event.params.id, input)
      : svc.operation(
          owner,
          event.params.id,
          event.params.operation,
          input.password,
        );
  });
