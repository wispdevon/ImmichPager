import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createFixture, albums } from '../fixtures/immich.mjs';
import { createGateway } from '../server/gateway.mjs';

const production = process.argv.includes('--production');
const port = Number(process.env.DEMO_PORT || 3000),
  fixturePort = port + 1,
  vitePort = port + 2;
const host = process.env.DEMO_HOST || '127.0.0.1';
const origin = `http://127.0.0.1:${port}`;
process.env.IMMICH_URL = `http://127.0.0.1:${fixturePort}`;
process.env.ORIGIN = origin;
process.env.DATA_DIR ||= '.demo';
process.env.BODY_SIZE_LIMIT = '6M';
process.env.ADDRESS_HEADER = 'x-pager-client-address';
mkdirSync(process.env.DATA_DIR, { recursive: true });
const fixture = createFixture();
await new Promise((resolve) =>
  fixture.listen(fixturePort, '127.0.0.1', resolve),
);
let vite;
if (!production)
  vite = spawn('pnpm', ['dev', '--port', String(vitePort), '--strictPort'], {
    stdio: 'inherit',
    env: process.env,
  });
const handler = production
  ? (await import('../build/handler.js')).handler
  : undefined;
const server = createGateway({
  upstream: process.env.IMMICH_URL,
  origin,
  handler,
  appUrl: `http://127.0.0.1:${vitePort}`,
});
await new Promise((resolve) => server.listen(port, host, resolve));
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    vite?.kill(signal);
    fixture.close();
    server.close();
    process.exit(0);
  });
const headers = {
  cookie: 'immich_access_token=demo-alice',
  origin,
  'content-type': 'application/json',
};
let ready = false;
for (let attempt = 0; attempt < 100; attempt++) {
  try {
    if ((await fetch(`${origin}/page/health`)).ok) {
      ready = true;
      break;
    }
  } catch {
    /* Server is starting. */
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}
if (!ready) throw Error('Demo application did not become ready');
const existing = await (
  await fetch(`${origin}/page/api/pages`, { headers })
).json();
if (!Array.isArray(existing)) throw Error('Demo owner authentication failed');
if (!existing.some((p) => p.slug === 'acme')) {
  const page = await (
    await fetch(`${origin}/page/api/pages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'A collection of our work',
        slug: 'acme',
        description: 'Every shoot. Every season. All in one place.',
        albumIds: albums.filter((a) => a.ownerId === 'alice').map((a) => a.id),
        clientUi: { showBrowsingControls: true },
      }),
    })
  ).json();
  const published = await fetch(`${origin}/page/api/pages/${page.id}/publish`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ expectedDraftRevision: page.draftRevision }),
  });
  if (!published.ok) throw Error('Could not seed demo page');
}
console.log(
  `\nDemo ready: ${origin}/page/acme\nEditor: ${origin}/dev-login/alice (then choose Pages)\n`,
);
