# Releases

## v0.3.1

Version 0.3.1 refines Customize with visual header presets, a simpler Design tab, six additional locally bundled open-license fonts, and logo shape and placement controls. Title and description can be edited directly in the private Customize preview. Partial token imports preserve styling omitted from the file. See [the changelog](../CHANGELOG.md), [customization guide](customization.md), and [font licenses](fonts.md).

Storage remains schema version 2; existing pages retain compatible defaults. Public pages stay read-only, and draft edits affect clients only after publication. The release is based on `dev`; upgrading Pager does not upgrade Immich.

## v0.3.0

The [GitLab v0.3.0 release](https://gitlab.com/wispd/ImmichPager/-/releases/v0.3.0) ships the per-page Customize workspace, individual element visibility, gallery styling, CodeMirror CSS editing, appearance v2, and DTCG token portability from MRs !28–!30. See [the changelog](../CHANGELOG.md) and [customization guide](customization.md).

The release is tagged from `dev`. Storage remains schema version 2 with additive JSON defaults; existing pages preserve their appearance and share links. New pages start with browsing controls off. Follow the [backup and rollback instructions](deployment.md#schema-upgrades). Source and compiled runtime archives with SHA-256 checksums are attached to the release; runtime Docker builds install dependencies for the target architecture.

The integrated feature set passed 160 unit tests, 45 Chromium browser tests, type checking, lint, formatting, audit, production build, independent review, and hosted Docker smoke checks. The release does not upgrade Immich itself.

## v0.2.0

The [GitLab v0.2.0 release](https://gitlab.com/wispd/ImmichPager/-/releases/v0.2.0) packages the verified roadmap and Immich UI parity work from MR !26. It adds header composition and custom CSS, responsive previews, appearance transfer and design duplication, client browsing, publication review, and management improvements. See [the changelog](../CHANGELOG.md). The newer Customize panel and portable design tokens remain separate follow-up work.

The release is tagged from `dev`; `main` and existing deployments are unchanged. Storage remains schema version 2, with additive JSON appearance defaults. Follow the [backup and rollback instructions](deployment.md#schema-upgrades) before upgrading. GitLab provides tagged source downloads; compiled runtime assets are attached to the release.

## v0.1.0

The first stable release packages the current `main` application: private autosaved drafts, branding from Immich Photos, native Options and album pickers, and Copy link sharing. The schema version is 2; follow the [backup and rollback instructions](deployment.md#schema-upgrades) when upgrading an existing Pager volume.

The [release downloads](https://github.com/wispdevon/ImmichPager/releases/tag/v0.1.0) include:

- `immichpager-v0.1.0-source.tar.gz`: the complete tagged source.
- `immichpager-v0.1.0-runtime.tar.gz`: compiled app and Docker build context; production dependencies are installed on the target architecture.
- `immichpager-v0.1.0-linux-arm64-docker.tar.gz`: a prebuilt Linux arm64 image, loaded as `immichpager:0.1.0`.
- `SHA256SUMS`: checksums for the three archives.

Local verification covers type checking, lint, formatting, dependency audit, 55 domain tests, 7 production-browser tests, and the production build. The ARM64 image receives an isolated startup and health smoke check; publishing does not change an existing deployment.

GitHub rejected workflow dispatch with `Actions has been disabled for this user`. The available publishing credential also lacks `write:packages`, so this release has no GHCR image. Use the downloadable image or source/runtime build until a GitLab release image is published.

## Release process

Use semantic versions. Keep `CHANGELOG.md` current and bump `package.json` in a reviewed commit. Verify type checks, linting, tests, browser flows, formatting, production build, dependency audit, and Docker smoke tests before tagging.

Create and push a `vMAJOR.MINOR.PATCH` tag only when releasing a verified version. GitLab is now the source and review host. The GitLab CI configuration verifies the application and Docker smoke test before allowing a maintainer to manually publish amd64/arm64 images from a protected semantic-version tag to `registry.gitlab.com/wispd/immichpager`. Account verification is complete, and MR !26 passed both hosted verification and Docker smoke jobs. Registry publication is a separate manual release action; a source release alone does not imply a published image. Historical v0.1.0 release downloads remain on GitHub; existing GitHub workflows are retained as historical configuration.

Container builds execute for PRs without publishing. Do not add credentials to workflow files or broaden pull-request permissions. Contributors' PRs use read-only repository permissions.

Before upgrading Immich, run compatibility tests against its matched API and inspect the sidebar/main layout. Record tested versions and any migration requirement in validation notes. Pager is an independent integration and does not automatically upgrade the underlying Immich server.
