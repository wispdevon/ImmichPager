import { afterEach, expect, it, vi } from 'vitest';
import { Immich } from '../src/lib/server/immich';
afterEach(() => vi.unstubAllGlobals());
it('preserves native custom slugs during password updates', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetcher);
  await new Immich('http://immich:2283', {
    cookie: 'immich_access_token=owner',
  }).updateShare('share', 'pin', 'pager-custom');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    slug: 'pager-custom',
    password: 'pin',
    allowUpload: false,
  });
});
it('never forwards editor credentials to a public share request', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ id: 'share', key: 'key', slug: 'slug' })),
    );
  vi.stubGlobal('fetch', fetcher);
  await new Immich('http://immich:2283', { cookie: 'owner-secret' }).shared(
    'key',
    'immich_shared_link_token=client',
  );
  expect(fetcher.mock.calls[0][1].headers).toEqual({
    cookie: 'immich_shared_link_token=client',
  });
});
