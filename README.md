# ImmichPager

**One link. Every shoot.**

[![CI](https://github.com/wispdevon/ImmichPager/actions/workflows/ci.yml/badge.svg)](https://github.com/wispdevon/ImmichPager/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Docker: amd64 + arm64](https://img.shields.io/badge/docker-amd64%20%7C%20arm64-2496ED?logo=docker&logoColor=white)](docs/deployment.md)

Persistent, customizable client album pages for [Immich](https://immich.app). Give returning photography clients one place for all the work they've commissioned. Select existing albums, customize the header, and keep adding shoots to the same URL:

```text
https://photos.example.com/page/acme
```

An independent, self-hosted community companion. Photos stay in Immich; albums open in its native shared viewer. No client account or global API key required.

[Docker setup](#quick-start) · [Development](#development) · [Documentation](#documentation) · [Report a bug](https://github.com/wispdevon/ImmichPager/issues/new/choose)

## A familiar album overview

<p align="center">
  <img src="docs/screenshots/gallery-desktop.png" width="75%" alt="ImmichPager desktop client page with an Immich-style album grid and year headings" />
  <img src="docs/screenshots/gallery-mobile.png" width="23%" alt="The same client page in a responsive two-column mobile layout" />
</p>

Screenshots use attributed [NASA Apollo photographs](fixtures/photos/README.md) and illustrative album data, not a live client library.

## Features

- **Persistent client links:** one `/page/custom-slug` URL across months of work.
- **Immich-style albums:** square covers, dates, item counts, collapsible years, and manual or chronological ordering.
- **Per-page branding:** title, description, logo, banner, crop position, alignment, and theme colors.
- **Password protection:** optional page password/PIN applied to dedicated Immich album shares too. The native viewer may prompt again.
- **Inside Immich:** a Pages sidebar entry and existing session authentication; each photographer manages their own pages.
- **Dedicated share links:** existing shares remain untouched. Interrupted operations are tracked and can be retried.
- **Docker companion:** one container and SQLite volume; amd64/arm64 image workflow, no changes to Immich's image or database.
- **Contributor-friendly:** typed boundaries, local Immich fixtures, browser tests, CI, issue forms, and architecture documentation.

<details>
<summary>See the photographer's editor</summary>

![Page editor with album selection, branding controls, and password settings](docs/screenshots/editor.png)

</details>

## Quick start

Requires Docker Compose v2, an existing Immich installation, and control of its HTTPS reverse proxy.

```sh
git clone https://github.com/wispdevon/ImmichPager.git
cd ImmichPager
cp .env.example .env
```

Set `IMMICH_URL` to the **internal** Immich root, such as `http://immich-server:2283`, and `ORIGIN` to its public HTTPS origin. Set `IMMICH_NETWORK` if your existing Docker network has another name.

```sh
docker compose up -d --build
```

Point the existing HTTPS proxy at Pager's default `127.0.0.1:3102` listener. Sign in to Immich and choose **Pages → Create page**. Add albums, adjust the header, preview, and publish.

All Pager routes and assets use `/page/`; native Immich `/api/`, `/s/`, and `/share/` routes continue to the upstream. You can chain Pager in front of Immichinko or keep an Immicull custom server. See [deployment and configuration](docs/deployment.md) for exact setup, image tags, proxy trust, backups, and rollback.

## Compatibility and current status

Initial API and sidebar source review targets **Immich v3.3.1**. Domain tests and production-browser tests run against an isolated matching fixture. Live Immich validation is still required; this is an early implementation, not a claim of compatibility with every Immich release.

The sidebar bridge is a maintained DOM integration rather than an official Immich plugin API. Use one Pager container per database. When upstream revocation fails, the overview is hidden; existing native links remain subject to Immich until the owner finishes synchronization. See [validation notes](docs/validation.md).

## Development

Built with SvelteKit, Svelte, TypeScript, Immich UI, and SQLite. No real library is needed for development.

```sh
nvm install
nvm use
corepack enable
corepack prepare pnpm@11.28.5 --activate
pnpm install --frozen-lockfile
pnpm dev:demo
```

Open `http://127.0.0.1:3000/page/acme` for the sample page. Visit `/dev-login/alice` on that local demo to open the editor with a fixture account. If the ports are occupied, use `DEMO_PORT=3300 pnpm dev:demo`.

```sh
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm format:check
```

See [development setup](docs/development.md) for all commands, browser requirements, port configuration, and fixture behavior.

## Documentation

| Guide                                | Contents                                                         |
| ------------------------------------ | ---------------------------------------------------------------- |
| [Deployment](docs/deployment.md)     | Docker, environment variables, proxy chaining, backups, rollback |
| [Development](docs/development.md)   | Fresh-clone setup, fixtures, tests, contributor workflow         |
| [Architecture](docs/architecture.md) | Module boundaries, authentication, sharing recovery, storage     |
| [API](docs/api.md)                   | Routes, typed inputs, errors, retry behavior                     |
| [Validation](docs/validation.md)     | Tested behavior, visual checks, compatibility limits             |
| [Releases](docs/releases.md)         | Versions, image publishing, and release checks                   |

## Contributing

Bug reports, fixes, documentation, and accessibility improvements are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), [design guidance](DESIGN.md), and the [code of conduct](CODE_OF_CONDUCT.md). Use the issue forms and include tests for behavior changes.

Report vulnerabilities privately according to [SECURITY.md](SECURITY.md). Never include client photos, credentials, or real private share URLs in reports.

## Roadmap

- [x] Persistent pages, branding, themes, and year-grouped albums.
- [x] Multi-photographer ownership and dedicated native sharing.
- [x] Passwords, recovery, Docker packaging, and a local contributor demo.
- [ ] Record live compatibility against supported Immich releases.
- [ ] Expand automated compatibility fixtures as Immich evolves.

Automatic album naming rules, client accounts, and a replacement photo viewer are outside the initial scope.

## Related projects and acknowledgments

- [Immich](https://github.com/immich-app/immich): photo storage, shared albums, UI components, and the album layout reference.
- [Immichinko](https://github.com/wispdevon/Immichinko): daily photo rediscovery and companion gateway patterns.
- [Immicull](https://github.com/wispdevon/Immicull): integrated photo culling.
- [Best-README-Template](https://github.com/othneildrew/Best-README-Template): inspiration for the documentation structure.

ImmichPager is not affiliated with the Immich team or NASA.

## License

[AGPL-3.0-only](LICENSE). See [NOTICE](NOTICE) for upstream attribution and fixture-image credits. Contributions use the same license.
