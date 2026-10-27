# Photography theme collections

Choose **Design → Themes → For your photography**, then select Wedding,
Portraiture, Wildlife, or One size fits all. Each collection contains three native
Pager adaptations of existing HTML5 UP designs. Select a card to audition it; a
small prompt appears in the center of the live canvas. **Apply theme** saves the
design privately; **Cancel preview** or Escape restores the current draft. On
phones, choosing a theme closes the inspector so the preview remains visible.

| Collection        | Pager theme / portable JSON                                                 | Original design                                | Adapted composition                                                  |
| ----------------- | --------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| Wedding           | [Story Wedding](../static/assets/themes/wedding/story.json)                 | [Story](https://html5up.net/story)             | Ivory split introduction, serif headings and justified sequences     |
| Wedding           | [Stellar Wedding](../static/assets/themes/wedding/stellar.json)             | [Stellar](https://html5up.net/stellar)         | Soft lavender introduction, wide photograph and white story panels   |
| Wedding           | [Ethereal Wedding](../static/assets/themes/wedding/ethereal.json)           | [Ethereal](https://html5up.net/ethereal)       | Image-left introduction, rose/violet panels and photographic ribbons |
| Portraiture       | [Lens Portraiture](../static/assets/themes/portraiture/lens.json)           | [Lens](https://html5up.net/lens)               | White right-hand profile rail with an uninterrupted image grid       |
| Portraiture       | [Strata Portraiture](../static/assets/themes/portraiture/strata.json)       | [Strata](https://html5up.net/strata)           | Dark photographic profile rail and rounded project photographs       |
| Portraiture       | [Dimension Portraiture](../static/assets/themes/portraiture/dimension.json) | [Dimension](https://html5up.net/dimension)     | Dark framed cover, spaced uppercase type, segmented navigation       |
| Wildlife          | [Photon Wildlife](../static/assets/themes/wildlife/photon.json)             | [Photon](https://html5up.net/photon)           | Teal/blue introduction, landscape frames and field notes             |
| Wildlife          | [Highlights Wildlife](../static/assets/themes/wildlife/highlights.json)     | [Highlights](https://html5up.net/highlights)   | Image-led introduction and a narrow vertical journal                 |
| Wildlife          | [Big Picture Wildlife](../static/assets/themes/wildlife/big-picture.json)   | [Big Picture](https://html5up.net/big-picture) | Centered full-cover introduction and large photographs               |
| One size fits all | [Multiverse Portfolio](../static/assets/themes/versatile/multiverse.json)   | [Multiverse](https://html5up.net/multiverse)   | Dark image wall with compact labels and minimal gutters              |
| One size fits all | [Editorial Portfolio](../static/assets/themes/versatile/editorial.json)     | [Editorial](https://html5up.net/editorial)     | Serif information rail, coral rules and project stories              |
| One size fits all | [Parallelism Portfolio](../static/assets/themes/versatile/parallelism.json) | [Parallelism](https://html5up.net/parallelism) | Coral title panel and horizontal image ribbons                       |

These categories are Pager's suggested photography uses for otherwise general
source templates. They are working Pager adaptations, with layout, colors and
section structure fitted to the existing photo/album/text blocks. They do not run
the original template engines, navigation scripts, forms, or plugins. Ethereal
and Parallelism retain horizontal photo ribbons within a responsive vertical page;
Lens retains its right-hand rail alongside Pager's gallery and shared viewer.

## Use, save and download

Each card has **Download theme JSON** for an importable `immichpager-theme` v1
file. Import it through the existing theme importer or apply the card directly.
Use **Save current design as theme** to keep an adjusted version in your personal
library. Preview, apply, undo, row overrides, resets, exports, and explicit
publication behave like the original five Pager themes.

Cards show just the thumbnail and name. Wedding designs use bundled serif
headings, restrained spacing, and responsive banner sizes; Stellar places its
full-width photograph before navigation instead of cropping it into a small circle.

The source designs have one original color treatment each. These adaptations
preserve a single light or dark mode rather than inventing an unrelated second
palette. Original fonts are replaced by bundled Inter, Lato, or Source Serif 4;
no remote font files are needed. Some colors and photographic scrims are adjusted
for readable text and controls. The semantic text/button palettes meet 4.5:1.

Photos, words, album memberships, ordering, access policies and downloads stay on
the destination page. Template demo photographs, font files and icons are not
included. Local verification uses existing NASA fixtures, so its screenshots show
layout behavior rather than sample wedding or wildlife photography.

## Source credit and licensing

All twelve original designs are by AJ / HTML5 UP under the publisher's
[Creative Commons Attribution 3.0 terms](https://html5up.net/license). The adapted
native files retain a source comment and structured `attribution` with the original
name, author, source URL, and license. Page snapshots, library copies and portable
exports retain this data. Client pages show design attribution even when Pager's
optional branding switch is off.

Original template engines, photographs, scripts, icons and font assets are not
redistributed. Pager's renderer and application keep their existing license;
these adapted design files retain their stated CC BY 3.0 attribution terms. The
[full license](../static/assets/themes/LICENSE-CC-BY-3.0.txt) and
[source/retrieval hashes](../static/assets/themes/sources.json) ship with the files.
The manifest records the downloaded archive and main CSS hashes for each source.

## Editor feedback

The Customize header is one compact row, with a labeled **Reset all** action
beside it. Its tabs remain directly below. Theme confirmation
uses a nonmodal canvas dialog, so another design can still be tried from the
inspector. Escape/cancel restores focus; publication waits until an audition is
applied or cancelled.

Successful publication, reset and other editor feedback uses a dismissible toast
outside normal document layout. It disappears after five seconds and never pushes
the canvas down. Critical save/publication errors retain their existing persistent
feedback. Toasts use native manual popovers when supported and a fixed-position
fallback in older browsers, without changing keyboard focus or closing on outside
interaction.
