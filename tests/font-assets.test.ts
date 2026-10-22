import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { FONT_CATALOG } from '../src/lib/font-catalog';

it('serves every catalog font from local WOFF2 assets under /page/', () => {
  const css = readFileSync('src/lib/bundled-fonts.css', 'utf8');
  expect(css).not.toMatch(/https?:\/\//i);

  const bundledFamilies = FONT_CATALOG.slice(2);
  for (const { name } of bundledFamilies)
    expect(css).toContain(`font-family: '${name}'`);

  const assets = [
    ...css.matchAll(/url\('\/assets\/fonts\/bundled\/([^']+\.woff2)'\)/g),
  ];
  expect(assets.length).toBeGreaterThan(bundledFamilies.length);
  expect(new Set(assets.map((match) => match[1])).size).toBe(assets.length);

  for (const [, filename] of assets) {
    const asset = readFileSync(`static/assets/fonts/bundled/${filename}`);
    expect(asset.toString('ascii', 0, 4)).toBe('wOF2');
  }
});
