# Build from the repository root: docker build -f infra/docker/web.Dockerfile .
FROM node:20-alpine AS build
WORKDIR /repo
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @asset-sentinel/shared --workspace @asset-sentinel/web --include-workspace-root
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @asset-sentinel/shared && npm run build -w @asset-sentinel/web

FROM nginx:1.27-alpine
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
