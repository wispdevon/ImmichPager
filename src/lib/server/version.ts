import { version } from '../../../package.json';

const releasesUrl =
  'https://gitlab.com/api/v4/projects/87842908/releases?per_page=100';
const releaseRoot = 'https://gitlab.com/wispd/ImmichPager/-/releases/';
const hour = 60 * 60 * 1000;
export type VersionStatus = {
  installedVersion: string;
  installedReleaseUrl: string;
  latestVersion: string | null;
  latestReleaseUrl: string | null;
  updateAvailable: boolean;
  checkedAt: string | null;
  status: 'disabled' | 'current' | 'available' | 'unavailable' | 'stale';
};
function stable(value: unknown): number[] | null {
  if (
    typeof value !== 'string' ||
    !/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)
  )
    return null;
  const parts = value.replace(/^v/, '').split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}
export function newer(a: string, b: string) {
  const left = stable(a),
    right = stable(b);
  if (!left || !right) return false;
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] > right[i];
  }
  return false;
}
export function latestStable(data: unknown, now: number): string {
  if (!Array.isArray(data)) throw Error('Invalid releases');
  let latest: string | undefined;
  for (const item of data) {
    if (
      !item ||
      !stable(item.tag_name) ||
      item.upcoming_release ||
      !Number.isFinite(Date.parse(item.released_at)) ||
      Date.parse(item.released_at) > now
    )
      continue;
    if (!latest || newer(item.tag_name, latest)) latest = item.tag_name;
  }
  if (!latest) throw Error('No stable release');
  return latest;
}
export class VersionChecker {
  private pending?: Promise<VersionStatus>;
  private nextCheck = 0;
  private latestTag: string | null = null;
  private checkedAt: string | null = null;
  private failed = false;
  constructor(
    private enabled = true,
    private request: typeof fetch = fetch,
    private now: () => number = Date.now,
    private installed = version,
  ) {}
  snapshot(): VersionStatus {
    const available = !!this.latestTag && newer(this.latestTag, this.installed);
    return {
      installedVersion: this.installed,
      installedReleaseUrl: `${releaseRoot}v${this.installed}`,
      latestVersion: this.latestTag?.replace(/^v/, '') ?? null,
      latestReleaseUrl: this.latestTag
        ? `${releaseRoot}${this.latestTag}`
        : null,
      updateAvailable: available,
      checkedAt: this.checkedAt,
      status: !this.enabled
        ? 'disabled'
        : this.failed
          ? this.checkedAt
            ? 'stale'
            : 'unavailable'
          : !this.checkedAt
            ? 'unavailable'
            : available
              ? 'available'
              : 'current',
    };
  }
  check(): Promise<VersionStatus> {
    if (this.pending) return this.pending;
    if (!this.enabled || this.now() < this.nextCheck)
      return Promise.resolve(this.snapshot());
    this.pending = this.refresh().finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }
  private async refresh() {
    this.nextCheck = this.now() + hour;
    try {
      const response = await this.request(releasesUrl, {
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
        headers: { accept: 'application/json' },
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw Error('Release check failed');
      }
      // Bound remote data even when Content-Length is missing or inaccurate.
      const reader = response.body?.getReader();
      if (!reader) throw Error('Empty response');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 2 * 1024 * 1024) throw Error('Release response too large');
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      this.latestTag = latestStable(
        JSON.parse(Buffer.concat(chunks).toString('utf8')),
        this.now(),
      );
      this.checkedAt = new Date(this.now()).toISOString();
      this.failed = false;
    } catch {
      this.failed = true;
    }
    return this.snapshot();
  }
}
