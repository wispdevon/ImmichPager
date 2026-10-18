# Validation record

## Verified locally

- Node 22.23.3 and pnpm 11.28.5; frozen dependency installation.
- TypeScript/Svelte checks with zero application errors or warnings.
- ESLint and Prettier checks.
- 21 domain/integration tests across ownership, slug validation, salted password hashing, interrupted creates/deletes, native slug preservation, public credential isolation, SQLite restart recovery, grouping, proxy streaming, and WebSocket upgrades.
- Four production-browser scenarios covering desktop/mobile grids, year collapse, native viewer navigation, branded protected publishing, owner isolation, sidebar embedding, same-origin writes, monthly additions, password rotation/session invalidation, rejected SVG uploads, and unpublish revocation.
- Production build and runtime dependency audit with no known advisories at implementation time.

## Visual comparison

The supplied reference shows the Immich Albums grid in dark mode. The implementation was rendered at 1506 px desktop width and 390 px mobile width. The desktop grid uses four large square covers, rounded corners, two-line titles, dates/counts, year headings, and divider lines. Mobile uses two columns without horizontal overflow. The requested customizable header is an intentional addition above the reference grid. Fixture photographs differ from the private reference images.

Screenshots in `docs/screenshots/` are actual browser captures. The revised editor uses Immich's ghost Textarea and Buttons, bundled Google Sans (WOFF2), inline title/description, and the ADD ALBUMS empty state. The album picker was checked on desktop and at 390 px, including loaded covers, search, selected filtering, Escape dismissal/focus restoration, and protected branded publishing. The original supplied native editor screenshot is cropped/zoomed; the editor follows its layout and upstream component sizes rather than claiming a pixel-exact match to that crop. Below-the-fold images are lazy-loaded; the first cover or banner receives high fetch priority.

Initial validation used the repository's automated Playwright suite with the installed Chromium executable. During live deployment, the browser runtime reported no connected browser backends, so an existing signed-in Immich browser session was unavailable. Browser tests use an isolated fixture and remain reproducible in CI.

## Compatibility limits

Immich v3.3.1 DTOs, shared-link controller/service, album presentation, and sidebar/main layout were reviewed from the local Immicull checkout. The v3.3.3 shared-link contracts were also checked before deployment. Album ownership now follows the v3 `albumUsers` DTO, with a regression test covering owner/collaborator separation and older `ownerId` responses. A regression fixture reproduces Immich's wrapped sidebar flex rows and verifies that Pages occupies its own full-width row.

The precompiled runtime image was built successfully for ARM64 and deployed alongside an existing Immicull/Immich **v3.3.3** server, Immichinko gateway, and RAW/JPEG integration. Public HTTPS smoke checks verified health/readiness JSON, native version passthrough, all three integration scripts, anonymous editor/API denial, and unknown-page 404 responses. The containers reported healthy. The native Immich image, database, and photo library were not changed.

No real albums were selected or published during deployment. Authenticated page editing, password rotation, and publication are verified against the fixture; a signed-in live user workflow remains to be checked.

The workstation account cannot access its Docker daemon. The ARM64 **runtime** Dockerfile was built and smoke-tested on the deployment host instead. The standard Dockerfile's full source-build stage and amd64 image remain unverified. GitHub rejected manual CI dispatch with `Actions has been disabled for this user` (HTTP 422); no hosted CI run or GHCR image has been produced. The committed workflow performs a Docker build and health smoke test before amd64/arm64 publication when account-level Actions access is restored.

Node 22 currently prints its built-in SQLite experimental warning. The production build also reports an adapter bundling notice for `node:sqlite`; it remains a Node built-in at runtime. These are not application type errors.
