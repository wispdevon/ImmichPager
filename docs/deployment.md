# Docker deployment

## Install beside Immich

Build the stable version from source, or import the prebuilt ARM64 package below. GHCR images have not yet been published because GitHub Actions is disabled for the maintainer account. The image workflow is configured for publication after validation once Actions is available.

```sh
git clone --branch v0.1.0 --depth 1 https://gitlab.com/wispd/ImmichPager.git
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

### Prebuilt ARM64 package

The [v0.1.0 release](https://github.com/wispdevon/ImmichPager/releases/tag/v0.1.0) includes a Docker image archive for **Linux arm64**. Use the source build above for amd64. Clone the stable tag and configure `.env` as above, then download and verify the package:

```sh
curl --fail --location --remote-name https://github.com/wispdevon/ImmichPager/releases/download/v0.1.0/immichpager-v0.1.0-linux-arm64-docker.tar.gz
curl --fail --location --remote-name https://github.com/wispdevon/ImmichPager/releases/download/v0.1.0/SHA256SUMS
sha256sum --check --ignore-missing SHA256SUMS
docker load --input immichpager-v0.1.0-linux-arm64-docker.tar.gz
docker tag immichpager:0.1.0 ghcr.io/wispdevon/immichpager:0.1.0
```

The second tag matches the Compose image name locally; it does not require a registry download. Set `PAGER_TAG=0.1.0` in `.env`, then start with:

```sh
docker compose up -d --no-build --pull never
```

For upgrades, back up the stopped Pager volume before starting the new image, as described under [schema upgrades](#schema-upgrades).

### Build the frontend off-device

For a memory-constrained ARM64 host, compile on a development workstation first:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm bundle:runtime
```

Transfer `.deploy/runtime/` to the host and run `docker build -t immichpager:local .` inside that transferred directory. The generated context includes `Dockerfile.runtime` as its Dockerfile, compiled assets, and dependency manifests. Production dependencies, including native Sharp binaries, are installed for the host architecture during the container build. No workstation `node_modules`, credentials, or demo data are included. Set the Compose image to that local tag and use `docker compose up -d --no-build`.

The release's `immichpager-v0.1.0-runtime.tar.gz` contains this compiled build context, so you can extract it and run the target-host Docker build without installing frontend tooling. It supports Linux amd64 and arm64 through the target Docker platform. The source archive remains available for inspection and rebuilding.

## Environment variables

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

If the HTTPS proxy's upstream address must stay unchanged, Pager can take the previous companion's published host port. Move that companion's host-port mapping to another available port, retain its internal Docker service port, and publish Pager at the original address. Point `IMMICH_URL` at the companion's Docker DNS name/internal port. Back up both Compose configurations and any environment file before changing mappings; persist the changes so restarts retain the chain. Rollback must restore both port mappings, not just the proxy configuration.

## Health, backup, and rollback

`/page/health` checks the running process. `/page/ready` also checks SQLite and the upstream version endpoint. Normal logs contain operation categories, not passwords or share URLs.

Use one container per `pager` volume. For a consistent backup, stop Pager, back up the complete volume, then restart it. Retain the database and WAL files together; do not copy only the live SQLite file. The volume contains private capabilities and should be backed up securely. `docker compose down --volumes` deletes it.

For rollback, point the HTTPS proxy back at its previous upstream. Immich itself has not been replaced. Pager-created native links remain in Immich until revoked; unpublish pages before uninstalling if you want them removed. Preserve the volume when stopping Pager.

## Schema upgrades

The autosave/branding update uses Pager schema version 2. Stop the Pager container and back up the entire data volume (including any WAL files) before first startup of this version. Keep the previous image and Compose configuration. The migration adds working copies while retaining published pages, native link records, branding, and sessions.

An older image refuses a version 2 database. To roll back, stop Pager, restore the complete pre-upgrade volume, restore the previous Compose image, and start it again. Do not restore a SQLite backup over a running process. Keep backup archives private: they contain share capabilities and client-session authorization. New changes made after the backup are not included in a restore. Immich's database and media are not part of this migration.
