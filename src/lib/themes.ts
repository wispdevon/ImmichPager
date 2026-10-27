import {
  themeDefinitionSchema,
  THEME_FILE_LIMIT,
  validateThemeSize,
  type ThemeDefinition,
  type ThemePalette,
} from './theme-schema';
import type { PageInput } from './contracts';
import { pageInputSchema } from './contracts';
import type { PageBlock } from './blocks';
import { z } from 'zod';

function palette(
  background: string,
  foreground: string,
  primary: string,
  surface: string,
): ThemePalette {
  return {
    background,
    foreground,
    primary,
    surface,
    surfaceForeground: foreground,
    primaryForeground: background,
    muted: foreground + 'b3',
    border: foreground + '30',
    focus: primary,
    hover: foreground + '12',
    hoverForeground: foreground,
  };
}
const neutral = {
  light: palette('#faf9f6', '#20231f', '#315b4c', '#efeee8'),
  dark: palette('#151917', '#f2f0e9', '#b1d9c4', '#202823'),
};
export const builtInThemes: ThemeDefinition[] = [
  {
    name: 'Studio',
    description:
      'A split-image introduction and spacious, image-led project tiles.',
    layout: 'studio',
    headingFont: 'inter',
    variants: neutral,
    design: {
      titleSize: 4,
      bannerHeight: 480,
      headerSpacing: 3.5,
      galleryStyle: {
        fontFamily: 'inter',
        contentWidth: 1440,
        gridColumnGap: 24,
        gridRowGap: 32,
        cardRadius: 2,
        coverAspectRatio: 1.35,
      },
    },
    rows: {
      albums: 'tiles',
      photos: 'masonry',
      gap: 20,
      columns: 3,
      rowHeight: 300,
    },
  },
  {
    name: 'Cinematic',
    description:
      'An immersive cover, oversized typography, and large photographic sequences.',
    layout: 'cinematic',
    headingFont: 'inter',
    variants: {
      light: palette('#f7f6f2', '#202020', '#77502b', '#eae7e1'),
      dark: palette('#101110', '#f7f6f0', '#e3cba8', '#1c1d1b'),
    },
    design: {
      headerLayout: 'overlay',
      headerSize: 'tall',
      bannerHeight: 640,
      titleSize: 4,
      galleryStyle: {
        fontFamily: 'inter',
        contentWidth: 1920,
        pagePadding: 24,
        cardRadius: 0,
        coverAspectRatio: 1.7,
        gridColumnGap: 20,
        gridRowGap: 32,
      },
    },
    rows: {
      albums: 'tiles',
      photos: 'large',
      gap: 24,
      columns: 1,
      rowHeight: 480,
    },
  },
  {
    name: 'Editorial',
    description:
      'A serif masthead, ruled sections, and magazine-style album stories.',
    layout: 'editorial',
    headingFont: 'source-serif-4',
    variants: {
      light: palette('#f4f0e7', '#24221f', '#88402c', '#e8e1d5'),
      dark: palette('#221f1b', '#f1e8db', '#efba9e', '#302b25'),
    },
    design: {
      alignment: 'center',
      titleSize: 4,
      headerSpacing: 3.5,
      galleryStyle: {
        fontFamily: 'inter',
        titleFontWeight: 500,
        contentWidth: 1280,
        pagePadding: 40,
        cardRadius: 0,
        coverAspectRatio: 1.5,
        gridColumnGap: 32,
        gridRowGap: 32,
      },
    },
    rows: {
      albums: 'editorial',
      photos: 'justified',
      gap: 16,
      columns: 3,
      rowHeight: 300,
    },
  },
  {
    name: 'Contact Sheet',
    description:
      'A quiet, compact masthead and a dense, numbered photographic index.',
    layout: 'contact-sheet',
    headingFont: 'inter',
    variants: {
      light: palette('#ffffff', '#171717', '#333333', '#f4f4f4'),
      dark: palette('#131313', '#eeeeee', '#dedede', '#202020'),
    },
    design: {
      headerSize: 'compact',
      bannerHeight: 180,
      titleSize: 2,
      headerSpacing: 1.5,
      galleryStyle: {
        fontFamily: 'inter',
        contentWidth: 1600,
        pagePadding: 32,
        cardRadius: 0,
        gridMinWidth: 160,
        gridColumnGap: 12,
        gridRowGap: 20,
        cardTitleSize: 0.875,
      },
    },
    rows: {
      albums: 'cards',
      photos: 'square',
      gap: 8,
      columns: 4,
      rowHeight: 180,
    },
  },
  {
    name: 'Archive',
    description:
      'A persistent information rail with section links and a flowing image archive.',
    layout: 'archive',
    headingFont: 'jetbrains-mono',
    variants: {
      light: palette('#eeede7', '#292b28', '#365a55', '#e1e0d8'),
      dark: palette('#192222', '#e7ece4', '#b5d3bf', '#263030'),
    },
    design: {
      headerSize: 'compact',
      bannerHeight: 200,
      titleSize: 2,
      headerSpacing: 2,
      galleryStyle: {
        fontFamily: 'inter',
        contentWidth: 1600,
        pagePadding: 32,
        cardRadius: 0,
        gridColumnGap: 24,
        gridRowGap: 28,
      },
    },
    rows: {
      albums: 'editorial',
      photos: 'masonry',
      gap: 16,
      columns: 3,
      rowHeight: 260,
    },
  },
].map((v) => themeDefinitionSchema.parse({ ...v, version: 1, css: '' }));

