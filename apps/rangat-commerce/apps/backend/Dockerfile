# Medusa backend image. One image, three run modes via MEDUSA_WORKER_MODE
# (server | worker | shared) — see docker-compose.yml on the droplet.
FROM node:20-slim AS build
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

# Workspace-aware install: copy just the manifests first so this layer caches
# across rebuilds that don't touch dependencies.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/backend/package.json apps/backend/package.json
RUN pnpm install --frozen-lockfile --filter=@dtc/backend...

COPY apps/backend apps/backend
RUN pnpm --filter=@dtc/backend build

FROM node:20-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/backend/package.json apps/backend/package.json
# Full install, not --prod: unverified whether `medusa start`/`db:migrate`
# need any devDependency (e.g. typescript) at runtime — matching the build
# stage's install avoids gambling on that. Cheap tradeoff on a 2GB droplet.
RUN pnpm install --frozen-lockfile --filter=@dtc/backend...

COPY --from=build /repo/apps/backend/.medusa apps/backend/.medusa
COPY apps/backend/medusa-config.ts apps/backend/medusa-config.ts
COPY apps/backend/src apps/backend/src

WORKDIR /repo/apps/backend
EXPOSE 9000
# Default: just start. The compose "web" service overrides this to run
# `predeploy` (migrations) first — only one container should race migrations.
CMD ["pnpm", "start"]
