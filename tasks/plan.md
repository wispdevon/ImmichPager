# Roadmap implementation and review plan

The user authorized agents to implement the visual-first roadmap on separate branches and open pull requests targeting `dev` for approval. `TODO.md` is the task list and durable product roadmap. Pull requests are review artifacts; no feature PR is merged automatically, and no release or deployment is authorized by this plan.

## Execution

1. Record the roadmap in `TODO.md` and link it from README on `dev`.
2. Implement the Now customization features in isolated git worktrees: composed inline editing, banner focal dragging, header sizing and typography, responsive preview, and release-readiness verification.
3. Implement independent Next workflow slices: design duplication, per-page presets, accessible drag ordering, client browsing, monthly selection, and publication summaries.
4. Implement Later slices: portable appearance files, management thumbnails/filters, published-view verification, GitLab distribution preparation, compatibility checks, and contributor onboarding.
5. Review each branch and its evidence. Keep PRs independently reviewable and disclose overlaps/dependencies. Test integration in a disposable branch if necessary; do not merge into `dev` without approval.

## Architecture and safety

- Existing per-page settings, private drafts, explicit publication, owner checks, and dedicated native share recovery remain the foundation.
- Use defaulted additive JSON fields when possible; persist new schema migrations if required.
- Public and preview galleries use the shared renderer. All companion paths stay under `/page/`.
- No credentials, album identifiers, or share capabilities in portable appearance files or duplicated designs.
- Deferred product ideas remain deferred: comments, client accounts, billing, analytics, and a replacement photo viewer.
- Agents use separate worktrees and feature branches. Features touching the same renderer, contracts, or editor may need conflict resolution and combined verification after approval.

## Verification checkpoints

Each feature must pass `pnpm check`, `pnpm test`, `pnpm lint`, and `pnpm build` using Node 22.23.3 and pnpm 11.28.5 before commit. Behavior and security boundaries get domain tests; UI changes get real browser verification. PR descriptions explain the user benefit, final behavior, test evidence, and practical limits. Existing baseline failures must be reported rather than weakened away.

The final review index will map roadmap IDs to PRs and distinguish implementation from release. A branch or PR does not mean a feature has shipped.

## Distribution destination

The user selected <https://gitlab.com/wispd/ImmichPager>. Prepare GitLab CI and registry configuration for review. Actual repository cutover and image publication remain explicit approval steps, after the changes are concrete and reviewable.

## Open work

All roadmap items are tracked in `TODO.md`; PR links and final verification evidence will be added to a separate review index as agents finish. External service limitations or inaccessible live Immich verification must be recorded explicitly.
