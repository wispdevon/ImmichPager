import * as css from 'css-tree';
import type { GalleryPage } from './contracts';
import { DEFAULT_PAGE_ACCENT } from './gallery';
import { stylesheetMarkup } from './custom-css';

export type GalleryStyleSource = Pick<
  GalleryPage,
  | 'id'
  | 'theme'
  | 'background'
  | 'foreground'
  | 'accent'
  | 'alignment'
  | 'bannerPosition'
  | 'headerLayout'
  | 'headerSize'
  | 'logoSize'
  | 'titleSize'
  | 'descriptionSize'
  | 'headerSpacing'
  | 'galleryStyle'
>;

const hoverTreatment = {
  surface: {
    surfaceOpacity: '5%',
    borderOpacity: '12%',
    lift: '0px',
    decoration: 'none',
    titleColor: 'var(--pager-accent)',
  },
  underline: {
    surfaceOpacity: '0%',
    borderOpacity: '0%',
    lift: '0px',
    decoration: 'underline',
    titleColor: 'var(--pager-accent)',
  },
  lift: {
    surfaceOpacity: '5%',
    borderOpacity: '12%',
    lift: '-2px',
    decoration: 'none',
    titleColor: 'var(--pager-accent)',
  },
  none: {
    surfaceOpacity: '0%',
    borderOpacity: '0%',
    lift: '0px',
    decoration: 'none',
    titleColor: 'currentColor',
  },
} as const;

/**
 * Maps persisted page settings to gallery-scoped CSS variables. The emitted
 * rule uses :where() so a page's authored CSS can override these defaults.
 */
export function galleryStyleVariables(page: GalleryStyleSource) {
  const style = page.galleryStyle;
  const treatment = hoverTreatment[style.hoverTreatment];
  const baseAccent = page.accent.toLowerCase() === DEFAULT_PAGE_ACCENT;
  const bannerHeights = {
    compact: {
      banner: 'clamp(140px, 18vw, 240px)',
      overlay: 'clamp(220px, 22vw, 320px)',
    },
    standard: {
      banner: 'clamp(180px, 26vw, 360px)',
      overlay: 'clamp(260px, 32vw, 460px)',
    },
    tall: {
      banner: 'clamp(240px, 35vw, 480px)',
      overlay: 'clamp(360px, 42vw, 560px)',
    },
  }[page.headerSize];

  return {
    '--pager-background': page.background ?? 'var(--custom-bg, var(--base-bg))',
    '--pager-foreground': page.foreground ?? 'var(--custom-fg, var(--base-fg))',
    '--pager-accent': baseAccent
      ? 'var(--gallery-hover-accent, var(--accent))'
      : page.accent,
    '--pager-font-family':
      style.fontFamily === 'google-sans'
        ? '"GoogleSans", sans-serif'
        : 'system-ui, sans-serif',
    '--pager-title-font-weight': String(style.titleFontWeight),
    '--pager-body-font-size': `${style.bodyFontSize}rem`,
    '--pager-body-font-weight': String(style.bodyFontWeight),
    '--pager-card-title-size': `${style.cardTitleSize}rem`,
    '--pager-card-title-weight': String(style.cardTitleWeight),
    '--pager-content-width': `${style.contentWidth}px`,
    '--pager-page-padding': `${style.pagePadding}px`,
    '--pager-gallery-inline-padding': `${Math.round(style.pagePadding * 0.4)}px`,
    '--pager-mobile-page-padding': `${Math.round(style.pagePadding * 0.5)}px`,
    '--pager-mobile-gallery-inline-padding': `${Math.round(style.pagePadding * 0.2)}px`,
    '--pager-grid-min-width': `${style.gridMinWidth}px`,
    '--pager-grid-row-gap': `${style.gridRowGap}px`,
    '--pager-grid-column-gap': `${style.gridColumnGap}px`,
    '--pager-cover-aspect-ratio': String(style.coverAspectRatio),
    '--pager-card-radius': `${style.cardRadius}px`,
    '--pager-hover-treatment': style.hoverTreatment,
    '--pager-hover-surface-opacity': treatment.surfaceOpacity,
    '--pager-hover-border-opacity': treatment.borderOpacity,
    '--pager-hover-lift': treatment.lift,
    '--pager-hover-text-decoration': treatment.decoration,
    '--pager-hover-title-color': treatment.titleColor,
    '--pager-header-alignment': page.alignment,
    '--pager-header-layout': page.headerLayout,
    '--pager-banner-size': page.headerSize,
    '--pager-banner-position': `${page.bannerPosition}%`,
    '--pager-banner-height': bannerHeights.banner,
    '--pager-overlay-height': bannerHeights.overlay,
    '--pager-logo-size': `${page.logoSize}px`,
    '--pager-title-size': `${page.titleSize}rem`,
    '--pager-title-min-size': `${page.titleSize * 0.625}rem`,
    '--pager-title-fluid-size': `${(3.4 / 3) * page.titleSize}vw`,
    '--pager-description-size': `${page.descriptionSize}rem`,
    '--pager-header-spacing': `${page.headerSpacing}rem`,
    '--pager-mobile-header-spacing': `${Math.max(1.5, page.headerSpacing * 0.8)}rem`,
    '--pager-color-scheme': page.theme === 'system' ? 'light dark' : page.theme,
    '--accent': page.accent,
  } satisfies Record<string, string>;
}

export function galleryStyleStylesheet(page: GalleryStyleSource) {
  const selector = `:where([data-pager-gallery="${css.string.encode(page.id).slice(1, -1)}"])`;
  const declarations = Object.entries(galleryStyleVariables(page))
    .map(([name, value]) => `${name}: ${value};`)
    .join('\n  ');
  return stylesheetMarkup(`${selector} {\n  ${declarations}\n}`);
}
