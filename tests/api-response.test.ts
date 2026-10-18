import { expect, it } from 'vitest';
import { readApiResponse } from '../src/lib/api-response';

it.each([413, 401, 403, 502, 503, 504])(
  'handles an empty HTTP %s error without a JSON exception',
  async (status) => {
    await expect(readApiResponse(new Response('', { status }))).rejects.toThrow(
      status === 413
        ? '5 MB'
        : status === 401
          ? 'session has expired'
          : `HTTP ${status}`,
    );
  },
);
it('preserves the API error message', async () => {
  await expect(
    readApiResponse(
      new Response(JSON.stringify({ message: 'Select an album first' }), {
        status: 400,
      }),
    ),
  ).rejects.toThrow('Select an album first');
});
it.each(['', '<html>Proxy failure</html>', 'null'])(
  'does not mistake an invalid success response for a saved page: %s',
  async (body) => {
    await expect(readApiResponse(new Response(body))).rejects.toThrow(
      'Check Client pages in another tab before retrying',
    );
  },
);
it('returns valid JSON records', async () => {
  expect(await readApiResponse(new Response('{"id":"page-id"}'))).toEqual({
    id: 'page-id',
  });
});
it('does not display proxy HTML as the error', async () => {
  await expect(
    readApiResponse(
      new Response('<html>private proxy details</html>', { status: 502 }),
    ),
  ).rejects.toThrow('The server could not complete this request (HTTP 502)');
});
