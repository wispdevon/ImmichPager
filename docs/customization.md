# Customize a client gallery

Open **Pages → your page → Design**. All client appearance settings belong to this page. The persistent canvas shows working edits immediately, with desktop, tablet, and phone widths. Changes autosave as a private draft; choose **Publish page** or **Update live page** to show them to clients. Your existing client URL stays the same.

The live composer is available in v0.4.0. Deployments change only when their operator upgrades.

## Check what clients see

After publishing, choose **Open published page** in the editor to open the actual published URL in a new tab. It shows the published version while your working edits remain private. The editor explains whether the published version has a password, independently of any pending password changes in Options. A previously unlocked browser may skip the page prompt; use a private window to check a first visit. Pager checks the page password for the on-page photo viewer and downloads. Retained direct native links still follow Immich’s own password flow. The private canvas shows draft changes.

## Add content rows

In **Content**, add Photos, Albums, or Text rows. Select a row to set its heading,
layout, and spacing. Drag rows or use their move buttons/arrow keys to reorder;
Duplicate row and Delete row operate on the selected row. Editorial albums use
compact covers and show each album’s description from Immich. Albums can appear in
multiple rows while sharing one native album link. Photo rows create a native
individual share for exactly the selected images. Empty rows stay private.

Select album checkboxes to move several together, then drag a grip to the
insertion line. The list scrolls near its edges. Reordering saves on release;
Escape or a drop outside the list cancels. With year grouping, selections stay
inside their year; choose No grouping for free ordering across years. Arrow keys
on the grip and the adjacent move buttons remain available.

Write text directly on the canvas with headings, bold, italic, links, and lists.
Albums expand on the same page; photos open the common viewer. Use its arrow
buttons, keyboard arrows, or swipe to navigate. Escape or Back closes it. Slideshow
is opt-in. Originals and ZIP downloads are available when Page settings allows downloads.

## Colors and accent

Choose Dark, Light, or System under **Design → Design → Colors**. Use the color controls to override background, text, and accent colors. The default accent is Immich blue (`#accbfa`). In Immich Classic, accent changes **album-title text on hover**; it does not recolor the page title, banner, management buttons, or native Immich album viewer. CSS can use the same accent for other gallery elements.

## Move a design between pages

In **Design → Themes → Advanced appearance and token files**, export the current design as
`immichpager-appearance.json` or choose a file to import. New exports use
appearance-file version 4. They include the complete theme snapshot, custom colors, header
settings including banner height, custom CSS, every visibility switch, and all gallery-style settings.
They do not contain the page title or description, URL, album names or
identifiers, album order, passwords, share links, or logo and banner images.
Choose content and branding separately on each page.

Version 1–3 files are still supported through Immich Classic; settings they cannot express are preserved. Importing one updates the appearance
fields it can express and preserves the current visibility and gallery-style
settings. If there are no current settings, compatibility defaults keep the
existing gallery appearance. Older version 1 files that omit the five size
settings import with these defaults: Standard, 80 px, 3 rem, 1.125 rem, and
2.5 rem.

Import applies only the visual settings to the current page's private draft.
The page's content, URL, albums, password, and branding images remain unchanged,
and clients see the design only after you publish. Files are limited to 96 KiB
and must use the supported version 1, 2, 3, or 4 format. Unknown fields and
invalid settings are rejected. Custom CSS goes through the same gallery
compiler used by preview and publication, so imports cannot add external
resources or styles outside the gallery.

This version 1 example remains importable:

```json
{
  "format": "immichpager-appearance",
  "version": 1,
  "appearance": {
    "theme": "dark",
    "background": null,
    "foreground": null,
    "accent": "#accbfa",
    "alignment": "left",
    "bannerPosition": 50,
    "headerLayout": "below",
    "headerSize": "standard",
    "logoSize": 80,
    "titleSize": 3,
    "descriptionSize": 1.125,
    "headerSpacing": 2.5,
    "customCss": ""
  }
}
```

Version 2 uses the same envelope and appearance fields, with complete
`clientUi` and `galleryStyle` objects added. For example, the two new objects
are shaped like this:

```json
{
  "clientUi": {
    "showBanner": true,
    "showLogo": true,
    "showTitle": true,
    "showDescription": true,
    "showBrowsingControls": false,
    "showAlbumSearch": true,
    "showMonthFilter": true,
    "showYearNavigation": true,
    "showResultsCount": true,
    "showAlbums": true,
    "showAlbumCovers": true,
    "showAlbumTitles": true,
    "showAlbumDates": true,
    "showAlbumItemCounts": true,
    "showSharedLabels": true,
    "showYearHeadings": true,
    "showYearCounts": true,
    "allowYearCollapse": true,
    "showBranding": true
  },
  "galleryStyle": {
    "fontFamily": "google-sans",
    "titleFontWeight": 650,
    "bodyFontSize": 1,
    "bodyFontWeight": 400,
    "cardTitleSize": 1.125,
    "cardTitleWeight": 600,
    "contentWidth": 1600,
    "pagePadding": 40,
    "gridMinWidth": 224,
    "gridRowGap": 16,
    "gridColumnGap": 0,
    "coverAspectRatio": 1,
    "cardRadius": 16,
    "logoShape": "rounded",
    "logoPosition": "above",
    "hoverTreatment": "surface"
  }
}
```

Use the separate [DTCG token file format](design-tokens.md) to share colors and
gallery styling without visibility settings or custom CSS.

## Edit directly on the canvas

Click the title or description on the private canvas to edit it. Empty visible
text has an Add a title or Add a description placeholder. Enter finishes title
editing; Ctrl+Enter finishes description editing; Escape returns to the text
button. Text autosaves to the draft, including while you type. A save failure
keeps your edits and offers Retry save. The canvas stays mounted through saved
updates so your caret stays in place.

On phones, close the inspector to edit the canvas and open it again to reach
Content or Design. Open **Page settings** beside Publish for sharing options. Hidden title and description fields remain editable
in Content → Header and branding. Public galleries and the standalone read-only
owner view do not expose editing controls.

Design opens with the current theme and five expandable groups: **Header &
banner**, **Logo**, **Typography**, **Colors**, and **Gallery layout**. Each group
shows its current value; expand the area you want to change. Fonts and title,
description, body, and album-title sizing are together in Typography. Header
composition, spacing, banner height, and crop are together in Header & banner.
**Change theme** opens the theme picker. Opening groups does not save a change;
groups keep their open state while switching customization tabs. Preset cards
show which layout matches the header; fine-tuning can leave no preset selected.

## Compose the header over a banner

Add a banner using **Choose from Immich**, an upload, or a file drop. In **Design → Design → Header & banner**, change **Header layout** from **Below banner** to **Over banner**. Your logo, title, and description move together onto the image. Header alignment controls left or centered composition. Banner crop position controls the image's vertical focal point.

Overlay mode uses white text and a dark gradient to keep the header readable. The banner grows to fit longer text on narrow screens. If you remove the banner, the header returns to the normal layout; the saved overlay choice takes effect when you add a banner again. Existing pages default to Below banner.

![Header composed over a banner, with custom title typography](screenshots/banner-overlay.png)

## Set header size

In **Design → Design → Header & banner**, choose **Compact**, **Standard**, or **Tall** for the banner composition. Standard keeps the existing responsive banner height. Compact and Tall give you shorter or deeper compositions in both Below banner and Over banner layouts. Open **Logo** for its shape, position, and size. Use the logo-size slider to choose a size from 48–160 px; existing and new pages default to 80 px.

Choose a logo shape of square, rounded, or circle, and place it above or to the
left of the title and description. Existing and new pages default to rounded
corners and the logo above the text. The left layout stacks above the text on
small screens unless custom CSS changes `--pager-mobile-logo-layout`.

Changes autosave to the private draft, appear on the canvas, and only update your client page after you publish. Existing pages receive these defaults without a database migration.

## Set typography and spacing

In **Design → Design → Typography**, set title size (1.5–4 rem) and description size (0.875–1.5 rem). Header spacing (1.5–5 rem) is in **Header & banner**. The title scales with page width while preserving the selected size at phone widths, and spacing adjusts on narrow screens. Google Sans remains the default font. Existing and new pages start with a 3 rem title, 1.125 rem description, and 2.5 rem header spacing.

Changes autosave to the private draft and appear on the canvas. Your client page changes only after you publish. Existing pages receive defaults without a database migration.

## Choose what clients can see

Open **Design → Elements** for five expandable groups: Header, Browsing, Albums,
Years, and Footer. Group headings show the current visibility; switches have
matching Material icons. Control the banner, logo, title, description, browsing
tools, album details, year headings, and footer separately.
Turning off an element only hides it from the client page; its text, images, and
settings remain in the draft. New pages start with browsing tools off. Existing
pages receive visibility defaults that preserve their current appearance.

