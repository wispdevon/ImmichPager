# Docker deployment

## Install beside Immich

Build from source for this initial version. Prebuilt GHCR images have not yet been published because GitHub Actions is disabled for the maintainer account. The image workflow is configured for publication after validation once Actions is available.

```sh
git clone https://github.com/wispdevon/ImmichPager.git
cd ImmichPager
cp .env.example .env
# Edit IMMICH_URL and ORIGIN, plus IMMICH_NETWORK if necessary.
docker compose up -d --build
```

`IMMICH_URL` must be the internal original server, such as `http://immich-server:2283`, or an existing companion gateway. It must not point back at the public domain routed through Pager. The companion joins the existing Immich Docker network; no original-photo or database mounts are needed.

Change the existing HTTPS reverse proxy's Immich upstream to `127.0.0.1:3102`, retaining its TLS settings, upload limits, and WebSocket support. Route the entire Immich domain through Pager so it can add the sidebar entry. Keep the previous upstream for rollback. Do not expose the companion directly to the public internet without HTTPS.

For Caddy, the existing site can use:

```caddyfile
photos.example.com {
    reverse_proxy 127.0.0.1:3102
}
```

When the HTTPS proxy is on another host, configure `BIND_ADDRESS` to a private LAN address and use that address as the proxy target. When the HTTPS proxy is containerized, attach it to the same network and use the companion's service address rather than container-local `127.0.0.1`.

## Configuration

| Variable         | Default           | Meaning                                                                                                              |
| ---------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `IMMICH_URL`     | required          | Internal Immich/upstream gateway root, without `/api`                                                                |
| `ORIGIN`         | required          | Exact public browser origin, e.g. `https://photos.example.com`                                                       |
| `IMMICH_NETWORK` | `immich_default`  | Existing Docker network                                                                                              |
| `BIND_ADDRESS`   | `127.0.0.1`       | Host bind interface                                                                                                  |
| `PAGER_PORT`     | `3102`            | Host gateway port                                                                                                    |
| `PAGER_TAG`      | `main`            | Image tag; prefer a published version for production                                                                 |
| `TRUST_PROXY`    | `false`           | Trust the first X-Forwarded-For value for password throttling; enable only behind a trusted proxy that overwrites it |
| `DATA_DIR`       | `/data` in Docker | SQLite and branding storage                                                                                          |
| `HOST`, `PORT`   | `0.0.0.0`, `3000` | In-container listener                                                                                                |

Without `TRUST_PROXY`, password throttling groups clients by the directly connected proxy address. With it enabled, prevent direct untrusted access to the gateway and ensure the HTTPS proxy sanitizes forwarding headers.

## With Immichinko or Immicull

Use the existing Immichinko gateway as `IMMICH_URL`, and have the public HTTPS proxy point at Pager. Other companion routes continue upstream. Do not configure the gateways to point at each other. If using an Immicull custom server, keep that image and use its existing internal server URL.

## Health, backup, and rollback

`/page/health` checks the running process. `/page/ready` also checks SQLite and the upstream version endpoint. Normal logs contain operation categories, not passwords or share URLs.

Use one container per `pager` volume. For a consistent backup, stop Pager, back up the complete volume, then restart it. Retain the database and WAL files together; do not copy only the live SQLite file. The volume contains private capabilities and should be backed up securely. `docker compose down --volumes` deletes it.

For rollback, point the HTTPS proxy back at its previous upstream. Immich itself has not been replaced. Pager-created native links remain in Immich until revoked; unpublish pages before uninstalling if you want them removed. Preserve the volume when stopping Pager.
