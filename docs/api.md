# API and URL contracts

All Pager routes use `/page/`. JSON management APIs require an existing Immich session and enforce page ownership. Mutations require the exact configured `Origin` header. Error responses use `{ "message": "…" }` and an appropriate 4xx/5xx status.

| Method       | Route                                | Behavior                                               |
| ------------ | ------------------------------------ | ------------------------------------------------------ |
| GET          | `/page/api/pages`                    | Current photographer's pages                           |
| POST         | `/page/api/pages`                    | Create a draft                                         |
| GET, PUT     | `/page/api/pages/:id`                | Read or save the complete page settings                |
| DELETE       | `/page/api/pages/:id`                | Revoke dedicated links, then delete                    |
| POST         | `/page/api/pages/:id/publish`        | Synchronize links and publish                          |
| POST         | `/page/api/pages/:id/unpublish`      | Hide page and revoke links                             |
| POST         | `/page/api/pages/:id/retry`          | Resume the persisted operation                         |
| POST, DELETE | `/page/api/pages/:id/branding/:kind` | Upload/remove `logo` or `banner`                       |
| GET          | `/page/api/albums`                   | Owned Immich albums                                    |
| GET          | `/page/api/albums/:id/cover`         | Authorized editor cover                                |
| GET          | `/page/:slug`                        | Public overview or password prompt                     |
| POST         | `/page/:slug`                        | Password form action, returning a Pager session cookie |
| GET          | `/page/media/:id/album/:albumId`     | Public/owner-authorized cover                          |
| GET          | `/page/media/:id/branding/:kind`     | Public/owner-authorized branding                       |

Settings are defined by `pageInputSchema` in `src/lib/contracts.ts`. Required fields are `title` and `slug`; optional fields have explicit defaults. PUT replaces settings rather than applying a partial patch. `albumIds` preserves selection/manual order. `passwordMode` is `keep`, `set`, or `remove`; `password` is accepted transiently. Publish/retry bodies accept `{ "password": "…" }` when protected. Branding upload uses multipart field `image`.

Editors receive `hasPassword`, never the stored hash. Public responses contain only authorized presentation data and native viewer links. System slugs `manage`, `api`, `assets`, `media`, `health`, and `ready` are reserved.

Create is not idempotent: a duplicate slug returns 409, and clients must not blindly retry creation with a different slug. Saves and lifecycle operations are serialized per page; an in-flight duplicate gets 409. For uncertain remote outcomes use retry, which adopts deterministic native links instead of creating duplicates. Limits: 500 albums/page, 256 KB JSON, 5 MB branding upload.
