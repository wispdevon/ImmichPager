# Immich Albums, with a client header

The supplied reference is the visual specification: black background, square album covers with rounded corners, semibold two-line names, date ranges and item counts, generous spacing, and collapsible year headings with counts and a divider. Preserve this hierarchy in light mode and on mobile. Do not add decorative cards, gradients, or a marketing homepage.

Branding sits above the grid: optional banner and logo, title, and short description. Page settings control colors and left/center header alignment. Public pages have no editor controls. The editor follows Immich's empty album screen: a large borderless ‘Add a title’ field, ‘Add a description’, and a centered ADD ALBUMS / Select albums tile. Selected albums replace the empty state. Use Immich UI's ghost Textarea and Button components, the same Google Sans font and dark primary/surface colors as Immich. Search and Owned/Selected filters live in a native modal album picker; URL, branding, ordering, and password controls live in Page settings. Keep /page/ on one line in the URL field. Preview and publish remain in the top toolbar.

Use Immich UI for the password input and accessible controls. Reproduce the album presentation with typed components, retaining upstream attribution. Reserve cover geometry before images load and lazy-load below-the-fold covers. Respect reduced motion.
