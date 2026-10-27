# ImmichPager roadmap

This roadmap focuses on helping photographers make polished client pages, then making monthly updates easier and improving distribution. Every appearance setting stays with its page; the roadmap does not introduce photographer-wide defaults. There are no delivery-date promises.

Use the IDs below when discussing work or opening a merge request against `dev`. The original roadmap and live composer are released in v0.4.0; complete themes, editor refinements, and CSS recipes ship in v0.5.0. Promote reviewed stable changes from `dev` to `main`; deployment remains a separate operator action.

## Status and priority

- **Released** means available in the stable [v0.4.0 release](https://gitlab.com/wispd/ImmichPager/-/releases/v0.4.0).
- **Implemented on dev** means present on `dev`, but not part of the stable release.
- **Planned** means not yet merged into `dev`. Completed reviews are recorded in the [merge request history](tasks/review.md).
- **Deferred** means a separate product decision is needed before scheduling the work.
- **P1** is the current focus, **P2** follows it, and **P3** is later. Priorities do not imply dates.

## Already available — stable (released)

### REL-01 — Persistent client pages

- **Priority:** Complete · **Status:** Released
- **Benefit:** Give each client one lasting page URL that can collect future shoots.
- **Acceptance:**
  - [x] Create and manage persistent pages for clients.
  - [x] Keep a page's public URL stable as its contents change.
- **Dependencies:** None.

### REL-02 — Select Immich albums

- **Priority:** Complete · **Status:** Released
- **Benefit:** Build a client page from albums already organized in Immich.
- **Acceptance:**
  - [x] Search and select albums owned by the signed-in photographer.
  - [x] Present selected albums in year groups with chronological or manual ordering.
- **Dependencies:** REL-01.

### REL-03 — Brand pages with Immich photos

- **Priority:** Complete · **Status:** Released
- **Benefit:** Use an existing logo or photograph to give each client's page a recognizable look.
- **Acceptance:**
  - [x] Choose logo and banner images from Immich Photos.
  - [x] Support image upload or drop, banner crop position, header alignment, and per-page colors.
- **Dependencies:** REL-01.

### REL-04 — Choose a gallery theme

- **Priority:** Complete · **Status:** Released
- **Benefit:** Match the client page to the photographer's preferred viewing theme.
- **Acceptance:**
  - [x] Offer dark, light, and system theme choices.
  - [x] Keep theme and color choices with the individual page.
- **Dependencies:** REL-01.

### REL-05 — Save private drafts automatically

- **Priority:** Complete · **Status:** Released
- **Benefit:** Continue editing later without exposing unfinished changes to clients.
- **Acceptance:**
  - [x] Autosave working edits privately.
  - [x] Keep working drafts separate from the published page.
- **Dependencies:** REL-01.

### REL-06 — Publish changes explicitly

- **Priority:** Complete · **Status:** Released
- **Benefit:** Choose when clients see new albums or appearance changes.
- **Acceptance:**
  - [x] Require an explicit publish or update action to change the live page.
  - [x] Keep the last published page available while a draft is edited.
- **Dependencies:** REL-05.

### REL-07 — Protect a page with a password

- **Priority:** Complete · **Status:** Released
- **Benefit:** Limit access to a client's page and its dedicated album shares.
- **Acceptance:**
  - [x] Allow optional password protection for the client page.
  - [x] Apply the password to Pager-managed Immich album shares.
- **Dependencies:** REL-01, REL-02.

### REL-08 — Copy the client link

- **Priority:** Complete · **Status:** Released
- **Benefit:** Share a published page with a client in a few clicks.
- **Acceptance:**
  - [x] Show a copy-link action for each published page.
  - [x] Copy the persistent client page URL.
- **Dependencies:** REL-01, REL-06.

## Released header composition and CSS

### DEV-01 — Compose the full header over the banner

- **Priority:** Complete · **Status:** Released
- **Benefit:** Place the logo, title, and description together on a banner for a stronger client-page introduction.
- **Acceptance:**
  - [x] Offer below-banner and over-banner layouts.
  - [x] Keep the logo, title, and description together in the overlay composition.
  - [x] Support left or centered alignment and retain the banner crop-position control.
- **Dependencies:** REL-03.

### DEV-02 — Add isolated per-page custom CSS

- **Priority:** Complete · **Status:** Released
- **Benefit:** Adjust typography, album corners, spacing, and theme styling beyond the built-in options.
- **Acceptance:**
  - [x] Save custom CSS with the page's private draft and publish it explicitly.
  - [x] Limit styles to the gallery and block external resource loading.
  - [x] Document supported selectors, theme variables, and examples.
- **Dependencies:** REL-05, REL-06.

## Released visual customization

### VIS-01 — Edit the finished header directly

- **Priority:** Complete · **Status:** Released
- **Benefit:** Adjust the title and description where they appear instead of switching between the composition and separate fields.
- **Acceptance:**
  - [x] Click or keyboard-focus the title and description in the actual page composition to edit them.
  - [x] Keep familiar Immich controls and preserve the existing private-draft and explicit-publish workflow.
- **Dependencies:** DEV-01.

### VIS-02 — Drag the banner focal point

- **Priority:** Complete · **Status:** Released
- **Benefit:** Put the important part of a photograph in view without guessing at a numeric crop position.
- **Acceptance:**
  - [x] Show a visible crop area and let the photographer drag the banner image to position its focal point.
  - [x] Support touch input.
  - [x] Retain the existing slider as an accessible alternative, with keyboard support.
- **Dependencies:** REL-03.

### VIS-03 — Control header and logo size

- **Priority:** Complete · **Status:** Released
- **Benefit:** Give a page a compact, standard, or tall banner and a logo size that fits its branding.
- **Acceptance:**
  - [x] Offer compact, standard, and tall banner sizes.
  - [x] Let the photographer choose a logo size.
  - [x] Save both settings per page and show them consistently in preview and publication.
- **Dependencies:** DEV-01.

### VIS-04 — Control header typography and spacing

- **Priority:** Complete · **Status:** Released
- **Benefit:** Make a client's title and description fit the chosen design without writing CSS.
- **Acceptance:**
  - [x] Offer title size, description size, and header spacing controls.
  - [x] Keep Google Sans as the default typeface.
  - [x] Save settings per page and apply the same result in preview and publication.
- **Dependencies:** DEV-01.

### VIS-05 — Preview desktop, tablet, and phone layouts

- **Priority:** Complete · **Status:** Released
- **Benefit:** Check that a page reads well on the screens clients use before publishing it.
- **Acceptance:**
  - [x] Offer desktop, tablet, and phone preview sizes.
  - [x] Render each preview with the same gallery renderer used by the published page.
  - [x] Keep preview controls out of the published page.
- **Dependencies:** DEV-01.

### VIS-06 — Verify dev customization for release

- **Priority:** Complete · **Status:** Released
- **Benefit:** Catch layout, accessibility, and isolation problems before the current dev customization reaches a stable release.
- **Acceptance:**
  - [x] Verify long titles and descriptions and behavior when branding images are missing.
  - [x] Verify light and dark themes.
  - [x] Verify keyboard navigation for customization controls.
  - [x] Verify custom CSS remains isolated from editor controls and other pages.
- **Dependencies:** DEV-01, DEV-02.

## Released design reuse and monthly workflow

### WRK-01 — Duplicate a page's design

- **Priority:** Complete · **Status:** Released
- **Benefit:** Start a new client page with an existing visual style instead of rebuilding it each time.
- **Acceptance:**
  - [x] Copy appearance and branding into a new private draft.
  - [x] Exclude albums, passwords, and share links from the duplicate.
  - [x] Require the new page's owner to choose its albums and publish it separately.
- **Dependencies:** REL-03, REL-05.

### WRK-02 — Add per-page design presets

- **Priority:** Complete · **Status:** Released
- **Benefit:** Apply a coherent header composition quickly while keeping each page's choices independent.
- **Acceptance:**
  - [x] Provide a small set of Immich-compatible header compositions.
  - [x] Apply a preset only to the selected page.
  - [x] Do not create photographer-wide defaults.
- **Dependencies:** DEV-01, VIS-03, VIS-04.

### WRK-03 — Drag albums to reorder them

- **Priority:** Complete · **Status:** Released
- **Benefit:** Put a client's most important shoots first with less manual effort.
- **Acceptance:**
  - [x] Allow albums to be dragged into a new order.
  - [x] Preserve year grouping.
  - [x] Keep keyboard-accessible ordering controls.
- **Dependencies:** REL-02.

### WRK-04 — Find albums by name, month, or year

- **Priority:** Complete · **Status:** Released
- **Benefit:** Find a particular shoot quickly when a client page contains many albums.
- **Acceptance:**
  - [x] Search albums by name.
  - [x] Filter albums by month.
  - [x] Navigate directly between years.
- **Dependencies:** REL-02.

### WRK-05 — Speed up monthly album updates

- **Priority:** Complete · **Status:** Released
- **Benefit:** Add the latest shoots to returning clients' pages with fewer clicks.
- **Acceptance:**
  - [x] Sort albums by recently added.
  - [x] Make inclusion on the page easy to see.
  - [x] Support bulk album selection.
- **Dependencies:** REL-02.

### WRK-06 — Review publication changes before updating

- **Priority:** Complete · **Status:** Released
- **Benefit:** Know what clients will see before changing a live page.
- **Acceptance:**
  - [x] Summarize albums being added and removed.
  - [x] Summarize appearance changes.
  - [x] Show the summary before the photographer confirms a live update.
- **Dependencies:** REL-05, REL-06.

## Released polish and distribution

### LTR-01 — Import and export appearance settings

- **Priority:** Complete · **Status:** Released
- **Benefit:** Reuse or back up a visual design outside the page where it was created.
- **Acceptance:**
  - [x] Export and import a portable appearance file.
  - [x] Exclude credentials, album identifiers, and share capabilities.
  - [x] Validate imported settings before applying them to a page.
- **Dependencies:** WRK-02.

### LTR-02 — Add thumbnails and filters to page management

- **Priority:** Complete · **Status:** Released
- **Benefit:** Recognize pages and find drafts or unpublished changes in a growing client list.
- **Acceptance:**
  - [x] Show a page thumbnail in management.
  - [x] Filter the list by draft, published, and unpublished changes.
  - [x] Keep each management action scoped to the page's owner.
- **Dependencies:** REL-01, REL-05, REL-06.

### LTR-03 — Improve client-view verification

- **Priority:** Complete · **Status:** Released
- **Benefit:** Check the page clients will open and understand what a password prompt means.
- **Acceptance:**
  - [x] Open the actual published page from the editor.
  - [x] Explain the password state clearly when a page is protected.
  - [x] Keep owner preview and client access checks intact.
- **Dependencies:** REL-06, REL-07.

### LTR-04 — Finish GitLab distribution

- **Priority:** Complete · **Status:** Released
- **Benefit:** Give maintainers and self-hosters a complete GitLab-based source and container distribution path.
- **Acceptance:**
  - [x] Complete the primary repository migration.
  - [x] Run CI checks on the GitLab repository.
  - [x] Publish container images to its registry.
- **Dependencies:** None.

### LTR-05 — Maintain Immich compatibility checks

- **Priority:** Complete · **Status:** Released
- **Benefit:** Help photographers know which Immich versions work and catch upstream integration changes early.
- **Acceptance:**
  - [x] Document the supported Immich versions and verified behaviors.
  - [x] Test API and sidebar integration when updating supported versions.
  - [x] Record compatibility results and migration requirements.
- **Dependencies:** None.

### LTR-06 — Improve contributor onboarding

- **Priority:** Complete · **Status:** Released
- **Benefit:** Help new contributors run the app and find a useful first task.
- **Acceptance:**
  - [x] Provide a development Docker Compose setup.
  - [x] Clearly mark starter tasks for contributors.
  - [x] Document setup and verification steps.
- **Dependencies:** None.

## Deferred — separate product decisions required

These ideas are intentionally outside the planned queue. The ID records the topic; it does not commit to implementation.

### DEC-01 — Client comments

- **Priority:** Deferred · **Status:** Deferred
- **Benefit:** Let clients respond to a gallery in context.
- **Acceptance:**
  - [ ] Decide and document moderation, retention, and notification expectations before scheduling.
- **Dependencies:** Product decision.

### DEC-02 — Client accounts

- **Priority:** Deferred · **Status:** Deferred
- **Benefit:** Give repeat clients an account-based way to access their work.
- **Acceptance:**
  - [ ] Decide and document account ownership, authentication, and the value beyond existing page links and passwords before scheduling.
- **Dependencies:** Product decision.

### DEC-03 — Billing

- **Priority:** Deferred · **Status:** Deferred
- **Benefit:** Support a paid service model if the project later offers hosted or commercial features.
- **Acceptance:**
  - [ ] Decide whether ImmichPager will offer a paid service and what customers would pay for before scheduling.
- **Dependencies:** Product decision.

### DEC-04 — Analytics

- **Priority:** Deferred · **Status:** Deferred
- **Benefit:** Help photographers understand how clients use their pages.
- **Acceptance:**
  - [ ] Decide and document useful metrics, privacy expectations, and data retention before scheduling.
- **Dependencies:** Product decision.

## Delivered product decision — DEC-05

- **Priority:** Complete · **Status:** Released
- **Benefit:** View photos directly on the client page.
- **Acceptance:**
  - [x] Deliver the approved viewer scope through CMP-01, with navigation, slideshow, and download controls.
- **Dependencies:** CMP-01.

## Released live composer — CMP-01

**Status:** Released and deployed as [v0.4.0](https://gitlab.com/wispd/ImmichPager/-/releases/v0.4.0), through [MR !36](https://gitlab.com/wispd/ImmichPager/-/merge_requests/36). This delivers DEC-05's approved scope.

- [x] Ordered Albums, Photos, and rich Text blocks with legacy-page migration.
- [x] Exact photo-block shares, durable retry, private drafts and explicit publication.
- [x] One live canvas with Content and Design inspectors, plus Page settings beside Publish.
- [x] Direct header sizing/crop and inline text editing, responsive canvas widths.
- [x] On-page album expansion and accessible photo viewer with slideshow/downloads.
- [x] Complete browser regression, review, release publication, and deployment.

See [implementation checkpoints](tasks/live-composer.md).
