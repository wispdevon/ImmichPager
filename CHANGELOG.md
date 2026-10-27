# Changelog

## [0.5.0] - 2026-10-27

### Added

- Five complete page designs and 12 licensed photography themes for weddings, portraiture, wildlife, and general portfolios, with preview/apply/cancel and undo on the live canvas.
- An owner-scoped personal theme library with search, rename, duplication, export, and portable Pager theme import. Ready-made shadcn/Tweakcn and daisyUI palettes can be reviewed and adapted without executing external CSS.
- Theme-aware Albums and Photos layouts, individual overrides and resets, and version 4 appearance files retaining the applied theme snapshot. Versions 1–3 still import.
- Twelve inspectable CSS recipes that append to existing styles, preserve private drafts, and cover palettes, typography, layouts, images, motion, and phone spacing.

### Improved

- Design and Elements controls use focused disclosure groups, concise summaries, matching Material icons, and accessible reset controls. Content rows group presentation settings and illustrated layouts.
- Album moves start from the displayed order, support group dragging, preserve stable lists during a drag, and cancel stale or out-of-bounds drops.
- Wedding compositions, row margins, photo actions, touch targets, keyboard focus, and compact theme cards are refined.
- The full footer defaults off. Source and required theme credits remain available from Page info, or directly in an enabled footer.

### Upgrade notes

- Pager migrates schema 3 to 4 by adding saved-theme storage; existing pages, drafts, branding, native shares, passwords, and sessions are retained. Applied themes are copied snapshots, so changing a library item cannot alter client pages.
- Before upgrading, stop Pager and back up its complete volume, including SQLite WAL/SHM files, configuration, and previous image. Rollback to a schema-3 image requires restoring that backup first.
- New and existing pages retain Immich Classic until a theme is applied. Design edits and resets stay private until explicit publication. Immich itself is not upgraded.

## [0.4.0] - 2026-10-24

### Added

- One live page composer with repeatable Albums, Photos, and rich Text rows; desktop, tablet, and phone controls resize the same canvas.
- Albums open into photos on the page. The shared viewer supports keyboard and swipe navigation, captions, fullscreen, an optional slideshow, and permitted original/ZIP downloads.
- Illustrated album and photo layout choices, direct header sizing and crop controls, and individual or full presentation resets that keep authored content and sharing settings.
- Album ordering uses prominent cover previews, multi-select group dragging, auto-scroll, cancellation, and keyboard alternatives.

### Improved

- Draft changes appear immediately and autosave privately without replacing active text or its caret. Publishing remains explicit.
- Editorial albums use compact covers and Immich descriptions. Page settings remains beside Publish for sharing, passwords, downloads, and QR exports.
- Photo rows publish dedicated exact-selection native shares with durable interrupted-operation recovery and independent media authorization.

### Security

- Updated Zod to patched 4.6.6 while preserving separate draft and publication validation boundaries.

### Upgrade notes

- Pager migrates to schema version 3. Existing album pages, branding, dedicated shares, passwords, and sessions are retained.
- Before upgrading, stop Pager and back up its complete data volume, including SQLite WAL/SHM files, plus its configuration and previous image. Rolling back to a schema-2 version requires restoring that complete backup before starting the older image.
- This release does not upgrade Immich. Keep the existing upstream and reverse-proxy chain.

## [0.3.3] - 2026-10-23

### Added

- Immich About now includes the installed ImmichPager version and its GitLab release link.
- Administrators receive dismissible notifications for newer stable releases, including patches. Checks run server-side and can be disabled for offline installations.

### Improved

- CI runs isolated browser shards and Docker smoke checks concurrently, reuses the production build, and uses a pinned browser toolchain image. All existing quality gates remain required.

### Upgrade notes

- No database migration. Set `PAGER_UPDATE_CHECK_ENABLED=false` to disable public GitLab release checks.

## [0.3.2] - 2026-10-23

### Added

- Page settings groups status, the live client link, access, album ordering, and page management in a wider desktop dialog and full-screen phone sheet.
- Local QR generation with 1024-pixel PNG and scalable SVG downloads. Codes always contain the current published URL, including while a different URL is drafted.
- Allow downloads controls Immich's download feature on every dedicated page album share after publication. Existing pages and new designs default to enabled.

### Improved

- Password Set, Change, and Remove actions stay transient. Publication review explains access changes and requests the current password only when protected album links require synchronization; failed reviews remain open.
- Live and pending URLs are shown separately. URL edits explain when the old link stops working, without an early browser confirmation.
- Settings shows saving failures and pending password actions, disables unchanged publications, and keeps its footer reachable on phones. Destructive actions use Immich confirmation dialogs.

### Upgrade notes

- Storage remains schema version 2. Download permissions use additive JSON defaults and remain private until published; appearance files and design tokens do not transfer access policy.
- Download restrictions cannot prevent screenshots or saving displayed images. QR codes never contain passwords or session credentials.

## [0.3.1.1] - 2026-10-23

