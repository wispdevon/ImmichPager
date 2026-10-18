import sharp from 'sharp';
import { AppError } from '../contracts';
export const maxBrandingBytes = 5 * 1024 * 1024;
export async function brandingImage(
  bytes: Uint8Array,
  kind: 'logo' | 'banner',
) {
  if (!bytes.length || bytes.length > maxBrandingBytes)
    throw new AppError(413, 'Choose an image that is 5 MB or smaller.');
  try {
    const pipeline = sharp(bytes, { limitInputPixels: 32000000 });
    const meta = await pipeline.metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format || ''))
      throw Error('format');
    return await pipeline
      .rotate()
      .resize({
        width: kind === 'logo' ? 512 : 2400,
        height: kind === 'logo' ? 512 : 1200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new AppError(
      400,
      'Use a valid JPEG, PNG, or WebP image up to 32 megapixels.',
    );
  }
}
export async function boundedImage(response: Response) {
  if (Number(response.headers.get('content-length')) > maxBrandingBytes) {
    await response.body?.cancel();
    throw new AppError(413, 'Choose an image that is 5 MB or smaller.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new AppError(502, 'Image unavailable');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBrandingBytes)
        throw new AppError(413, 'Choose an image that is 5 MB or smaller.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}
