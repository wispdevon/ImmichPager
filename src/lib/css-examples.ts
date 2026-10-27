import { CUSTOM_CSS_LIMIT } from './custom-css';

export type CssExample = {
  id: string;
  title: string;
  category: string;
  description: string;
  css: string;
};

export const CSS_EXAMPLES: readonly CssExample[] = [
  {
    id: 'warm-accent',
    title: 'Warm accent and serif title',
    category: 'Palette',
    description: 'A warm accent with a traditional serif page title.',
    css: ':scope {\n  --pager-accent: #f0b67f;\n}\n.ip-title.ip-title {\n  font-family: Georgia, serif;\n}',
  },
  {
    id: 'ivory-paper',
    title: 'Ivory paper',
    category: 'Palette',
    description: 'Warm paper, dark text, and a muted green accent.',
    css: ':scope {\n  --pager-background: #fbf8f0;\n  --pager-foreground: #302d27;\n  --pager-accent: #46665b;\n  --pager-muted: #655f55;\n  --pager-surface: #f1ecdf;\n  --pager-surface-foreground: #302d27;\n  --pager-primary-foreground: #ffffff;\n}\n.ip-block {\n  background: var(--pager-background);\n}',
  },
  {
    id: 'charcoal',
    title: 'Charcoal and sea glass',
    category: 'Palette',
    description: 'A dark gallery with bright text and a cool accent.',
    css: ':scope {\n  --pager-background: #15191c;\n  --pager-foreground: #f1f3f4;\n  --pager-accent: #95cbd1;\n  --pager-muted: #b8c0c6;\n  --pager-surface: #222a30;\n  --pager-surface-foreground: #f1f3f4;\n  --pager-primary-foreground: #152024;\n}\n.ip-block {\n  background: var(--pager-background);\n}',
  },
  {
    id: 'serif-title',
    title: 'Editorial title',
    category: 'Typography',
    description: 'Use the bundled Source Serif 4 font for the page title.',
    css: '.ip-title.ip-title {\n  font-family: "Source Serif 4", Georgia, serif;\n  font-weight: 400;\n  letter-spacing: -0.025em;\n  line-height: 1.12;\n}\n.ip-description.ip-description {\n  max-width: 42ch;\n  line-height: 1.7;\n}',
  },
  {
    id: 'fluid-title',
    title: 'Fluid title',
    category: 'Typography',
    description:
      'Scale the title within readable limits as the canvas changes.',
    css: '.ip-title.ip-title {\n  font-size: clamp(2rem, calc(1.25rem + 3vw), 4rem);\n  line-height: 1.1;\n  letter-spacing: -0.03em;\n}',
  },
  {
    id: 'compact-layout',
    title: 'Compact portfolio',
    category: 'Layout',
    description: 'Narrower content, smaller gutters, and balanced album gaps.',
    css: ':scope {\n  --pager-content-width: 1120px;\n  --pager-page-padding: 24px;\n  --pager-mobile-page-padding: 16px;\n  --pager-grid-row-gap: 24px;\n  --pager-grid-column-gap: 24px;\n}',
  },
  {
    id: 'landscape-covers',
    title: 'Landscape album covers',
    category: 'Layout',
    description: 'Use wide 3:2 album covers with restrained corners.',
    css: ':scope {\n  --pager-cover-aspect-ratio: 1.5;\n  --pager-card-radius: 6px;\n  --pager-grid-min-width: 280px;\n  --pager-grid-row-gap: 32px;\n  --pager-grid-column-gap: 24px;\n}',
  },
  {
    id: 'square-contact-sheet',
    title: 'Square contact sheet',
    category: 'Layout',
    description: 'Compact square album covers with crisp edges.',
    css: ':scope {\n  --pager-cover-aspect-ratio: 1;\n  --pager-card-radius: 0px;\n  --pager-grid-min-width: 176px;\n  --pager-grid-row-gap: 16px;\n  --pager-grid-column-gap: 12px;\n  --pager-card-title-size: 0.95rem;\n}',
  },
  {
    id: 'rounded-images',
    title: 'Rounded images',
    category: 'Images',
    description: 'Round banner, album-cover, and photo-tile corners.',
    css: ':scope {\n  --pager-card-radius: 12px;\n}\n.ip-banner {\n  border-radius: 20px;\n  overflow: hidden;\n}\n.ip-photo.ip-photo {\n  border-radius: 12px;\n  overflow: hidden;\n}',
  },
  {
    id: 'monochrome-covers',
    title: 'Monochrome album covers',
    category: 'Images',
    description:
      'Show grayscale covers, returning to color on hover or keyboard focus.',
    css: '.ip-cover img {\n  filter: grayscale(1);\n}\n.ip-album:hover .ip-cover img,\n.ip-album:focus-visible .ip-cover img {\n  filter: grayscale(0);\n}',
  },
  {
    id: 'gentle-hover',
    title: 'Gentle album lift',
    category: 'Motion',
    description: 'A small hover lift for visitors who allow motion.',
    css: '@media (prefers-reduced-motion: no-preference) {\n  :scope {\n    --pager-hover-lift: -3px;\n  }\n}',
  },
  {
    id: 'phone-spacing',
    title: 'Phone spacing',
    category: 'Responsive',
    description: 'Smaller gutters and comfortable descriptions below 600px.',
    css: '@media (max-width: 600px) {\n  :scope {\n    --pager-page-padding: 16px;\n    --pager-mobile-page-padding: 16px;\n    --pager-grid-column-gap: 12px;\n  }\n  .ip-description.ip-description {\n    line-height: 1.65;\n  }\n}',
  },
];

/** Append only after the complete result has passed the editor's size limit. */
export function appendCssExample(source: string, example: CssExample) {
  const separator = source.trim() ? '\n\n' : '';
  const next = source + separator + `/* ${example.title} */\n${example.css}`;
  if (next.length > CUSTOM_CSS_LIMIT)
    throw new RangeError(
      'There is not enough room to add the example. Clear or shorten CSS first.',
    );
  return next;
}
