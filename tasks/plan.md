# Roadmap implementation and review plan

The user authorized agents to implement the visual-first roadmap on separate branches and open merge requests targeting `dev` for approval. `TODO.md` is the task list and durable product roadmap. Merge requests are review artifacts; no feature MR is merged automatically, and no release or deployment is authorized by this plan.

## Execution

1. Record the roadmap in `TODO.md` and link it from README on `dev`.
2. Implement the Now customization features in isolated git worktrees: composed inline editing, banner focal dragging, header sizing and typography, responsive preview, and release-readiness verification.
3. Implement independent Next workflow slices: design duplication, per-page presets, accessible drag ordering, client browsing, monthly selection, and publication summaries.
4. Implement Later slices: portable appearance files, management thumbnails/filters, published-view verification, GitLab distribution preparation, compatibility checks, and contributor onboarding.
5. Review each branch and its evidence. Keep MRs independently reviewable and disclose overlaps/dependencies. Test integration in a disposable branch if necessary; do not merge into `dev` without approval.

## Architecture and safety

- Existing per-page settings, private drafts, explicit publication, owner checks, and dedicated native share recovery remain the foundation.
- Use defaulted additive JSON fields when possible; persist new schema migrations if required.
- Public and preview galleries use the shared renderer. All companion paths stay under `/page/`.
- No credentials, album identifiers, or share capabilities in portable appearance files or duplicated designs.
- Deferred product ideas remain deferred: comments, client accounts, billing, analytics, and a replacement photo viewer.
- Agents use separate worktrees and feature branches. Features touching the same renderer, contracts, or editor may need conflict resolution and combined verification after approval.

## Verification checkpoints

Each feature must pass `pnpm check`, `pnpm test`, `pnpm lint`, and `pnpm build` using Node 22.23.3 and pnpm 11.28.5 before commit. Behavior and security boundaries get domain tests; UI changes get real browser verification. MR descriptions explain the user benefit, final behavior, test evidence, and practical limits. Existing baseline failures must be reported rather than weakened away.

The final review index will map roadmap IDs to MRs and distinguish implementation from release. A branch or MR does not mean a feature has shipped.

## Distribution destination

The user selected <https://gitlab.com/wispd/ImmichPager>. Prepare GitLab CI and registry configuration for review. The user subsequently authorized moving the repository and review context to GitLab. All 26 review branches and descriptions now live there under the authenticated `wispd` account; local `origin` and branch upstreams point to GitLab. Feature approval, release, and image publication remain separate steps.

## Open work

All roadmap items are tracked in `TODO.md`; MR links and final verification evidence will be added to a separate review index as agents finish. External service limitations or inaccessible live Immich verification must be recorded explicitly.

## Immich UI and UX parity goal

The user explicitly requested a further goal: make ImmichPager match Immich's UI and UX as closely as practical, study Immich's actual interface, take screenshots, and apply the findings. The roadmap MR-preparation goal is complete: 18 feature MRs and verified draft integration MR !19 are ready for review. The UI/UX implementation and evidence are prepared in six follow-up MRs (!20–!25) and combined draft !26; approval and release remain separate steps.

Capture versioned reference evidence for Immich's albums, page/album creation and inline editing, selection, ordering, options, sharing/password controls, navigation, empty/error/loading states, keyboard behavior, and responsive layouts. Compare equivalent Pager states, record visible differences and interaction findings, then implement the relevant changes in reviewable branches/MRs to `dev`. Preserve per-page customization, private drafts, explicit publishing, owner checks, `/page/` isolation, and native Immich viewer behavior. Use fixture/synthetic content for committed evidence; never commit client photos or credentials. Keep `main` and the live deployment unchanged pending approval.

The desired result is measured against captured Immich screens and flows, rather than a generic redesign. Validate the changes with source-backed design decisions, before/after screenshots, browser interaction checks, and the repository's required gates.

### Evidence and implementation slices

Official Immich v3.3.3 is the source baseline. The public demo reported v3.3.4 during read-only screenshot capture; the five album toolbar/list/group/card/cover source files are identical between those tags. Reference photographs remain outside the repository. Pager screenshots and interaction tests use synthetic fixtures and attributed NASA assets.

- **Native link-button contrast:** remove the CSS cascade conflict that overrides Immich's primary anchor-button foreground; verify both themes and keyboard focus.
- **Album presentation and browsing:** match native square covers, responsive density, hover/focus treatment, year hierarchy, and toolbar rhythm while retaining client search/month/year controls and per-page branding.
- **Compact page actions:** preserve frequent desktop actions and provide a native, accessible phone overflow pattern with reliable focus and dismissal.
- **Host theme inheritance:** match the surrounding Immich light/dark preference in management, including dialogs and pickers, without changing the client page's own theme.
- **Sidebar navigation state:** give Pages the native active indicator while its editor is open, restore native navigation state on close, and verify keyboard and history behavior.
- **Inline editing shortcuts:** support Immich's description Ctrl+Enter shortcut and restore focus when editing ends without interrupting normal Tab traversal. Escape keeps already autosaved private values; it does not undo them.
- **Remaining interaction audit:** inspect editor, pickers, options, publication feedback, loading/error/empty states, mobile and keyboard behavior; implement material findings rather than assuming existing component reuse proves parity.

Each slice gets an isolated branch and MR targeting `dev`, with its dependency on integration draft !19 disclosed. After independent review, combine the slices in a disposable candidate, run all required gates and browser checks, and update the local preview. Do not merge the candidate into `dev` automatically.

Completion requires a committed comparison matrix with versioned source references and intentional product differences, before/after screenshot evidence, tests covering the changed interactions and security boundaries, passing combined gates, and reviewable MRs. Similar-looking screenshots alone do not prove interaction parity.

### Review handoff

The evidence and implementation goal is complete for review in [draft !26](https://gitlab.com/wispd/ImmichPager/-/merge_requests/26). All six final parity MR heads are included. The comparison matrix records the source/screenshot study, applied findings, remaining interaction audit, and intentional differences. Final combined gates passed: 127 unit tests, 34 Chromium scenarios, 33 compatibility tests plus two compatibility browser checks, type checking, lint, formatting, audit, and build. The fresh fixture preview matches the runtime candidate. See [the review index](review.md) for individual MRs, preview links, and runtime limitations. Repository and review context have moved to GitLab. Feature approval, merge, release, and deployment remain pending.
