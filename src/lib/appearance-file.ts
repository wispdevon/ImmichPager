import { z } from 'zod';
import {
  clientUiSchema,
  DEFAULT_CLIENT_UI,
  DEFAULT_GALLERY_STYLE,
  galleryStyleSchema,
} from './contracts';
import { compileCustomCss } from './custom-css';

export const APPEARANCE_FILE_FORMAT = 'immichpager-appearance';
export const APPEARANCE_FILE_VERSION = 2;
export const APPEARANCE_FILE_MAX_BYTES = 96 * 1024;

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const appearanceV1Schema = z
  .object({
    theme: z.enum(['dark', 'light', 'system']),
    background: color.nullable(),
    foreground: color.nullable(),
    accent: color,
    alignment: z.enum(['left', 'center']),
    bannerPosition: z.number().int().min(0).max(100),
    headerLayout: z.enum(['below', 'overlay']),
    headerSize: z.enum(['compact', 'standard', 'tall']).default('standard'),
    logoSize: z.number().int().min(48).max(160).default(80),
    titleSize: z.number().min(1.5).max(4).default(3),
    descriptionSize: z.number().min(0.875).max(1.5).default(1.125),
    headerSpacing: z.number().min(1.5).max(5).default(2.5),
    customCss: z.string().max(20_000),
  })
  .strict();

export const appearanceSettingsSchema = z
  .object({
    theme: z.enum(['dark', 'light', 'system']),
    background: color.nullable(),
    foreground: color.nullable(),
    accent: color,
    alignment: z.enum(['left', 'center']),
    bannerPosition: z.number().int().min(0).max(100),
    headerLayout: z.enum(['below', 'overlay']),
    headerSize: z.enum(['compact', 'standard', 'tall']),
    logoSize: z.number().int().min(48).max(160),
    titleSize: z.number().min(1.5).max(4),
    descriptionSize: z.number().min(0.875).max(1.5),
    headerSpacing: z.number().min(1.5).max(5),
    customCss: z.string().max(20_000),
    clientUi: clientUiSchema,
    galleryStyle: galleryStyleSchema,
  })
  .strict();

const appearanceFileV1Schema = z
  .object({
    format: z.literal(APPEARANCE_FILE_FORMAT),
    version: z.literal(1),
    appearance: appearanceV1Schema,
  })
  .strict();

const appearanceFileV2Schema = z
  .object({
    format: z.literal(APPEARANCE_FILE_FORMAT),
    version: z.literal(2),
    appearance: appearanceSettingsSchema,
  })
  .strict();

export const appearanceFileSchema = z.discriminatedUnion('version', [
  appearanceFileV1Schema,
  appearanceFileV2Schema,
]);

export type AppearanceSettings = z.infer<typeof appearanceSettingsSchema>;
export type LegacyAppearanceSettings = z.infer<typeof appearanceV1Schema>;

function assertFileSize(text: string) {
  if (new TextEncoder().encode(text).byteLength > APPEARANCE_FILE_MAX_BYTES)
    throw new Error('This appearance file is too large.');
}

function assertSafeCss(customCss: string) {
  const result = compileCustomCss(customCss, 'appearance-import');
  if (result.error) throw new Error(`Custom CSS: ${result.error}`);
}

export function serializeAppearanceFile(settings: AppearanceSettings) {
  const appearance = appearanceSettingsSchema.parse(settings);
  assertSafeCss(appearance.customCss);
  const text = `${JSON.stringify(
    {
      format: APPEARANCE_FILE_FORMAT,
      version: APPEARANCE_FILE_VERSION,
      appearance,
    },
    null,
    2,
  )}\n`;
  assertFileSize(text);
  return text;
}

export function parseAppearanceFile(
  text: string,
  current?: AppearanceSettings,
): AppearanceSettings {
  assertFileSize(text);

  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }

  const result = appearanceFileSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      'This is not a supported ImmichPager appearance file (version 1 or 2).',
    );

  assertSafeCss(result.data.appearance.customCss);
  if (result.data.version === 2) return result.data.appearance;

  // Version 1 predates client visibility and gallery style. Keep the current
  // draft values for those settings, then apply the fields that v1 can express.
  return appearanceSettingsSchema.parse({
    ...{
      clientUi: current?.clientUi ?? DEFAULT_CLIENT_UI,
      galleryStyle: current?.galleryStyle ?? DEFAULT_GALLERY_STYLE,
    },
    ...current,
    ...result.data.appearance,
  });
}
