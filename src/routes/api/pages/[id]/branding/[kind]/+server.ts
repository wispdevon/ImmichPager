import sharp from 'sharp';
import type { RequestHandler } from './$types';
import { api } from '$lib/server/http';
import { database } from '$lib/server/runtime';
import { AppError, editorPage } from '$lib/contracts';
import { exclusive } from '$lib/server/security';

export const POST: RequestHandler = event => api(event, async owner => exclusive(event.params.id, async () => {
  const store = database();
  const page = store.owned(event.params.id, owner);
  const kind = event.params.kind;
  if (kind !== 'logo' && kind !== 'banner') throw new AppError(404, 'Unknown image type');
  const file = (await event.request.formData()).get('image');
  if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) throw new AppError(400, 'Choose an image smaller than 5 MB');
  let image: Buffer;
  try {
    const pipeline = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 32000000 });
    const metadata = await pipeline.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || '')) throw new Error('format');
    image = await pipeline.rotate().resize({ width: kind === 'logo' ? 512 : 2400, height: kind === 'logo' ? 512 : 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch { throw new AppError(400, 'Use a valid JPEG, PNG, or WebP image up to 32 megapixels'); }
  store.putBranding(page.id, kind, image);
  page[kind] = true; page.updatedAt = new Date().toISOString(); store.put(page);
  return editorPage(page);
}));
export const DELETE: RequestHandler = event => api(event, owner => {
  const store = database(); const page = store.owned(event.params.id, owner);
  const kind = event.params.kind;
  if (kind !== 'logo' && kind !== 'banner') throw new AppError(404, 'Unknown image type');
  store.removeBranding(page.id, kind); page[kind] = false; store.put(page); return editorPage(page);
});
