# GitLab CI and distribution

GitLab is the active host. Merge requests target `dev`; `main` is unchanged by the
0.3.x release workflow. Historical GitHub upstream links and downloads remain.

## Required checks

Quality checks (format, lint, types, unit tests and audit), production build, and
source Dockerfile smoke testing start concurrently. Two Chromium jobs consume the
same production build artifact and shard test files. Each job has one worker and
an isolated fixture process/database; local browser runs remain serialized.
The browser jobs use `needs: build`; release publication requires every gate.
No tests are skipped to improve timing.

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

The manual `publish_image` job is restricted to protected `vMAJOR.MINOR.PATCH`
tags. It waits for quality, build, both browser shards and Docker smoke. It uses
GitLab job credentials and Buildx to publish amd64/arm64 images with exact-version,
minor and latest tags. Production should use an exact version.

Runners must support privileged Docker-in-Docker with TLS. Static CI Lint checks
validate configuration; successful hosted jobs establish runtime operation.
Release the reviewed tagged commit, verify downloadable checksums, preserve a
recoverable configuration and complete stopped-volume backup (including SQLite
WAL/SHM), and verify live version, readiness and data fingerprints after upgrade.
See [deployment](deployment.md) for recovery and runtime-bundle deployment.
