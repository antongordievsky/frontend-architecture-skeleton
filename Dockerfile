# D-12 / D-02: one image family for both modes. Bun installs dependencies and runs scripts;
# Node runs the tools (Vite, TypeScript), because that is the runtime they document support for.
FROM oven/bun:1.4.2-slim AS bun

FROM node:24.21.0-slim AS base
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

# Dependencies come from the lockfile only: a package.json that disagrees with bun.lock fails here (QR-13).
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Development form: compose bind-mounts the source; node_modules stays in a named volume, never on the host.
FROM deps AS dev
EXPOSE 5173
CMD ["node_modules/.bin/vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

FROM deps AS build
COPY . .
RUN bun run build

# Production form: the built bundle behind a real web server — what every browser test runs against (D-12).
FROM caddy:2.11.4-alpine AS prod
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