export function cloneTheme<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function applyClassic(page: PageInput): PageInput {
  const defaults = pageInputSchema.parse({
    title: 'Defaults',
    slug: 'defaults',
  });
  return {
    ...page,
    ...classicTheme.design,
    pageTheme: null,
    background: null,
    foreground: null,
    accent: defaults.accent,
    blocks: page.blocks?.map((block): PageBlock => {
      if (block.type === 'albums')
        return {
          ...block,
          layout: classicTheme.rows.albums,
          presentationSource: 'custom',
        };
      if (block.type === 'photos')
        return {
          ...block,
          layout: classicTheme.rows.photos,
          gap: classicTheme.rows.gap,
          columns: classicTheme.rows.columns,
          rowHeight: classicTheme.rows.rowHeight,
          presentationSource: 'custom',
        };
      return { ...block, presentationSource: 'custom' };
    }),
  };
}
export const classicTheme = themeDefinitionSchema.parse({
  name: 'Immich Classic',
  description: 'The original Immich-inspired client page.',
  version: 1,
  layout: 'classic',
  headingFont: 'google-sans',
  variants: {
    light: palette('#ffffff', '#191919', '#4250af', '#fafafa'),
    dark: palette('#000000', '#f5f5f5', '#accbfa', '#121212'),
  },
  design: { galleryStyle: {} },
  rows: { albums: 'cards', photos: 'justified' },
  css: '',
});
export function applyTheme(page: PageInput, input: ThemeDefinition): PageInput {
  const definition = themeDefinitionSchema.parse(cloneTheme(input));
  const theme =
    definition.variants.light && definition.variants.dark
      ? page.theme
      : definition.variants.dark
        ? 'dark'
        : 'light';
  return {
    ...page,
    ...cloneTheme(definition.design),
    theme,
    background: null,
    foreground: null,
    accent: '#accbfa',
    pageTheme: { definition, overrides: {} },
    blocks: page.blocks?.map((block) => ({
      ...block,
      presentationSource: 'theme',
    })),
  };
}
export function resolveBlockTheme(
  block: PageBlock,
  definition?: ThemeDefinition,
): PageBlock {
  if (!definition || block.presentationSource !== 'theme') return block;
  if (block.type === 'albums')
    return { ...block, layout: definition.rows.albums };
  if (block.type === 'photos')
    return {
      ...block,
      layout: definition.rows.photos,
      gap: definition.rows.gap,
      columns: definition.rows.columns,
      rowHeight: definition.rows.rowHeight,
    };
  return block;
}
export function themePalette(
  page: Pick<PageInput, 'theme' | 'pageTheme'> &
    Partial<Pick<PageInput, 'background' | 'foreground' | 'accent'>>,
  mode?: 'light' | 'dark',
) {
  const snapshot = page.pageTheme;
  if (!snapshot) return null;
  const chosen = mode ?? (page.theme === 'light' ? 'light' : 'dark');
  return {
    ...(snapshot.definition.variants[chosen] ??
      snapshot.definition.variants.dark ??
      snapshot.definition.variants.light)!,
    ...snapshot.overrides,
    ...(page.background ? { background: page.background } : {}),
    ...(page.foreground ? { foreground: page.foreground } : {}),
    ...(page.accent && page.accent !== '#accbfa'
      ? { primary: page.accent }
      : {}),
  };
}
export function captureTheme(page: PageInput, name: string): ThemeDefinition {
  const base = page.pageTheme?.definition ?? classicTheme;
  const {
    alignment,
    headerLayout,
    headerSize,
    bannerHeight,
    logoSize,
    titleSize,
    descriptionSize,
    headerSpacing,
    galleryStyle,
  } = page;
  const definition = cloneTheme(base);
  definition.name = name;
  definition.design = {
    alignment,
    headerLayout,
    headerSize,
    bannerHeight: bannerHeight ?? null,
    logoSize,
    titleSize,
    descriptionSize,
    headerSpacing,
    galleryStyle: cloneTheme(galleryStyle),
  };
  definition.headingFont =
    page.pageTheme?.headingFont ?? definition.headingFont;
  for (const mode of ['light', 'dark'] as const) {
    if (!definition.variants[mode]) continue;
    const colors = themePalette(page, mode) ?? definition.variants[mode]!;
    definition.variants[mode] = {
      ...colors,
      ...(page.background ? { background: page.background } : {}),
      ...(page.foreground ? { foreground: page.foreground } : {}),
      ...(page.accent !== '#accbfa' ? { primary: page.accent } : {}),
    };
  }
  definition.css = [base.css, page.customCss].filter(Boolean).join('\n');
  return themeDefinitionSchema.parse(definition);
}
const envelope = z
  .object({
    format: z.literal('immichpager-theme'),
    version: z.literal(1),
    theme: themeDefinitionSchema,
  })
  .strict();
