# Client-page themes

In **Design → Themes**, choose an illustrated design card to try it on the live
canvas. The apply/cancel prompt appears over the center of that canvas. **Apply theme** saves to the private draft; **Cancel preview** leaves the
draft alone. **Undo theme** restores the previous design while retaining later
content edits. Publish explicitly when the page is ready for clients.

The editor itself follows Immich's appearance. These designs affect client pages
and their canvas only. New and existing pages retain **Immich Classic** until a
theme is applied.

| Design        | Composition                                               | Starting row layouts                       |
| ------------- | --------------------------------------------------------- | ------------------------------------------ |
| Studio        | Split introduction and photograph                         | Masonry photos, album tiles                |
| Cinematic     | Full cover with a large title                             | Large photographs, album tiles             |
| Editorial     | Serif masthead and ruled sections                         | Justified photos, compact editorial albums |
| Contact Sheet | Compact introduction and numbered image index             | Square photos, album cards                 |
| Archive       | Sticky desktop information rail; top navigation on phones | Masonry photos, editorial albums           |

All five bundled designs include light and dark variants. **System** follows the
viewer's device when both variants are available. A single-variant imported theme
uses its declared mode. Built-in families adapt to desktop, tablet, and phone sizes.

Applying a theme changes presentation; Albums and Photos rows **Use theme layout**. It
preserves words, media, row order, album order/grouping, branding selections,
visibility, URL, passwords, and downloads. Changing an individual row's layout or
spacing makes it a manual override; enable **Use theme layout** to follow again.
Text rows keep their own alignment and inherit the page typography without a
separate theme-layout toggle. Individual reset buttons use the active theme's
defaults. **Reset all**
returns to Classic and the existing presentation/visibility defaults, retaining
content, branding images, and access settings.

Custom CSS remains the final override. The renderer gives theme CSS and page CSS
separate specificity tiers above bundled layout rules; standard CSS `!important`
and inline-style precedence still apply. If it obscures the theme, choose
**Preview and apply without my custom CSS** during the audition. Cancel retains
that CSS; applying with this option clears it from the private draft.

## Personal library and portable files

**Save current design as theme** captures appearance and CSS without client text,
photos, albums, IDs, or access settings. Search, preview, rename, duplicate, export,
and delete saved themes under **My themes**. Each owner has a separate library.
Applied pages contain a copied definition: renaming or deleting the saved item
cannot change any client page. To use an updated design, apply it again.

**Export current theme** produces this native envelope:

```json
{
  "format": "immichpager-theme",
  "version": 1,
  "theme": {
    "name": "My theme",
    "version": 1,
    "layout": "studio",
    "headingFont": "inter",
    "variants": { "light": {}, "dark": {} },
    "design": {},
    "rows": { "albums": "tiles", "photos": "masonry" },
    "css": ""
  }
}
```

The empty palette objects above are structural placeholders, not an importable
theme. Export a built-in theme to obtain complete validated values. The schema
is defined in [`theme-schema.ts`](../src/lib/theme-schema.ts). Native themes select
a supported Pager layout; they do not contain executable templates.

Appearance exports are now **version 4**, including the theme snapshot and current
adjustments. Versions 1–3 still import through Classic, retaining compatibility
behavior for settings those versions could not represent. Appearance and DTCG
files remain available under **Advanced appearance and token files**. DTCG imports
transfer recognized styling values, not a complete page composition.

## Adapting existing web themes

Open **Import a ready-made theme**, choose the format, then upload or paste the
source. Choose a Pager design for the composition and **Review import** before
trying or saving it.

- **shadcn / Tweakcn CSS:** recognizes palettes in `:root` and `.dark`, including
  hex, RGB, HSL, OKLCH, alpha colors, local variable aliases, fonts, and radius.
  These scopes follow the [shadcn theming format](https://ui.shadcn.com/docs/theming).
- **daisyUI v5 CSS:** reads `@plugin "daisyui/theme"` declarations or named
  `[data-theme="…"]` blocks as data. Choose a name when a file contains several
  themes and declare Light/Dark if it is absent. See the
  [daisyUI custom-theme format](https://daisyui.com/docs/themes/#how-to-add-a-new-custom-theme).

Imports map supported background, foreground, surface, primary, muted, border,
focus, and hover roles. They use bundled font equivalents or report a fallback.
The review reports ignored effects/rules and low text contrast. External CSS is
never executed; framework plugins, imports, remote fonts, and resource URLs are
not installed or fetched. Framework components and layouts are not imported.
Pager provides the selected page composition. Ghost ZIPs and Squarespace packages
are not supported.

Files are limited to **96 KiB**. Native theme CSS is limited to **20,000 characters**
and uses the same gallery-boundary compiler and resource restrictions as page CSS.
Malicious or unsupported definitions are rejected before application.

## Storage and API

SQLite schema 4 adds `themes`; existing page, draft, share, branding, and session
rows are retained. Theme definitions live in Pager's database, never Immich's.

Authenticated endpoints are owner scoped:

| Endpoint                          | Operation                                                  |
| --------------------------------- | ---------------------------------------------------------- |
| `GET /page/api/themes?q=&cursor=` | Search metadata, up to 50 items plus `nextCursor`          |
| `POST /page/api/themes`           | Create from `{ "definition": … }`                          |
| `GET /page/api/themes/:id`        | Read an owned saved definition                             |
| `PATCH /page/api/themes/:id`      | Replace using `{ "definition": …, "expectedRevision": 1 }` |
| `DELETE /page/api/themes/:id`     | Delete using `{ "expectedRevision": 1 }`                   |

Another owner's IDs return 404. Stale updates/deletes return 409. Public rendering
receives the design snapshot with private library name/description removed.
Presentation-only publication rechecks ownership without changing native shares.
See [schema upgrades](deployment.md#schema-upgrades) before upgrading to v0.5.0.

## Photography collections

Twelve licensed adaptations add three designs each for Wedding, Portraiture,
Wildlife, and One size fits all. They include downloadable native JSON and retained
source credit. See [the collection guide and source links](photography-themes.md).
Native definitions can carry optional HTTPS-only `attribution` metadata; that credit
is preserved in snapshots, library operations, portable files, and client credits
under Page info or the optional footer.
