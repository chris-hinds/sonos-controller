# ── Stage 1: build the web client ───────────────────────────────────────────
# Install and build in the app's own directory — no monorepo workspace flags.
# @sonos/shared imports are all `import type` so vite/esbuild strips them
# without ever resolving the module; packages/shared is not needed here.
FROM node:20-alpine AS web-builder
WORKDIR /build/apps/web

COPY apps/web/package.json .
RUN npm install

COPY apps/web .
RUN VITE_API_URL="" npx vite build

# ── Stage 2: server runtime ──────────────────────────────────────────────────
# Same approach — install server deps directly, no workspace resolution.
# tsx is in dependencies; @sonos/shared is not referenced (type-only, erased).
FROM node:20-alpine
WORKDIR /app/apps/server

COPY apps/server/package.json .
RUN npm install --omit=dev

COPY apps/server/src ./src
COPY --from=web-builder /build/apps/web/dist /app/apps/web/dist

ENV PORT=3001
ENV STATIC_PATH=/app/apps/web/dist
EXPOSE 3001

CMD ["node_modules/.bin/tsx", "src/index.ts"]
