import { z } from 'zod';
import { AppError, type Album } from '../contracts';

const albumSchema = z.object({
  id: z.string(),
  albumName: z.string(),
  ownerId: z.string().default(''),
  assetCount: z.number().default(0),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  albumThumbnailAssetId: z.string().nullish(),
});
const shareSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string().nullish(),
  album: albumSchema.optional(),
});
export type NativeShare = z.infer<typeof shareSchema>;
export class Immich {
  constructor(
    private root: string,
    private credentials: Record<string, string> = {},
  ) {
    const url = new URL(root);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/'
    )
      throw new Error(
        'IMMICH_URL must be an HTTP(S) server root without /api or credentials',
      );
  }
  async request(
    path: string,
    init: RequestInit = {},
    publicHeaders?: Record<string, string>,
  ) {
    let response: Response;
    try {
      response = await fetch(new URL(`/api/${path}`, this.root), {
        ...init,
        headers: { ...(publicHeaders ?? this.credentials), ...init.headers },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new AppError(502, 'Immich is unavailable. Try again shortly.');
    }
    if (!response.ok) {
      const status = response.status;
      await response.body?.cancel();
      throw new AppError(
        status === 401
          ? 401
          : status === 403
            ? 403
            : status === 404
              ? 404
              : 502,
        status === 401
          ? 'Sign in to Immich to continue'
          : status === 403
            ? 'Immich denied access'
            : status === 404
              ? 'Immich resource not found'
              : 'Immich could not complete this operation',
      );
    }
    return response;
  }
  async user() {
    const data = await (await this.request('users/me')).json();
    return z.object({ id: z.string(), name: z.string() }).parse(data);
  }
  async albums(): Promise<Album[]> {
    const data = z
      .array(albumSchema)
      .parse(await (await this.request('albums')).json());
    return data.map((a) => ({
      ...a,
      startDate: a.startDate ?? undefined,
      endDate: a.endDate ?? undefined,
    }));
  }
  async album(id: string): Promise<Album> {
    const a = albumSchema.parse(
      await (await this.request(`albums/${encodeURIComponent(id)}`)).json(),
    );
    return {
      ...a,
      startDate: a.startDate ?? undefined,
      endDate: a.endDate ?? undefined,
    };
  }
  async listShares() {
    return z
      .array(shareSchema)
      .parse(await (await this.request('shared-links')).json());
  }
  async createShare(albumId: string, slug: string, password: string | null) {
    return shareSchema.parse(
      await (
        await this.request('shared-links', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: 'ALBUM',
            albumId,
            slug,
            password,
            allowUpload: false,
            allowDownload: true,
            showMetadata: true,
          }),
        })
      ).json(),
    );
  }
  async updateShare(id: string, password: string | null, slug: string) {
    await this.request(`shared-links/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        password,
        slug,
        allowUpload: false,
        allowDownload: true,
        showMetadata: true,
        expiresAt: null,
      }),
    });
  }
  async deleteShare(id: string) {
    try {
      await this.request(`shared-links/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      if (!(error instanceof AppError && error.status === 404)) throw error;
    }
  }
  async shared(key: string, cookie = '') {
    return shareSchema.parse(
      await (
        await this.request(
          `shared-links/me?key=${encodeURIComponent(key)}`,
          {},
          cookie ? { cookie } : {},
        )
      ).json(),
    );
  }
  async loginShare(key: string, password: string) {
    const response = await this.request(
      `shared-links/login?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      },
      {},
    );
    const cookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith('immich_shared_link_token='));
    if (!cookie) throw new AppError(502, 'Immich did not authorize this album');
    return cookie.split(';')[0];
  }
  async thumbnail(assetId: string, key?: string, cookie = '') {
    const query = new URLSearchParams({ size: 'thumbnail' });
    if (key) query.set('key', key);
    return this.request(
      `assets/${encodeURIComponent(assetId)}/thumbnail?${query}`,
      {},
      key ? (cookie ? { cookie } : {}) : undefined,
    );
  }
}
