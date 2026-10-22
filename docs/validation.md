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
