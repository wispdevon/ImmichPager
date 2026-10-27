import { z } from 'zod';
import { FONT_FAMILY_IDS } from './font-catalog';
import { galleryStyleSchema } from './gallery-style-schema';
import { compileCustomCss } from './custom-css';

export const THEME_FILE_LIMIT = 96 * 1024;
export const themeLayoutSchema = z.enum([
  'classic',
  'cinematic',
  'editorial',
  'contact-sheet',
  'archive',
  'studio',
]);
const color = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);
export const paletteSchema = z
  .object({
    background: color,
    foreground: color,
    surface: color,
    surfaceForeground: color,
    muted: color,
    primary: color,
    primaryForeground: color,
    border: color,
    focus: color,
    hover: color,
    hoverForeground: color,
  })
  .strict();
export type ThemePalette = z.infer<typeof paletteSchema>;
export const themeDesignSchema = z
  .object({
    alignment: z.enum(['left', 'center']).default('left'),
    headerLayout: z.enum(['below', 'overlay']).default('below'),
    headerSize: z.enum(['compact', 'standard', 'tall']).default('standard'),
    bannerHeight: z.number().int().min(140).max(900).nullable().default(null),
    logoSize: z.number().int().min(48).max(160).default(80),
    titleSize: z.number().min(1.5).max(4).default(3),
    descriptionSize: z.number().min(0.875).max(1.5).default(1.125),
    headerSpacing: z.number().min(1.5).max(5).default(2.5),
    galleryStyle: galleryStyleSchema.strict(),
  })
  .strict();
const themeAttributionSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    author: z.string().trim().min(1).max(120),
    url: z
      .string()
      .max(500)
      .url()
      .refine(
        (value) => value.startsWith('https://'),
        'Use an HTTPS source link',
      ),
    license: z.literal('CC-BY-3.0'),
  })
  .strict();
export const themeDefinitionSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().max(500).default(''),
    version: z.literal(1),
    layout: themeLayoutSchema,
    attribution: themeAttributionSchema.optional(),
    headingFont: z.enum(FONT_FAMILY_IDS).default('inter'),
    variants: z
      .object({
        light: paletteSchema.optional(),
        dark: paletteSchema.optional(),
      })
      .strict()
      .refine((v) => !!v.light || !!v.dark, 'Provide a light or dark variant'),
    design: themeDesignSchema,
    rows: z
      .object({
        albums: z.enum(['cards', 'tiles', 'editorial']),
        photos: z.enum(['justified', 'masonry', 'square', 'large', 'carousel']),
        gap: z.number().int().min(0).max(64).default(16),
        columns: z.number().int().min(1).max(6).default(3),
        rowHeight: z.number().int().min(120).max(600).default(260),
      })
      .strict(),
    css: z
      .string()
      .max(20_000)
      .default('')
      .refine(
        (v) => !compileCustomCss(v, 'theme-validation').error,
        'Theme CSS contains unsupported or unsafe rules',
      ),
  })
  .strict();
export type ThemeDefinition = z.infer<typeof themeDefinitionSchema>;
export const pageThemeSchema = z
  .object({
    definition: themeDefinitionSchema,
    overrides: paletteSchema.partial().default({}),
    headingFont: z.enum(FONT_FAMILY_IDS).optional(),
  })
  .strict();
export type PageTheme = z.infer<typeof pageThemeSchema>;
export const themeRecordInputSchema = z
  .object({
    definition: themeDefinitionSchema,
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();
export function validateThemeSize(value: unknown) {
  if (new TextEncoder().encode(JSON.stringify(value)).length > THEME_FILE_LIMIT)
    throw new Error('Theme files must be no larger than 96 KiB.');
}
