# GitLab distribution and repository migration

## Repository migration status

The user authorized moving the active repository and reviews to `https://gitlab.com/wispd/ImmichPager`. All 26 review branches and descriptions now have GitLab merge requests targeting `dev`; local `origin` and branch upstreams use GitLab. No feature merge or image publication is implied. The stable `main` commit and existing `v0.1.0` tag are unchanged; historical release downloads remain available on GitHub. See [the migration record on dev](https://gitlab.com/wispd/ImmichPager/-/blob/dev/docs/gitlab-migration.md) and [the approval index](https://gitlab.com/wispd/ImmichPager/-/blob/dev/tasks/review.md).

This MR prepares the CI configuration and registry publishing behavior for review. GitLab attempted pipelines after the transfer but created no jobs because it reports that the user is not verified. Account verification is required before hosted checks can run; local checks do not certify runner or registry operation.

## CI and image publishing

`.gitlab-ci.yml` runs on merge requests, branches, and tags with Node `22.23.3` from `.nvmrc` and pnpm `11.28.5` from `package.json`. The verification job runs formatting, lint, type checks, domain tests, dependency audit, production build, and serialized browser tests. A separate job builds the Docker image and checks `/page/health`.

The `publish_image` job is available only for a protected tag matching `vMAJOR.MINOR.PATCH`. It waits for verification and the Docker smoke test, then requires a maintainer to start it manually. It uses GitLab's per-job registry credentials, builds amd64 and arm64 images, and publishes `MAJOR.MINOR.PATCH`, `MAJOR.MINOR`, and `latest` tags. No rolling branch tag is published. The Compose file defaults to `latest`; pin `PAGER_TAG` to an exact version for production.

Docker-in-Docker is used for the smoke test and image publication. GitLab runners must allow privileged Docker-in-Docker jobs; confirm the destination runner supports that before relying on these jobs. GitLab documents this runner requirement and the TLS configuration in its [Docker-in-Docker guide](https://docs.gitlab.com/ci/docker/docker_in_docker/). Registry authentication uses the temporary [`CI_REGISTRY_USER` and `CI_REGISTRY_PASSWORD` variables](https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/), so no long-lived registry token is stored in the repository.

The configuration can be checked with GitLab's [CI Lint API](https://docs.gitlab.com/api/lint/) using static validation (`dry_run` omitted or `false`). That endpoint validates YAML without creating a pipeline. A successful lint response does not test runner availability or publish images.

## Remaining CI and release steps

1. Review and approve the proposed CI and feature changes through GitLab merge requests. The combined candidate is draft !26; all features remain unmerged.
2. Complete the GitLab account verification required to start CI jobs, then run the candidate pipeline. Confirm Node/pnpm setup, browser tests, Docker smoke tests, and the runner's privileged Docker-in-Docker support.
3. Before any release, verify `main` protection and configure a protected tag rule for `v*` with Maintainer-level release access. Confirm that CI marks release tags as protected and that manual `publish_image` is absent from ordinary branches and unprotected tags.
4. Review the proposed GitLab issue/MR templates and verify a private vulnerability-reporting path before replacing existing security contact guidance.
5. Retain historical v0.1.0 downloads on GitHub. Test image pulls before updating installation guidance to a newly published GitLab image. GitHub is retained for history, upstream references, and existing download links.
6. Create a new protected semantic-version tag only after release checks pass. A maintainer can then start the manual image job and verify the manifest and version tags before updating a deployment.

Repository and review migration is complete. Feature approval, release verification, registry publication, and deployment remain separate from that transfer.
