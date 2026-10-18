import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { database, service } from '$lib/server/runtime';
import { editorPage, parsePageInput } from '$lib/contracts';
export const GET: RequestHandler = (event) =>
  api(event, (id) => database().list(id).map(editorPage));
export const POST: RequestHandler = (event) =>
  api(event, async (id) =>
    editorPage(
      await service(event.request).save(
        id,
        null,
        parsePageInput(await body(event.request)),
      ),
    ),
  );
