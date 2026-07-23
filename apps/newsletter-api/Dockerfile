FROM node:22-alpine

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/newsletter-api/package.json apps/newsletter-api/package.json
RUN pnpm install --frozen-lockfile --filter @grove/newsletter-api...

COPY apps/newsletter-api apps/newsletter-api
RUN pnpm --filter @grove/newsletter-api build

ENV NODE_ENV=production
CMD ["sh", "-c", "pnpm --filter @grove/newsletter-api migrate && exec pnpm --filter @grove/newsletter-api start"]
