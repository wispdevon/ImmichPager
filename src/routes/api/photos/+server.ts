import { z } from 'zod';
import type { RequestHandler } from './$types';
import { api } from '$lib/server/http';
import { upstream } from '$lib/server/runtime';
export const GET: RequestHandler = (event) =>
  api(event, (owner) => {
    const p = event.url.searchParams;
    const query = z
      .object({
        q: z.string().max(160),
        albumId: z.string().uuid().optional(),
        favorite: z.boolean(),
        cursor: z.string().max(4096).optional(),
      })
      .parse({
        q: p.get('q') || '',
        albumId: p.get('albumId') || undefined,
        favorite: p.get('favorite') === 'true',
        cursor: p.get('cursor') || undefined,
      });
    return upstream(event.request).photos(owner, query);
  });
