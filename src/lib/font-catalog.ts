/** Font options available to page galleries and portable design tokens. */
export const FONT_FAMILY_IDS = [
  'google-sans',
  'system',
  'inter',
  'nunito-sans',
  'lato',
  'source-serif-4',
  'merriweather',
  'jetbrains-mono',
] as const;

export type FontFamilyId = (typeof FONT_FAMILY_IDS)[number];

export const FONT_CATALOG = [
  {
    id: 'google-sans',
    name: 'Google Sans',
    cssStack: '"GoogleSans", sans-serif',
    tokenFamily: 'Google Sans',
  },
  {
    id: 'system',
    name: 'System',
    cssStack: 'system-ui, sans-serif',
    tokenFamily: 'system-ui',
  },
  {
    id: 'inter',
    name: 'Inter',
    cssStack: '"Inter", sans-serif',
    tokenFamily: 'Inter',
  },
  {
    id: 'nunito-sans',
    name: 'Nunito Sans',
    cssStack: '"Nunito Sans", sans-serif',
    tokenFamily: 'Nunito Sans',
  },
  {
    id: 'lato',
    name: 'Lato',
    cssStack: '"Lato", sans-serif',
    tokenFamily: 'Lato',
  },
  {
    id: 'source-serif-4',
    name: 'Source Serif 4',
    cssStack: '"Source Serif 4", serif',
    tokenFamily: 'Source Serif 4',
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    cssStack: '"Merriweather", serif',
    tokenFamily: 'Merriweather',
  },
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    cssStack: '"JetBrains Mono", monospace',
    tokenFamily: 'JetBrains Mono',
  },
] as const satisfies readonly {
  id: FontFamilyId;
  name: string;
  cssStack: string;
  tokenFamily: string;
}[];

export const FONT_CATALOG_BY_ID = Object.fromEntries(
  FONT_CATALOG.map((font) => [font.id, font]),
) as Record<FontFamilyId, (typeof FONT_CATALOG)[number]>;

export function fontFamilyIdFromToken(value: string): FontFamilyId | undefined {
  const normalized = value.trim().toLowerCase();
  return FONT_CATALOG.find(
    (font) =>
      font.tokenFamily.toLowerCase() === normalized ||
      font.id.toLowerCase() === normalized,
  )?.id;
}
