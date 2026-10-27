# GitLab CI and distribution

GitLab is the active host. Feature merge requests target `dev`; promote reviewed
stable changes to `main` with a fast-forward. Release tags remain immutable, and
deployment is a separate operator action. Historical GitHub upstream links and
downloads remain.

## Required checks

Quality checks (format, lint, types, unit tests and audit), production build, and
source Dockerfile smoke testing start concurrently. Two Chromium jobs consume the
same production build artifact and shard test files. Each job has one worker and
an isolated fixture process/database; local browser runs remain serialized.
The browser jobs use `needs: build`; release publication requires every gate.
No tests are skipped to improve timing.

### Local verification and runner minutes

The same application checks can run on a development machine:

```sh
pnpm format:check
pnpm lint
pnpm check
pnpm test
pnpm build
pnpm test:e2e
```

Docker smoke testing additionally requires access to a Docker daemon. A
[self-managed project runner](https://docs.gitlab.com/ci/runners/runners_scope/#project-runners)
can run the pipeline on your own machine; project runners are not affected by the
[instance-runner compute quota](https://docs.gitlab.com/ci/pipelines/instance_runner_compute_minutes/).
The current pipeline uses Docker images and TLS-enabled Docker-in-Docker, so its
runner must support that executor and service configuration.

For locally verified documentation-only maintenance, `git push -o ci.skip` skips
the push pipeline. It does not skip merge-request pipelines. Keep the existing
application checks and release prerequisites when working around a temporary
hosted-minute shortage; the skip is not evidence of a new CI pass.

Node 22.23.3 and pnpm 11.28.5 are asserted. The build job alone writes the
lockfile-keyed pnpm cache; other jobs read it. Missing caches remain supported.
Superseded verification jobs are interruptible; publishing jobs are not.

`Dockerfile.ci` pins the browser toolchain to Playwright 1.56.0 and Node/pnpm.
When a pin changes, run the manual `ci_tools` job, inspect its trace and
`ci-image.txt` artifact, then update the browser image digest in `.gitlab-ci.yml`.
Keep the previous digest until the replacement build succeeds. Do not remove
referenced CI image tags during registry cleanup. This job publishes only a CI
toolchain image, never an application release.

Each command records seconds and exit status in `ci-timings.tsv`. Browser jobs
retain JUnit reports and failure traces. To compare hosted required-job elapsed
time and summed runner usage (excluding optional publishing/toolchain jobs):

```sh
node scripts/ci/report.mjs 2978961866 PIPELINE_ID
```

The v0.3.2 baseline is about 398 seconds elapsed and 397 runner-seconds. Measure
cold cache separately from three warm-cache runs. The goal is at least 30% less
elapsed time; parallel setup may increase total runner usage.

## Releases

### Locally verified 0.5.0 release

When hosted minutes are exhausted, the maintainer can run all application quality,
browser, audit, build, and runtime container checks locally. For 0.5.0, production
assets are compiled on the workstation and target-architecture dependencies are
installed from the runtime bundle on the build host. Both container architectures
must pass smoke checks before publishing the version, minor, and latest tags.

Release archives and image labels identify the reviewed release commit. Push
with CI skipping only after verification; this does not represent a hosted CI pass
or weaken the normal pipeline prerequisites. Publish the immutable release tag,
verify downloaded assets and registry digests, and retain a complete stopped
volume/configuration/image backup before deployment. Promote the same commit from
`dev` to `main` with a fast-forward. Keep the existing pipeline for future runs.

### Normal hosted publisher

The manual `publish_image` job normally runs on protected `vMAJOR.MINOR.PATCH`
tags. It waits for quality, build, both browser shards and Docker smoke. It uses
GitLab job credentials and Buildx to publish amd64/arm64 images with exact-version,
minor and latest tags. Production should use an exact version.

Runners must support privileged Docker-in-Docker with TLS. Static CI Lint checks
validate configuration; successful hosted jobs establish runtime operation.
Release the reviewed tagged commit, verify downloadable checksums, preserve a
recoverable configuration and complete stopped-volume backup (including SQLite
WAL/SHM), and verify live version, readiness and data fingerprints after upgrade.
See [deployment](deployment.md) for recovery and runtime-bundle deployment.

Buildx uses a named Docker context containing the DinD TLS endpoint and client
certificates; TLS stays enabled. If publishing fails because the tagged CI setup
needs a fix, preserve the release tag. Merge the CI correction through a reviewed
MR, then use an API-triggered pipeline on a protected
`release/publish-vMAJOR.MINOR.PATCH` branch with `PAGER_RELEASE_TAG` and the exact
40-character `PAGER_RELEASE_REVISION`. Pipeline-variable overrides must be allowed
for the initiating operator; retain the project's existing restriction afterward.
All required checks still run. The manual publisher verifies the tag and package
version, rejects product-tree differences beyond `.gitlab-ci.yml`, and checks out
the original release commit before building. Image revision labels therefore
record the immutable release source, not the CI recovery commit.
