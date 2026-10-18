# ADR 0001: A same-origin companion with dedicated native shares

Status: accepted

## Context

Returning clients need one persistent URL across monthly albums. Immich's native shared link represents one album or a flat asset selection, while its native viewer already provides photo browsing and downloads. Existing projects demonstrate both companion gateways and custom Immich builds.

## Decision

Use a Docker companion under `/page/`, session-authenticated through the existing Immich server. Store only Pager state in SQLite. Reproduce the Albums overview and use dedicated native shares for viewer navigation. Keep every photographer's resources owner-scoped. Use a small sidebar bridge instead of maintaining another Immich fork.

Use AGPL-3.0-only and preserve attribution for the reviewed Immich component presentation. Keep network boundaries, recovery behavior, and contributor setup documented in the same repository.

## Consequences

Immich upgrades do not require replacing Pager's database or photo storage, but sidebar compatibility must be tested. Native viewer passwords can prompt again. Public protection depends on both Pager sessions and native shared-link permissions. Deterministic slugs and persisted operation intent support retries after remote failures. One container owns each SQLite volume.
