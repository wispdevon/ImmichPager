import http from 'node:http';
import https from 'node:https';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);
function clean(headers) {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => !hopHeaders.has(name.toLowerCase()),
    ),
  );
}
export const isPagerPath = (path) =>
  path === '/page' || path.startsWith('/page/');

/** @param {{upstream:string,origin:string,handler?:import('node:http').RequestListener,appUrl?:string,trustProxy?:boolean}} options */
export function createGateway({
  upstream,
  origin,
  handler,
  appUrl,
  trustProxy = false,
}) {
  const target = new URL(upstream),
    publicUrl = new URL(origin);
  if (
    ![target, publicUrl].every(
      (url) =>
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        url.pathname === '/',
    )
  )
    throw Error('Use HTTP(S) server root URLs without credentials');
  const script = readFileSync(new URL('./sidebar.js', import.meta.url));
  const scriptPath = `/page/assets/sidebar.js?v=${createHash('sha256').update(script).digest('hex').slice(0, 12)}`;
  function proxy(req, res, url, inject) {
    const headers = clean(req.headers);
    headers.host = publicUrl.host;
    headers['x-forwarded-host'] = publicUrl.host;
    headers['x-forwarded-proto'] = publicUrl.protocol.slice(0, -1);
    delete headers['x-pager-client-address'];
    headers['x-pager-client-address'] =
      trustProxy && req.headers['x-forwarded-for']
        ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
        : req.socket.remoteAddress;
    if (inject) {
      headers['accept-encoding'] = 'identity';
      delete headers['if-none-match'];
      delete headers['if-modified-since'];
    }
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request(
      new URL(req.url, url),
      { method: req.method, headers },
      (response) => {
        const result = clean(response.headers);
        const html =
          inject &&
          req.method === 'GET' &&
          response.statusCode === 200 &&
          String(result['content-type']).includes('text/html') &&
          !result['content-encoding'];
        response.on('error', () => res.destroy());
        if (!html) {
          res.writeHead(response.statusCode || 502, result);
          response.pipe(res);
          return;
        }
        const chunks = [];
        let length = 0;
        response.on('data', (chunk) => {
          length += chunk.length;
          if (length > 4 * 1024 * 1024) response.destroy();
          else chunks.push(chunk);
        });
        response.on('end', () => {
          let body = Buffer.concat(chunks).toString('utf8');
          body = body.replace(
            '</head>',
            `<script defer src="${scriptPath}"></script></head>`,
          );
          delete result['content-length'];
          delete result.etag;
          delete result['content-md5'];
          res.writeHead(response.statusCode || 200, result);
          res.end(body);
        });
      },
    );
    request.on('error', () => {
      if (!res.headersSent)
        res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('Upstream unavailable');
    });
    request.setTimeout(120000, () => request.destroy());
    req.on('aborted', () => request.destroy());
    res.on('close', () => {
      if (!res.writableEnded) request.destroy();
    });
    req.pipe(request);
  }
  // Outlast Caddy's default 2-minute upstream keepalive. Otherwise a reused
  // socket can close during a POST, producing an empty proxy 502.
  const server = http.createServer(
    { keepAliveTimeout: 180000, headersTimeout: 190000 },
    (req, res) => {
      if (!req.url.startsWith('/') || req.url.startsWith('//')) {
        res.writeHead(400);
        res.end('Invalid request target');
        return;
      }
      let path;
      try {
        path = new URL(req.url, publicUrl).pathname;
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }
      // Reject ambiguous encoded separators instead of routing them to the other application.
      if (/%2f|%5c|\\/i.test(path)) {
        res.writeHead(400);
        res.end('Invalid path');
        return;
      }
      if (path === '/page/assets/sidebar.js') {
        res.writeHead(200, {
          'content-type': 'application/javascript; charset=utf-8',
          'cache-control': 'public, max-age=300',
          'x-content-type-options': 'nosniff',
        });
        res.end(script);
        return;
      }
      if (isPagerPath(path)) {
        if (Number(req.headers['content-length'] || 0) > 6 * 1024 * 1024) {
          res.writeHead(413, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
            'x-content-type-options': 'nosniff',
          });
          res.end(
            JSON.stringify({
              message:
                'Request is too large. Branding images must be 5 MB or smaller.',
            }),
          );
          return;
        }
        if (handler) {
          req.headers.host = publicUrl.host;
          req.headers['x-pager-client-address'] =
            trustProxy && req.headers['x-forwarded-for']
              ? String(req.headers['x-forwarded-for']).split(',')[0].trim()
              : req.socket.remoteAddress;
          handler(req, res);
        } else proxy(req, res, new URL(appUrl), false);
      } else {
        const inject = !/^\/(api|share|s)(\/|$)/.test(path);
        proxy(req, res, target, inject);
      }
    },
  );
  server.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url, publicUrl).pathname;
    const url = appUrl && isPagerPath(path) ? new URL(appUrl) : target;
    const transport = url.protocol === 'https:' ? https : http;
    const upgrade = transport.request(new URL(req.url, url), {
      headers: {
        ...req.headers,
        host: publicUrl.host,
        'x-forwarded-proto': publicUrl.protocol.slice(0, -1),
      },
    });
    upgrade.on('upgrade', (response, upstreamSocket, upstreamHead) => {
      socket.write(
        `HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n${Object.entries(
          response.headers,
        )
          .flatMap(([name, value]) =>
            Array.isArray(value)
              ? value.map((v) => `${name}: ${v}`)
              : [`${name}: ${value}`],
          )
          .join('\r\n')}\r\n\r\n`,
      );
      if (head.length) upstreamSocket.write(head);
      if (upstreamHead.length) socket.write(upstreamHead);
      socket.pipe(upstreamSocket);
      upstreamSocket.pipe(socket);
      socket.on('error', () => upstreamSocket.destroy());
      upstreamSocket.on('error', () => socket.destroy());
      socket.on('close', () => upstreamSocket.destroy());
      upstreamSocket.on('close', () => socket.destroy());
      socket.on('end', () => upstreamSocket.destroy());
      upstreamSocket.on('end', () => socket.end());
    });
    upgrade.on('error', () => socket.destroy());
    upgrade.end();
  });
  return server;
}
