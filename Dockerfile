# ── Stage 1: build the web client ─────────────────────────────────────────────
FROM node:25-alpine AS web
WORKDIR /app

# Manifests only — no lock file so npm resolves platform-native packages
# correctly (the macOS lock records darwin rollup binaries, not linux-musl).
COPY package.json .
COPY apps/web/package.json    apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN npm install -w apps/web

COPY packages/shared packages/shared
COPY apps/web      apps/web
RUN npm run build -w apps/web

# ── Stage 2: server runtime ───────────────────────────────────────────────────
FROM node:25-alpine
WORKDIR /app

COPY package.json .
COPY apps/web/package.json    apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN npm install -w apps/server --omit=dev

COPY apps/server/src apps/server/src
COPY packages/shared packages/shared
COPY --from=web /app/apps/web/dist apps/web/dist

ENV PORT=3001
ENV STATIC_PATH=/app/apps/web/dist
EXPOSE 3001
CMD ["node_modules/.bin/tsx", "apps/server/src/index.ts"]
