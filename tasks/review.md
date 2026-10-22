# Roadmap merge request review index

The roadmap is in [TODO.md](../TODO.md). These changes are proposed for `dev`; an open merge request is not a release or an approved merge. `main` and the live deployment have not been changed. All appearance customization remains per page.

## Ready for review

| Roadmap ID | Merge request                                                   | What it does for you                                                                                                        |
| ---------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| LTR-05     | [!1](https://gitlab.com/wispd/ImmichPager/-/merge_requests/1)   | Runs repeatable API/sidebar compatibility checks and records what has actually been verified against Immich.                |
| LTR-03     | [!2](https://gitlab.com/wispd/ImmichPager/-/merge_requests/2)   | Opens the actual published page from the editor and explains password prompts and private drafts.                           |
| VIS-02     | [!3](https://gitlab.com/wispd/ImmichPager/-/merge_requests/3)   | Lets you drag the banner crop with mouse or touch while retaining the keyboard slider.                                      |
| VIS-06     | [!4](https://gitlab.com/wispd/ImmichPager/-/merge_requests/4)   | Verifies customization edge cases and fixes long descriptions clipping on phones.                                           |
| LTR-06     | [!5](https://gitlab.com/wispd/ImmichPager/-/merge_requests/5)   | Adds a fixture-only development Compose setup and starter-task guidance.                                                    |
| LTR-04     | [!6](https://gitlab.com/wispd/ImmichPager/-/merge_requests/6)   | Prepares GitLab CI and protected manual multiarchitecture image publishing for the selected GitLab project.                 |
| LTR-01     | [!7](https://gitlab.com/wispd/ImmichPager/-/merge_requests/7)   | Imports and exports validated appearance-only JSON without content or share capabilities.                                   |
| VIS-01     | [!8](https://gitlab.com/wispd/ImmichPager/-/merge_requests/8)   | Edits title and description directly in the composed gallery header using Immich controls.                                  |
| WRK-04     | [!9](https://gitlab.com/wispd/ImmichPager/-/merge_requests/9)   | Finds shoots with album-name search, month filters, and year navigation.                                                    |
| VIS-03     | [!10](https://gitlab.com/wispd/ImmichPager/-/merge_requests/10) | Controls banner height and logo size without writing CSS.                                                                   |
| WRK-06     | [!11](https://gitlab.com/wispd/ImmichPager/-/merge_requests/11) | Reviews album and appearance changes before explicit publication, rejecting stale reviews.                                  |
| VIS-05     | [!12](https://gitlab.com/wispd/ImmichPager/-/merge_requests/12) | Checks desktop, tablet, and phone layouts using the real gallery renderer and viewport.                                     |
| WRK-01     | [!13](https://gitlab.com/wispd/ImmichPager/-/merge_requests/13) | Copies a design and branding into a private draft without albums, passwords, or shares.                                     |
| WRK-05     | [!14](https://gitlab.com/wispd/ImmichPager/-/merge_requests/14) | Sorts recently added albums, shows inclusion clearly, and selects visible albums in bulk within the 500-album limit.        |
| WRK-03     | [!15](https://gitlab.com/wispd/ImmichPager/-/merge_requests/15) | Reorders albums by dragging within year groups while retaining keyboard controls.                                           |
| VIS-04     | [!16](https://gitlab.com/wispd/ImmichPager/-/merge_requests/16) | Adjusts title size, description size, and header spacing while keeping Google Sans.                                         |
| LTR-02     | [!17](https://gitlab.com/wispd/ImmichPager/-/merge_requests/17) | Recognizes pages through safe branding thumbnails and filters drafts, published pages, changes, and synchronization states. |
| WRK-02     | [!18](https://gitlab.com/wispd/ImmichPager/-/merge_requests/18) | Applies Classic, Centered, or Editorial header compositions to one private draft while preserving content and sharing.      |

All 18 planned roadmap items have a proposed feature MR. MR !18 includes its !10/!16 dependency commits; approve those controls before the preset MR. Review each feature independently before approving the integrated merge candidate.

## Verified integration candidate

[Draft MR !19](https://gitlab.com/wispd/ImmichPager/-/merge_requests/19) preserves the conflict resolutions and cross-feature fixes across all 18 feature MRs. Review and approve the individual features first, then promote and merge this candidate to preserve the verified combined result. Every final feature MR head is included in its history. Nothing has been merged into `dev` except documentation.

Combined verification passed with Node 22.23.3 and pnpm 11.28.5: zero type/Svelte errors or warnings, 114 domain tests across 16 files, all 24 Chromium scenarios, lint, formatting, moderate-level dependency audit, and production build. No tests were disabled. Desktop/mobile screenshots were visually reviewed.

The integration also ensures all five header controls survive design duplication and appearance export/import and appear in publication reviews. Older v1 appearance files receive defaults. Browser tests cover inline editing with responsive iframe previews, combined page-list actions, actual password-protected published views, and missing-cover fallback before hydration.

The earlier roadmap-only fixture preview remains available on the review workstation: [client gallery](http://127.0.0.1:4300/page/acme) and [fixture editor login](http://127.0.0.1:4300/dev-login/alice). It does not connect to a real library. Use the fresh combined preview below to review all six Immich UI/UX follow-ups.

## Immich UI and UX parity review

These six follow-up MRs use official Immich v3.3.3 source and v3.3.4 public-demo screenshots. They build on draft !19 and target `dev` as requested. Until !19 is approved and merged, GitLab's full diff includes that prerequisite; each MR links a focused comparison and its own commits. MR !25 also includes the native-sidebar fixture and bridge prerequisite from !22.

| Merge request                                                   | What it does for you                                                                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [!20](https://gitlab.com/wispd/ImmichPager/-/merge_requests/20) | Makes native link buttons readable by fixing the CSS layer conflict, with measured light/dark contrast.                        |
| [!21](https://gitlab.com/wispd/ImmichPager/-/merge_requests/21) | Matches album density, typography, year headings, metadata, and hover/focus treatment; phones show one album per row.          |
| [!22](https://gitlab.com/wispd/ImmichPager/-/merge_requests/22) | Highlights Pages in the native sidebar, closes the actual mobile menu, and preserves keyboard and browser-history navigation.  |
| [!23](https://gitlab.com/wispd/ImmichPager/-/merge_requests/23) | Adds description Ctrl+Enter, restores focus when inline editing ends, and preserves private autosave and natural Tab movement. |
| [!24](https://gitlab.com/wispd/ImmichPager/-/merge_requests/24) | Keeps Copy link visible on phones while putting secondary page actions in Immich's native menu; desktop actions stay visible.  |
| [!25](https://gitlab.com/wispd/ImmichPager/-/merge_requests/25) | Follows Immich's light/dark preference in the editor and dialogs while preserving each client page's independent theme.        |

[Draft MR !26](https://gitlab.com/wispd/ImmichPager/-/merge_requests/26) combines !19 and all six final parity MR heads for approval. The committed [comparison matrix](https://gitlab.com/wispd/ImmichPager/-/blob/qa/immich-ui-parity/docs/immich-ui-parity.md) records official source references, screenshot findings, the remaining interaction audit, and intentional product differences. Official public-demo photographs remain outside source control; committed images use synthetic or attributed NASA fixtures.

The fresh fixture-only preview runs at [client gallery](http://127.0.0.1:4400/page/acme) and [editor login](http://127.0.0.1:4400/dev-login/alice). Its runtime files match the combined candidate; it does not connect to a real library. Mobile menus, host theme changes, gallery layouts, and keyboard flows were browser-checked.

Final combined verification passed after the last count-label correction: 127 unit tests, 34 Chromium scenarios, 33 compatibility tests plus two compatibility browser checks, zero type/Svelte errors or warnings, lint, formatting, moderate-level dependency audit, and production build. No tests were disabled. Desktop/mobile screenshots were visually reviewed. No feature has been merged into `dev`.

## Verification and limits

Every feature MR records its own Node 22.23.3 / pnpm 11.28.5 checks, domain tests, build, and browser evidence. Browser tests use the isolated synthetic/NASA fixture library; no real client albums are published. The in-app browser connection was unavailable, so the repository's Playwright/Chromium workflow provides runtime checks.

The local environment cannot access its Docker daemon. Compose configuration is validated, but the development container startup and distribution Docker smoke remain unverified. GitLab static CI lint passes; the review branches and merge requests have now been transferred to GitLab. GitLab attempted merge-request pipelines but created no jobs because the account is not verified. Hosted checks remain pending account verification; registry publishing has not been run. The destination is [gitlab.com/wispd/ImmichPager](https://gitlab.com/wispd/ImmichPager), with registry `registry.gitlab.com/wispd/immichpager`.

## Merge and release discipline

Some MRs touch the same editor, gallery renderer, appearance contract, or tests. Resolve overlaps in a review branch and run combined checks before merging the series. Header controls must be included when reviewing presets, design duplication, portable appearance files, and publication appearance summaries. The verified draft integration candidate above preserves these resolutions without merging features into `dev`.

Do not mark roadmap entries “Implemented on dev” until their MRs are merged, and do not mark them “Released” until release verification and publication are complete. Deferred product ideas remain deferred.
