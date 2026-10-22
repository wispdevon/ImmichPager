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

it('normalizes v3 album ownership without treating a collaborator as owner', async () => {
  const albums = [
    {
      id: 'owned',
      albumName: 'My work',
      createdAt: '2026-10-01T12:00:00.000Z',
      albumUsers: [{ user: { id: 'alice' }, role: 'owner' }],
    },
    {
      id: 'shared',
      albumName: 'Shared with me',
      albumUsers: [
        { user: { id: 'bob' }, role: 'owner' },
        { user: { id: 'alice' }, role: 'editor' },
      ],
    },
    { id: 'legacy', albumName: 'Older Immich', ownerId: 'alice' },
    { id: 'unknown', albumName: 'Missing owner' },
  ];
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((url: URL) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              url.pathname.endsWith('/owned') ? albums[0] : albums,
            ),
          ),
        ),
      ),
  );
  const client = new Immich('http://immich:2283');
  const listed = await client.albums();
  expect(listed.filter((a) => a.ownerId === 'alice').map((a) => a.id)).toEqual([
    'owned',
    'legacy',
  ]);
  expect(listed.find((a) => a.id === 'owned')?.createdAt).toBe(
    '2026-10-01T12:00:00.000Z',
  );
  expect((await client.album('owned')).ownerId).toBe('alice');
  expect((await client.album('owned')).createdAt).toBe(
    '2026-10-01T12:00:00.000Z',
  );
});