The album section must keep either its cover or its visible title. Album links
keep an accessible name when the title is hidden. Hiding year headings keeps
album order and year navigation. Turning off year collapsibility leaves groups
expanded. The entire footer is hidden by default. Enable **Footer → Show footer**
to display it, then optionally include ImmichPager branding. When the footer is
hidden, **Page info** opens source/license links and theme attribution in a
compact dialog. Escape or its close button returns focus to Page info. Existing
settings without an explicit footer choice also default to hidden. Changes to
the switch save privately and take effect on the client page when published.

## Adjust the gallery layout

Open **Design → Design → Typography** to choose the gallery font. Google Sans remains the
default; six additional open-license families are bundled locally, and System
uses installed fonts. See the [font catalog and licenses](fonts.md). **Gallery
layout** groups content width, page padding, grid density, row and column spacing,
cover aspect ratio, corner radius, and hover treatment. The initial layout
keeps Immich's 1600 px content width, 224 px minimum album track, square covers,
16 px card corners, and subtle hover surface.

Gallery layout sliders have matching Material Design icons beside their text
labels. Icons supplement the labels; controls keep their keyboard behavior and
adjacent individual resets.

The settings are page-specific and stay private until publication. Existing
header presets continue to update header composition and sizing while keeping
these gallery settings unchanged.

## Restore defaults

**Reset all** at the top of Design restores the new-page design,
visibility, CSS, and row layout defaults. It keeps your title, description, text,
row headings, selected photos and albums, branding images, page URL, password,
and download permissions. The restore icon beside a changed setting resets
that value. These changes autosave privately; publish to apply them to the live page.

Choose album and photo styles from illustrated cards in Content. Each album row shows its existing Immich cover as the drag handle. Missing covers
use a placeholder. Album rows have an actions menu for moving or removing an album. Choose **Select to reorder** to show
checkboxes, then drag a grip to move the selected albums together within their group.

The inspector and canvas show the same album order. Choosing **Manual** keeps the
currently displayed sequence. The first drag, arrow-key move, or menu move from
**Newest first** also starts from that sequence and switches to Manual. Cancelled
drags, drops outside the list, and moves that leave the order unchanged do not
save a change. Grouping by year restricts moves to the same year; choose **No
grouping** to arrange freely across years.

Albums and Photos rows can **Use theme layout**. Editing a layout setting
customizes the row; checking the box again restores the theme's layout defaults.
Text rows expose their alignment directly. Each photo has an actions menu for
moving or removing it; expand its chevron to edit its caption and alternative
text. These actions remain available while metadata is collapsed. Touch input
uses larger reset and row-action targets.

## Apply a header preset

Choose **Classic**, **Centered**, or **Editorial** in **Design → Design → Header & banner** to start with a complete header composition. Each preset sets only layout, alignment, banner size, logo size, title size, description size, and header spacing for the current page. It keeps your title and description text, theme and colors, banner crop, CSS, logo and banner images, albums and their order, password, and page URL. Presets are private draft edits until you publish; Google Sans remains the default font.

## Add CSS

Open **Design → CSS** to enter ordinary CSS and see it on the canvas. CSS is limited to 20,000 characters. **Clear custom CSS** removes the draft stylesheet; publish that change to reset the live gallery too.

CSS is parsed and limited to this gallery. Selectors cannot change the management UI, preview toolbar, other pages, or native Immich album views. Positioned content is clipped to the gallery boundary, so fixed elements behave relative to the gallery rather than the browser viewport. There is no JavaScript or HTML editor.

Errors include a source location where available. Invalid CSS remains saved in your private draft, but the **entire custom stylesheet is omitted** from preview and publication is blocked until you fix or clear it. The current live page keeps its last published settings. Variables are resolved by the browser; undefined variables or unsupported browser features can still cause individual declarations to be ignored.

Use ordinary rules and selector lists, plus `@media`, `@supports`, and `@container`. Write separate rules instead of nested selectors. External resources are blocked: no `@import`, `@font-face`, `url()`, `image-set()`, `attr()`, or other resource/attribute functions. This also blocks same-origin resource URLs. Other at-rules, including keyframes, are not supported. Existing Immich-selected branding and album covers remain available through the normal controls. Use bundled/system fonts and CSS gradients rather than downloading resources.

Gallery style defaults are scoped through zero-specificity `:where()` rules.
Set a documented variable on `:scope` to override it without `!important`.
Direct property overrides still follow normal selector specificity. Start with
the stable hooks below rather than Svelte's generated classes.

### Stable selectors

Selectors are relative to the gallery. Use `:scope` for the gallery root, **not** `html`, `body`, or `:root`.

