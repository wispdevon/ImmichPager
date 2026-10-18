# API and URL contracts

All Pager routes use `/page/`. Management routes require a verified Immich session and enforce owner checks. Mutations require the configured `Origin`. Errors return `{ "message": "…" }` with a 4xx/5xx status.

| Method       | Route                                | Behavior                                                                      |
| ------------ | ------------------------------------ | ----------------------------------------------------------------------------- |
| GET          | `/page/api/pages`                    | Owner's working copies, publication state, and live URL                       |
| POST         | `/page/api/pages`                    | Create an incomplete private draft                                            |
| GET, PUT     | `/page/api/pages/:id`                | Read or replace working settings                                              |
| DELETE       | `/page/api/pages/:id`                | Revoke dedicated links and delete draft/live data                             |
| POST         | `/page/api/pages/:id/publish`        | Validate and publish the expected draft revision                              |
| POST         | `/page/api/pages/:id/unpublish`      | Hide page and revoke links                                                    |
| POST         | `/page/api/pages/:id/retry`          | Resume a persisted publication/revocation                                     |
| POST, DELETE | `/page/api/pages/:id/branding/:kind` | Change working `logo` or `banner`                                             |
| GET          | `/page/api/photos`                   | Owned Photos search, favorites, and album filtering                           |
| GET          | `/page/api/photos/:id/thumbnail`     | Owner-checked library thumbnail                                               |
| GET          | `/page/api/albums`                   | Owned albums                                                                  |
| GET          | `/page/api/albums/:id/cover`         | Owner-authorized cover                                                        |
| GET, POST    | `/page/:slug`                        | Published overview / password form                                            |
| GET          | `/page/media/:id/album/:albumId`     | Authorized published album cover                                              |
| GET          | `/page/media/:id/branding/:kind`     | Authorized published branding; `?preview=1` reads owner-only working branding |

## Draft and publication contracts

`draftInputSchema` defines full working settings. Blank/incomplete titles and slugs are allowed privately. PUT replaces settings, not a partial patch, and **requires `expectedDraftRevision`** matching the latest response. Each settings or branding change increments that revision. A stale revision returns 409 without overwriting another tab.

Responses include `draftRevision`, `publishedRevision` (nullable), `publishedSlug` (nullable), `hasUnpublishedChanges`, publication status, working branding flags, and `hasPassword`. They never include password hashes or native share credentials. `revision` is the live page revision, not the working revision.

Publishing requires `{ "expectedDraftRevision": 3, "passwordMode": "keep", "password": "" }`. `passwordMode` is `keep`, `set`, or `remove`. The password is transient and supplied only when changing protection or synchronizing protected album links; it is not saved with the draft. Header/order-only updates with unchanged membership/protection reuse existing links. Publication applies strict title/slug validation and requires at least one owned album. System slugs `manage`, `api`, `assets`, `media`, `health`, and `ready` remain reserved; a live slug collision returns 409.

Autosaving never changes the public version or its sessions. Publication commits the working branding and matching settings together. Failed native synchronization remains hidden until retry succeeds. Retry/unpublish bodies accept `{ "password": "…" }` when needed. For an uncertain native outcome, retry adopts deterministic native links rather than creating duplicates. Draft creation itself is not idempotent; after an unreadable success response, check the page list before repeating creation.

## Appearance settings (dev)

Working settings and gallery responses add `headerLayout: "below" | "overlay"` (default `"below"`) and `customCss: string` (default `""`, maximum 20,000 characters). These are per-page settings and use the existing autosave revision and explicit publication endpoints. Existing stored records receive defaults on read; database schema version remains 2.

Draft saves accept unfinished or invalid CSS within the size limit. Publication validates CSS server-side and returns 400 with a `Custom CSS` message for invalid or unsupported rules before touching live data or shares. Gallery rendering independently compiles the stylesheet and omits it on error. See the [customization guide](customization.md) for selectors, variables and supported syntax. No external resources or global selectors are enabled.

## Branding and library media

File uploads use multipart `image` and `expectedDraftRevision`. Library selection uses JSON `{ "assetId": "<uuid>", "expectedDraftRevision": 3 }`. DELETE uses JSON `{ "expectedDraftRevision": 3 }`. Both paths process the image into page-specific WebP bytes and never modify Immich assets. Limits are 5 MiB input and 32 megapixels.

Photo search accepts `q` (filename), `favorite=true`, optional owned `albumId`, and opaque `cursor`. It returns `{ "items": [{ "id", "name", "takenAt", "thumbnail" }], "nextCursor": null }`, with up to 60 items per upstream page. Only selectable, owned images are returned; ownership is checked again on thumbnails and selection. Client-provided upstream URLs are not accepted. Media redirects must stay on the configured Immich origin and the same asset's thumbnail/original routes.

Other limits: 500 albums/page, 256 KiB JSON. Management mutations are serialized per draft; overlapping requests return 409. Editors serialize their autosave/upload queue, debounce text changes, flush before publishing, and retain unsaved fields after errors.
