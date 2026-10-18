# Validation record

## Verified locally

- Node 22.23.3 and pnpm 11.28.5; frozen dependency installation.
- TypeScript/Svelte checks with zero application errors or warnings.
- ESLint and Prettier checks.
- 20 domain/integration tests across ownership, slug validation, salted password hashing, interrupted creates/deletes, native slug preservation, public credential isolation, SQLite restart recovery, grouping, proxy streaming, and WebSocket upgrades.
- Four production-browser scenarios covering desktop/mobile grids, year collapse, native viewer navigation, branded protected publishing, owner isolation, sidebar embedding, same-origin writes, monthly additions, password rotation/session invalidation, rejected SVG uploads, and unpublish revocation.
- Production build and runtime dependency audit with no known advisories at implementation time.

## Visual comparison

The supplied reference shows the Immich Albums grid in dark mode. The implementation was rendered at 1506 px desktop width and 390 px mobile width. The desktop grid uses four large square covers, rounded corners, two-line titles, dates/counts, year headings, and divider lines. Mobile uses two columns without horizontal overflow. The requested customizable header is an intentional addition above the reference grid. Fixture photographs differ from the private reference images.

Screenshots in `docs/screenshots/` are actual browser captures. The editor was also inspected, including the dark Immich UI password field. Below-the-fold images are lazy-loaded; the first cover or banner receives high fetch priority.

The in-app browser JavaScript execution tool was not exposed in this session. Validation used the repository's automated Playwright suite with the installed Chromium executable. This also makes the tests reproducible in CI.

## Compatibility limits

Immich v3.3.1 DTOs, shared-link controller/service, album presentation, and sidebar/main layout were reviewed from the local Immicull checkout. The fixture implements those integration contracts. No live Immich server or client library was modified or tested.

The local account cannot access the Docker daemon, and passwordless sudo is unavailable. Local container build/smoke testing therefore remains unverified. The public repository has active workflows, but GitHub rejected manual CI dispatch with `Actions has been disabled for this user` (HTTP 422). No hosted CI run or container image was produced during implementation. The committed workflow performs a Docker build and health smoke test before amd64/arm64 publication when account-level Actions access is restored.

Node 22 currently prints its built-in SQLite experimental warning. The production build also reports an adapter bundling notice for `node:sqlite`; it remains a Node built-in at runtime. These are not application type errors.
