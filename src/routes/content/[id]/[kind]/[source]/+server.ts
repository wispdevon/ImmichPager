import type { RequestHandler } from './$types';
import {
  contentSource,
  sourcePhotoPage,
  contentResponse,
} from '$lib/server/content';
export const GET: RequestHandler = (event) =>
  contentResponse(async () =>
    sourcePhotoPage(
      await contentSource(event),
      event.url.searchParams.get('cursor'),
    ),
  );
