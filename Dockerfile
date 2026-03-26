# ── Stage 1: build the web client ───────────────────────────────────────────
FROM node:20-alpine AS web-builder
WORKDIR /build

# No lock file → npm resolves platform-native optional deps fresh
# (e.g. @rollup/rollup-linux-x64-musl on Alpine instead of the darwin variant
# recorded in the macOS-generated lock file).
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/web

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# cd into the workspace so vite resolves its root and output dir unambiguously.
RUN cd apps/web && VITE_API_URL="" npm run build

# ── Stage 2: server runtime ──────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# @sonos/shared is devDep (type-only, erased by tsx/esbuild at runtime) so
# --omit=dev skips it. tsx is in dependencies and is included.
COPY package.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/server --omit=dev

COPY apps/server/src ./apps/server/src
COPY --from=web-builder /build/apps/web/dist /app/apps/web/dist

ENV PORT=3001
ENV STATIC_PATH=/app/apps/web/dist
EXPOSE 3001

CMD ["node_modules/.bin/tsx", "apps/server/src/index.ts"]
