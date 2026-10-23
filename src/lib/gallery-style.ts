import * as css from 'css-tree';
import type { GalleryPage } from './contracts';
import { DEFAULT_PAGE_ACCENT } from './gallery';
import { stylesheetMarkup } from './custom-css';
import { FONT_CATALOG_BY_ID } from './font-catalog';

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
  | 'bannerHeight'
  | 'logoSize'
  | 'titleSize'
  | 'descriptionSize'
  | 'headerSpacing'
  | 'banner'
  | 'clientUi'
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
export function galleryStyleVariables(
  page: GalleryStyleSource,
  options: { editorHeader?: boolean } = {},
) {
  const style = page.galleryStyle;
  const treatment = hoverTreatment[style.hoverTreatment];
  const baseAccent = page.accent.toLowerCase() === DEFAULT_PAGE_ACCENT;
  const overlay =
    page.headerLayout === 'overlay' &&
    !!page.banner &&
    (options.editorHeader || page.clientUi.showBanner);
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
  const logoRadius = {
    square: '0px',
    rounded: '16px',
    circle: '50%',
  }[style.logoShape];

  const variables: Record<string, string> = {
    '--pager-background': page.background ?? 'var(--custom-bg, var(--base-bg))',
    '--pager-accent': baseAccent
      ? 'var(--gallery-hover-accent, var(--accent))'
      : page.accent,
    '--pager-font-family': FONT_CATALOG_BY_ID[style.fontFamily].cssStack,
    '--pager-title-font-weight': String(style.titleFontWeight),
    '--pager-body-font-size': `${style.bodyFontSize}rem`,
    '--pager-body-font-weight': String(style.bodyFontWeight),
    '--pager-control-font-size': `${style.bodyFontSize * 0.875}rem`,
    '--pager-mobile-control-font-size': `${style.bodyFontSize * 0.8125}rem`,
    '--pager-card-meta-size': `${style.bodyFontSize * 0.875}rem`,
    '--pager-card-title-size': `${style.cardTitleSize}rem`,
    '--pager-card-title-weight': String(style.cardTitleWeight),
    '--pager-content-width': `${style.contentWidth}px`,
    '--pager-page-padding': `${style.pagePadding}px`,
    '--pager-gallery-inline-padding': `${Math.round(style.pagePadding * 0.4)}px`,
    '--pager-mobile-page-padding': `${Math.round(style.pagePadding * 0.5)}px`,
    '--pager-mobile-gallery-inline-padding': `${Math.round(style.pagePadding * 0.2)}px`,
    '--pager-mobile-footer-inline-padding': `${Math.max(24, Math.round(style.pagePadding * 0.6))}px`,
    '--pager-grid-min-width': `${style.gridMinWidth}px`,
    '--pager-grid-row-gap': `${style.gridRowGap}px`,
    '--pager-grid-column-gap': `${style.gridColumnGap}px`,
    '--pager-cover-aspect-ratio': String(style.coverAspectRatio),
    '--pager-card-radius': `${style.cardRadius}px`,
    '--pager-hover-surface-opacity': treatment.surfaceOpacity,
    '--pager-hover-border-opacity': treatment.borderOpacity,
    '--pager-hover-lift': treatment.lift,
    '--pager-hover-text-decoration': treatment.decoration,
    '--pager-hover-title-color': treatment.titleColor,
    '--pager-header-alignment': page.alignment,
    '--pager-banner-position': `${page.bannerPosition}%`,
    '--pager-banner-height': page.bannerHeight
      ? `min(${page.bannerHeight}px, 90svh)`
      : bannerHeights.banner,
    '--pager-overlay-height': page.bannerHeight
      ? `min(${page.bannerHeight}px, 90svh)`
      : bannerHeights.overlay,
    '--pager-hero-display': overlay ? 'grid' : 'block',
    '--pager-hero-min-height': overlay ? 'var(--pager-overlay-height)' : 'auto',
    '--pager-hero-margin-block-end': overlay ? '32px' : '0px',
    '--pager-banner-placement': overlay ? 'absolute' : 'relative',
    '--pager-overlay-decoration-display': overlay ? 'block' : 'none',
    '--pager-header-align-self': overlay ? 'end' : 'auto',
    '--pager-overlay-header-color': overlay
      ? 'var(--pager-foreground, #fff)'
      : 'inherit',
    '--pager-logo-size': `${page.logoSize}px`,
    '--pager-logo-radius': logoRadius,
    '--pager-logo-layout': style.logoPosition === 'left' ? 'row' : 'column',
    '--pager-logo-gap': '20px',
    '--pager-mobile-logo-layout': 'column',
    '--pager-logo-justify':
      page.alignment === 'center' ? 'center' : 'flex-start',
    '--pager-title-size': `${page.titleSize}rem`,
    '--pager-title-min-size': `${page.titleSize * 0.625}rem`,
    '--pager-title-fluid-size': `${(3.4 / 3) * page.titleSize}vw`,
    '--pager-description-size': `${page.descriptionSize}rem`,
    '--pager-header-spacing': `${page.headerSpacing}rem`,
    '--pager-mobile-header-spacing': `${Math.max(1.5, page.headerSpacing * 0.8)}rem`,
    // Preserve the former root properties for integrations that inspect them.
    // Gallery styling consumes the authoritative --pager-* variables above.
    '--logo-size': 'var(--pager-logo-size)',
    '--title-min-size': 'var(--pager-title-min-size)',
    '--title-fluid-size': 'var(--pager-title-fluid-size)',
    '--title-max-size': 'var(--pager-title-size)',
    '--description-size': 'var(--pager-description-size)',
    '--header-spacing': 'var(--pager-header-spacing)',
    '--mobile-header-spacing': 'var(--pager-mobile-header-spacing)',
    '--pager-color-scheme': page.theme === 'system' ? 'light dark' : page.theme,
    '--accent': page.accent,
  };
  if (page.background) variables['--custom-bg'] = page.background;
  if (page.foreground) variables['--pager-foreground'] = page.foreground;
  if (page.foreground) variables['--custom-fg'] = page.foreground;
  if (!baseAccent) variables['--gallery-hover-accent'] = page.accent;
  return variables;
}

export function galleryStyleStylesheet(
  page: GalleryStyleSource,
  options: { editorHeader?: boolean } = {},
) {
  const selector = `:where([data-pager-gallery="${css.string.encode(page.id).slice(1, -1)}"])`;
  const declarations = Object.entries(galleryStyleVariables(page, options))
    .map(([name, value]) => `${name}: ${value};`)
    .join('\n  ');
  return stylesheetMarkup(`${selector} {\n  ${declarations}\n}`);
}
