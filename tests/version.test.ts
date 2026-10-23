import { describe, expect, it, vi } from 'vitest';
import { latestStable, newer, VersionChecker } from '../src/lib/server/version';
const now = Date.parse('2026-10-23T00:00:00Z');
const release = (tag_name: string, extra = {}) => ({
  tag_name,
  released_at: '2026-10-22T00:00:00Z',
  ...extra,
});
describe('version awareness', () => {
  it('orders numeric stable versions and excludes future or prerelease entries', () => {
    expect(newer('v0.3.10', '0.3.9')).toBe(true);
    expect(newer('v0.3.3', '0.3.3')).toBe(false);
    expect(newer('v0.3.2', '0.3.3')).toBe(false);
    expect(newer('v0.4.0-rc.1', '0.3.3')).toBe(false);
    expect(
      latestStable(
        [
          release('v0.3.10'),
          release('v0.3.9'),
          release('v1.0.0-rc.1'),
          release('v2.0.0', { upcoming_release: true }),
          release('v3.0.0', { released_at: '2030-01-01' }),
        ],
        now,
      ),
    ).toBe('v0.3.10');
    expect(() => latestStable({}, now)).toThrow();
    expect(() => latestStable([release('v01.2.3')], now)).toThrow();
  });
  it('deduplicates requests, caches results and never forwards credentials or remote URLs', async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify([
            release('v0.3.4', { _links: { self: 'https://evil.example' } }),
          ]),
        ),
      );
    const checker = new VersionChecker(true, request, () => now, '0.3.3');
    await Promise.all([checker.check(), checker.check()]);
    const result = await checker.check();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1]?.headers).toEqual({
      accept: 'application/json',
    });
    expect(request.mock.calls[0][1]?.redirect).toBe('error');
    expect(result).toMatchObject({
      status: 'available',
      installedVersion: '0.3.3',
      latestVersion: '0.3.4',
      latestReleaseUrl:
        'https://gitlab.com/wispd/ImmichPager/-/releases/v0.3.4',
    });
  });
  it('keeps the last successful result on failure and rate limits retries', async () => {
    let time = now;
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([release('v0.3.4')])))
      .mockRejectedValue(new Error('Offline'));
    const checker = new VersionChecker(true, request, () => time, '0.3.3');
    await checker.check();
    time += 3600001;
    expect(await checker.check()).toMatchObject({
      status: 'stale',
      latestVersion: '0.3.4',
      checkedAt: new Date(now).toISOString(),
    });
    await checker.check();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('handles disabled, malformed, oversized, timed out and unsuccessful responses', async () => {
    const request = vi.fn<typeof fetch>();
    expect((await new VersionChecker(false, request).check()).status).toBe(
      'disabled',
    );
    expect(request).not.toHaveBeenCalled();
    for (const response of [
      new Response('bad json'),
      new Response('[]'),
      new Response('x'.repeat(2 * 1024 * 1024 + 1)),
      new Response('', { status: 429 }),
    ]) {
      request.mockResolvedValueOnce(response);
      expect((await new VersionChecker(true, request).check()).status).toBe(
        'unavailable',
      );
    }
    request.mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError'));
    expect((await new VersionChecker(true, request).check()).status).toBe(
      'unavailable',
    );
  });
});
