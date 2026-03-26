# ── Stage 1: build the web client ───────────────────────────────────────────
FROM node:20-alpine AS web-builder
WORKDIR /build

# Copy only package.json (not the lock file) so npm resolves optional native
# deps for the current platform (musl on Alpine). The lock file is generated
# on macOS and records darwin binaries; copying it causes npm to skip the
# linux-x64-musl rollup variant needed for the build.
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN npm install

# Source
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build with empty VITE_API_URL — the client is served by the same Express
# server, so API requests go to the same origin with no absolute URL needed
RUN VITE_API_URL="" npm run build --workspace=apps/web

# ── Stage 2: server runtime ──────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install server deps only
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
RUN npm install --workspace=apps/server

# Server source + shared types
COPY apps/server/src ./apps/server/src
COPY packages/shared ./packages/shared

# Built web client
COPY --from=web-builder /build/apps/web/dist /app/apps/web/dist

ENV PORT=3001
ENV STATIC_PATH=/app/apps/web/dist
EXPOSE 3001

CMD ["npx", "tsx", "apps/server/src/index.ts"]
