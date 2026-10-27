# Validation record

## Verified locally

- Node 22.23.3 and pnpm 11.28.5; frozen dependency installation.
- TypeScript/Svelte checks with zero application errors or warnings.
- ESLint and Prettier checks.
- 74 domain/integration tests across ownership, slug validation, salted password hashing, interrupted creates/deletes, native slug preservation, public credential isolation, SQLite restart recovery, grouping, proxy streaming, and WebSocket upgrades.
- Ten production-browser scenarios covering desktop/mobile grids, year collapse, native viewer navigation, branded protected publishing, owner isolation, sidebar embedding, same-origin writes, monthly additions, password rotation/session invalidation, rejected SVG uploads, unpublish revocation, and gallery customization.
- Production build and runtime dependency audit with no known advisories at implementation time.

## Visual comparison

The Immich v3.3.3 album card and group components are the source baseline; the relevant files are unchanged in the v3.3.4 public demo used for visual observation. The gallery uses 224 px minimum auto-fill tracks, 20 px card padding, 16 px rounded corners and row spacing, 18 px two-line titles, 14 px metadata, and 30 px year headings. Cards have no persistent surface; their rounded surface and border appear on hover or keyboard focus. At 390 px, covers use one column and Shared metadata remains visible without horizontal overflow. The default `#accbfa` light-theme hover/focus title uses Immich's light primary; default title contrast is at least 4.5:1 and the keyboard ring is at least 3:1 in light, dark, and system themes. Non-default page accents and `--pager-accent` keep their authored values; authors should ensure custom accent and background colors retain readable contrast. The requested customizable header is an intentional addition above the reference grid. Fixture photographs differ from the private reference images.

The [dark desktop](screenshots/gallery-desktop.png), [dark phone](screenshots/gallery-mobile.png), [light desktop](screenshots/gallery-desktop-light.png), and [light phone](screenshots/gallery-mobile-light.png) captures use the repository's attributed NASA Apollo fixtures, never a real client library.

Screenshots in `docs/screenshots/` are actual browser captures. The revised editor uses Immich's ghost Textarea and Buttons, bundled Google Sans (WOFF2), inline title/description, and the ADD ALBUMS empty state. The album picker was checked on desktop and at 390 px, including loaded covers, search, selected filtering, Escape dismissal/focus restoration, and protected branded publishing. The original supplied native editor screenshot is cropped/zoomed; the editor follows its layout and upstream component sizes rather than claiming a pixel-exact match to that crop. Below-the-fold images are lazy-loaded; the first cover or banner receives high fetch priority.

Initial validation used the repository's automated Playwright suite with the installed Chromium executable. During live deployment, the browser runtime reported no connected browser backends, so an existing signed-in Immich browser session was unavailable. Browser tests use an isolated fixture and remain reproducible in CI.

## Drafts and branding update

Schema v1-to-v2 migration is tested with a published page, image bytes, a password hash, and a client session. Working edits and branding do not change public settings/media or invalidate live sessions. Revision conflicts preserve the second tab's edits; failed publication can retry and commit matching branding. PNG transparency, bounded streaming, owned-photo filtering, structured v3 search fields, and restricted raster media/redirects are covered by tests.

Browser scenarios verify photo pagination/search, album and favorites filtering, logo selection, dropped branding before a title exists, private autosaving, explicit protected publication, header-only updates, desktop/mobile Options, copy-to-clipboard, and stale tabs. The browser runtime reported no connected backend; checks use the project's isolated Playwright/Chromium fixture, not a real library. No real library assets are selected or published by these checks.

## Empty-response regression

