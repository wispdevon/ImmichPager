import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { database } from '$lib/server/runtime';
import { ThemeLibrary } from '$lib/server/theme-library';
import { themeRecordInputSchema } from '$lib/theme-schema';
export const GET: RequestHandler = (event) =>
  api(event, (owner) =>
    new ThemeLibrary(database()).list(
      owner,
      event.url.searchParams.get('cursor') ?? '',
      event.url.searchParams.get('q') ?? '',
    ),
  );
export const POST: RequestHandler = (event) =>
  api(event, async (owner) => {
    const value = themeRecordInputSchema.parse(await body(event.request));
    return new ThemeLibrary(database()).create(owner, value.definition);
  });
