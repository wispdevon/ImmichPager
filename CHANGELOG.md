# Changelog

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