### Fixed

- Title and description stay centered in the editor and Customize preview. Edit indicators sit outside the text flow, including on hover and keyboard focus, without changing text wrapping.

## [0.3.1] - 2026-10-23

### Added

- Locally bundled open-license Inter, Nunito Sans, Lato, Source Serif 4, Merriweather, and JetBrains Mono fonts, including appearance and design-token transfer.
- Square, rounded, and circular logos with placement above or beside the title; narrow screens stack the header for readability.
- Visual Classic, Centered, and Editorial header preset cards with keyboard selection and selected-state feedback.
- Direct title and description editing in the private Customize preview, with hidden text editable in Design.

### Improved

- Page-list actions use Immich Material Design icons; Duplicate design is a compact icon button with a hover and keyboard-focus tooltip.
- Design presents everyday controls first, with fine header, typography, and gallery layout settings in a final Advanced design section.
- Loading the Pages iframe after history navigation no longer steals focus from a sidebar control the user has selected.
- Preview updates preserve the editing caret through acknowledged saves, and failed saves retain unfinished text.
- Importing a partial token file preserves styling values that the file does not specify.

### Upgrade notes

- Existing logo shape and position retain their previous appearance. Storage remains schema version 2, with additive JSON defaults.
- Fonts load from Pager assets without external font requests. Google Sans remains the default.
- Draft edits remain private until publication; public gallery text remains read-only.

## [0.3.0] - 2026-10-23

### Added

- Per-page Customize workspace with Design, Elements, Themes, and CSS tabs, a responsive private preview, and phone settings/preview switching.
- Individual client visibility controls for headers, browsing, album details, year groups, and footer branding, with accessible album names and preserved hidden content.
- Gallery typography, fonts, spacing, density, cover proportions, corners, and hover controls backed by documented CSS variables.
- Lazy-loaded CodeMirror CSS editor with validation, examples, character count, and reset controls.
- Complete appearance-file version 2 and styling-only DTCG 2025.10 token import/export with local references and import summaries.

### Improved

- Preview refreshes after acknowledged draft saves without moving settings focus; failed saves preserve edits and support retry.
- Publication review identifies visibility and gallery-style changes before clients see them.
- Keyboard focus, mobile Preview reachability, reduced-motion behavior, and compatibility with existing gallery CSS variables.

### Upgrade notes

- Storage remains schema version 2; these settings are additive JSON fields. Back up the complete stopped Pager volume before upgrading.
- Existing pages retain compatibility defaults. New pages start with browsing controls off; duplicated designs preserve their source settings.
- Version 1 appearance imports remain supported and preserve newer visibility/style settings. Token imports change styling only and do not load external resources.
- Existing published pages and share links remain unchanged until explicitly updated. The release includes merged MRs !28, !29, and !30.

## [0.2.0] - 2026-10-23

### Added

- Per-page header layouts, sizing, typography, spacing, presets, and validated gallery-only custom CSS.
- Responsive private previews, published-view checks, design duplication, and appearance import/export.
- Client album search, month filtering, year navigation, manual album ordering, and monthly album selection.
- Publication change review, searchable page management, and mobile page actions.
- GitLab verification and Docker smoke pipelines, fixture-only Compose setup, and compatibility checks.

### Improved

- Immich host theme and sidebar parity, native album cards, readable button links, and keyboard-friendly inline editing.
- Wrapped long descriptions on phones and draggable banner crop positioning.

### Upgrade notes

- Pager storage remains at schema version 2. New appearance settings use additive JSON defaults. Back up the stopped Pager volume before upgrading.
- This release contains verified MR !26 and its 25 prerequisite branches. The new Customize panel, individual visibility controls, and DTCG token portability are separate follow-up work.
- Publishing this release does not update an existing deployment.

## [0.1.0] - 2026-10-19

### Added

- Persistent `/page/:slug` client pages with Immich-style year-grouped album grids.
- Owner-scoped editor, custom headers, logos/banners, themes, and live preview.
- Private autosaved working drafts with explicit Publish and Update live page actions.
- Logo and banner selection from owned Immich Photos, plus upload and file drop.
- Native Immich-style Options and album pickers, with Copy link sharing.
- Dedicated native album shares, optional passwords, and durable synchronization/revocation recovery.
- Docker gateway, sidebar embedding, and amd64/arm64 image publication workflow.
- Isolated contributor demo, API/architecture/deployment documentation, and browser tests.
- Open-source license, attribution, contributor policies, issue forms, and CI.
- Stable source and compiled-runtime downloads, a prebuilt ARM64 Docker image archive, and SHA-256 checksums.

### Upgrade notes

- Pager schema version 2 preserves published pages and native shares while adding private working copies. Back up the complete stopped Pager volume before upgrading; restoring an older image also requires restoring that backup.
- This release was verified with 55 domain tests and 7 browser tests. GitHub Actions is disabled for the maintainer account; hosted CI and GHCR publication remain unavailable.
