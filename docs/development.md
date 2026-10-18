# Development

## First run

```sh
nvm install
nvm use
corepack enable
corepack prepare pnpm@11.28.5 --activate
pnpm install --frozen-lockfile
pnpm dev:demo
```

Open `http://127.0.0.1:3000/page/acme` for the example gallery. Open `http://127.0.0.1:3000/dev-login/alice` to sign in to the local fixture, then click Pages. `/dev-login/bob` switches to the second photographer. Fixture identities are available only in the demo process; production has no demo login route.

The demo starts a loopback-only fixture on port 3001, Vite on 3002, and the gateway on 3000. Set `DEMO_PORT` to use another consecutive three-port range. `.demo/` preserves local page settings; stop the demo and remove that directory to reset it. Native fixture shares live in memory. After restarting the fixture, republish existing demo pages to recreate their links.

If a system-wide libvips installation causes Sharp to attempt a source build, install with `SHARP_IGNORE_GLOBAL_LIBVIPS=1 pnpm install --frozen-lockfile`. Docker uses prebuilt Sharp binaries.

## Commands

| Command             | Purpose                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev:demo`     | Complete local development environment                                       |
| `pnpm dev`          | App-only Vite server; use a configured same-origin gateway for real sessions |
| `pnpm check`        | TypeScript, Svelte, and accessibility diagnostics                            |
| `pnpm lint`         | JavaScript/TypeScript linting                                                |
| `pnpm test`         | Domain, SQLite, Immich-client, grouping, and gateway tests                   |
| `pnpm build`        | Production application                                                       |
| `pnpm test:e2e`     | Production browser tests with an isolated fixture/database                   |
| `pnpm format:check` | Formatting validation                                                        |
| `pnpm format`       | Format source and documentation                                              |
| `pnpm audit --prod` | Runtime dependency audit                                                     |

Before browser tests, run `pnpm build` and `pnpm exec playwright install chromium`. On Linux CI, use `pnpm exec playwright install --with-deps chromium`. An installed browser can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium`.

Browser tests start their own production gateway at `127.0.0.1:3200`, fixture at 3201, and a disposable database in the operating system's temporary directory. Test screenshots/traces go into ignored `test-results/`. Never point test scripts at a real library.

## Working against Immich

Set `IMMICH_URL` to the internal server root without `/api`, and `ORIGIN` to the public HTTPS origin. Build and run the production gateway behind that origin's reverse proxy. Immich cookies remain scoped to the existing origin. A standalone localhost app cannot reuse cookies from a remote Immich domain.

## Contribution boundaries

Keep remote API handling in the Immich client and lifecycle decisions in the page service. Preserve owner checks, public image authorization, deterministic share recovery, and origin checks. Add tests for changed behavior before implementation. Update public contracts and [API documentation](api.md) together.
