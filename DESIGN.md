# Immich Albums, with a client header

The Immich v3.3.3 Albums view is the visual specification: black background, square album covers with rounded corners, semibold two-line names, date ranges and item counts, generous spacing, and collapsible 30px year headings with counts and a divider. Use auto-fill tracks with a 224px minimum so phones naturally show one full-width album while wider viewports gain columns. Album links have no persistent card surface; use the native rounded surface and border only on hover or keyboard focus. Preserve this hierarchy in light mode. The schema's default `#accbfa` accent uses Immich's light primary for readable title hover/focus; non-default page accents and CSS `--pager-accent` overrides retain their authored colors, so their contrast depends on the chosen page background. Do not add marketing cards or a homepage. A functional dark gradient is permitted behind a banner-overlay header for text readability. See the [pinned Immich album grid source](https://github.com/immich-app/immich/blob/v3.3.3/web/src/lib/components/album-page/AlbumCardGroup.svelte), [card source](https://github.com/immich-app/immich/blob/v3.3.3/web/src/lib/components/album-page/AlbumCard.svelte), and [light primary token](https://github.com/immich-app/immich/blob/v3.3.3/web/src/app.css#L76).

Branding sits above the blocks: optional banner and logo, title, and description. Public pages have no editor controls. The editor uses one live canvas with Content and Design in a persistent inspector. Page settings opens sharing options in a dialog from the toolbar beside Publish. Use native Immich UI controls and Google Sans around the isolated canvas. Search and Owned/Selected filters live in the modal album picker. Header and branding controls accept uploads and Immich selections; title, description, rich text, header size, crop, and logo size can be edited on the canvas. Keep /page/ on one line in the URL field. Device widths, Copy link, Page settings, and explicit Publish/Update remain in the toolbar; there is no separate Preview action. Working edits autosave privately with visible saving/failure states. Public content changes only on explicit publication. The page list uses a compact toolbar, search, visible copy actions, and responsive rows.

Use Immich UI for the password input and accessible controls. Reproduce the album presentation with typed components, retaining upstream attribution. Reserve cover geometry before images load and lazy-load below-the-fold covers. Respect reduced motion.

The Header layout choice places the whole logo/title/description over the banner, preserving alignment and responsive readability. Custom CSS lives in its own lazy-loaded CodeMirror tab, with compiler validation, a character count, examples, and Clear CSS. It styles only the gallery preview/public view; the editor stays native. Individual element switches preserve hidden content. New pages start with browsing controls off, while existing records keep their visible controls. Album cards always retain covers or visible names and keep accessible names. Themes offers complete Pager appearance files and styling-only DTCG token files with a preview of recognized and unsupported tokens before applying them.

The Page settings dialog groups Page status, Client link, Access, and collapsed Page management. Album membership and ordering live in each Content block. Show the published absolute URL independently from pending URL edits. Use compact Material Design sharing icons, a locally generated QR dialog, transient password actions, and conditional current-password entry in publication review. The scrollable content and compact footer must remain reachable in the phone dialog.

## Live block composition

The finished page is the editing surface. Use native Immich controls around an
isolated canvas; preserve the existing album presentation within Albums rows.
Content lists repeatable Albums, Photos, and Text rows with stable selection,
drag/keyboard ordering, duplication, and removal. Insertion controls and selection
handles are editor-only. Inline rich text uses a small formatting toolbar.

Albums expand into a photo grid without navigating away. Use one shared dark
modal viewer for all photo sources. Fade its backdrop over 250 ms and fade/scale
images over 300 ms from 0.985. Keep slideshow opt-in, support Pause and reduced
motion, contain keyboard focus, and restore the originating thumbnail on close.
The browser Back button closes the viewer. Photos and ZIPs obey publication,
password, ownership, source membership, and download permissions.

The inspector collapses on phones. Local edits update the canvas immediately;
autosave acknowledgment never reloads it or replaces active typing. Unsaved
canvas edits survive delayed acknowledgment and save failure. Public pages never
render insertion handles, settings, or text-formatting controls.

Editorial album rows use compact landscape covers alongside the Immich album
description and metadata. They share the page gutter and never expand the cover
to half the entire desktop canvas. Editor labels sit above headings without
covering editable content. Inspector controls must shrink inside narrow columns,
including their focus rings. Use the bundled Material SVG icons throughout the
inspector, canvas, and viewer; do not substitute font-dependent symbol glyphs.

Album reordering keeps DOM order stable during dragging, shows an insertion
marker, scrolls to distant targets, and commits once on release. Checkboxes allow
a selection to move together in its existing order. Escape, lost capture, or an
outside drop cancels. Year grouping keeps dates intact; No grouping allows free
ordering across years. Keep the arrow-key and move-button alternatives.

Album styles use illustrated radio cards. Album-order rows show an 80px album-cover drag handle, with a fallback for missing covers, readable names, and a single actions menu; selection mode exposes checkboxes for group moves. Changed presentation settings have adjacent reset controls with stable reserved space. Reset all customization restores design, visibility, CSS, and row presentation defaults while retaining authored content, selected media, branding images, and access settings. Resets autosave privately and never publish.

## Complete client designs

Immich Classic remains the compatibility baseline described above. Five opt-in
client designs provide structural composition: Studio splits introduction and image;
Cinematic uses an immersive cover; Editorial uses a serif masthead and ruled
sections; Contact Sheet provides a compact numbered index; Archive keeps a sticky
information rail on desktop and moves it above content on phones. Each has paired
light/dark variants, bundled typography, and responsive row defaults. Management
controls retain Immich styling.

Theme cards audition on the existing canvas without saving; Apply adopts row
presentation and saves privately. Cancel restores the working canvas; Undo changes
design only. Content order, media, visibility, and access survive theme application.
Manual row changes override theme defaults. Preserve authored CSS as the final
layer unless explicitly cleared. Personal library definitions are copied into page
snapshots; importing external CSS extracts supported tokens into a Pager design.
See [themes](docs/themes.md) for behavior and portable formats.

The photographer collections adapt twelve credited HTML5 UP designs, three per
speciality, as portable native theme definitions. Keep original source attribution
through library operations and client rendering; do not bundle demo photos or
external template engines. The existing shared viewer and access model apply.

Theme audition uses a small nonmodal dialog centered within the live canvas,
with Apply/Cancel, keyboard dismissal, and focus restoration. On phones the
inspector closes to reveal it. Keep the customization heading to one compact row
with an accessible reset icon. Success messages are dismissible five-second toasts
that overlay the editor rather than pushing the canvas down; errors remain visible.
