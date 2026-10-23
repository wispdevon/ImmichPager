import { expect, it } from 'vitest';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { createPageQr } from '../src/lib/qr-code';

it.each(['client', 'changed-client-url', 'a'.repeat(80)])(
  'exports decodable 1024px PNG and scalable SVG for %s',
  async (slug) => {
    const qr = await createPageQr('https://photos.example.com', slug);
    expect(qr.filename).toBe(`immichpager-${slug}-qr`);
    for (const input of [
      Buffer.from(qr.png.split(',')[1], 'base64'),
      Buffer.from(qr.svg),
    ]) {
      const { data, info } = await sharp(input)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(1024);
      expect(info.height).toBe(1024);
      expect([...data.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
      expect(
        jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data,
      ).toBe(`https://photos.example.com/page/${slug}`);
    }
  },
);

it('rejects URLs or credentials passed as slugs', async () => {
  for (const slug of [
    '',
    'draft?password=secret',
    'https://evil.test',
    '../api',
  ]) {
    await expect(
      createPageQr('https://photos.example.com', slug),
    ).rejects.toThrow();
  }
  const qr = await createPageQr(
    'https://user:secret@photos.example.com/?token=secret',
    'client',
  );
  expect(qr.url).toBe('https://photos.example.com/page/client');
});
