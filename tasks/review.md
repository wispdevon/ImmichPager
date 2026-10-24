# Merge request history

The original roadmap and subsequent composer work are merged and released. See [the roadmap](../TODO.md), [changelog](../CHANGELOG.md), and [v0.4.0 release](https://gitlab.com/wispd/ImmichPager/-/releases/v0.4.0) for the current product state. All appearance settings remain per page.

## Original roadmap — merged

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

[MR !19](https://gitlab.com/wispd/ImmichPager/-/merge_requests/19) preserved the combined history and conflict resolutions for these 18 features. Its verified result was included in the merged parity integration below and the v0.2.0 release.

## Immich UI and UX parity — merged

| Merge request                                                   | What it does for you                                                                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [!20](https://gitlab.com/wispd/ImmichPager/-/merge_requests/20) | Makes native link buttons readable by fixing the CSS layer conflict, with measured light/dark contrast.                        |
| [!21](https://gitlab.com/wispd/ImmichPager/-/merge_requests/21) | Matches album density, typography, year headings, metadata, and hover/focus treatment; phones show one album per row.          |
| [!22](https://gitlab.com/wispd/ImmichPager/-/merge_requests/22) | Highlights Pages in the native sidebar, closes the actual mobile menu, and preserves keyboard and browser-history navigation.  |
| [!23](https://gitlab.com/wispd/ImmichPager/-/merge_requests/23) | Adds description Ctrl+Enter, restores focus when inline editing ends, and preserves private autosave and natural Tab movement. |
| [!24](https://gitlab.com/wispd/ImmichPager/-/merge_requests/24) | Keeps Copy link visible on phones while putting secondary page actions in Immich's native menu; desktop actions stay visible.  |
| [!25](https://gitlab.com/wispd/ImmichPager/-/merge_requests/25) | Follows Immich's light/dark preference in the editor and dialogs while preserving each client page's independent theme.        |

[MR !26](https://gitlab.com/wispd/ImmichPager/-/merge_requests/26) combined the roadmap and six parity follow-ups. The [comparison matrix](../docs/immich-ui-parity.md) records source references, screenshots, and intentional product differences. The final integration passed 127 unit tests, 34 Chromium scenarios, compatibility checks, type checks, lint, formatting, audit, and build before release.

## Subsequent releases

| Merge request                                                       | Result                                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [!27](https://gitlab.com/wispd/ImmichPager/-/merge_requests/27)     | v0.2.0 release                                                                      |
| [!28–!31](https://gitlab.com/wispd/ImmichPager/-/merge_requests/31) | Client visibility controls, portable design tokens, integration, and v0.3.0 release |
| [!32](https://gitlab.com/wispd/ImmichPager/-/merge_requests/32)     | Visual customization and v0.3.1 release                                             |
| [!33](https://gitlab.com/wispd/ImmichPager/-/merge_requests/33)     | Header centering fix and v0.3.1.1 release                                           |
| [!34](https://gitlab.com/wispd/ImmichPager/-/merge_requests/34)     | Page settings and v0.3.2 release                                                    |
| [!35](https://gitlab.com/wispd/ImmichPager/-/merge_requests/35)     | Version awareness, CI improvements, and v0.3.3 release                              |
| [!36](https://gitlab.com/wispd/ImmichPager/-/merge_requests/36)     | Live composer, photo viewer, and v0.4.0 release                                     |
| [!37](https://gitlab.com/wispd/ImmichPager/-/merge_requests/37)     | TLS-preserving container publisher and guarded recovery                             |
| [!38](https://gitlab.com/wispd/ImmichPager/-/merge_requests/38)     | Registry installation and publication-recovery documentation                        |

## Verification and retained history

The v0.4.0 product passed 219 unit tests and 83 Chromium scenarios, plus type checks, lint, formatting, audit, production build, and Docker smoke checks. The [guarded publication pipeline](https://gitlab.com/wispd/ImmichPager/-/pipelines/2983390141) published amd64/arm64 images from the immutable release commit; image digests and labels were verified, and the ARM64 image passed native health/readiness checks. See [validation](../docs/validation.md) for evidence and limits.

Obsolete source branches were removed after their exact heads were confirmed against merged MRs and their merge commits were found in `dev`. Release tags, commits, MR discussions, release downloads, and CI history remain available. Feature work continues through reviewed MRs into `dev`, with stable changes promoted to `main`.
