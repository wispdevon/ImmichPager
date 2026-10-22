# Bundled font catalog

Page galleries keep Google Sans as their default and can use the browser's
system stack or one of six additional bundled families. The catalog is exported
from `src/lib/font-catalog.ts` as `FONT_CATALOG`; each entry provides the
stable settings ID, display name, CSS stack, and DTCG `fontFamily` value. The
same catalog drives validation, gallery CSS, token imports, and the Customize
font picker.

| ID               | Name           | DTCG value       | CSS stack                     | Weights                   |
| ---------------- | -------------- | ---------------- | ----------------------------- | ------------------------- |
| `google-sans`    | Google Sans    | `Google Sans`    | `"GoogleSans", sans-serif`    | 410–900                   |
| `system`         | System         | `system-ui`      | `system-ui, sans-serif`       | Installed stack           |
| `inter`          | Inter          | `Inter`          | `"Inter", sans-serif`         | Variable 100–900          |
| `nunito-sans`    | Nunito Sans    | `Nunito Sans`    | `"Nunito Sans", sans-serif`   | Variable 200–1000         |
| `lato`           | Lato           | `Lato`           | `"Lato", sans-serif`          | Bundled 300, 400, and 700 |
| `source-serif-4` | Source Serif 4 | `Source Serif 4` | `"Source Serif 4", serif`     | Variable 200–900          |
| `merriweather`   | Merriweather   | `Merriweather`   | `"Merriweather", serif`       | Variable 300–900          |
| `jetbrains-mono` | JetBrains Mono | `JetBrains Mono` | `"JetBrains Mono", monospace` | Variable 100–800          |

The six new families are served as local WOFF2 assets from
`/page/assets/fonts/bundled/`.
Latin and Latin Extended subsets are included. Lato currently has static faces
at weights 300, 400, and 700; browsers use their standard font-weight matching
for the intermediate gallery weights. Other bundled families provide variable
weight axes. Google Sans is the existing Immich-supplied asset.

The WOFF2 files were downloaded from the [official Google Fonts CSS API](https://developers.google.com/fonts/docs/css2)
and then stored locally. The client never requests font files or stylesheets
from Google or another external host. The font CSS uses
`/page/assets/fonts/bundled/` URLs and loads the chosen local face on demand.

Each additional font is licensed under the SIL Open Font License 1.1. Its
complete license text and copyright notice are kept beside the files under
`static/assets/fonts/bundled/licenses/` and are included here for redistribution:

| Family         | Official Google Fonts source                                          | Local license                                                             |
| -------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Inter          | [Source](https://github.com/google/fonts/tree/main/ofl/inter)         | [OFL 1.1](../static/assets/fonts/bundled/licenses/inter-OFL.txt)          |
| Nunito Sans    | [Source](https://github.com/google/fonts/tree/main/ofl/nunitosans)    | [OFL 1.1](../static/assets/fonts/bundled/licenses/nunito-sans-OFL.txt)    |
| Lato           | [Source](https://github.com/google/fonts/tree/main/ofl/lato)          | [OFL 1.1](../static/assets/fonts/bundled/licenses/lato-OFL.txt)           |
| Source Serif 4 | [Source](https://github.com/google/fonts/tree/main/ofl/sourceserif4)  | [OFL 1.1](../static/assets/fonts/bundled/licenses/source-serif-4-OFL.txt) |
| Merriweather   | [Source](https://github.com/google/fonts/tree/main/ofl/merriweather)  | [OFL 1.1](../static/assets/fonts/bundled/licenses/merriweather-OFL.txt)   |
| JetBrains Mono | [Source](https://github.com/google/fonts/tree/main/ofl/jetbrainsmono) | [OFL 1.1](../static/assets/fonts/bundled/licenses/jetbrains-mono-OFL.txt) |

Portable DTCG token files use the catalog's exact family names shown above.
Pager also accepts the stable IDs for local round trips and known generic
system font stacks. Unknown font names are rejected instead of being silently
mapped to another family. See the [token paths and import rules](design-tokens.md#pager-token-paths).