| Selector                        | Element                           |
| ------------------------------- | --------------------------------- |
| `:scope` / `.ip-gallery`        | Gallery root and theme variables  |
| `.ip-hero`                      | Banner/header composition         |
| `.ip-banner` / `.ip-banner img` | Banner area / image               |
| `.ip-header`                    | Logo, title and description       |
| `.ip-logo`                      | Logo image                        |
| `.ip-title`                     | Page title                        |
| `.ip-description`               | Page description                  |
| `.ip-albums`                    | Albums section                    |
| `.ip-year-group`                | Year group                        |
| `.ip-year-heading`              | Year heading or collapse control  |
| `.ip-album-grid`                | Grid within a year                |
| `.ip-album`                     | Album link/card                   |
| `.ip-cover` / `.ip-cover img`   | Cover area / image                |
| `.ip-album-info`                | Album title, dates and item count |
| `.ip-footer`                    | Project/source attribution        |

The documented hooks and variables are the customization interface. Other classes and generated scope attributes are implementation details.

### Theme variables

Set these on `:scope`. When omitted, the corresponding Design setting or
selected theme remains in use.

| Variable             | Effect                                                               |
| -------------------- | -------------------------------------------------------------------- |
| `--pager-accent`     | Album-title hover color; can be reused elsewhere                     |
| `--pager-background` | Gallery background                                                   |
| `--pager-foreground` | Gallery text; overlay header uses white unless explicitly overridden |

```css
:scope {
  --pager-accent: #f0b67f;
  --pager-background: #14120f;
  --pager-foreground: #faf5ec;
}

.ip-year-heading {
  color: var(--pager-accent);
}
```

### Layout and typography variables

All visual settings map to these variables. Lengths use `px` or `rem` as shown;
cover aspect ratio is width divided by height. Derived spacing and banner
variables keep the current responsive layout as the defaults change.

Legacy header properties (`--logo-size`, `--title-min-size`,
`--title-fluid-size`, `--title-max-size`, `--description-size`,
`--header-spacing`, and `--mobile-header-spacing`) remain exposed as computed
aliases for compatibility. The gallery renders from the corresponding
`--pager-*` properties; use those when authoring custom styles. The former
theme properties `--custom-bg`, `--custom-fg`, `--accent`, and
`--gallery-hover-accent` also remain available when their settings apply.

| Variable                                | Setting and default                                            |
| --------------------------------------- | -------------------------------------------------------------- |
| `--pager-font-family`                   | Font family; `"GoogleSans", sans-serif`                        |
| `--pager-title-size`                    | Maximum page title size; `3rem`                                |
| `--pager-title-min-size`                | Minimum responsive page title size; `1.875rem`                 |
| `--pager-title-fluid-size`              | Fluid page title size; `3.4vw`                                 |
| `--pager-title-font-weight`             | Page title weight; `650`                                       |
| `--pager-description-size`              | Description size; `1.125rem`                                   |
| `--pager-body-font-size`                | Gallery body size; `1rem`                                      |
| `--pager-body-font-weight`              | Gallery body weight; `400`                                     |
| `--pager-control-font-size`             | Desktop browsing control size; `0.875rem`                      |
| `--pager-card-title-size`               | Album title size; `1.125rem`                                   |
| `--pager-card-title-weight`             | Album title weight; `600`                                      |
| `--pager-card-meta-size`                | Album date and metadata size; `0.875rem`                       |
| `--pager-content-width`                 | Header and album content width; `1600px`                       |
| `--pager-page-padding`                  | Header/footer horizontal padding; `40px`                       |
| `--pager-gallery-inline-padding`        | Album section horizontal padding; `16px`                       |
| `--pager-mobile-page-padding`           | Mobile header padding; `20px`                                  |
| `--pager-mobile-gallery-inline-padding` | Mobile album section padding; `8px`                            |
| `--pager-grid-min-width`                | Minimum album grid track; `224px`                              |
| `--pager-grid-row-gap`                  | Album row gap; `16px`                                          |
| `--pager-grid-column-gap`               | Album column gap; `0px`                                        |
| `--pager-cover-aspect-ratio`            | Cover width/height ratio; `1`                                  |
| `--pager-card-radius`                   | Album card and cover radius; `16px`                            |
| `--pager-hover-surface-opacity`         | Hover surface opacity; `5%`                                    |
| `--pager-hover-border-opacity`          | Hover border opacity; `12%`                                    |
| `--pager-hover-lift`                    | Hover vertical movement; `0px`                                 |
| `--pager-hover-text-decoration`         | Hover title decoration; `none`                                 |
| `--pager-hover-title-color`             | Hover title color; `var(--pager-accent)`                       |
| `--pager-header-alignment`              | Header alignment; `left`                                       |
| `--pager-banner-position`               | Banner focal point; `50%`                                      |
| `--pager-banner-height`                 | Responsive banner height for the selected preset               |
| `--pager-overlay-height`                | Responsive overlay header height for the selected preset       |
| `--pager-hero-display`                  | Header composition; `block` or `grid`                          |
| `--pager-hero-min-height`               | Hero height; `auto` below a banner or overlay height           |
| `--pager-hero-margin-block-end`         | Space below an overlaid header; `32px`                         |
| `--pager-banner-placement`              | Banner composition; `static` below or `absolute` behind header |
| `--pager-overlay-decoration-display`    | Whether the overlay gradient is shown; `block` or `none`       |
| `--pager-header-align-self`             | Header position in overlay; `end` or `auto`                    |
| `--pager-overlay-header-color`          | Overlay title and description color                            |
| `--pager-logo-size`                     | Logo width and height; `80px`                                  |
| `--pager-logo-radius`                   | Logo corner radius; `16px`                                     |
| `--pager-logo-layout`                   | Logo and copy direction; `column` above or `row` beside        |
| `--pager-logo-gap`                      | Space between logo and copy; `20px`                            |
| `--pager-logo-justify`                  | Left-layout group alignment; `flex-start` or `center`          |
| `--pager-mobile-logo-layout`            | Logo layout below 600px; `column`                              |
| `--pager-header-spacing`                | Desktop header spacing; `2.5rem`                               |
| `--pager-mobile-header-spacing`         | Mobile header spacing; `2rem`                                  |
| `--pager-mobile-control-font-size`      | Mobile browsing control text size; `13px`                      |
| `--pager-mobile-footer-inline-padding`  | Mobile footer horizontal padding; `24px`                       |
| `--pager-color-scheme`                  | Native control theme; `dark`, `light`, or `light dark`         |

