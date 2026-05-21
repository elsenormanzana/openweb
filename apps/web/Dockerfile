FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

COPY apps/web apps/web
# Builds both the client bundle (dist/client) and the SSR bundle (dist/server).
RUN npm run build -w apps/web

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci --omit=dev --workspace apps/web --include-workspace-root

COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/apps/web/server.js apps/web/server.js

EXPOSE 80
CMD ["node", "apps/web/server.js"]
