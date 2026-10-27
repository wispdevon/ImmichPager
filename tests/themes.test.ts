import { describe, expect, it } from 'vitest';
import { pageInputSchema } from '../src/lib/contracts';
import {
  applyTheme,
  builtInThemes,
  parseThemeFile,
  serializeThemeFile,
} from '../src/lib/themes';

describe('complete client-page themes', () => {
  it('adopts presentation while preserving content, access, visibility and CSS', () => {
    const page = pageInputSchema.parse({
      title: 'My client',
      slug: 'my-client',
      customCss: '.ip-title { color: red; }',
      allowDownload: false,
      blocks: [
        {
          id: 'photos',
          type: 'photos',
          photos: [{ id: 'asset', caption: 'Keep me' }],
          layout: 'carousel',
        },
      ],
    });
    const themed = applyTheme(
      page,
      builtInThemes.find((t) => t.layout === 'studio')!,
    );
    expect(themed.title).toBe(page.title);
    expect(themed.blocks?.[0]).toMatchObject({
      id: 'photos',
      photos: [{ id: 'asset', caption: 'Keep me' }],
      presentationSource: 'theme',
    });
    expect(themed.clientUi).toEqual(page.clientUi);
    expect(themed.allowDownload).toBe(false);
    expect(themed.customCss).toBe(page.customCss);
    expect(themed.pageTheme?.definition.layout).toBe('studio');
  });
  it('freezes the applied definition instead of referencing a mutable catalog entry', () => {
    const definition = structuredClone(builtInThemes[0]);
    const page = applyTheme(
      pageInputSchema.parse({ title: 'Client', slug: 'client' }),
      definition,
    );
    definition.name = 'Changed later';
    expect(page.pageTheme?.definition.name).not.toBe('Changed later');
  });
  it('round-trips portable themes and rejects unsafe CSS and unknown layouts', () => {
    const theme = builtInThemes.find((t) => t.layout === 'editorial')!;
    expect(parseThemeFile(serializeThemeFile(theme))).toEqual(theme);
    expect(() =>
      parseThemeFile(
        JSON.stringify({
          format: 'immichpager-theme',
          version: 1,
          theme: { ...theme, css: '@import "https://evil.example/x.css";' },
        }),
      ),
    ).toThrow();
    expect(() =>
      parseThemeFile(
        JSON.stringify({
          format: 'immichpager-theme',
          version: 1,
          theme: { ...theme, layout: 'executable-plugin' },
        }),
      ),
    ).toThrow();
  });
});

it('uses theme row defaults until overridden and undo restores design without reverting content edits', async () => {
  const { resolveBlockTheme, restoreTheme } = await import('../src/lib/themes');
  const original = pageInputSchema.parse({
    title: 'Original',
    slug: 'original',
    blocks: [
      {
        id: 'p',
        type: 'photos',
        layout: 'carousel',
        photos: [{ id: 'asset', caption: 'Before' }],
      },
    ],
  });
  const themed = applyTheme(original, builtInThemes[0]);
  const row = themed.blocks![0];
  expect(resolveBlockTheme(row, themed.pageTheme!.definition)).toMatchObject({
    layout: 'masonry',
    columns: 3,
    gap: 20,
  });
  expect(
    resolveBlockTheme(
      { ...row, presentationSource: 'custom' },
      themed.pageTheme!.definition,
    ),
  ).toMatchObject({ layout: 'carousel' });
  const current = {
    ...themed,
    title: 'New words',
    blocks: themed.blocks!.map((b) =>
      b.type === 'photos'
        ? { ...b, photos: [{ id: 'asset', caption: 'New caption', alt: '' }] }
        : b,
    ),
  };
  const undone = restoreTheme(current, original);
  expect(undone.title).toBe('New words');
  expect(undone.blocks![0]).toMatchObject({
    layout: 'carousel',
    photos: [{ caption: 'New caption' }],
  });
  expect(undone.pageTheme).toBeNull();
});

it('forces single-variant modes and retains both variants and palette adjustments in portable captures', async () => {
  const { captureTheme, themePalette } = await import('../src/lib/themes');
  const original = pageInputSchema.parse({
    title: 'Page',
    slug: 'page',
    theme: 'system',
  });
  const definition = structuredClone(builtInThemes[0]);
  delete definition.variants.light;
  expect(applyTheme(original, definition).theme).toBe('dark');
  const paired = applyTheme(original, builtInThemes[0]);
  expect(paired.theme).toBe('system');
  paired.pageTheme!.overrides.primary = '#123456';
  expect(themePalette(paired, 'light')!.primary).toBe('#123456');
  expect(captureTheme(paired, 'Saved').variants.dark!.primary).toBe('#123456');
  expect(() => parseThemeFile(' '.repeat(97 * 1024))).toThrow('96 KiB');
});

it('resets to Classic without changing row membership, text, branding position or access', async () => {
  const { resetCustomization } = await import('../src/lib/customization');
  const { applyClassic } = await import('../src/lib/themes');
  const original = pageInputSchema.parse({
    title: 'Retain these words',
    slug: 'retain',
    allowDownload: false,
    blocks: [
      {
        id: 'a',
        type: 'albums',
        albumIds: ['album'],
        order: 'manual',
        grouping: 'none',
      },
    ],
  });
  const themed = applyTheme(original, builtInThemes[2]);
  const classic = applyClassic(themed);
  expect(classic.pageTheme).toBeNull();
  expect(classic.blocks![0]).toMatchObject({
    layout: 'cards',
    order: 'manual',
    grouping: 'none',
    albumIds: ['album'],
  });
  const reset = resetCustomization(themed);
  expect(reset.pageTheme).toBeUndefined();
  expect(reset.title).toBe(original.title);
  expect(reset.slug).toBe(original.slug);
  expect(reset.allowDownload).toBe(false);
  expect(reset.blocks![0]).toMatchObject({
    id: 'a',
    albumIds: ['album'],
    layout: 'cards',
  });
});
