import { z } from 'zod';

export const reservedSlugs = new Set([
  'manage',
  'api',
  'assets',
  'media',
  'health',
  'ready',
]);
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color');
export const pageInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .refine((s) => !reservedSlugs.has(s), 'This URL is reserved'),
    description: z.string().max(2000).default(''),
    theme: z.enum(['dark', 'light', 'system']).default('dark'),
    background: color.nullable().default(null),
    foreground: color.nullable().default(null),
    accent: color.default('#a3bfff'),
    alignment: z.enum(['left', 'center']).default('left'),
    bannerPosition: z.number().int().min(0).max(100).default(50),
    albumIds: z
      .array(z.string().min(1).max(100))
      .max(500)
      .default([])
      .refine((a) => new Set(a).size === a.length, 'Albums must be unique'),
    order: z.enum(['newest', 'manual']).default('newest'),
    passwordMode: z.enum(['keep', 'set', 'remove']).default('keep'),
    password: z.string().max(256).default(''),
  })
  .refine((v) => v.passwordMode !== 'set' || v.password.length >= 4, {
    message: 'Use at least four characters',
    path: ['password'],
  });
export type PageInput = z.infer<typeof pageInputSchema>;
export const parsePageInput = (value: unknown) => pageInputSchema.parse(value);
export type PageStatus = 'draft' | 'published' | 'syncing' | 'error';
export type PageRecord = Omit<PageInput, 'passwordMode' | 'password'> & {
  id: string;
  ownerId: string;
  status: PageStatus;
  intent: 'publish' | 'unpublish' | 'delete' | null;
  revision: number;
  passwordHash: string | null;
  logo: boolean;
  banner: boolean;
  createdAt: string;
  updatedAt: string;
};
export type EditorPage = Omit<PageRecord, 'passwordHash'> & {
  hasPassword: boolean;
};
export function editorPage(page: PageRecord): EditorPage {
  const { passwordHash, ...rest } = page;
  return { ...rest, hasPassword: !!passwordHash };
}
export type Album = {
  id: string;
  albumName: string;
  ownerId: string;
  assetCount: number;
  startDate?: string;
  endDate?: string;
  albumThumbnailAssetId?: string | null;
};
export type GalleryAlbum = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  count: number;
  cover: string | null;
  href: string | null;
  available: boolean;
};
export type GalleryPage = Pick<
  PageRecord,
  | 'id'
  | 'title'
  | 'description'
  | 'theme'
  | 'background'
  | 'foreground'
  | 'accent'
  | 'alignment'
  | 'bannerPosition'
  | 'order'
> & {
  logo: string | null;
  banner: string | null;
  albums: GalleryAlbum[];
};
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
