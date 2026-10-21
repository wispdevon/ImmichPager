import { expect, it } from 'vitest';
import { parsePageInput } from '../src/lib/contracts';
import {
  applyHeaderPreset,
  headerPresets,
} from '../src/lib/appearance-presets';

it.each(headerPresets)(
  'applies the $id header preset and leaves unrelated settings intact',
  (preset) => {
    const page = parsePageInput({
      title: 'Client page',
      slug: 'client-page',
      description: 'A page description',
      theme: 'light',
      background: '#101820',
      foreground: '#f0f0f0',
      accent: '#123abc',
      bannerPosition: 24,
      customCss: '.ip-title { color: rebeccapurple; }',
      albumIds: ['album-1', 'album-2'],
      order: 'manual',
      passwordMode: 'keep',
      password: '',
    });
    const updated = applyHeaderPreset(page, preset);

    expect(updated).toMatchObject(preset.appearance);
    expect(updated).not.toBe(page);
    expect(updated).toMatchObject({
      title: page.title,
      slug: page.slug,
      description: page.description,
      theme: page.theme,
      background: page.background,
      foreground: page.foreground,
      accent: page.accent,
      bannerPosition: page.bannerPosition,
      customCss: page.customCss,
      albumIds: page.albumIds,
      order: page.order,
      passwordMode: page.passwordMode,
      password: page.password,
    });
    expect(updated.albumIds).toBe(page.albumIds);
  },
);
