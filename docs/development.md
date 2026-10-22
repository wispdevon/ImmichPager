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

## Fixture-only Docker Compose demo

You can run the same development demo in Docker without installing Node or connecting to an Immich server. It uses the synthetic accounts and albums from `fixtures/immich.mjs` and the attributed sample photos under `fixtures/photos/`. It does not read `.env`, mount an Immich volume, or need real Immich credentials or client photos.

Start it from the repository root:

```sh
docker compose -f compose.dev.yaml up --build
```

The app prints its local URL when ready. Open `http://127.0.0.1:3000/page/acme` for the example gallery or `http://127.0.0.1:3000/dev-login/alice` to open the editor as the fixture photographer. The gateway is published only on `127.0.0.1`; the synthetic Immich fixture and Vite server are not published.

If host port `3000` is in use, choose another gateway port. The fixture and Vite use the next two ports inside the container and are not published to the host:

```sh
PAGER_DEV_PORT=3300 docker compose -f compose.dev.yaml up --build
```

Use the same `PAGER_DEV_PORT` value for later `exec` or `down` commands if needed; Compose applies it to the host and container gateway ports. Stop the demo with `Ctrl+C` or `docker compose -f compose.dev.yaml down`. To reset the demo database and installed dependency volume, run:

```sh
docker compose -f compose.dev.yaml down -v
```

### Validate the setup

Check the Compose file and start the demo:

```sh
docker compose -f compose.dev.yaml config --quiet
docker compose -f compose.dev.yaml up --build
```

In another terminal, confirm the gateway and example page respond:

```sh
curl --fail --silent --show-error http://127.0.0.1:3000/page/health
curl --fail --silent --show-error --output /dev/null http://127.0.0.1:3000/page/acme
```

For a non-default port, replace `3000` with the selected port. To run static checks in a one-off container without starting the demo, use `docker compose -f compose.dev.yaml run --rm demo pnpm check` and replace `check` with `test`, `lint`, or `build`. The host-based commands below remain available too.

The selected source directories and configuration files are bind-mounted read-only; edit them on the host to use Vite's live reload. Environment files such as `.env` are not copied into the image or mounted into the container. If `package.json` or `pnpm-lock.yaml` changes, recreate the dependency volume with `docker compose -f compose.dev.yaml down -v`, then run `up --build` again. This also clears the demo data.

## Starter tasks

The following roadmap items can be explored with the local fixture; no live Immich server is needed. Their IDs and acceptance checklists are in [TODO.md](../TODO.md). Pick one item for a focused feature branch and pull request to `dev`.

- **VIS-01 — Edit the finished header directly:** use the fixture page to edit its title and description in place, keeping private drafts and explicit publishing.
- **VIS-02 — Drag the banner focal point:** use a fixture banner to try mouse and touch positioning while retaining the keyboard-accessible slider.
- **VIS-05 — Preview desktop, tablet, and phone layouts:** use the same fixture page to check each responsive preview size.
- **WRK-03 — Drag albums to reorder them:** preserve year grouping and keyboard-accessible ordering.
- **WRK-04 — Find albums by name, month, or year:** exercise search and filters against the fixture albums.

Before opening a pull request, run the relevant checks from [Commands](#commands), add tests for behavior changes, and include a short description of what the change lets a photographer or client do.

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

## Compatibility checks

Run `pnpm test:compat` for a focused API, sharing, gateway, and production-browser integration check against the local fixture. See [Immich compatibility](compatibility.md) for the version evidence table and upgrade review procedure.

## Working against Immich

Set `IMMICH_URL` to the internal server root without `/api`, and `ORIGIN` to the public HTTPS origin. Build and run the production gateway behind that origin's reverse proxy. Immich cookies remain scoped to the existing origin. A standalone localhost app cannot reuse cookies from a remote Immich domain.

## Contribution boundaries

Keep remote API handling in the Immich client and lifecycle decisions in the page service. Preserve owner checks, public image authorization, deterministic share recovery, and origin checks. Add tests for changed behavior before implementation. Update public contracts and [API documentation](api.md) together.
