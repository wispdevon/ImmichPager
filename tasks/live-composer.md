# Live composer implementation

Approved scope: replace separate edit/customize/preview screens with an always-live
canvas and Content, Design, Sharing inspector. Repeatable Albums (Cards, Tiles,
Editorial), Photos (Justified, Masonry, Square, Large, Carousel), and inline basic
rich-text blocks. Direct header sizing/crop controls. Albums expand on the page;
photos open a Folio-style accessible viewer with slideshow and downloads.

Private drafts, explicit publication, ownership checks, /page isolation, and
recoverable native sharing remain required. Existing pages migrate without
changing their appearance or shares. Still images only. No release/deployment.

## Verification checkpoints

- [x] Block contracts, rich-text validation, legacy migration, publication summaries
- [x] Exact photo-block sharing, interruption recovery, authorized media and ZIPs
- [x] Shared block rendering, layouts, expanded albums, accessible viewer
- [x] Unified composer, multi-select picker, direct manipulation and autosave
- [x] Browser verification, full checks, documentation, GitLab review handoff prepared

Use Node 22.23.3 and pnpm 11.28.5. Run check, test, lint, build and format:check;
exercise the new behavior in Playwright and visually inspect desktop and phone.