The logo shape setting maps to `--pager-logo-radius`: `square` uses `0px`,
`rounded` uses `16px`, and `circle` uses `50%`. The `left` logo position uses a
row on larger screens and stacks above the header copy below 600px by default.
Set `--pager-mobile-logo-layout: row` to keep the side-by-side layout on small
screens.

For example, this changes the page without `!important`:

```css
:scope {
  --pager-font-family: Georgia, serif;
  --pager-content-width: 1200px;
  --pager-card-radius: 8px;
  --pager-cover-aspect-ratio: 1.5;
  --pager-grid-column-gap: 24px;
}
```

### Title typography

Use any bundled gallery family or an installed system font without external
font requests. The gallery uses Google Sans by default; see the
[font catalog](fonts.md) for local family options and licenses.

```css
.ip-title {
  letter-spacing: -0.03em;
}
```

### Cover corners and grid spacing

```css
:scope {
  --pager-card-radius: 6px;
  --pager-grid-column-gap: 32px;
  --pager-grid-row-gap: 56px;
}
```

### Mobile adjustments

```css
@media (max-width: 600px) {
  .ip-title {
    letter-spacing: -0.02em;
  }
}
```

## Contributor implementation notes

`headerLayout`, `headerSize`, `logoSize`, `titleSize`, `descriptionSize`, `headerSpacing`, and `customCss` (raw CSS text) are additive settings on working drafts, published records, and gallery DTOs. Missing fields in older stored JSON receive defaults on read; the block-content migration uses SQLite schema version 3. Draft writes preserve invalid CSS text so an unfinished edit is recoverable. Publication validates the stylesheet before changing any live data or native shares.

The shared compiler uses CSS Tree to parse, validate supported constructs, and add a page-specific guard to each selector's target, including selectors with pseudo-elements. `:scope` maps to the gallery root. A separate, untargetable layout/paint containment wrapper isolates positioned descendants. The renderer only serializes compiled CSS and escapes `<` as a CSS escape before placing it in a style element; raw author text is never inserted as HTML. Existing CSP directives remain unchanged. Browser tests cover style-closing strings, selector escape attempts, containment, private drafts, publication and resetting.

When adding hooks or new CSS syntax support, extend the validation and browser scenarios first. Avoid making generated Svelte classes part of the public interface. See [API contracts](api.md) and [architecture](architecture.md).

## Complete client themes

For structural layouts, the personal theme library, native theme JSON, and
shadcn/Tweakcn or daisyUI CSS imports, see [the theme guide](themes.md). Theme
application follows the private-draft/publication boundary. Its semantic palette
also styles client navigation, browsing controls, and photo-download buttons.
Management controls retain native Immich styling.
