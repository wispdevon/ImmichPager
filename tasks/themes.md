# Complete client-page themes

Approved 2026-10-27. Client pages only; the Immich management UI stays native.

## Accepted design

Five complete responsive designs: Cinematic (large image hero), Editorial
(serif magazine), Contact Sheet (dense numbered images), Archive (sticky rail),
and Studio (split hero). Retain Immich Classic unchanged as the default.
Themes include paired light/dark modes, with System when both variants exist.

Preview on the existing canvas without autosaving, Apply to the private draft,
Cancel, and Undo. Adopt theme row layouts while preserving content and ordering;
allow manual row overrides. Preserve custom CSS above theme styling and offer
explicit clearing. Existing reset-all returns to Classic without removing content.

Personal, owner-scoped theme library with frozen page snapshots. Native portable
theme JSON, appearance v4 with v1–3 compatibility, existing DTCG imports, and
shadcn/Tweakcn or daisyUI v5 CSS conversion. No Ghost ZIP compatibility, template
execution, remote asset loading, multi-page sites, or community marketplace.

## Implementation checklist

- [x] Theme schemas, catalog, resolver, safe portable files, Classic compatibility.
- [x] Page/draft/preview/publication/duplication integration and theme row defaults.
- [x] Complete Studio presentation and theme audition/apply/cancel/undo.
- [x] SQLite schema 4 personal library with owner and revision checks.
- [x] CSS import adapters and backwards-compatible appearance exports.
- [x] Remaining four complete designs, responsive modes, resets and controls.
- [x] Domain/security tests, browser interactions and visual review.
- [x] Full local check/test/lint/build/format gates; documentation and verified commits.

## Verification and delivery constraints

Use Node 22 and pinned pnpm. Run locally; do not consume hosted runner minutes.
Keep current production, main, release tags, and live data unchanged. No deployment
or new release is part of this implementation. A future schema-4 upgrade needs
a complete stopped-volume/configuration backup; older versions require restoration.

Test legacy appearance retention, snapshot independence, cross-owner access,
stale revisions, malicious/oversized imports, CSS isolation and precedence,
preview cancellation, autosave races, row overrides, all layouts/modes/viewports,
keyboard/focus, missing images, long text, and no native-share mutations from
presentation-only publication. Committed captures use NASA/synthetic fixtures.

## Verified implementation

239 unit/domain tests pass. The full original regression suite and the theme
scenarios cover audition/cancel/apply, undo across inspector tabs, late autosave
acknowledgments, row overrides and resets, System mode, CSS isolation/precedence,
owner/stale-revision boundaries, and all five layouts in light/dark at
1440/768/390px. An expanded final browser run also checks native light/dark
management surfaces and omission of empty sections from public navigation.

Visual review captured twenty public theme/mode/viewport combinations plus
management screens in both modes on desktop and phone using NASA fixtures.
There were no horizontal overflows, missing visible images, or browser exceptions.
The in-app browser runtime had no available browser targets; repository Chromium
was used headlessly without Xvfb.

The compiler's new specificity tier retains every generated selector component
and its independent gallery/editor-control guard. Tests cover both the original
and new paths. Imported variable expansion has depth, reference, and value-length
bounds so branching aliases cannot exhaust memory. Schema-3 migration preserves
published/draft/branding/share/session rows byte for byte.

Final verification: all 95 browser scenarios pass on the final production build,
with zero type errors/warnings and successful lint and formatting checks.
