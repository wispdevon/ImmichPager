# ImmichPager contributor instructions

- Read README.md, DESIGN.md, and docs/architecture.md before changing behavior.
- Use Node 22 from .nvmrc and the pinned pnpm version; commit the lockfile.
- All companion routes and assets belong under /page/. Never intercept /api/, /share/, or /s/.
- Keep Immich credentials transient and server-side. Every management resource needs an owner check.
- Persist migrations and interrupted share operations. Never edit Immich's database.
- Use tests for domain behavior and security boundaries; browser-check UI changes.
- Run pnpm check, pnpm test, pnpm lint, and pnpm build before committing a feature.
- Commit coherent verified increments using Conventional Commits. Never commit secrets or client photos.
