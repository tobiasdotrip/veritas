# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
COPY packages/etl/package.json packages/etl/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY packages/etl packages/etl
COPY apps/backend apps/backend
COPY apps/frontend apps/frontend
RUN pnpm build

FROM node:24-alpine AS backend
WORKDIR /app
RUN corepack enable && \
    addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter @veritas/backend...

COPY --chown=nodejs:nodejs --from=build /app/apps/backend/dist apps/backend/dist
COPY --chown=nodejs:nodejs --from=build /app/packages/shared/dist packages/shared/dist

WORKDIR /app/apps/backend
USER nodejs
EXPOSE 3000
CMD ["node", "dist/server.js"]

FROM node:24-alpine AS frontend
WORKDIR /app
RUN corepack enable && \
    addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter @veritas/frontend...

COPY --chown=nodejs:nodejs --from=build /app/apps/frontend/dist apps/frontend/dist
COPY --chown=nodejs:nodejs --from=build /app/packages/shared/dist packages/shared/dist

WORKDIR /app/apps/frontend
USER nodejs
EXPOSE 3001
CMD ["node", "dist/server/server.js"]
