import http from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const albums = [
  ['Liberty Family Camp ’26', '2026-05-01', '2026-05-31', 552, 'earthrise'],
  ['Captured by Me', '2026-08-01', '2026-10-01', 374, 'astronaut'],
  ['Photos Day 1 — The One Camp', '2026-07-01', '2026-07-20', 330, 'moon'],
  ['Alive · April gathering', '2026-04-01', '2026-04-30', 313, 'earth'],
  ['The summer collection', '2026-06-01', '2026-06-30', 218, 'moon'],
  ['A new perspective', '2026-03-01', '2026-03-31', 146, 'earthrise'],
  ['February stories', '2026-02-01', '2026-02-28', 204, 'earth'],
  ['The year begins', '2026-01-01', '2026-01-31', 187, 'astronaut'],
  ['December, together', '2025-12-01', '2025-12-31', 268, 'moon'],
].map(([albumName, startDate, endDate, assetCount, photo], i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  albumName,
  startDate,
  endDate,
  assetCount,
  photo,
  ownerId: 'alice',
  albumThumbnailAssetId: `photo-${i}`,
}));
albums.push({
  ...albums[0],
  id: 'bob-album',
  albumName: 'Bob’s private work',
  ownerId: 'bob',
  albumThumbnailAssetId: 'bob-photo',
});
const encode = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;');
export function createFixture() {
  const shares = new Map();
  const token = (share) =>
    createHash('sha256').update(`${share.id}:${share.password}`).digest('hex');
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://fixture');
    const cookie = req.headers.cookie || '';
    const owner = cookie.includes('immich_access_token=demo-alice')
      ? 'alice'
      : cookie.includes('immich_access_token=demo-bob')
        ? 'bob'
        : null;
    const json = (value, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(value));
    };
    const parse = async () => {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 65536) throw Error('large body');
      }
      return JSON.parse(body || '{}');
    };
    const byCapability = () =>
      [...shares.values()].find(
        (s) =>
          s.key === url.searchParams.get('key') ||
          s.slug === url.searchParams.get('slug'),
      );
    const authorized = (share) =>
      share && (!share.password || cookie.includes(token(share)));
    const publicShare = (share) => ({
      id: share.id,
      key: share.key,
      slug: share.slug,
      type: 'ALBUM',
      password: share.password ? 'protected' : null,
      album: albums.find((a) => a.id === share.albumId),
      allowDownload: true,
      allowUpload: false,
    });
    try {
      if (url.pathname.startsWith('/dev-login/')) {
        const who = url.pathname.split('/').pop();
        if (!['alice', 'bob'].includes(who)) return json({}, 404);
        res.writeHead(303, {
          location: '/',
          'set-cookie': `immich_access_token=demo-${who}; HttpOnly; SameSite=Lax; Path=/`,
        });
        res.end();
        return;
      }
      if (url.pathname === '/api/server/version')
        return json({ major: 3, minor: 3, patch: 1 });
      if (url.pathname === '/api/users/me')
        return owner
          ? json({
              id: owner,
              name: owner === 'alice' ? 'Alex Morgan' : 'Bob Parker',
            })
          : json({}, 401);
      if (url.pathname === '/api/albums')
        return owner
          ? json(albums.filter((a) => a.ownerId === owner))
          : json({}, 401);
      if (/^\/api\/albums\//.test(url.pathname)) {
        const album = albums.find((a) => a.id === url.pathname.split('/')[3]);
        return owner && album?.ownerId === owner ? json(album) : json({}, 404);
      }
      if (
        url.pathname === '/api/shared-links/me' ||
        url.pathname === '/api/shared-links/login'
      ) {
        const share = byCapability();
        if (!share) return json({}, 404);
        if (url.pathname.endsWith('login')) {
          const body = await parse();
          if (body.password !== share.password) return json({}, 401);
          res.setHeader(
            'set-cookie',
            `immich_shared_link_token=${token(share)}; Path=/; HttpOnly; SameSite=Lax`,
          );
          return json(publicShare(share));
        }
        return authorized(share) ? json(publicShare(share)) : json({}, 401);
      }
      if (url.pathname === '/api/shared-links') {
        if (!owner) return json({}, 401);
        if (req.method === 'GET')
          return json(
            [...shares.values()]
              .filter((s) => s.ownerId === owner)
              .map(publicShare),
          );
        const body = await parse();
        if (!albums.some((a) => a.id === body.albumId && a.ownerId === owner))
          return json({}, 403);
        if ([...shares.values()].some((s) => s.slug === body.slug))
          return json({}, 400);
        const id = randomUUID(),
          share = { ...body, id, key: randomUUID(), ownerId: owner };
        shares.set(id, share);
        return json(publicShare(share), 201);
      }
      if (url.pathname.startsWith('/api/shared-links/')) {
        const id = url.pathname.split('/').pop(),
          share = shares.get(id);
        if (!owner || share?.ownerId !== owner) return json({}, 404);
        if (req.method === 'DELETE') {
          shares.delete(id);
          res.writeHead(204);
          res.end();
          return;
        }
        // Match Immich's slug-clearing behavior so the integration test catches omissions.
        const body = await parse();
        Object.assign(share, body, { slug: body.slug || null });
        return json(publicShare(share));
      }
      if (/^\/api\/assets\/[^/]+\/thumbnail$/.test(url.pathname)) {
        const album = albums.find(
          (a) => a.albumThumbnailAssetId === url.pathname.split('/')[3],
        );
        const share = byCapability();
        if (
          !album ||
          !(
            owner === album.ownerId ||
            (authorized(share) && share.albumId === album.id)
          )
        )
          return json({}, 401);
        const bytes = await readFile(
          new URL(`./photos/${album.photo}.webp`, import.meta.url),
        );
        res.writeHead(200, { 'content-type': 'image/webp' });
        res.end(bytes);
        return;
      }
      if (
        url.pathname.startsWith('/s/') ||
        url.pathname.startsWith('/share/')
      ) {
        const value = url.pathname.split('/').pop();
        const share = [...shares.values()].find(
          (s) => s.slug === value || s.key === value,
        );
        if (!share) return json({}, 404);
        if (req.method === 'POST') {
          let text = '';
          for await (const chunk of req) text += chunk;
          if (new URLSearchParams(text).get('password') !== share.password)
            return json({}, 401);
          res.writeHead(303, {
            location: url.pathname,
            'set-cookie': `immich_shared_link_token=${token(share)}; Path=/; HttpOnly; SameSite=Lax`,
          });
          res.end();
          return;
        }
        res.setHeader('content-type', 'text/html');
        if (!authorized(share)) {
          res.end(
            '<!doctype html><html><head><title>Immich · Password required</title></head><body><h1>Password required</h1><form method="post"><label>Password <input name="password" type="password"></label><button>Submit</button></form></body></html>',
          );
          return;
        }
        const album = albums.find((a) => a.id === share.albumId);
        res.end(
          `<!doctype html><html><head><title>${encode(album.albumName)} · Immich fixture</title></head><body style="background:#000;color:#fff;font-family:system-ui"><h1>${encode(album.albumName)}</h1><p>Native Immich viewer fixture</p><img width="600" src="/api/assets/${album.albumThumbnailAssetId}/thumbnail?key=${share.key}"></body></html>`,
        );
        return;
      }
      if (url.pathname.startsWith('/api/'))
        return json({ method: req.method, path: req.url }, 200);
      res.setHeader('content-type', 'text/html');
      res.end(
        `<!doctype html><html><head><title>Immich fixture</title><style>body{margin:0;background:#111;color:#eee;font:15px system-ui}header{padding:24px;border-bottom:1px solid #333}aside{width:220px;float:left;padding:20px;box-sizing:border-box}aside a{color:inherit;display:block;padding:16px;text-decoration:none}main{margin-left:220px}a{color:#a3bfff}.demo{padding:40px}</style></head><body><header>✿ IMMICH <span style="float:right;font-size:12px">Local development fixture</span></header><aside id="sidebar"><a href="/photos">Photos</a><a href="/albums">Albums</a><a href="/sharing"><span>Sharing</span></a></aside><main><div class="demo"><h1>Your library, connected.</h1><p>This is a local Immich fixture. No real photo library is connected.</p><p>Sign in as <a href="/dev-login/alice">Alex</a> or <a href="/dev-login/bob">Bob</a>, then choose Pages.</p><p><a href="/page/acme">Open the example client page →</a></p></div></main></body></html>`,
      );
    } catch {
      json({ message: 'Fixture request failed' }, 500);
    }
  });
}
