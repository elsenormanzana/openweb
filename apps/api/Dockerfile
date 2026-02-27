FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

COPY apps/api apps/api
RUN npm run build -w apps/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache zip unzip postgresql-client

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci --omit=dev --workspace apps/api --include-workspace-root

COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/drizzle apps/api/drizzle
RUN mkdir -p /app/apps/api/uploads /app/apps/api/backups

EXPOSE 3000
CMD ["npm", "run", "start", "-w", "apps/api"]
