# Immich compatibility

ImmichPager follows Immich's HTTP API and maintains a DOM-based sidebar integration. An Immich upgrade can change either boundary. The table records the evidence available for the stable release; it is not a promise that every workflow works with every patch version.

| Immich version | Evidence recorded                                                                | Limits                                                                                          |
| -------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| v3.3.1         | Initial DTO, shared-link and sidebar source review; v3-shaped local API fixtures | No signed-in live workflow recorded for this version                                            |
| v3.3.3         | Shared-link contract review; ARM64 deployment and public HTTP smoke checks       | Signed-in live editing, protected publishing and password rotation remain fixture-verified only |
| Other versions | No recorded verification                                                         | Review and test before treating the version as supported                                        |

See the [validation record](validation.md#compatibility-limits) for the existing deployment evidence and its limits. No new live-version support is claimed by the compatibility command below.

## Repeatable fixture check

Use Node from `.nvmrc` and the pinned pnpm version. After `pnpm install --frozen-lockfile` and `pnpm exec playwright install chromium`, run:

```sh
pnpm test:compat
```

This stops on the first failed stage. It checks API/ownership/image/share/gateway contracts, builds the production app, then runs browser scenarios for gallery-to-native-viewer navigation and sidebar placement/embedding. It uses the existing local fixture and a disposable SQLite database, never a real library. The browser stage needs ports 3200 and 3201 free. This focused command complements the full required checks and browser suite; it does not replace them.

The fixture's version endpoint and v3-shaped responses represent a contract, not separate real Immich installations. Changing its reported version alone does not verify a new release. Keep ownership, credentials, native share slugs, media redirects, sidebar wrappers and passthrough regressions covered when refreshing fixtures.

## Reviewing an upstream upgrade

1. Identify the exact Immich tag/commit and inspect its published HTTP contracts and sidebar structure. Record the source links or checkout revision with the result.
2. Compare album owner ordering, metadata search filters/pagination, shared-link create/update/login cookies, asset media/redirects and native viewer URLs against `src/lib/server/immich.ts` and `fixtures/immich.mjs`.
3. Compare the sidebar Sharing entry, its wrapper rows, main element, and mobile dismissal against `server/sidebar.js`. Update the fixture structure to reproduce an observed upstream change before fixing the bridge.
4. Add a regression for each changed contract. Run `pnpm test:compat`, then the full contributor checks. A passing local fixture is evidence for the contract only.
5. In an isolated Immich installation with synthetic albums, verify signed-in page creation, ownership denial, branding, explicit publication, password unlock/rotation, native viewer navigation, unpublish and retry/restart recovery. Verify `/api/`, `/share/` and `/s/` still reach Immich. Do not use a client library for compatibility tests.
6. Record results in `docs/validation.md` and update the version table with the exact evidence. Note any migrations and rollback requirements, including whether a Pager volume backup is necessary. Leave unperformed checks explicitly pending.

## Result template

Copy this into the validation record for each reviewed version:

```text
Immich version/tag and source commit:
Pager branch/commit and schema version:
Platform and fixture/live environment:
Upstream source links reviewed:
API/share/media regression checks and command results:
Sidebar desktop/mobile and native passthrough results:
Signed-in synthetic-library workflows checked:
Known failures and checks not performed:
Migration, backup and rollback requirements:
```

Never include session cookies, passwords, share capabilities, database files, or client photos in the record.
