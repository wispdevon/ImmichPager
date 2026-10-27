# CSS examples

In **Design → CSS → Examples**, choose a recipe, expand **View example CSS** to
inspect it, then choose **Insert example**. Insertion appends a labeled snippet;
it keeps your existing CSS. Selection alone does not save a change. The result
previews and autosaves privately; publish explicitly to update the client page.
You can also copy the examples below directly into the CSS editor.

Combine recipes selectively. Later rules win when they target the same setting;
remove a recipe's comment and rules to undo it, or Clear custom CSS to remove the
whole draft stylesheet. The 20,000-character limit applies to the combined result.
Examples use local fonts and existing gallery hooks, without external resources.
Some selectors repeat a stable class to override built-in Classic component styles
without `!important`. The lift recipe uses the existing album hover variable.

Full themes may retain their own hero panels or structural rules. Palette recipes
recolor the gallery and row backgrounds; use Immich Classic for a uniform base.
Album cover recipes affect album rows; round photo corners works on photo tiles.
Custom CSS takes precedence over corresponding visual controls. See the
[CSS interface](customization.md#add-css) for selectors, variables, and validation.

## Warm accent and serif title

A warm accent with a traditional serif page title.

```css
:scope {
  --pager-accent: #f0b67f;
}
.ip-title.ip-title {
  font-family: Georgia, serif;
}
```

## Ivory paper

Warm paper, dark text, and a muted green accent.

```css
:scope {
  --pager-background: #fbf8f0;
  --pager-foreground: #302d27;
  --pager-accent: #46665b;
  --pager-muted: #655f55;
  --pager-surface: #f1ecdf;
  --pager-surface-foreground: #302d27;
  --pager-primary-foreground: #ffffff;
}
.ip-block {
  background: var(--pager-background);
}
```

## Charcoal and sea glass

A dark gallery with bright text and a cool accent.

```css
:scope {
  --pager-background: #15191c;
  --pager-foreground: #f1f3f4;
  --pager-accent: #95cbd1;
  --pager-muted: #b8c0c6;
  --pager-surface: #222a30;
  --pager-surface-foreground: #f1f3f4;
  --pager-primary-foreground: #152024;
}
.ip-block {
  background: var(--pager-background);
}
```

## Editorial title

Use the bundled Source Serif 4 font for the page title.

```css
.ip-title.ip-title {
  font-family: 'Source Serif 4', Georgia, serif;
  font-weight: 400;
  letter-spacing: -0.025em;
  line-height: 1.12;
}
.ip-description.ip-description {
  max-width: 42ch;
  line-height: 1.7;
}
```

## Fluid title

Scale the title within readable limits as the canvas changes.

```css
.ip-title.ip-title {
  font-size: clamp(2rem, calc(1.25rem + 3vw), 4rem);
  line-height: 1.1;
  letter-spacing: -0.03em;
}
```

## Compact portfolio

Narrower content, smaller gutters, and balanced album gaps.

```css
:scope {
  --pager-content-width: 1120px;
  --pager-page-padding: 24px;
  --pager-mobile-page-padding: 16px;
  --pager-grid-row-gap: 24px;
  --pager-grid-column-gap: 24px;
}
```

## Landscape album covers

Use wide 3:2 album covers with restrained corners.

```css
:scope {
  --pager-cover-aspect-ratio: 1.5;
  --pager-card-radius: 6px;
  --pager-grid-min-width: 280px;
  --pager-grid-row-gap: 32px;
  --pager-grid-column-gap: 24px;
}
```

## Square contact sheet

Compact square album covers with crisp edges.

```css
:scope {
  --pager-cover-aspect-ratio: 1;
  --pager-card-radius: 0px;
  --pager-grid-min-width: 176px;
  --pager-grid-row-gap: 16px;
  --pager-grid-column-gap: 12px;
  --pager-card-title-size: 0.95rem;
}
```

## Rounded images

Round banner, album-cover, and photo-tile corners.

```css
:scope {
  --pager-card-radius: 12px;
}
.ip-banner {
  border-radius: 20px;
  overflow: hidden;
}
.ip-photo.ip-photo {
  border-radius: 12px;
  overflow: hidden;
}
```

## Monochrome album covers

Show grayscale covers, returning to color on hover or keyboard focus.

```css
.ip-cover img {
  filter: grayscale(1);
}
.ip-album:hover .ip-cover img,
.ip-album:focus-visible .ip-cover img {
  filter: grayscale(0);
}
```

## Gentle album lift

A small hover lift for visitors who allow motion.

```css
@media (prefers-reduced-motion: no-preference) {
  :scope {
    --pager-hover-lift: -3px;
  }
}
```

## Phone spacing

Smaller gutters and comfortable descriptions below 600px.

```css
@media (max-width: 600px) {
  :scope {
    --pager-page-padding: 16px;
    --pager-mobile-page-padding: 16px;
    --pager-grid-column-gap: 12px;
  }
  .ip-description.ip-description {
    line-height: 1.65;
  }
}
```
