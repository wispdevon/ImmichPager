import { z } from 'zod';
import { blocksSchema, normalizeContent } from './blocks';
import { DEFAULT_PAGE_ACCENT } from './gallery';

export const reservedSlugs = new Set([
  'manage',
  'api',
  'assets',
  'media',
  'health',
  'ready',
  'content',
  'download',
]);
export const MAX_PAGE_ALBUMS = 500;
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color');

export {
  galleryStyleSchema,
  DEFAULT_GALLERY_STYLE,
  type GalleryStyle,
} from './gallery-style-schema';
import {
  galleryStyleSchema,
  DEFAULT_GALLERY_STYLE,
  type GalleryStyle,
} from './gallery-style-schema';
import { pageThemeSchema } from './theme-schema';

const clientUiShape = {
  showBanner: z.boolean().default(true),
  showLogo: z.boolean().default(true),
  showTitle: z.boolean().default(true),
  showDescription: z.boolean().default(true),
  showBrowsingControls: z.boolean().default(false),
  showAlbumSearch: z.boolean().default(true),
  showMonthFilter: z.boolean().default(true),
  showYearNavigation: z.boolean().default(true),
  showResultsCount: z.boolean().default(true),
  showAlbums: z.boolean().default(true),
  showAlbumCovers: z.boolean().default(true),
  showAlbumTitles: z.boolean().default(true),
  showAlbumDates: z.boolean().default(true),
  showAlbumItemCounts: z.boolean().default(true),
  showSharedLabels: z.boolean().default(true),
  showYearHeadings: z.boolean().default(true),
  showYearCounts: z.boolean().default(true),
  allowYearCollapse: z.boolean().default(true),
  showBranding: z.boolean().default(true),
};

export const clientUiSchema = z
  .object(clientUiShape)
  .refine(
    (settings) =>
      !settings.showAlbums ||
      settings.showAlbumCovers ||
      settings.showAlbumTitles,
    {
      message:
        'Show album covers or album titles when the album section is visible.',
      path: ['showAlbumTitles'],
    },
  );
export type ClientUi = z.infer<typeof clientUiSchema>;
export const DEFAULT_CLIENT_UI = clientUiSchema.parse({
  showBrowsingControls: true,
});
export const NEW_PAGE_CLIENT_UI = clientUiSchema.parse({});

export function normalizeClientUi(value: unknown): ClientUi {
  const storedSettings =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return clientUiSchema.parse({ ...DEFAULT_CLIENT_UI, ...storedSettings });
}

export function normalizeGalleryStyle(value: unknown): GalleryStyle {
  return galleryStyleSchema.parse(value ?? {});
}

const pageFieldsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .refine((s) => !reservedSlugs.has(s), 'This URL is reserved'),
  description: z.string().max(2000).default(''),
  theme: z.enum(['dark', 'light', 'system']).default('dark'),
  pageTheme: pageThemeSchema.nullable().optional(),
  background: color.nullable().default(null),
  foreground: color.nullable().default(null),
  accent: color.default(DEFAULT_PAGE_ACCENT),
  alignment: z.enum(['left', 'center']).default('left'),
  headerLayout: z.enum(['below', 'overlay']).default('below'),
  bannerHeight: z.number().int().min(140).max(900).nullable().optional(),
  blocks: blocksSchema.optional(),
  headerSize: z.enum(['compact', 'standard', 'tall']).default('standard'),
  logoSize: z.number().int().min(48).max(160).default(80),
  titleSize: z.number().min(1.5).max(4).default(3),
  descriptionSize: z.number().min(0.875).max(1.5).default(1.125),
  headerSpacing: z.number().min(1.5).max(5).default(2.5),
  customCss: z.string().max(20_000).default(''),
  clientUi: clientUiSchema.default(NEW_PAGE_CLIENT_UI),
  galleryStyle: galleryStyleSchema.default(DEFAULT_GALLERY_STYLE),
  bannerPosition: z.number().int().min(0).max(100).default(50),
  albumIds: z
    .array(z.string().min(1).max(100))
    .max(MAX_PAGE_ALBUMS)
    .default([])
    .refine((a) => new Set(a).size === a.length, 'Albums must be unique'),
  order: z.enum(['newest', 'manual']).default('newest'),
  allowDownload: z.boolean().default(true),
  passwordMode: z.enum(['keep', 'set', 'remove']).default('keep'),
  password: z.string().max(256).default(''),
});
// Keep reusable fields separate from publication-only cross-field validation.
export const pageInputSchema = pageFieldsSchema.refine(
  (v) => v.passwordMode !== 'set' || v.password.length >= 4,
  {
    message: 'Use at least four characters',
    path: ['password'],
  },
);
export type PageInput = z.infer<typeof pageInputSchema>;
export const parsePageInput = (value: unknown) =>
  pageInputSchema.parse(
    value &&
      typeof value === 'object' &&
      'blocks' in value &&
      value.blocks !== undefined
      ? normalizeContent(value as Parameters<typeof normalizeContent>[0])
      : value,
  );
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
  description?: string;
  ownerId: string;
  assetCount: number;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  albumThumbnailAssetId?: string | null;
};
export type GalleryAlbum = {
  id: string;
  name: string;
  description?: string;
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
  | 'pageTheme'
  | 'background'
  | 'foreground'
  | 'accent'
  | 'alignment'
  | 'bannerPosition'
  | 'headerLayout'
  | 'headerSize'
  | 'bannerHeight'
  | 'blocks'
  | 'logoSize'
  | 'titleSize'
  | 'descriptionSize'
  | 'headerSpacing'
  | 'customCss'
  | 'clientUi'
  | 'galleryStyle'
  | 'order'
> & {
  logo: string | null;
  banner: string | null;
  persistedBlockIds?: string[];
  persistedPhotos?: { blockId: string; photoIds: string[] }[];
  revision?: number;
  allowDownload?: boolean;
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

// Drafts deliberately allow incomplete title/URL fields. Publication is strict.
export const draftInputSchema = z.object({
  ...pageFieldsSchema.omit({ password: true, passwordMode: true }).shape,
  title: z.string().max(160),
  slug: z.string().max(80),
  expectedDraftRevision: z.number().int().nonnegative().optional(),
});
export type DraftSettings = Omit<
  z.infer<typeof draftInputSchema>,
  'expectedDraftRevision'
>;
export type DraftRecord = DraftSettings & {
  id: string;
  ownerId: string;
  revision: number;
  publishedDraftRevision: number | null;
  logo: boolean;
  banner: boolean;
  createdAt: string;
  updatedAt: string;
};
export type DraftEditorPage = EditorPage & {
  draftRevision: number;
  publishedRevision: number | null;
  publishedSlug: string | null;
  hasUnpublishedChanges: boolean;
};
export type Photo = {
  id: string;
  name: string;
  takenAt: string;
  thumbnail: string;
};

/** Additive JSON settings: old records keep their original appearance. */
export function appearanceDefaults<T extends object>(
  record: T,
): T & {
  headerLayout: 'below' | 'overlay';
  headerSize: 'compact' | 'standard' | 'tall';
  logoSize: number;
  titleSize: number;
  descriptionSize: number;
  headerSpacing: number;
  customCss: string;
  clientUi: ClientUi;
  galleryStyle: GalleryStyle;
} {
  return {
    blocks: undefined,
    bannerHeight: null,
    headerLayout: 'below',
    headerSize: 'standard',
    logoSize: 80,
    titleSize: 3,
    descriptionSize: 1.125,
    headerSpacing: 2.5,
    customCss: '',
    ...record,
    clientUi: normalizeClientUi((record as { clientUi?: unknown }).clientUi),
    galleryStyle: normalizeGalleryStyle(
      (record as { galleryStyle?: unknown }).galleryStyle,
    ),
  } as T & {
    headerLayout: 'below' | 'overlay';
    headerSize: 'compact' | 'standard' | 'tall';
    logoSize: number;
    titleSize: number;
    descriptionSize: number;
    headerSpacing: number;
    customCss: string;
    clientUi: ClientUi;
    galleryStyle: GalleryStyle;
  };
}

export type ViewPhoto = {
  id: string;
  ratio: number;
  takenAt: string;
  caption: string;
  alt: string;
  thumbnail: string;
  preview: string;
  original: string | null;
};
export type PhotoPage = { items: ViewPhoto[]; nextCursor: string | null };
