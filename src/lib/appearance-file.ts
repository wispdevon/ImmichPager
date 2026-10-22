import { z } from 'zod';
import { compileCustomCss } from './custom-css';

export const APPEARANCE_FILE_FORMAT = 'immichpager-appearance';
export const APPEARANCE_FILE_VERSION = 1;
export const APPEARANCE_FILE_MAX_BYTES = 96 * 1024;

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const appearanceSettingsSchema = z
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

export const appearanceFileSchema = z
  .object({
    format: z.literal(APPEARANCE_FILE_FORMAT),
    version: z.literal(APPEARANCE_FILE_VERSION),
    appearance: appearanceSettingsSchema,
  })
  .strict();

export type AppearanceSettings = z.infer<typeof appearanceSettingsSchema>;

function assertFileSize(text: string) {
  if (
    text.length > APPEARANCE_FILE_MAX_BYTES ||
    new TextEncoder().encode(text).byteLength > APPEARANCE_FILE_MAX_BYTES
  )
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

export function parseAppearanceFile(text: string): AppearanceSettings {
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
      'This is not a supported ImmichPager appearance file (version 1).',
    );

  assertSafeCss(result.data.appearance.customCss);
  return result.data.appearance;
}
