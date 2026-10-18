import { afterEach, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { Immich } from '../src/lib/server/immich';
import {
  brandingImage,
  boundedImage,
  maxBrandingBytes,
} from '../src/lib/server/branding';
afterEach(() => vi.unstubAllGlobals());
const asset = {
  id: 'asset',
  ownerId: 'alice',
  type: 'IMAGE',
  originalFileName: 'logo.png',
  originalMimeType: 'image/png',
  fileCreatedAt: '2026-01-01',
  visibility: 'timeline',
  isTrashed: false,
  isOffline: false,
};
it('searches with v3 filters and returns only minimal owned photo metadata', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        assets: {
          items: [
            asset,
            { ...asset, id: 'partner', ownerId: 'bob' },
            { ...asset, id: 'locked', visibility: 'locked' },
            { ...asset, id: 'trash', isTrashed: true },
          ],
          nextCursor: 'next',
        },
      }),
    ),
  );
  vi.stubGlobal('fetch', fetcher);
  const result = await new Immich('http://immich:2283').photos('alice', {
    q: 'logo',
    favorite: true,
  });
  expect(result.items.map((a) => a.id)).toEqual(['asset']);
  expect(result.nextCursor).toBe('next');
  expect(Object.keys(result.items[0]).sort()).toEqual([
    'id',
    'name',
    'takenAt',
    'thumbnail',
  ]);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    filter: {
      originalFileName: { like: '%logo%' },
      type: { eq: 'IMAGE' },
      isFavorite: { eq: true },
      trashedAt: { eq: null },
    },
  });
});
it.each([
  { ownerId: 'bob' },
  { visibility: 'locked' },
  { isTrashed: true },
  { isOffline: true },
  { type: 'VIDEO' },
])('denies a photo that is not selectable: %s', async (change) => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ...asset, ...change }))),
  );
  await expect(
    new Immich('http://immich:2283').photo('asset', 'alice'),
  ).rejects.toThrow('not available');
});
it('follows same-asset media redirects and keeps credentials on the configured upstream', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: 'original' } }),
    )
    .mockResolvedValueOnce(
      new Response('image', { headers: { 'content-type': 'image/webp' } }),
    );
  vi.stubGlobal('fetch', fetcher);
  await new Immich('http://immich:2283', { cookie: 'owner' }).assetMedia(
    'asset',
    'preview',
  );
  expect(String(fetcher.mock.calls[1][0])).toBe(
    'http://immich:2283/api/assets/asset/original',
  );
  expect(fetcher.mock.calls[1][1].headers).toEqual({ cookie: 'owner' });
});
it.each([
  'https://external.invalid/image',
  '/api/users/me',
  '/api/assets/other/original',
])('rejects an unsafe media redirect: %s', async (location) => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(null, { status: 302, headers: { location } }),
    );
  vi.stubGlobal('fetch', fetcher);
  await expect(
    new Immich('http://immich:2283', { cookie: 'secret' }).assetMedia(
      'asset',
      'preview',
    ),
  ).rejects.toThrow('invalid image redirect');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('bounds a streamed library image even without a content length', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(maxBrandingBytes));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    },
  });
  await expect(boundedImage(new Response(stream))).rejects.toThrow('5 MB');
});
it('preserves logo transparency and strips metadata in a bounded WebP copy', async () => {
  const png = await sharp({
    create: {
      width: 800,
      height: 400,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 0.3 },
    },
  })
    .png()
    .toBuffer();
  const output = await brandingImage(png, 'logo'),
    meta = await sharp(output).metadata();
  expect(meta.width).toBe(512);
  expect(meta.height).toBe(256);
  expect(meta.hasAlpha).toBe(true);
  expect(meta.exif).toBeUndefined();
});

it.each(['text/html', 'image/svg+xml'])(
  'does not proxy active content as a library image: %s',
  async (type) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('<svg/>', { headers: { 'content-type': type } }),
        ),
    );
    await expect(
      new Immich('http://immich:2283').assetMedia('asset', 'thumbnail'),
    ).rejects.toThrow('supported image');
  },
);
