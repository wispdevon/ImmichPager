import * as css from 'css-tree';
import { parse, formatHex, formatHex8, wcagContrast } from 'culori';
import { cloneTheme } from './themes';
import { FONT_CATALOG, fontFamilyIdFromToken } from './font-catalog';
import {
  THEME_FILE_LIMIT,
  themeDefinitionSchema,
  type ThemeDefinition,
  type ThemePalette,
} from './theme-schema';

export type CssThemeFormat = 'shadcn' | 'daisyui';
type Group = {
  name: string;
  mode: 'light' | 'dark';
  vars: Map<string, string>;
};
const maps: Record<CssThemeFormat, Record<keyof ThemePalette, string>> = {
  shadcn: {
    background: '--background',
    foreground: '--foreground',
    surface: '--card',
    surfaceForeground: '--card-foreground',
    muted: '--muted-foreground',
    primary: '--primary',
    primaryForeground: '--primary-foreground',
    border: '--border',
    focus: '--ring',
    hover: '--accent',
    hoverForeground: '--accent-foreground',
  },
  daisyui: {
    background: '--color-base-100',
    foreground: '--color-base-content',
    surface: '--color-base-200',
    surfaceForeground: '--color-base-content',
    muted: '--color-base-content',
    primary: '--color-primary',
    primaryForeground: '--color-primary-content',
    border: '--color-base-300',
    focus: '--color-primary',
    hover: '--color-accent',
    hoverForeground: '--color-accent-content',
  },
};
function declarations(node: css.CssNode) {
  const values = new Map<string, string>();
  if ('block' in node && node.block && node.block.type === 'Block')
    node.block.children.forEach((child) => {
      if (child.type === 'Declaration')
        values.set(child.property, css.generate(child.value).trim());
    });
  return values;
}
function resolve(
  value: string,
  vars: Map<string, string>,
  seen = new Set<string>(),
  budget = { remaining: 256 },
): string {
  if (value.length > 4096)
    throw new Error('Theme variable values are too long.');
  if (seen.size > 64)
    throw new Error('Theme variable references are too deeply nested.');
  return value.replace(
    /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g,
    (_, key: string, fallback: string) => {
      if (--budget.remaining < 0)
        throw new Error('Too many theme variable references.');
      if (seen.has(key)) throw new Error('Circular CSS variable reference.');
      const raw = vars.get(key) ?? fallback;
      if (!raw) throw new Error(`Unresolved theme variable ${key}.`);
      return resolve(raw, vars, new Set([...seen, key]), budget);
    },
  );
}
function color(value: string) {
  value = value.trim();
  // Older shadcn exports store HSL channels without a function wrapper.
  if (/^[-\d.]+\s+[-\d.]+%\s+[-\d.]+%(?:\s*\/\s*[\d.%]+)?$/.test(value))
    value = `hsl(${value})`;
  const result = parse(value);
  if (!result) throw new Error(`Unsupported color: ${value.slice(0, 80)}.`);
  return (
    result.alpha !== undefined && result.alpha !== 1
      ? formatHex8(result)
      : formatHex(result)
  )!;
}
export function importThemeCss(
  text: string,
  format: CssThemeFormat,
  base: ThemeDefinition,
  selection?: string,
  mode?: 'light' | 'dark',
) {
  if (new TextEncoder().encode(text).length > THEME_FILE_LIMIT)
    throw new Error('Theme files must be no larger than 96 KiB.');
  const ast = css.parse(text),
    groups: Group[] = [];
  const warnings = new Set<string>();
  css.walk(ast, {
    enter(node: css.CssNode) {
      if (
        node.type === 'Atrule' &&
        node.name === 'plugin' &&
        node.prelude &&
        css.generate(node.prelude).includes('daisyui/theme') &&
        format === 'daisyui'
      ) {
        const vars = declarations(node);
        const scheme = vars.get('color-scheme') ?? mode;
        if (scheme !== 'light' && scheme !== 'dark')
          throw new Error('Choose Light or Dark for this theme.');
        groups.push({
          name: (vars.get('name') ?? 'Imported theme').replace(
            /^['"]|['"]$/g,
            '',
          ),
          mode: scheme,
          vars,
        });
      } else if (node.type === 'Rule') {
        const selector = css.generate(node.prelude),
          vars = declarations(node);
        const applicable = [...vars.keys()].some((key) =>
          Object.values(maps[format]).includes(key),
        );
        if (!applicable) {
          if (vars.size || selector)
            warnings.add(
              'Unrelated selectors and framework rules are ignored.',
            );
          return;
        }
        if (
          format === 'shadcn' &&
          (selector.includes(':root') || selector.includes('.dark'))
        )
          groups.push({
            name: 'Imported theme',
            mode: selector.includes('.dark') ? 'dark' : 'light',
            vars,
          });
        else if (format === 'daisyui' && selector.includes('data-theme')) {
          const name =
            selector.match(/data-theme\s*=\s*['"]?([\w-]+)/)?.[1] ??
            'Imported theme';
          const scheme = vars.get('color-scheme') ?? mode;
          if (scheme !== 'light' && scheme !== 'dark')
            throw new Error('Choose Light or Dark for this theme.');
          groups.push({ name, mode: scheme, vars });
        } else
          warnings.add('Only supported theme variable scopes are imported.');
      } else if (
        node.type === 'Atrule' &&
        ['import', 'font-face'].includes(node.name)
      )
        warnings.add(
          'External imports and fonts are ignored; no resources are downloaded.',
        );
    },
  });
  if (!groups.length)
    throw new Error(
      'No supported theme colors found. Paste a complete theme CSS export.',
    );
  const names = [...new Set(groups.map((g) => g.name))];
  if (names.length > 1 && !selection)
    throw new Error(`Choose one theme: ${names.join(', ')}.`);
  const chosen = groups.filter((g) => g.name === (selection ?? names[0]));
  if (!chosen.length) throw new Error('The selected theme was not found.');
  const definition = cloneTheme(base);
  definition.name = selection ?? names[0];
  definition.css = '';
  definition.variants = {};
  const rootVars = new Map<string, string>();
  for (const g of chosen.filter((g) => g.mode === 'light'))
    g.vars.forEach((v, k) => rootVars.set(k, v));
  const recognized: string[] = [];
  for (const group of chosen) {
    const vars = new Map([...rootVars, ...group.vars]);
    const colors = {
      ...(base.variants[group.mode] ??
        base.variants.dark ??
        base.variants.light)!,
    };
    for (const required of ['background', 'foreground', 'primary'] as const)
      if (!vars.has(maps[format][required]))
        throw new Error(
          `Missing ${maps[format][required]}; paste the complete theme export.`,
        );
    for (const [role, key] of Object.entries(maps[format]) as [
      keyof ThemePalette,
      string,
    ][]) {
      const raw = vars.get(key);
      if (raw) {
        colors[role] = color(resolve(raw, vars));
        recognized.push(`${group.mode}: ${key}`);
      }
    }
    definition.variants[group.mode] = colors;
    if (wcagContrast(colors.background, colors.foreground) < 4.5)
      warnings.add(
        `${group.mode}: text contrast is below 4.5:1. Review before applying.`,
      );
    for (const [background, foreground, label] of [
      ['surface', 'surfaceForeground', 'surface text'],
      ['primary', 'primaryForeground', 'primary button text'],
    ] as const) {
      if (wcagContrast(colors[background], colors[foreground]) < 4.5)
        warnings.add(
          `${group.mode}: ${label} contrast is below 4.5:1. Review before applying.`,
        );
    }
    const radius = vars.get(format === 'shadcn' ? '--radius' : '--radius-box');
    if (radius) {
      const resolved = resolve(radius, vars);
      const match = resolved.match(/^([\d.]+)(px|rem)$/);
      if (!match) throw new Error('Unsupported corner radius. Use px or rem.');
      const value = Number(match[1]) * (match[2] === 'rem' ? 16 : 1);
      if (!Number.isInteger(value) || value > 40)
        throw new Error('Corner radius must be 0–40 whole pixels.');
      definition.design.galleryStyle.cardRadius = value;
      recognized.push('Corner radius');
    }
    const family = vars.get('--font-sans');
    if (family) {
      let resolvedFont = family;
      try {
        resolvedFont = resolve(family, vars);
      } catch {
        warnings.add(
          'The font references a variable outside this export; a bundled fallback will be used.',
        );
      }
      const value = resolvedFont
        .split(',')
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
      const found = value.map(fontFamilyIdFromToken).find(Boolean);
      definition.design.galleryStyle.fontFamily = found ?? 'inter';
      if (!found)
        warnings.add(
          `Font ${value[0]} is not bundled; Inter will be used. Available fonts: ${FONT_CATALOG.map((f) => f.name).join(', ')}.`,
        );
      recognized.push('Body font');
    }
  }
  if (format === 'daisyui')
    warnings.add(
      'Unsupported daisyUI effects, noise, and component sizes are ignored.',
    );
  warnings.add('Pager supplies the selected page composition and row layouts.');
  return {
    definition: themeDefinitionSchema.parse(definition),
    recognized,
    warnings: [...warnings],
    names,
  };
}
