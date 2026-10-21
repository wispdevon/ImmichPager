import { z } from 'zod';
import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { drafts } from '$lib/server/runtime';
import { AppError } from '$lib/contracts';
export const GET: RequestHandler = (event) =>
  api(event, (owner) => {
    if (event.params.operation !== 'publication-review')
      throw new AppError(404, 'Unknown operation');
    const revision = event.url.searchParams.get('expectedDraftRevision');
    if (revision === null)
      throw new AppError(400, 'Expected draft revision is required');
    const expectedDraftRevision = z
      .string()
      .regex(/^(0|[1-9]\d*)$/)
      .transform(Number)
      .pipe(z.number().int().nonnegative())
      .parse(revision);
    return drafts(event.request).review(
      owner,
      event.params.id,
      expectedDraftRevision,
    );
  });
export const POST: RequestHandler = (event) =>
  api(event, async (owner) => {
    const input = z
      .object({
        password: z.string().max(256).default(''),
        passwordMode: z.enum(['keep', 'set', 'remove']).default('keep'),
        expectedDraftRevision: z.number().int().nonnegative().optional(),
        expectedPublishedRevision: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .optional(),
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
