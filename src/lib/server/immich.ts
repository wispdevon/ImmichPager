import { z } from 'zod';
import { AppError, type Album } from '../contracts';

const albumSchema = z
  .object({
    id: z.string(),
    albumName: z.string(),
    ownerId: z.string().optional(),
    albumUsers: z
      .array(z.object({ user: z.object({ id: z.string() }) }))
      .optional(),
    assetCount: z.number().default(0),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    albumThumbnailAssetId: z.string().nullish(),
  })
  .transform(({ albumUsers, ownerId, ...album }) => ({
    ...album,
    // Immich v3 guarantees that the first album user is its owner.
    ownerId: albumUsers?.[0]?.user.id ?? ownerId ?? '',
  }));
const assetSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  type: z.string(),
  originalFileName: z.string(),
  originalMimeType: z.string().default(''),
  fileCreatedAt: z.string().default(''),
  visibility: z.string(),
  isTrashed: z.boolean(),
  isOffline: z.boolean(),
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
  async photo(id: string, owner: string) {
    const asset = assetSchema.parse(
      await (await this.request(`assets/${encodeURIComponent(id)}`)).json(),
    );
    if (
      asset.ownerId !== owner ||
      asset.type !== 'IMAGE' ||
      asset.isTrashed ||
      asset.isOffline ||
      !['timeline', 'archive'].includes(asset.visibility)
    )
      throw new AppError(404, 'Photo not available');
    return asset;
  }
  async photos(
    owner: string,
    query: { q: string; albumId?: string; favorite: boolean; cursor?: string },
  ) {
    if (query.albumId && (await this.album(query.albumId)).ownerId !== owner)
      throw new AppError(404, 'Album not found');
    const response = await this.request('search/metadata', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        size: 60,
        withExif: false,
        filter: {
          type: { eq: 'IMAGE' },
          visibility: { in: ['timeline', 'archive'] },
          isOffline: { eq: false },
          trashedAt: { eq: null },
          ...(query.q ? { originalFileName: { like: `%${query.q}%` } } : {}),
          ...(query.favorite ? { isFavorite: { eq: true } } : {}),
          ...(query.albumId ? { albumIds: { any: [query.albumId] } } : {}),
        },
        orderBy: { field: 'fileCreatedAt', direction: 'desc' },
        ...(query.cursor ? { cursor: query.cursor } : {}),
      }),
    });
    const data = z
      .object({
        assets: z.object({
          items: z.array(assetSchema),
          nextCursor: z.string().nullish(),
        }),
      })
      .parse(await response.json());
    return {
      items: data.assets.items
        .filter(
          (a) =>
            a.ownerId === owner &&
            a.type === 'IMAGE' &&
            !a.isTrashed &&
            !a.isOffline &&
            ['timeline', 'archive'].includes(a.visibility),
        )
        .map((a) => ({
          id: a.id,
          name: a.originalFileName,
          takenAt: a.fileCreatedAt,
          thumbnail: `/page/api/photos/${encodeURIComponent(a.id)}/thumbnail`,
        })),
      nextCursor: data.assets.nextCursor ?? null,
    };
  }
  async assetMedia(
    id: string,
    size: 'thumbnail' | 'preview' | 'original',
    publicHeaders?: Record<string, string>,
    key?: string,
  ) {
    let url = new URL(
      `/api/assets/${encodeURIComponent(id)}/${size === 'original' ? 'original' : 'thumbnail'}`,
      this.root,
    );
    if (size !== 'original') url.searchParams.set('size', size);
    if (key) url.searchParams.set('key', key);
    for (let hop = 0; hop < 4; hop++) {
      const response = await fetch(url, {
        headers: publicHeaders ?? this.credentials,
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        const next = location ? new URL(location, url) : null;
        if (
          !next ||
          next.origin !== new URL(this.root).origin ||
          ![
            `/api/assets/${encodeURIComponent(id)}/original`,
            `/api/assets/${encodeURIComponent(id)}/thumbnail`,
          ].includes(next.pathname) ||
          next.username ||
          next.password
        )
          throw new AppError(502, 'Immich returned an invalid image redirect');
        url = next;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new AppError(502, 'Immich image is unavailable');
      }
      if (
        !/^image\/(jpeg|png|webp|avif|gif|heic|heif|jxl|tiff)(;|$)/i.test(
          response.headers.get('content-type') || '',
        )
      ) {
        await response.body?.cancel();
        throw new AppError(502, 'Immich did not return a supported image');
      }
      return response;
    }
    throw new AppError(502, 'Immich image redirected too many times');
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
    return this.assetMedia(
      assetId,
      'thumbnail',
      key ? (cookie ? { cookie } : {}) : undefined,
      key,
    );
  }
}