export function parseThemeFile(text: string) {
  if (new TextEncoder().encode(text).length > THEME_FILE_LIMIT)
    throw new Error('Theme files must be no larger than 96 KiB.');
  return envelope.parse(JSON.parse(text)).theme;
}
export function serializeThemeFile(theme: ThemeDefinition) {
  const value = envelope.parse({
    format: 'immichpager-theme',
    version: 1,
    theme,
  });
  validateThemeSize(value);
  return JSON.stringify(value, null, 2) + '\n';
}

/** Undo design only; edits to content made since the application remain intact. */
export function restoreTheme(current: PageInput, before: PageInput): PageInput {
  const keys = [
    'theme',
    'background',
    'foreground',
    'accent',
    'pageTheme',
    'alignment',
    'headerLayout',
    'headerSize',
    'bannerHeight',
    'logoSize',
    'titleSize',
    'descriptionSize',
    'headerSpacing',
    'galleryStyle',
    'customCss',
  ] as const;
  const restored = { ...current };
  for (const key of keys)
    Object.assign(restored, { [key]: cloneTheme(before[key] ?? null) });
  restored.blocks = current.blocks?.map((block) => {
    const previous = before.blocks?.find((b) => b.id === block.id);
    if (!previous || previous.type !== block.type) return block;
    const styles: Record<string, unknown> = {};
    for (const key of [
      'presentationSource',
      'layout',
      'gap',
      'columns',
      'rowHeight',
      'alignment',
    ])
      if (key in previous)
        styles[key] = (previous as unknown as Record<string, unknown>)[key];
    return {
      ...block,
      ...styles,
      presentationSource: previous.presentationSource,
    };
  });
  return restored;
}
