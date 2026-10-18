import { createGateway } from './gateway.mjs';
if (!process.env.IMMICH_URL || !process.env.ORIGIN)
  throw Error('Set IMMICH_URL and ORIGIN before starting ImmichPager');
process.env.BODY_SIZE_LIMIT ||= '6M';
process.env.ADDRESS_HEADER = 'x-pager-client-address';
const { handler } = await import('../build/handler.js');
const server = createGateway({
  upstream: process.env.IMMICH_URL,
  origin: process.env.ORIGIN,
  handler,
  trustProxy: process.env.TRUST_PROXY === 'true',
});
server.listen(
  Number(process.env.PORT || 3000),
  process.env.HOST || '0.0.0.0',
  () => console.log('ImmichPager gateway is listening'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
