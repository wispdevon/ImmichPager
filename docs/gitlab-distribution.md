# GitLab distribution and repository migration

## Preparation status

This change prepares GitLab CI, the GitLab container registry, and project links for `https://gitlab.com/wispd/ImmichPager`. It does not move the canonical repository or publish an image. The current source branch still uses the GitHub `origin`; the destination project has not been changed by this work.

The destination is public, its default branch is `main`, and its container registry is enabled at `registry.gitlab.com/wispd/immichpager`. It already contains `main`, `dev`, and a `v0.1.0` tag. The peeled `v0.1.0` commit (`3f47be81`) and current `dev` commit (`c0b57e2a`) match the GitHub refs. Compare peeled commit IDs when checking annotated tags; the tag object's own ID is different by design.

## CI and image publishing

`.gitlab-ci.yml` runs on merge requests, branches, and tags with Node `22.23.3` from `.nvmrc` and pnpm `11.28.5` from `package.json`. The verification job runs formatting, lint, type checks, domain tests, dependency audit, production build, and serialized browser tests. A separate job builds the Docker image and checks `/page/health`.

The `publish_image` job is available only for a protected tag matching `vMAJOR.MINOR.PATCH`. It waits for verification and the Docker smoke test, then requires a maintainer to start it manually. It uses GitLab's per-job registry credentials, builds amd64 and arm64 images, and publishes `MAJOR.MINOR.PATCH`, `MAJOR.MINOR`, and `latest` tags. No rolling branch tag is published. The Compose file defaults to `latest`; pin `PAGER_TAG` to an exact version for production.

Docker-in-Docker is used for the smoke test and image publication. GitLab runners must allow privileged Docker-in-Docker jobs; confirm the destination runner supports that before relying on these jobs. GitLab documents this runner requirement and the TLS configuration in its [Docker-in-Docker guide](https://docs.gitlab.com/ci/docker/docker_in_docker/). Registry authentication uses the temporary [`CI_REGISTRY_USER` and `CI_REGISTRY_PASSWORD` variables](https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/), so no long-lived registry token is stored in the repository.

The configuration can be checked with GitLab's [CI Lint API](https://docs.gitlab.com/api/lint/) using static validation (`dry_run` omitted or `false`). That endpoint validates YAML without creating a pipeline. A successful lint response does not test runner availability or publish images.

## Remaining migration steps

After reviewing and approving the GitHub pull request:

1. Compare every destination branch and tag against the intended GitHub source commits. The inspected `main`, `dev`, and `v0.1.0` refs currently match; recheck them at migration time, preserve release tags and assets, and avoid force-pushing unless an explicit recovery decision is made.
2. Transfer the reviewed branches and tags, then confirm `main` is the intended default branch. Keep the GitHub repository available until clones, links, and release downloads work from GitLab.
3. Protect `main` and configure a protected tag rule for `v*` with Maintainer-level release access. Confirm that CI marks release tags as protected and that the manual `publish_image` job is absent from ordinary branches and unprotected tags.
4. Run a GitLab pipeline on the migrated `dev` branch and confirm Node/pnpm setup, browser tests, Docker smoke test, and the runner's privileged DinD support. Use static CI lint before the first pipeline if the configuration changes.
5. Port GitHub-only issue forms, pull request templates, and private security-report instructions to GitLab. Verify the private vulnerability reporting path before changing the public security contact.
6. Transfer or retain the v0.1.0 release files. Current documentation links those historical downloads to GitHub. Test a clone from GitLab and an image pull before changing old installation guidance or archiving GitHub.
7. For the next release, create a new protected semantic-version tag only after its checks pass. A maintainer can then start the manual image job and verify the published manifest and version tags before updating a deployment.
8. Switch local remotes and any remaining integrations to GitLab after the migration is approved and verified. The current remote is intentionally unchanged.

The branch changes prepare these files and links for review. The migration steps above remain separate from this configuration change.
