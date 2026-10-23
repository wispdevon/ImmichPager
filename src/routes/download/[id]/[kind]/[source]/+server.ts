import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { body } from '$lib/server/http';
import {
  contentSource,
  sourceAssetIds,
  contentResponse,
} from '$lib/server/content';
const input = z
  .object({
    revision: z.number().int(),
    part: z.number().int().nonnegative().optional(),
  })
  .strict();
export const POST: RequestHandler = (event) =>
  contentResponse(async () => {
    const source = await contentSource(event);
    if (!source.page.allowDownload) error(403, 'Downloads are disabled');
    const values = event.request.headers
      .get('content-type')
      ?.includes('application/json')
      ? await body(event.request)
      : Object.fromEntries(
          [...(await event.request.formData())].map(([key, value]) => [
            key,
            Number(value),
          ]),
        );
    const parsed = input.safeParse(values);
    if (!parsed.success) error(400, 'Invalid archive request');
    if (parsed.data.revision !== source.page.revision)
      error(409, 'This page changed; refresh before downloading');
    const ids = await sourceAssetIds(source);
    if (!ids.length) error(404, 'No photos available');
    const plan = await source.client.downloadInfo(
      ids,
      source.key,
      source.cookie,
    );
    const allowed = new Set(ids);
    if (plan.archives.some((a) => a.assetIds.some((id) => !allowed.has(id))))
      error(502, 'Immich returned an invalid archive');
    if (parsed.data.part === undefined)
      return {
        revision: source.page.revision,
        parts: plan.archives.map((a, index) => ({
          index,
          count: a.assetIds.length,
          size: a.size,
        })),
      };
    const archive = plan.archives[parsed.data.part];
    if (!archive) error(404, 'Archive part not found');
    const response = await source.client.downloadArchive(
      archive.assetIds,
      source.key,
      source.cookie,
      event.request.signal,
    );
    return new Response(response.body, {
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="photos-${parsed.data.part + 1}.zip"`,
        'cache-control': 'private, no-store',
      },
    });
  });
