# D-12 / D-02: one image family for both modes. Bun installs dependencies and runs scripts;
# Node runs the tools (Vite, TypeScript), because that is the runtime they document support for.
FROM oven/bun:1.4.2-slim AS bun

# D-21: the secrets scanner `check` runs, pinned by digest (the multi-arch index of v1.8.1); the host pins
# the same version in mise.toml.
FROM ghcr.io/betterleaks/betterleaks@sha256:8b9d12db5e11ca798029da44923503de5d8cfff6992cffaaa6722fbeb9fc7797 AS betterleaks

FROM node:24.21.0-slim AS base
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY --from=betterleaks /usr/bin/betterleaks /usr/local/bin/betterleaks
WORKDIR /app

# Dependencies come from the lockfile only: a package.json that disagrees with bun.lock fails here (QR-13).
# No third-party install script runs in the image (QR-24): nothing the app builds with needs one, and
# Bun's built-in trust list would otherwise let better-sqlite3 (pulled in by the host-only CodeGraph)
# start a native node-gyp build that the slim image cannot complete.
FROM base AS deps
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --ignore-scripts

# Development form: compose bind-mounts the source; node_modules stays in a named volume, never on the host.
# The volume outlives the image, so every start re-syncs it with the lockfile — a no-op when nothing changed.
FROM deps AS dev
EXPOSE 5173
CMD ["sh", "-c", "bun install --frozen-lockfile --ignore-scripts && exec node_modules/.bin/vite --host 0.0.0.0 --port 5173 --strictPort"]

FROM deps AS build
COPY . .
RUN bun run build

# Production form: the built bundle behind a real web server — what every browser test runs against (D-12).
FROM caddy:2.11.4-alpine AS prod
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
