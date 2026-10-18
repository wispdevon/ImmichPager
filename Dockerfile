FROM node:22.23.3-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=1
RUN corepack enable && corepack prepare pnpm@11.28.5 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22.23.3-bookworm-slim
ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.title="ImmichPager" \
      org.opencontainers.image.description="Persistent, customizable client album pages for Immich. Self-hosted with Docker." \
      org.opencontainers.image.source="https://github.com/wispdevon/ImmichPager" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.revision=$REVISION
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data BODY_SIZE_LIMIT=6M
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/LICENSE ./
COPY --from=build /app/server ./server
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/page/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
