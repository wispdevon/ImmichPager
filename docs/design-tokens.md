# Portable design tokens

Pages can import and export `.tokens.json` files alongside the complete
`immichpager-appearance.json` format. Token files use the [DTCG Design Tokens
Format 2025.10](https://www.designtokens.org/tr/2025.10/format/) and the [DTCG
Color Module 2025.10](https://www.designtokens.org/tr/2025.10/color/). Pager supports
local token aliases, local JSON Pointer `$ref` references, and `$type`
inheritance from token groups. JSON Pointer references can target whole tokens
or individual properties inside composite values, as defined in [DTCG §7.3
Property-Level References](https://www.designtokens.org/tr/2025.10/format/#property-level-references).
It does not fetch references or resolve external files.

In **Pages → Customize → Themes**, choose a `.tokens.json` file to review its
recognized and unsupported paths before applying it. Invalid recognized
values, unresolved references, circular references, or files with no applicable
Pager tokens cannot be applied. Unsupported tokens with ordinary values are
listed in the preview and ignored. Files are limited to 96 KiB.

Token import changes only the styling properties listed below. It leaves
visibility switches, custom CSS, page content, branding images, album
selection and order, password, and page URL untouched. A token absent from the
file is not changed. In particular, nullable background and foreground colors
are omitted when exported because DTCG has no null color value. Use a complete
appearance file to transfer every design choice, including visibility, CSS,
header layout, theme, and settings that have no DTCG token type.

## Pager token paths

| Path                                  | DTCG type    | Imported value                                                               |
| ------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| `pager.colors.background`             | `color`      | Six-digit opaque sRGB hex; omitted when the page uses its theme default      |
| `pager.colors.foreground`             | `color`      | Six-digit opaque sRGB hex; omitted when the page uses its theme default      |
| `pager.colors.accent`                 | `color`      | Six-digit opaque sRGB hex                                                    |
| `pager.galleryStyle.fontFamily`       | `fontFamily` | Bundled family from the [font catalog](fonts.md) or a supported system stack |
| `pager.galleryStyle.titleFontWeight`  | `fontWeight` | Title weight, 400–800                                                        |
| `pager.galleryStyle.bodyFontSize`     | `dimension`  | Body size, normalized to rem (0.75–1.5)                                      |
| `pager.galleryStyle.bodyFontWeight`   | `fontWeight` | Body weight, 300–700                                                         |
| `pager.galleryStyle.cardTitleSize`    | `dimension`  | Album title size, normalized to rem (0.75–2)                                 |
| `pager.galleryStyle.cardTitleWeight`  | `fontWeight` | Album title weight, 400–800                                                  |
| `pager.galleryStyle.contentWidth`     | `dimension`  | Content width, normalized to px (640–1920)                                   |
| `pager.galleryStyle.pagePadding`      | `dimension`  | Page padding, normalized to px (0–80)                                        |
| `pager.galleryStyle.gridMinWidth`     | `dimension`  | Minimum album width, normalized to px (160–360)                              |
| `pager.galleryStyle.gridRowGap`       | `dimension`  | Grid row gap, normalized to px (0–80)                                        |
| `pager.galleryStyle.gridColumnGap`    | `dimension`  | Grid column gap, normalized to px (0–80)                                     |
| `pager.galleryStyle.coverAspectRatio` | `number`     | Cover width divided by height (0.5–2)                                        |
| `pager.galleryStyle.cardRadius`       | `dimension`  | Album corner radius, normalized to px (0–40)                                 |
| `pager.header.titleSize`              | `dimension`  | Page title size, normalized to rem (1.5–4)                                   |
| `pager.header.descriptionSize`        | `dimension`  | Description size, normalized to rem (0.875–1.5)                              |
| `pager.header.logoSize`               | `dimension`  | Logo size, normalized to px (48–160)                                         |
| `pager.header.headerSpacing`          | `dimension`  | Header spacing, normalized to rem (1.5–5)                                    |
| `pager.header.bannerPosition`         | `number`     | Banner crop position, integer 0–100                                          |

Dimensions accept `px` or `rem`; Pager converts between them at 16 px per rem.
The result must satisfy the target field's range, and px targets must resolve to
a whole number of pixels. Font weights accept DTCG numeric values or the
standard names understood by the DTCG format, then must fit the Pager range.
Font families accept a bundled Pager family name or stable ID from the
[font catalog](fonts.md), or a system stack beginning with `system`,
`system-ui`, `ui-sans-serif`, `sans-serif`, `-apple-system`, or
`blinkmacsystemfont`. The exporter writes the catalog's canonical family name.
Unknown installed fonts such as Arial are rejected rather than substituted
silently.

Colors are stored by Pager as six-digit hex. sRGB, linear sRGB, HSL, and HWB
values can be normalized directly. Other DTCG color spaces need a valid
six-digit `hex` fallback; translucent colors and values that cannot be
normalized are rejected.

The DTCG format has no string or enum token type, so `hoverTreatment`, the
header theme/alignment/layout presets, and other choice fields do not appear in
the token path table. Use an appearance file to transfer those settings.

## Aliases and inherited types

A group `$type` applies to its descendant tokens unless a token declares its
own `$type`. Pager resolves curly-brace aliases within the same file and local
JSON Pointer `$ref` values. For example:

```json
{
  "palette": {
    "$type": "color",
    "blue": {
      "$value": {
        "colorSpace": "srgb",
        "components": [0.2, 0.4, 0.8],
        "hex": "#3366cc"
      }
    }
  },
  "pager": {
    "colors": {
      "$type": "color",
      "accent": { "$value": "{palette.blue}" }
    },
    "galleryStyle": {
      "contentWidth": {
        "$type": "dimension",
        "$value": { "value": 75, "unit": "rem" }
      }
    }
  }
}
```

Pager exports concrete values rather than aliases, so each exported token file
can be used on its own. Import does not implement DTCG group composition with
`$extends`, multi-file resolution, or external resource loading.

## Complete appearance files

Use **Import or export appearance** when the transfer should include client
visibility, CSS, gallery styling, and all header settings. Version 2 includes
the complete current appearance object. Version 1 remains importable; since it
cannot express `clientUi` or `galleryStyle`, those settings keep their current
values (or receive compatibility defaults when imported without a current
page). Both formats exclude page content, album data, URLs, passwords, and
branding images. See [customization](customization.md#move-a-design-between-pages)
for the envelope shape and import behavior.
