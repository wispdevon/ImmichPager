import * as css from 'css-tree';
import type { GalleryPage } from './contracts';
import { FONT_CATALOG_BY_ID } from './font-catalog';
import { compileCustomCss, stylesheetMarkup } from './custom-css';
import { themePalette } from './themes';

export function themeStylesheet(page: GalleryPage) {
  if (!page.pageTheme) return '';
  const selector = `:where([data-pager-gallery="${css.string.encode(page.id).slice(1, -1)}"])`;
  function rule(requestedMode: 'light' | 'dark') {
    const variants = page.pageTheme!.definition.variants;
    const mode = variants[requestedMode]
      ? requestedMode
      : variants.dark
        ? 'dark'
        : 'light';
    const p = themePalette(page, mode)!;
    const values = {
      '--pager-background': page.background ?? p.background,
      '--pager-foreground': page.foreground ?? p.foreground,
      '--pager-accent': page.accent !== '#accbfa' ? page.accent : p.primary,
      '--pager-surface': p.surface,
      '--pager-surface-foreground': p.surfaceForeground,
      '--pager-primary-foreground': p.primaryForeground,
      '--pager-hover-foreground': p.hoverForeground,
      '--pager-muted': p.muted,
      '--pager-border': p.border,
      '--pager-focus': p.focus,
      '--pager-hover': p.hover,
      '--pager-heading-font':
        FONT_CATALOG_BY_ID[
          page.pageTheme!.headingFont ?? page.pageTheme!.definition.headingFont
        ].cssStack,
      '--pager-color-scheme': mode,
    };
    return `html:has(${selector}){color-scheme:${mode};background:${values['--pager-background']}}${selector}{${Object.entries(
      values,
    )
      .map(([k, v]) => `${k}:${v}`)
      .join(';')}}`;
  }
  let output = rule(page.theme === 'light' ? 'light' : 'dark');
  if (page.theme === 'system')
    output += `@media(prefers-color-scheme:light){${rule('light')}}`;
  return (
    stylesheetMarkup(output) +
    stylesheetMarkup(
      compileCustomCss(page.pageTheme.definition.css, page.id, {
        precedence: 'theme',
      }).css,
    )
  );
}
