# Build from the repository root: docker build -f infra/docker/api.Dockerfile .
FROM node:20-bookworm-slim AS build
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @asset-sentinel/shared --workspace @asset-sentinel/api --include-workspace-root
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @asset-sentinel/shared && npm run build -w @asset-sentinel/api

FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/shared packages/shared
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/prisma apps/api/prisma
COPY --from=build /repo/apps/api/package.json apps/api/
USER node
WORKDIR /repo/apps/api
EXPOSE 3000
# Apply the schema, then start. Replace `db push` with `migrate deploy` once migrations exist.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
