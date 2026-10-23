import { z } from 'zod';
import { AppError, type Album } from '../contracts';

const albumSchema = z
  .object({
    id: z.string(),
    albumName: z.string(),
    description: z
      .string()
      .nullish()
      .transform((value) => value ?? ''),
    ownerId: z.string().optional(),
    albumUsers: z
      .array(z.object({ user: z.object({ id: z.string() }) }))
      .optional(),
    assetCount: z.number().default(0),
    createdAt: z.string().optional(),
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
  exifInfo: z
    .object({
      exifImageWidth: z.number().nullish(),
      exifImageHeight: z.number().nullish(),
    })
    .nullish(),
});
const shareSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string().nullish(),
  album: albumSchema.optional(),
  assets: z
    .array(
      z.object({
        id: z.string(),
        originalFileName: z.string().default(''),
        fileCreatedAt: z.string().default(''),
        type: z.string().default('IMAGE'),
        exifInfo: z
          .object({
            exifImageWidth: z.number().nullish(),
            exifImageHeight: z.number().nullish(),
          })
          .nullish(),
      }),
    )
    .optional(),
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
    return z
      .object({
        id: z.string(),
        name: z.string(),
        isAdmin: z.boolean().default(false),
      })
      .parse(data);
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
      const deadline = new AbortController();
      const timer = setTimeout(() => deadline.abort(), 15000);
      let response: Response;
      try {
        response = await fetch(url, {
          headers: publicHeaders ?? this.credentials,
          redirect: 'manual',
          signal: deadline.signal,
        });
      } finally {
        // Bound upstream response headers without truncating a large original's stream.
        clearTimeout(timer);
      }
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
  async createShare(
    albumId: string,
    slug: string,
    password: string | null,
    allowDownload = true,
  ) {
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
            allowDownload,
            showMetadata: true,
          }),
        })
      ).json(),
    );
  }
  async createPhotoShare(
    assetIds: string[],
    slug: string,
    password: string | null,
    allowDownload = true,
  ) {
    return shareSchema.parse(
      await (
        await this.request('shared-links', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: 'INDIVIDUAL',
            assetIds,
            slug,
            password,
            allowUpload: false,
            allowDownload,
            showMetadata: true,
          }),
        })
      ).json(),
    );
  }
  async syncPhotoShare(shareId: string, assetIds: string[]) {
    const current = shareSchema.parse(
      await (
        await this.request(`shared-links/${encodeURIComponent(shareId)}`)
      ).json(),
    );
    const old = (current.assets ?? []).map((p) => p.id);
    for (const [method, ids] of [
      ['DELETE', old.filter((id) => !assetIds.includes(id))],
      ['PUT', assetIds.filter((id) => !old.includes(id))],
    ] as const) {
      if (ids.length) {
        const results = z
          .array(z.object({ assetId: z.string(), success: z.boolean() }))
          .parse(
            await (
              await this.request(
                `shared-links/${encodeURIComponent(shareId)}/assets`,
                {
                  method,
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ assetIds: ids }),
                },
              )
            ).json(),
          );
        if (
          results.length !== ids.length ||
          new Set(results.map((result) => result.assetId)).size !==
            ids.length ||
          results.some(
            (result) => !result.success || !ids.includes(result.assetId),
          )
        )
          throw new AppError(
            502,
            'Immich could not synchronize selected photos',
          );
      }
    }
  }
  async timeBuckets(albumId: string, key?: string, cookie = '') {
    const query = new URLSearchParams({
      albumId,
      order: 'desc',
      ...(key ? { key } : {}),
    });
    return z
      .array(z.object({ timeBucket: z.string(), count: z.number() }))
      .parse(
        await (
          await this.request(
            `timeline/buckets?${query}`,
            {},
            key ? (cookie ? { cookie } : {}) : undefined,
          )
        ).json(),
      );
  }
  async timeBucket(
    albumId: string,
    timeBucket: string,
    key?: string,
    cookie = '',
  ) {
    const query = new URLSearchParams({
      albumId,
      timeBucket,
      order: 'desc',
      ...(key ? { key } : {}),
    });
    const data = z
      .object({
        id: z.array(z.string()),
        isImage: z.array(z.boolean()),
        isTrashed: z.array(z.boolean()).optional(),
        ratio: z.array(z.number()),
        fileCreatedAt: z.array(z.string()),
        visibility: z.array(z.string()).optional(),
      })
      .parse(
        await (
          await this.request(
            `timeline/bucket?${query}`,
            {},
            key ? (cookie ? { cookie } : {}) : undefined,
          )
        ).json(),
      );
    return data.id.flatMap((id, i) =>
      data.isImage[i] &&
      !data.isTrashed?.[i] &&
      (!data.visibility?.[i] ||
        ['timeline', 'archive'].includes(data.visibility[i]))
        ? [
            {
              id,
              ratio: data.ratio[i] || 1.5,
              takenAt: data.fileCreatedAt[i] || '',
            },
          ]
        : [],
    );
  }
  async downloadInfo(assetIds: string[], key?: string, cookie = '') {
    return z
      .object({
        archives: z.array(
          z.object({ assetIds: z.array(z.string()), size: z.number() }),
        ),
      })
      .parse(
        await (
          await this.request(
            `download/info${key ? `?key=${encodeURIComponent(key)}` : ''}`,
            {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ assetIds }),
            },
            key ? (cookie ? { cookie } : {}) : undefined,
          )
        ).json(),
      );
  }
  async downloadArchive(
    assetIds: string[],
    key?: string,
    cookie = '',
    signal?: AbortSignal,
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(
        new URL(
          `/api/download/archive${key ? `?key=${encodeURIComponent(key)}` : ''}`,
          this.root,
        ),
        {
          method: 'POST',
          headers: {
            ...(key ? (cookie ? { cookie } : {}) : this.credentials),
            'content-type': 'application/json',
          },
          body: JSON.stringify({ assetIds }),
          redirect: 'error',
          signal: signal
            ? AbortSignal.any([signal, controller.signal])
            : controller.signal,
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new AppError(502, 'Archive unavailable');
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
  async updateShare(
    id: string,
    password: string | null,
    slug: string,
    allowDownload = true,
  ) {
    await this.request(`shared-links/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        password,
        slug,
        allowUpload: false,
        allowDownload,
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
