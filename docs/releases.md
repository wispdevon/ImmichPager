# Releases

Use semantic versions. Keep `CHANGELOG.md` current and bump `package.json` in a reviewed commit. Verify type checks, linting, tests, browser flows, formatting, production build, dependency audit, and Docker smoke tests before tagging.

Create and push a `vMAJOR.MINOR.PATCH` tag only when releasing a verified version. The image workflow builds Linux amd64/arm64 images and publishes version and major.minor tags to GHCR. Main branch pushes publish the rolling `main` image. Image metadata records the source commit and license.

Container builds execute for PRs without publishing. Do not add credentials to workflow files or broaden pull-request permissions. Contributors' PRs use read-only repository permissions.

Before upgrading Immich, run compatibility tests against its matched API and inspect the sidebar/main layout. Record tested versions and any migration requirement in validation notes. Pager is an independent integration and does not automatically upgrade the underlying Immich server.
