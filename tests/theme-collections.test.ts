import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { photographyCollections } from '../src/lib/theme-collections';
import {
  applyTheme,
  captureTheme,
  parseThemeFile,
  serializeThemeFile,
} from '../src/lib/themes';
import { parsePageInput } from '../src/lib/contracts';
import { themeDefinitionSchema } from '../src/lib/theme-schema';

describe('licensed photography collections', () => {
  it('ships three distinct portable designs in each requested category', () => {
    expect(photographyCollections.map((c) => c.id)).toEqual([
      'wedding',
      'portraiture',
      'wildlife',
      'versatile',
    ]);
    const names = new Set<string>(),
      compositions = new Set<string>();
    for (const collection of photographyCollections) {
      expect(collection.themes).toHaveLength(3);
      for (const item of collection.themes) {
        const theme = parseThemeFile(
          readFileSync('static' + item.path.replace('/page', ''), 'utf8'),
        );
        expect(theme).toEqual(item.definition);
        names.add(theme.name);
        compositions.add(theme.css);
        expect(serializeThemeFile(theme)).toContain('HTML5 UP');
        expect(theme.attribution).toMatchObject({
          author: 'AJ / HTML5 UP',
          license: 'CC-BY-3.0',
        });
        expect(theme.css).not.toMatch(/@import|url\s*\(|@font-face/);
      }
    }
    expect(names.size).toBe(12);
    expect(compositions.size).toBe(12);
  });
  it('preserves source credit through application, capture and portable round trips', () => {
    const item = photographyCollections[0].themes[0];
    const input = parsePageInput({
      title: 'Client words',
      slug: 'client',
      allowDownload: false,
      blocks: [
        {
          id: 'photos',
          type: 'photos',
          photos: [{ id: 'asset', caption: 'Keep this' }],
        },
      ],
    });
    const applied = applyTheme(input, item.definition);
    expect(applied.title).toBe(input.title);
    expect(applied.allowDownload).toBe(false);
    expect(applied.blocks![0]).toMatchObject({
      photos: [{ id: 'asset', caption: 'Keep this' }],
    });
    expect(
      parseThemeFile(
        serializeThemeFile(captureTheme(applied, 'Renamed design')),
      ).attribution,
    ).toEqual(item.definition.attribution);
  });
  it('rejects executable or non-HTTPS attribution links', () => {
    const theme = photographyCollections[0].themes[0].definition;
    expect(() =>
      themeDefinitionSchema.parse({
        ...theme,
        attribution: { ...theme.attribution, url: 'javascript:alert(1)' },
      }),
    ).toThrow();
  });
});

it('keeps adapted semantic text and button palettes readable', async () => {
  const { wcagContrast } = await import('culori');
  for (const collection of photographyCollections)
    for (const { definition } of collection.themes)
      for (const palette of Object.values(definition.variants)) {
        for (const [bg, fg] of [
          ['background', 'foreground'],
          ['background', 'muted'],
          ['surface', 'surfaceForeground'],
          ['primary', 'primaryForeground'],
        ] as const) {
          expect(
            wcagContrast(palette[bg], palette[fg]),
            `${definition.name}: ${fg} on ${bg}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
});
