#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <backup_dir>"
  exit 1
fi

BACKUP_DIR="$1"
if [ ! -d "$BACKUP_DIR" ]; then
  echo "backup directory not found: $BACKUP_DIR"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/docker-compose.yml}"
DB_USER="${DB_USER:-${POSTGRES_USER:-openweb}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-openweb}}"

echo "[restore] starting services"
docker compose -f "$COMPOSE_FILE" up -d postgres redis api web proxy

echo "[restore] restoring postgres"
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_DIR/postgres.sql"

echo "[restore] restoring uploads"
API_CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps -q api)"
docker compose -f "$COMPOSE_FILE" exec -T api sh -c 'rm -rf /app/apps/api/uploads/* && mkdir -p /app/apps/api/uploads'
docker cp "$BACKUP_DIR/uploads/." "$API_CONTAINER":/app/apps/api/uploads

echo "[restore] restoring redis"
REDIS_CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps -q redis)"
docker cp "$BACKUP_DIR/redis.dump.rdb" "$REDIS_CONTAINER":/data/dump.rdb
docker compose -f "$COMPOSE_FILE" restart redis >/dev/null

echo "[restore] completed"
echo "[restore] code snapshot is available at: $BACKUP_DIR/source.tar.gz"
