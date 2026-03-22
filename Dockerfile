# ── Stage 1: build the web client ───────────────────────────────────────────
FROM node:20-alpine AS web-builder
WORKDIR /build/web-client

# Install deps first (better layer caching)
COPY web-client/package*.json ./
RUN npm install

# Shared types are imported as '../../../shared/types' from src/api|components|hooks
# Placing them at /build/shared makes the relative path resolve correctly
COPY shared /build/shared
COPY web-client .

# Build with empty VITE_API_URL — the client will be served by the same Express
# server, so API requests go to the same origin with no absolute URL needed
RUN VITE_API_URL="" npx vite build

# ── Stage 2: server runtime ──────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app/server

# Install server deps (includes tsx for running TypeScript directly)
COPY server/package*.json ./
RUN npm install

# Server source + shared types
COPY server/src ./src
COPY shared /app/shared

# Built web client — server resolves ../../web-client/dist from /app/server/src
COPY --from=web-builder /build/web-client/dist /app/web-client/dist

ENV PORT=3001
ENV STATIC_PATH=/app/web-client/dist
EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
