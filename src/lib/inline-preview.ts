import { blockSchema, blocksSchema } from './blocks';
import { z } from 'zod';
import {
  clientUiSchema,
  galleryStyleSchema,
  MAX_PAGE_ALBUMS,
  type GalleryPage,
} from './contracts';

const pageIdSchema = z.string().min(1).max(100);
export const canvasReadySchema = z
  .object({
    type: z.literal('pager:canvas-ready'),
    version: z.literal(1),
    pageId: pageIdSchema,
  })
  .strict();
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
    description: z.string().max(20000).optional(),
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
    bannerHeight: z.number().int().min(140).max(900).nullable().optional(),
    blocks: blocksSchema.optional(),
    allowDownload: z.boolean().optional(),
    revision: z.number().int().nonnegative().optional(),
    persistedBlockIds: z.array(z.string().max(100)).max(100).optional(),
    persistedPhotos: z
      .array(
        z
          .object({
            blockId: z.string().max(100),
            photoIds: z.array(z.string().max(100)).max(500),
          })
          .strict(),
      )
      .max(100)
      .optional(),
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
    selectedBlockId: z.string().max(100).optional(),
    ackSequence: z.number().int().nonnegative().optional(),
    locked: z.boolean().optional(),
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

const envelope = {
  type: z.literal('pager:composer-change'),
  version: z.literal(1),
  pageId: pageIdSchema,
  sequence: z.number().int().positive(),
};
export const composerChangeSchema = z.discriminatedUnion('action', [
  z
    .object({
      ...envelope,
      action: z.literal('header'),
      field: z.enum(['title', 'description']),
      value: z.string().max(2000),
    })
    .strict()
    .refine(
      (m) => m.field !== 'title' || titleSchema.safeParse(m.value).success,
    ),
  z
    .object({ ...envelope, action: z.literal('block'), block: blockSchema })
    .strict(),
  z
    .object({ ...envelope, action: z.literal('select'), blockId: pageIdSchema })
    .strict(),
  z
    .object({
      ...envelope,
      action: z.literal('insert'),
      index: z.number().int().min(0).max(100),
      blockType: z.enum(['albums', 'photos', 'text']),
    })
    .strict(),
  z
    .object({
      ...envelope,
      action: z.literal('size'),
      field: z.enum(['bannerHeight', 'logoSize', 'bannerPosition']),
      value: z.number().int(),
    })
    .strict()
    .refine((m) =>
      m.field === 'bannerHeight'
        ? m.value >= 140 && m.value <= 900
        : m.field === 'logoSize'
          ? m.value >= 48 && m.value <= 160
          : m.value >= 0 && m.value <= 100,
    ),
]);
export type ComposerChange = z.infer<typeof composerChangeSchema>;
