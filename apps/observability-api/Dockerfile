FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/observability-api/package.json apps/observability-api/package.json
RUN pnpm install --frozen-lockfile --filter @grove/observability-api...
COPY apps/observability-api apps/observability-api
RUN pnpm --filter @grove/observability-api build

FROM node:22-bookworm-slim
RUN corepack enable
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/observability-api apps/observability-api
CMD ["pnpm", "--filter", "@grove/observability-api", "start"]
