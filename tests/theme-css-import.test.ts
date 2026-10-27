import { describe, it, expect } from 'vitest';
import { importThemeCss } from '../src/lib/theme-css-import';
import { builtInThemes } from '../src/lib/themes';
describe('external theme CSS conversion', () => {
  it('imports paired shadcn palettes, alpha borders and bundled fonts without retaining source CSS', () => {
    const result = importThemeCss(
      ':root {--background: oklch(1 0 0);--foreground: #222;--primary: hsl(220 60% 40%);--border:rgb(0 0 0 / 10%);--font-sans: "Inter",sans-serif;--radius:0.5rem;} .dark {--background:#111;--foreground:#eee;--primary:#aabbcc;} .unrelated {background:url(https://example.com/track);}',
      'shadcn',
      builtInThemes[0],
    );
    expect(result.definition.variants.light?.background).toBe('#ffffff');
    expect(result.definition.variants.light?.border).toBe('#0000001a');
    expect(result.definition.variants.dark?.background).toBe('#111111');
    expect(result.definition.css).toBe('');
    expect(result.definition.design.galleryStyle.cardRadius).toBe(8);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it('reads daisyUI plugin blocks as data and requires a choice for multiple themes', () => {
    const css =
      '@plugin "daisyui/theme" {name:"mytheme";color-scheme:dark;--color-base-100:#112233;--color-base-content:#ffffff;--color-primary:#aabbcc;}';
    const result = importThemeCss(css, 'daisyui', builtInThemes[0]);
    expect(result.definition.variants.dark?.background).toBe('#112233');
    expect(result.definition.variants.light).toBeUndefined();
    expect(() =>
      importThemeCss(
        css + css.replace('mytheme', 'another'),
        'daisyui',
        builtInThemes[0],
      ),
    ).toThrow('Choose one');
  });
  it('rejects cycles, unsafe recognized values and files without applicable colors', () => {
    expect(() =>
      importThemeCss(
        ':root {--background:var(--foreground);--foreground:var(--background);--primary:red;}',
        'shadcn',
        builtInThemes[0],
      ),
    ).toThrow();
    expect(() =>
      importThemeCss(
        ':root{--background:url(https://evil.test);--foreground:white;--primary:red;}',
        'shadcn',
        builtInThemes[0],
      ),
    ).toThrow();
    expect(() =>
      importThemeCss('body {color:red}', 'shadcn', builtInThemes[0]),
    ).toThrow();
  });
});

it('substitutes bundled fonts for external framework font aliases without losing the palette', () => {
  const result = importThemeCss(
    ':root {--background: white;--foreground: black;--primary: #334455;--font-sans:var(--font-geist);}',
    'shadcn',
    builtInThemes[0],
  );
  expect(result.definition.design.galleryStyle.fontFamily).toBe('inter');
  expect(result.warnings.join(' ')).toContain('bundled fallback');
});

it('bounds branching variable expansion before a small file can exhaust memory', () => {
  const variables = Array.from(
    { length: 20 },
    (_, i) => `--value-${i}:var(--value-${i + 1}) var(--value-${i + 1});`,
  ).join('');
  expect(() =>
    importThemeCss(
      `:root {${variables}--value-20:white;--background:var(--value-0);--foreground:black;--primary:red;}`,
      'shadcn',
      builtInThemes[0],
    ),
  ).toThrow('Too many theme variable references');
});
