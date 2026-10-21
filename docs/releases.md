# Releases

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

Create a protected `vMAJOR.MINOR.PATCH` tag only for a verified release. The GitLab pipeline runs the same checks on merge requests, branches, and tags. Its `publish_image` job appears only for a protected semantic-version tag, waits for checks and a Docker smoke test, and requires a maintainer to start it manually. It publishes Linux amd64/arm64 images to `registry.gitlab.com/wispd/immichpager` with version, major.minor, and `latest` tags. There is no rolling branch image. Image metadata records the GitLab source URL, version, and source commit. See [GitLab distribution](gitlab-distribution.md) before switching the primary repository.

Container builds execute for PRs without publishing. Do not add credentials to workflow files or broaden pull-request permissions. Contributors' PRs use read-only repository permissions.

Before upgrading Immich, run compatibility tests against its matched API and inspect the sidebar/main layout. Record tested versions and any migration requirement in validation notes. Pager is an independent integration and does not automatically upgrade the underlying Immich server.
