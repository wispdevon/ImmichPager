import { expect, it } from 'vitest';
import {
  appearanceFileSchema,
  parseAppearanceFile,
  serializeAppearanceFile,
  type AppearanceSettings,
} from '../src/lib/appearance-file';

const appearance: AppearanceSettings = {
  theme: 'light',
  background: '#fafafa',
  foreground: null,
  accent: '#abc123',
  alignment: 'center',
  bannerPosition: 28,
  headerLayout: 'overlay',
  customCss: '.ip-title { color: #abc123 !important; }',
};

it('round-trips only versioned appearance settings', () => {
  const exported = serializeAppearanceFile(appearance);

  expect(JSON.parse(exported)).toEqual({
    format: 'immichpager-appearance',
    version: 1,
    appearance,
  });
  expect(parseAppearanceFile(exported)).toEqual(appearance);
});

it.each(['albumIds', 'title', 'slug', 'password', 'shareToken', 'ownerId'])(
  'rejects portable files containing %s',
  (field) => {
    const input = {
      format: 'immichpager-appearance',
      version: 1,
      appearance: { ...appearance, [field]: 'private-value' },
    };

    expect(appearanceFileSchema.safeParse(input).success).toBe(false);
    expect(() => parseAppearanceFile(JSON.stringify(input))).toThrow();
  },
);

it('rejects unsupported versions and malformed JSON', () => {
  expect(() =>
    parseAppearanceFile(
      JSON.stringify({
        format: 'immichpager-appearance',
        version: 2,
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
        version: 1,
        accountToken: 'must not be portable',
        appearance,
      }),
    ),
  ).toThrow(/supported ImmichPager appearance/i);
  expect(() =>
    parseAppearanceFile(
      JSON.stringify({
        format: 'immichpager-appearance',
        version: 1,
        appearance: { ...appearance, bannerPosition: 101 },
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

it('rejects custom CSS that fails the gallery compiler', () => {
  const input = JSON.stringify({
    format: 'immichpager-appearance',
    version: 1,
    appearance: {
      ...appearance,
      customCss: '@import "https://example.com/a.css";',
    },
  });

  expect(() => parseAppearanceFile(input)).toThrow(/custom css/i);
});