The user confirmed Publish page triggered the error. Caddy's log records the matching initial draft-creation POST failing with EOF / HTTP 502 before the draft was persisted. Pager used Node's five-second idle keepalive, while Caddy pools upstream connections for two minutes. [Caddy documents failed non-idempotent requests when the upstream's keepalive is shorter](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#the-http-transport). The gateway now keeps idle connections for three minutes, with a longer header timeout. A wire-level test reuses the same connection for a POST after 6.5 idle seconds and verifies the advertised timeout exceeds Caddy's pool duration.

The editor reports status-specific errors for empty/non-JSON responses without discarding fields or automatically replaying writes. Decoder tests cover empty errors, invalid successes, session expiry, and proxy HTML. A browser scenario injects the empty 502 during Publish page, confirms the draft survives, then retries through a complete native-share publication.

Independently, an oversized request reproduced the same parser failure with an empty HTTP 413 through the live gateway. The gateway now returns a JSON error for that case. Branding images larger than 5 MiB are rejected before upload, with an inline message next to the editor. The gateway regression failed against the old code; the browser scenario also verifies that oversized branding makes no upload request.

## Compatibility limits

See [Immich compatibility](compatibility.md) for the version evidence table, repeatable fixture checks, and the result template for future upstream reviews.

Immich v3.3.1 DTOs, shared-link controller/service, album presentation, and sidebar/main layout were reviewed from the local Immicull checkout. The v3.3.3 shared-link contracts were also checked before deployment. Album ownership now follows the v3 `albumUsers` DTO, with a regression test covering owner/collaborator separation and older `ownerId` responses. A regression fixture reproduces Immich's wrapped sidebar flex rows and verifies that Pages occupies its own full-width row.

The precompiled runtime image was built successfully for ARM64 and deployed alongside an existing Immicull/Immich **v3.3.3** server, Immichinko gateway, and RAW/JPEG integration. Public HTTPS smoke checks verified health/readiness JSON, native version passthrough, all three integration scripts, anonymous editor/API denial, and unknown-page 404 responses. The containers reported healthy. The native Immich image, database, and photo library were not changed.

The inline-editor update (`237dab9`) was also built and deployed for ARM64. Public checks confirmed the bundled Google Sans WOFF2 asset, readiness, upstream passthrough, companion scripts, and authorization boundaries after the existing Immich server completed a concurrent restart. Compose rollback retains image `390ad7a`; no database migration was needed.

No real albums were selected or published during deployment. Authenticated page editing, password rotation, and publication are verified against the fixture; a signed-in live user workflow remains to be checked.

The workstation account cannot access its Docker daemon. The ARM64 **runtime** Dockerfile was built and smoke-tested on the deployment host instead. The standard Dockerfile's full source-build stage and amd64 image remain unverified. GitHub rejected manual CI dispatch with `Actions has been disabled for this user` (HTTP 422); no hosted CI run or GHCR image has been produced. The committed workflow performs a Docker build and health smoke test before amd64/arm64 publication when account-level Actions access is restored.

Node 22 currently prints its built-in SQLite experimental warning. The production build also reports an adapter bundling notice for `node:sqlite`; it remains a Node built-in at runtime. These are not application type errors.

### Live deployment: 9a768a9

Deployed to the existing instance with a stopped-volume backup before the schema 1 → 2 migration. The existing page, share, two branding images and sessions were preserved; one working draft and two draft branding snapshots were initialized. Pager and native Immich remained healthy. Public health/readiness, native version, unauthorized management/photo API responses, missing-page handling and all three companion integration scripts passed. Authenticated editing flows were verified against the fixture instance, without publishing changes to the user's live albums. The host deployment notes record the backup checksum and the required database restore when rolling back to schema 1.

## Dev branch: banner composition and custom CSS

The dev branch adds header overlays and per-page CSS without changing main or the live instance. Browser coverage verifies desktop/mobile overlays, centered whole-header composition, missing-banner fallback, private autosave, explicit publication, clearing CSS, and rejection of invalid CSS without altering live styling. Release-readiness checks also cover a 160-character title, a 2,000-character unbroken description, absent branding, a failed album-cover fallback, dark and light appearance, and keyboard-only theme and preview controls. The CSS containment check verifies that a keyboard user can still reach and activate the preview toolbar. Security cases cover resource/attribute functions, escaped URLs, imports, unsupported nesting/at-rules, selector escape attempts, fixed-position containment and style-closing HTML strings. Screenshots use public NASA fixtures. This increment was verified against the local fixture only; no release or live deployment was performed.

## v0.3.1 Customize refinements

Verified with Node 22.23.3 and pnpm 11.28.5: zero Svelte/TypeScript diagnostics,
187 unit/integration tests, 56 production Chromium browser tests, ESLint,
Prettier, dependency audit, and production build. Independent integration review
found no blocking issues after the delayed-preview regression was fixed.

Browser coverage includes visual preset keyboard selection, collapsed advanced
controls, all six locally loaded fonts, logo shapes/placement, hidden header
editing, owner-only direct preview editing, failed-save retry, caret retention,
delayed and stale preview messages, phone controls, native row-action icon tooltips, CSS isolation, and explicit
publication. A delayed-load regression reproduces and verifies the fix for iframe
auto-focus stealing sidebar focus after history navigation. [Desktop inline editing](screenshots/customize-v031-desktop.png) and
[phone settings](screenshots/customize-v031-phone.png) were inspected in the
production fixture app with native dark Immich styling. Images use the repository's
attributed NASA fixtures; no live client content was used.

## v0.3.3 — CI and version awareness

Node 22.23.3 / pnpm 11.28.5 passed 200 unit tests and 67 Chromium scenarios,
including authenticated version metadata, About reopening/light/dark/phone
layouts, administrator patch notices, dismissal on Escape and immediate reload,
and deferral while another dialog is open. Release-check tests cover stable
version ordering, future/prerelease filtering, disabled checks, concurrency,
request bounds and stale results. Live authenticated About rendering remains a
manual compatibility check; fixture DOM structure follows Immich v3.3.3.

[Cold-cache pipeline 2979113084](https://gitlab.com/wispd/ImmichPager/-/pipelines/2979113084)
completed all required gates in 220 seconds versus the
[v0.3.2 baseline](https://gitlab.com/wispd/ImmichPager/-/pipelines/2978961866)
at 398 seconds (45% less elapsed time). Summed runner time increased from 397 to
491 seconds. Browser shards executed 34 and 33 tests in isolated processes and
databases. Warm-cache MR/dev/tag measurements are recorded in the v0.3.3 release
notes. Timings include runner setup and artifacts, exclude optional publication,
and are observations rather than a hosted-runner latency guarantee.

A warm-cache repetition exposed an existing mobile history test racing the
iframe's initial focus. The test now asserts iframe focus readiness before its
next keyboard action; the separate deliberately delayed-load test still verifies
that host interaction prevents late iframe focus. No assertion or test was
removed.

## Live composer — development review

The live composer is verified against the isolated Immich fixture, using attributed
NASA images. It has not been deployed to a live library. Browser coverage exercises
mixed/repeated blocks, all album/photo layouts, row duplication/removal/keyboard
ordering, rich-text formatting and caret retention, direct banner/crop/logo controls,
phone focus containment, explicit publication, password-protected source membership,
viewer Back/Escape/navigation/slideshow, exact ZIP contents, and unpublish revocation.

The media integration was checked against Immich v3.3.3's
[shared-link controller](https://github.com/immich-app/immich/blob/v3.3.3/server/src/controllers/shared-link.controller.ts),
[asset update results](https://github.com/immich-app/immich/blob/v3.3.3/server/src/dtos/asset-ids.response.dto.ts),
[timeline DTOs](https://github.com/immich-app/immich/blob/v3.3.3/server/src/dtos/time-bucket.dto.ts),
and [download DTOs](https://github.com/immich-app/immich/blob/v3.3.3/server/src/dtos/download.dto.ts).
The fixture and HTTP-client regression use `assetId` results for individual-share
updates. Schema 3 migration preserves the original album shares and sessions.

Visual review captures: [desktop composer](screenshots/live-composer-desktop.png),
[phone canvas](screenshots/live-composer-phone.png), and
[on-page viewer](screenshots/live-composer-viewer.png). The browser integration
was unavailable in this session; Playwright/Chromium provided runtime and visual
verification against the fixture instead.

Final verification: Node 22.23.3 / pnpm 11.28.5 passed 213 domain/integration
tests and all 72 production Chromium scenarios with no skips or retries. Type
checks reported zero errors/warnings; lint, formatting, and the production build
passed. Production dependency audit reported no known advisories.

## Composer layout and reorder corrections

Regression tests reproduce narrow inspector controls extending beyond the sidebar,
block labels covering their headings, missing album descriptions, symbol-based
icons, and autosaves occurring during a drag. The corrected editor fits controls
and focus rings inside the inspector, separates labels from headings, uses compact
editorial covers and the upstream album description, and uses Material SVG icons.

Album dragging stages an insertion marker without moving DOM rows or saving until
drop. Tests cover distant and grouped selections, edge scrolling, Escape/outside
cancellation, touch, keyboard alternatives, and reload/publication. An explicit
canvas-ready exchange prevents initial selection from being lost during hydration.
The publication scenario now waits for actual completion; the earlier CI artifact
showed navigation to a still-unpublished URL after only waiting for autosave status.

Visual review: [desktop](screenshots/composer-polish-desktop.png),
[phone](screenshots/composer-polish-phone.png), and
[viewer controls](screenshots/composer-polish-viewer.png). These are NASA fixture
images. Album descriptions follow the reviewed
[Immich v3.3.3 album DTO](https://github.com/immich-app/immich/blob/v3.3.3/server/src/dtos/album.dto.ts).

The corrected checkout passed all 216 domain/integration tests and 78 production
Chromium scenarios with no skips or retries, plus type checks, lint, formatting,
and the production build using the pinned Node/pnpm toolchain.

CI subsequently reported [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
for the old Zod pin. Zod is now pinned to patched version 4.6.6 with its lockfile
integrity. Shared input fields are defined before publication-only refinements so
private drafts can derive their schema without dropping or copying cross-field
checks. Type checks, all 216 domain tests, lint, build, and the dependency audit
pass with the patched version; the audit reports no known vulnerabilities.

## Composer settings and default restoration

The inspector uses Content and Design; Page settings opens the sharing dialog
beside Publish. Browser regressions cover dialog focus return and phone focus
containment, visible album-style radio cards, individual setting resets, and a
full presentation reset that preserves content, selected albums, and publication.
Album rows expose one actions menu and an explicit selection mode; the existing
single/group drag, scrolling, cancellation, touch, and keyboard checks remain in place.

Reset defaults come from the page and block schemas. Domain tests check content,
media, passwords, and download permissions remain intact, reset values do not
mutate another page, and restoring album visibility retains a usable link.
Visual review used the running fixture demo at port 3360 with desktop and phone
viewports. The in-app browser runtime reported `Browser is not available: iab`;
the established Playwright fallback provided runtime and screenshot verification.

Settings review captures: [desktop style cards](screenshots/composer-settings-desktop.png),
[phone album rows](screenshots/composer-settings-phone.png),
[default resets](screenshots/composer-settings-reset-phone.png), and
[phone sharing dialog](screenshots/composer-settings-dialog-phone.png).
Captures use the attributed NASA fixtures. Menu contrast is checked against its
actual surface in both host themes, and reset controls restore focus to the setting.

Final settings verification passed 219 domain/integration tests and all 81
production Chromium scenarios with no skips or retries, plus type checks, lint,
formatting, and the production build on Node 22.23.3 / pnpm 11.28.5.

## Album covers in the ordering list

Each selected album has an 80px cover in its drag handle, loaded through the
existing owner-checked cover route. The image geometry stays reserved while
loading; selection checkboxes overlay the cover without reducing the name width.
Missing or failed covers use an icon placeholder. A listener on the image wrapper
also detects failures before hydration without generating inline image handlers.
Browser regressions check matching loaded covers on desktop and phone, selection
geometry, failure fallbacks, CSP, and the existing drag/scroll/keyboard flows.

Local verification passed all 219 domain/integration tests, 12 focused production
Chromium scenarios, type checks, lint, formatting, and the production build.
[Desktop](screenshots/composer-album-covers-desktop.png) and
[phone selection](screenshots/composer-album-covers-phone.png) captures use NASA
fixtures. Inspection confirmed all nine cover images emit no inline handlers.
The Vite demo retains its existing iframe-load bootstrap CSP warning; production
cover-failure and host-theme CSP checks pass. Temporary visual-review drafts were
removed after capture.

## v0.4.0 release preparation

The release version is 0.4.0, with upgrade and rollback instructions for the
schema-3 migration. Local validation passed 219 domain/integration tests and all
five version/About browser scenarios, plus type checks, lint, formatting, audit at
the moderate threshold, and the production build. Version browser fixtures derive
the installed and next patch versions from the package metadata.

The audit reports two low SvelteKit advisories, with no moderate/high/critical
findings. The [enhanced-form redirect advisory](https://github.com/sveltejs/kit/security/advisories/GHSA-pfhg-q3qv-9q6r)
requires an enhanced route accepting leading double-slash paths; Pager's enhanced
password form uses the single-segment `/page/[slug]` route, with no catch-all form
route. The [prerendered-header advisory](https://github.com/sveltejs/kit/security/advisories/GHSA-27mw-82g8-phjj)
requires prerendering with an untrusted cache-control value; Pager does not
prerender and sets a fixed private/no-store policy. Source inspection found no
matching affected paths. The dependency remains flagged; the upstream fix
requires a separately reviewed SvelteKit 3 migration.

## Complete client themes (development branch, 2026-10-27)

Local Node 22 validation passes 239 unit/domain tests, all 95 browser scenarios,
`pnpm check` (zero errors/warnings), `pnpm lint`, `pnpm format:check`, and the
production build. No hosted CI minutes were used.

Theme coverage includes preview/cancel/apply, undo across Content/Design, delayed
autosave acknowledgments, row overrides/reset behavior, System mode without
autosaving, CSS precedence with gallery/editor-control isolation, portable-file
compatibility, bounded variable expansion, owner isolation and stale revisions,
library search/pagination, and snapshot survival after library deletion. Schema-3
migration retains published, draft, branding, share, and session rows byte for byte.
Theme-only publication does not mutate native shares.

All five families render in light/dark at 1440, 768, and 390 pixels, retain the
shared photo viewer, and omit empty rows from public section navigation. Visual
review includes twenty desktop/phone public captures and native light/dark editor
screens, using NASA fixtures; visible images load, no horizontal overflow occurs,
and no browser exceptions are recorded. The in-app browser had no available
targets, so verification used the repository's headless Chromium without Xvfb.

This is a feature-branch implementation with schema 4. The release version stays
0.4.0; deploying the feature requires the complete stopped-volume/configuration
backup and rollback procedure documented in the deployment guide.

## Photography collections and editor feedback (2026-10-27)

Local Node 22 validation passes 243 unit/domain tests and all 109 browser
scenarios, plus type checks (zero errors/warnings), lint, formatting, and the
production build. The fourteen collection/editor browser scenarios also passed
after the final template typography adjustments. No hosted CI minutes were used.

The twelve source adaptations retain portable attribution, reject unsafe source
URLs, and pass semantic text/button contrast checks. Browser coverage includes
three viewport sizes, editable typography, publication, the shared image viewer,
JSON downloads, the centered nonmodal confirmation and keyboard focus, compact
heading, mobile inspector dismissal, and dismissible five-second success feedback
without workspace movement.

Twenty-four desktop/phone captures use NASA fixtures, with no horizontal overflow,
unloaded visible images, or browser exceptions. The local fixture server loses
its in-memory native shares on restart; task-owned demo pages were unpublished
and republished to recreate those fixture shares before capture. Production data
and hosted repositories were unchanged.

## Theme picker and wedding refinements (2026-10-27)

Local validation passes 243 unit tests, 26 theme browser scenarios, type checks
with zero errors/warnings, lint, formatting, and the production build. Browser
review of all three wedding themes at 1440 and 390 pixels confirms inline native
checkboxes with 44px label targets, click/Space toggling, keyboard banner-height
changes, unwrapped crop/height controls within their banners, and thumbnail/name
theme cards without descriptive paragraphs. Public captures have no horizontal
overflow, unloaded visible images, or browser exceptions. The in-app browser
reported no available targets; review used headless Playwright with existing NASA
fixtures. No hosted CI minutes were used.
