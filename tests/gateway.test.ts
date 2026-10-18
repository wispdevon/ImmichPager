import { afterEach, describe, expect, it } from 'vitest';
import http from 'node:http';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import { createGateway, isPagerPath } from '../server/gateway.mjs';
const servers: http.Server[] = [];
async function listen(server: http.Server) {
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (s) =>
        new Promise<void>((r) => {
          s.closeAllConnections();
          s.close(() => r());
        }),
    ),
  );
});
describe('same-origin integration gateway', () => {
  it('reserves only the /page namespace', () => {
    expect(isPagerPath('/page')).toBe(true);
    expect(isPagerPath('/page/acme')).toBe(true);
    for (const path of [
      '/pages',
      '/api/albums',
      '/s/client',
      '/share/key',
      '/immichinko/',
    ])
      expect(isPagerPath(path)).toBe(false);
  });
  it('injects the sidebar bridge without changing APIs or binary responses', async () => {
    const original = Buffer.from([0, 255, 17, 36]);
    const upstream = await listen(
      http.createServer((req, res) => {
        if (req.url === '/') {
          res.setHeader('content-type', 'text/html');
          res.end('<html><head></head><body>Immich</body></html>');
        } else if (req.url === '/api/binary') {
          res.setHeader('set-cookie', 'test=ok; HttpOnly');
          res.end(original);
        } else {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ method: req.method, url: req.url }));
        }
      }),
    );
    const gateway = await listen(
      createGateway({
        upstream,
        origin: 'http://localhost',
        handler: (_req: http.IncomingMessage, res: http.ServerResponse) =>
          res.end('pager'),
      }),
    );
    expect(await (await fetch(gateway)).text()).toContain(
      '/page/assets/sidebar.js',
    );
    const binary = await fetch(`${gateway}/api/binary`);
    expect(Buffer.from(await binary.arrayBuffer())).toEqual(original);
    expect(binary.headers.get('set-cookie')).toContain('test=ok');
    expect(await (await fetch(`${gateway}/page/acme`)).text()).toBe('pager');
    expect(
      await (
        await fetch(`${gateway}/api/upload?x=1`, {
          method: 'POST',
          body: 'data',
        })
      ).json(),
    ).toEqual({ method: 'POST', url: '/api/upload?x=1' });
    expect((await fetch(`${gateway}/page%2Facme`)).status).toBe(400);
  });
  it('returns a JSON error before passing oversized Pager requests to the app', async () => {
    let handled = false;
    const gateway = await listen(
      createGateway({
        upstream: 'http://127.0.0.1:1',
        origin: 'http://localhost',
        handler: (_req: http.IncomingMessage, res: http.ServerResponse) => {
          handled = true;
          res.end('unexpected');
        },
      }),
    );
    const response = await fetch(`${gateway}/page/api/pages`, {
      method: 'POST',
      body: ' '.repeat(7 * 1024 * 1024),
    });
    expect(response.status).toBe(413);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({
      message: 'Request is too large. Branding images must be 5 MB or smaller.',
    });
    expect(handled).toBe(false);
  });
  it('keeps a proxy connection alive across an idle pause before a POST', async () => {
    const gateway = await listen(
      createGateway({
        upstream: 'http://127.0.0.1:1',
        origin: 'http://localhost',
        handler: (req: http.IncomingMessage, res: http.ServerResponse) => {
          req.resume();
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ method: req.method }));
        },
      }),
    );
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    const send = (method: string) =>
      new Promise<{ reused: boolean; keepalive?: string; body: string }>(
        (resolve, reject) => {
          const req = http.request(
            `${gateway}/page/api/pages`,
            { method, agent },
            (res) => {
              let body = '';
              res.on('data', (chunk) => (body += chunk));
              res.on('end', () =>
                resolve({
                  reused: req.reusedSocket,
                  keepalive: res.headers['keep-alive']?.toString(),
                  body,
                }),
              );
            },
          );
          req.on('error', reject);
          req.end();
        },
      );
    try {
      const first = await send('GET');
      // Caddy pools upstream connections for two minutes; advertised lifetime must exceed it.
      expect(
        Number(first.keepalive?.match(/timeout=(\d+)/)?.[1]),
      ).toBeGreaterThan(120);
      // This exceeds Node's old five-second timeout plus its one-second buffer.
      await new Promise((resolve) => setTimeout(resolve, 6500));
      const next = await send('POST');
      expect(next.reused).toBe(true);
      expect(JSON.parse(next.body)).toEqual({ method: 'POST' });
    } finally {
      agent.destroy();
    }
  }, 10000);
  it('does not allow an absolute request target to change the upstream host', async () => {
    const upstream = await listen(
      http.createServer((_req, res) => res.end('safe')),
    );
    const gateway = await listen(
      createGateway({
        upstream,
        origin: 'http://localhost',
        handler: () => {},
      }),
    );
    const status = await new Promise<number>((resolve) => {
      const request = http.request(
        gateway,
        { path: 'http://127.0.0.1:1/private' },
        (response) => {
          response.resume();
          resolve(response.statusCode!);
        },
      );
      request.end();
    });
    expect(status).toBe(400);
  });
  it('preserves WebSocket upgrade handshakes and bidirectional bytes', async () => {
    const source = http.createServer();
    source.on('upgrade', (_req, socket) => {
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
      );
      socket.on('data', (data) => socket.write(data));
      socket.on('end', () => socket.end());
    });
    const upstream = await listen(source);
    const gateway = await listen(
      createGateway({
        upstream,
        origin: 'http://localhost',
        handler: () => {},
      }),
    );
    const port = Number(new URL(gateway).port);
    const result = await new Promise<string>((resolve, reject) => {
      const socket = net.connect(port, '127.0.0.1');
      let received = '';
      socket.on('connect', () =>
        socket.write(
          'GET /socket.io/?transport=websocket HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
        ),
      );
      socket.on('data', (data) => {
        received += data.toString();
        if (received.includes('\r\n\r\n') && !received.includes('hello'))
          socket.write('hello');
        if (received.includes('hello')) {
          socket.destroy();
          resolve(received);
        }
      });
      socket.on('error', reject);
      socket.setTimeout(3000, () => {
        socket.destroy();
        reject(Error('upgrade timed out'));
      });
    });
    expect(result).toContain('101 Switching Protocols');
    expect(result).toContain('hello');
  });
});
