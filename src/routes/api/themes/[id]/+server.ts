import { z } from 'zod';
import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { database } from '$lib/server/runtime';
import { ThemeLibrary } from '$lib/server/theme-library';
import { themeRecordInputSchema } from '$lib/theme-schema';
export const GET: RequestHandler = (event) =>
  api(event, (owner) =>
    new ThemeLibrary(database()).get(owner, event.params.id),
  );
export const PATCH: RequestHandler = (event) =>
  api(event, async (owner) => {
    const value = themeRecordInputSchema.parse(await body(event.request));
    return new ThemeLibrary(database()).update(
      owner,
      event.params.id,
      value.definition,
      value.expectedRevision,
    );
  });
export const DELETE: RequestHandler = (event) =>
  api(event, async (owner) => {
    const value = z
      .object({ expectedRevision: z.number().int().nonnegative() })
      .strict()
      .parse(await body(event.request));
    return new ThemeLibrary(database()).remove(
      owner,
      event.params.id,
      value.expectedRevision,
    );
  });
