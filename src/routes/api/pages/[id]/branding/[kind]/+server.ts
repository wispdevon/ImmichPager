import { z } from 'zod';
import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { database, drafts, upstream } from '$lib/server/runtime';
import { AppError } from '$lib/contracts';
import { exclusive } from '$lib/server/security';
import {
  brandingImage,
  boundedImage,
  maxBrandingBytes,
} from '$lib/server/branding';
export const POST: RequestHandler = (event) =>
  api(event, (owner) =>
    exclusive(`draft:${event.params.id}`, async () => {
      const kind = z.enum(['logo', 'banner']).parse(event.params.kind);
      let bytes: Uint8Array, revision: number;
      if (
        event.request.headers.get('content-type')?.includes('application/json')
      ) {
        const data = z
          .object({
            assetId: z.string().uuid(),
            expectedDraftRevision: z.number().int().nonnegative(),
          })
          .parse(await body(event.request));
        revision = data.expectedDraftRevision;
        drafts(event.request).check(event.params.id, owner, revision);
        const client = upstream(event.request),
          asset = await client.photo(data.assetId, owner);
        bytes = await boundedImage(
          await client.assetMedia(
            asset.id,
            ['image/png', 'image/webp'].includes(asset.originalMimeType) ||
              /\.(png|webp)$/i.test(asset.originalFileName)
              ? 'original'
              : 'preview',
          ),
        );
      } else {
        const form = await event.request.formData();
        revision = z.coerce
          .number()
          .int()
          .nonnegative()
          .parse(form.get('expectedDraftRevision'));
        drafts(event.request).check(event.params.id, owner, revision);
        const file = form.get('image');
        if (
          !(file instanceof File) ||
          !file.size ||
          file.size > maxBrandingBytes
        )
          throw new AppError(413, 'Choose an image that is 5 MB or smaller.');
        bytes = new Uint8Array(await file.arrayBuffer());
      }
      const draft = drafts(event.request).check(
        event.params.id,
        owner,
        revision,
      );
      database().changeDraftBranding(
        draft,
        kind,
        await brandingImage(bytes, kind),
      );
      return database().editor(draft.id, owner);
    }),
  );
export const DELETE: RequestHandler = (event) =>
  api(event, (owner) =>
    exclusive(`draft:${event.params.id}`, async () => {
      const kind = z.enum(['logo', 'banner']).parse(event.params.kind);
      const { expectedDraftRevision } = z
        .object({ expectedDraftRevision: z.number().int().nonnegative() })
        .parse(await body(event.request));
      const draft = drafts(event.request).check(
        event.params.id,
        owner,
        expectedDraftRevision,
      );
      database().changeDraftBranding(draft, kind, null);
      return database().editor(draft.id, owner);
    }),
  );
