# Contributing

Thank you for helping improve ImmichPager. Small, focused pull requests are welcome.

## Local setup

Use the Node version in `.nvmrc`, enable Corepack, then run `pnpm install --frozen-lockfile` and `pnpm dev:demo`. The fixture server provides synthetic Immich accounts and albums without accessing a real library. Contributors who prefer Docker can use the [fixture-only Compose demo](docs/development.md#fixture-only-docker-compose-demo); it needs no Immich credentials or client photos.

See the [starter tasks](docs/development.md#starter-tasks) for roadmap items that can be built and checked against the local fixture.

## Changes

Discuss large changes in an issue first. Keep domain logic separate from routes and components. Include regression tests for changed behavior, especially ownership and sharing. Use Conventional Commits; contributions are licensed under AGPL-3.0-only.

Before submitting, run `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, and `pnpm format:check`. Include screenshots for visual changes and update documentation for configuration or API changes.

Never include credentials, client photographs, database files, or identifying information in issues or fixtures. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).
