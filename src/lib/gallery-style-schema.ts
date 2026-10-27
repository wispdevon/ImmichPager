import { z } from 'zod';
import { FONT_FAMILY_IDS } from './font-catalog';

const fontFamily = z.enum(FONT_FAMILY_IDS);

export const galleryStyleSchema = z.object({
  fontFamily: fontFamily.default('google-sans'),
  titleFontWeight: z.number().int().min(400).max(800).default(650),
  bodyFontSize: z.number().min(0.75).max(1.5).default(1),
  bodyFontWeight: z.number().int().min(300).max(700).default(400),
  cardTitleSize: z.number().min(0.75).max(2).default(1.125),
  cardTitleWeight: z.number().int().min(400).max(800).default(600),
  contentWidth: z.number().int().min(640).max(1920).default(1600),
  pagePadding: z.number().int().min(0).max(80).default(40),
  gridMinWidth: z.number().int().min(160).max(360).default(224),
  gridRowGap: z.number().int().min(0).max(80).default(16),
  gridColumnGap: z.number().int().min(0).max(80).default(0),
  coverAspectRatio: z.number().min(0.5).max(2).default(1),
  cardRadius: z.number().int().min(0).max(40).default(16),
  logoShape: z.enum(['square', 'rounded', 'circle']).default('rounded'),
  logoPosition: z.enum(['above', 'left']).default('above'),
  hoverTreatment: z
    .enum(['surface', 'underline', 'lift', 'none'])
    .default('surface'),
});
export type GalleryStyle = z.infer<typeof galleryStyleSchema>;
export const DEFAULT_GALLERY_STYLE = galleryStyleSchema.parse({});
