FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# Build frontend only (API runs from source via tsx)
FROM deps AS build
COPY . .
RUN pnpm --filter=web build

# Production image
FROM base AS runner
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules apps/web/node_modules
COPY --from=deps /app/packages/db/node_modules packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules packages/shared/node_modules

COPY packages/ packages/
COPY apps/api/ apps/api/
COPY --from=build /app/apps/web/dist/ apps/web/dist/
COPY pnpm-workspace.yaml package.json ./

ENV NODE_ENV=production
ENV API_PORT=3001
ENV API_HOST=0.0.0.0
EXPOSE 3001

CMD ["npx", "tsx", "apps/api/src/index.ts"]
