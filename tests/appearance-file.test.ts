import { expect, it } from 'vitest';
import { DEFAULT_CLIENT_UI, DEFAULT_GALLERY_STYLE } from '../src/lib/contracts';
import {
  appearanceFileSchema,
  parseAppearanceFile,
  serializeAppearanceFile,
  type AppearanceSettings,
  type LegacyAppearanceSettings,
} from '../src/lib/appearance-file';

const appearance: AppearanceSettings = {
  theme: 'light',
  background: '#fafafa',
  foreground: null,
  accent: '#abc123',
  alignment: 'center',
  bannerPosition: 28,
  headerLayout: 'overlay',
  headerSize: 'tall',
  logoSize: 112,
  titleSize: 3.5,
  descriptionSize: 1.25,
  headerSpacing: 3.5,
  customCss: '.ip-title { color: #abc123 !important; }',
  clientUi: { ...DEFAULT_CLIENT_UI, showAlbumDates: false },
  galleryStyle: {
    ...DEFAULT_GALLERY_STYLE,
    cardRadius: 21,
    fontFamily: 'system',
    logoShape: 'circle',
    logoPosition: 'left',
  },
};

function version1Appearance(): LegacyAppearanceSettings {
  return {
    theme: appearance.theme,
    background: appearance.background,
    foreground: appearance.foreground,
    accent: appearance.accent,
    alignment: appearance.alignment,
    bannerPosition: appearance.bannerPosition,
    headerLayout: appearance.headerLayout,
    headerSize: appearance.headerSize,
    logoSize: appearance.logoSize,
    titleSize: appearance.titleSize,
    descriptionSize: appearance.descriptionSize,
    headerSpacing: appearance.headerSpacing,
    customCss: appearance.customCss,
  };
}

function version1File(legacy = version1Appearance()) {
  return JSON.stringify({
    format: 'immichpager-appearance',
    version: 1,
    appearance: legacy,
  });
}

it('round-trips complete version 2 design settings', () => {
  const exported = serializeAppearanceFile(appearance);

  expect(JSON.parse(exported)).toEqual({
    format: 'immichpager-appearance',
    version: 2,
    appearance,
  });
  expect(parseAppearanceFile(exported)).toEqual(appearance);
});

it('imports version 1 files with compatibility defaults and current new settings', () => {
  const current: AppearanceSettings = {
    ...appearance,
    clientUi: { ...DEFAULT_CLIENT_UI, showDescription: false },
    galleryStyle: { ...DEFAULT_GALLERY_STYLE, cardRadius: 4 },
  };
  const legacy = version1Appearance();
  delete (legacy as Partial<LegacyAppearanceSettings>).headerSize;
  delete (legacy as Partial<LegacyAppearanceSettings>).logoSize;
  delete (legacy as Partial<LegacyAppearanceSettings>).titleSize;
  delete (legacy as Partial<LegacyAppearanceSettings>).descriptionSize;
  delete (legacy as Partial<LegacyAppearanceSettings>).headerSpacing;

  const imported = parseAppearanceFile(version1File(legacy), current);
  expect(imported).toEqual({
    ...legacy,
    headerSize: 'standard',
    logoSize: 80,
    titleSize: 3,
    descriptionSize: 1.125,
    headerSpacing: 2.5,
    clientUi: current.clientUi,
    galleryStyle: current.galleryStyle,
  });

  expect(parseAppearanceFile(version1File()).clientUi).toEqual(
    DEFAULT_CLIENT_UI,
  );
  expect(parseAppearanceFile(version1File()).galleryStyle).toEqual(
    DEFAULT_GALLERY_STYLE,
  );
});

it.each([
  'albumIds',
  'title',
  'slug',
  'password',
  'shareToken',
  'ownerId',
  'allowDownload',
])('rejects portable files containing %s', (field) => {
  const input = {
    format: 'immichpager-appearance',
    version: 2,
    appearance: { ...appearance, [field]: 'private-value' },
  };

  expect(appearanceFileSchema.safeParse(input).success).toBe(false);
  expect(() => parseAppearanceFile(JSON.stringify(input))).toThrow();
});

it('rejects unsupported versions and malformed JSON', () => {
  expect(() =>
    parseAppearanceFile(
      JSON.stringify({
        format: 'immichpager-appearance',
        version: 3,
        appearance,
      }),
    ),
  ).toThrow(/supported ImmichPager appearance/i);
  expect(() => parseAppearanceFile('{')).toThrow(/valid JSON/i);
});

it('rejects unknown envelope keys and out-of-range appearance values', () => {
  expect(() =>
    parseAppearanceFile(
      JSON.stringify({
        format: 'immichpager-appearance',
        version: 2,
        accountToken: 'must not be portable',
        appearance,
      }),
    ),
  ).toThrow(/supported ImmichPager appearance/i);
  expect(() =>
    parseAppearanceFile(
      JSON.stringify({
        format: 'immichpager-appearance',
        version: 2,
        appearance: { ...appearance, bannerPosition: 101 },
      }),
    ),
  ).toThrow(/supported ImmichPager appearance/i);
});

it('rejects unknown fields inside version 2 client UI and gallery style settings', () => {
  const badClientUi = {
    ...appearance,
    clientUi: { ...appearance.clientUi, showYearHeadig: false },
  };
  const badGalleryStyle = {
    ...appearance,
    galleryStyle: { ...appearance.galleryStyle, cardRaduis: 12 },
  };

  expect(
    appearanceFileSchema.safeParse({
      format: 'immichpager-appearance',
      version: 2,
      appearance: badClientUi,
    }).success,
  ).toBe(false);
  expect(() =>
    parseAppearanceFile(
      JSON.stringify({
        format: 'immichpager-appearance',
        version: 2,
        appearance: badGalleryStyle,
      }),
    ),
  ).toThrow(/supported ImmichPager appearance/i);
});

it('validates logo appearance settings in version 2 files', () => {
  expect(
    parseAppearanceFile(serializeAppearanceFile(appearance)).galleryStyle,
  ).toMatchObject({
    logoShape: 'circle',
    logoPosition: 'left',
  });

  expect(() =>
    parseAppearanceFile(
      JSON.stringify({
        format: 'immichpager-appearance',
        version: 2,
        appearance: {
          ...appearance,
          galleryStyle: { ...appearance.galleryStyle, logoShape: 'pill' },
        },
      }),
    ),
  ).toThrow(/supported ImmichPager appearance/i);
});

it('does not serialize extra private properties supplied at runtime', () => {
  expect(() =>
    serializeAppearanceFile({
      ...appearance,
      albumIds: ['private-album-id'],
    } as AppearanceSettings),
  ).toThrow();
});

it('rejects oversized files before validating their contents', () => {
  const oversized = ' '.repeat(100 * 1024);

  expect(() => parseAppearanceFile(oversized)).toThrow(/too large/i);
});

it('rejects custom CSS that fails the gallery compiler in both file versions', () => {
  const css = '@import "https://example.com/a.css";';

  expect(() =>
    parseAppearanceFile(
      JSON.stringify({
        format: 'immichpager-appearance',
        version: 1,
        appearance: { ...version1Appearance(), customCss: css },
      }),
    ),
  ).toThrow(/custom css/i);
  expect(() =>
    parseAppearanceFile(
      JSON.stringify({
        format: 'immichpager-appearance',
        version: 2,
        appearance: { ...appearance, customCss: css },
      }),
    ),
  ).toThrow(/custom css/i);
});
