import { z } from 'zod';
import {
  clientUiSchema,
  galleryStyleSchema,
  MAX_PAGE_ALBUMS,
  type GalleryPage,
} from './contracts';

const pageIdSchema = z.string().min(1).max(100);
const titleSchema = z
  .string()
  .max(160)
  .refine((value) => !/[\r\n]/.test(value), 'Titles must stay on one line');
const descriptionSchema = z.string().max(2000);
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const previewAssetPathSchema = z
  .string()
  .max(1024)
  .refine((value) => value.startsWith('/page/'), 'Use a Pager asset path');

export const inlineHeaderChangeSchema = z.discriminatedUnion('field', [
  z
    .object({
      type: z.literal('pager:inline-header-change'),
      version: z.literal(1),
      pageId: pageIdSchema,
      field: z.literal('title'),
      value: titleSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('pager:inline-header-change'),
      version: z.literal(1),
      pageId: pageIdSchema,
      field: z.literal('description'),
      value: descriptionSchema,
    })
    .strict(),
]);

export type InlineHeaderChange = z.infer<typeof inlineHeaderChangeSchema>;

const galleryAlbumSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().max(2000),
    startDate: z.string().max(64).optional(),
    endDate: z.string().max(64).optional(),
    count: z.number().int().nonnegative(),
    cover: previewAssetPathSchema.nullable(),
    href: z.null(),
    available: z.boolean(),
  })
  .strict();

const inlineGalleryPageSchema = z
  .object({
    id: pageIdSchema,
    title: titleSchema,
    description: descriptionSchema,
    theme: z.enum(['dark', 'light', 'system']),
    background: colorSchema.nullable(),
    foreground: colorSchema.nullable(),
    accent: colorSchema,
    alignment: z.enum(['left', 'center']),
    bannerPosition: z.number().int().min(0).max(100),
    headerLayout: z.enum(['below', 'overlay']),
    headerSize: z.enum(['compact', 'standard', 'tall']),
    logoSize: z.number().int().min(48).max(160),
    titleSize: z.number().min(1.5).max(4),
    descriptionSize: z.number().min(0.875).max(1.5),
    headerSpacing: z.number().min(1.5).max(5),
    customCss: z.string().max(20_000),
    clientUi: clientUiSchema.strict(),
    galleryStyle: galleryStyleSchema.strict(),
    order: z.enum(['newest', 'manual']),
    logo: previewAssetPathSchema.nullable(),
    banner: previewAssetPathSchema.nullable(),
    albums: z.array(galleryAlbumSchema).max(MAX_PAGE_ALBUMS),
  })
  .strict();

export const inlinePreviewSyncSchema = z
  .object({
    type: z.literal('pager:inline-preview-sync'),
    version: z.literal(1),
    pageId: pageIdSchema,
    syncSequence: z.number().nonnegative(),
    draftRevision: z.number().int().nonnegative(),
    page: inlineGalleryPageSchema,
  })
  .strict()
  .refine((message) => message.page.id === message.pageId, {
    message: 'Preview page ID must match the message page ID',
    path: ['page', 'id'],
  });

export type InlinePreviewSync = Omit<
  z.infer<typeof inlinePreviewSyncSchema>,
  'page'
> & { page: GalleryPage };
