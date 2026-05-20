#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
COMPOSE_FILE="${COMPOSE_FILE:-$DEPLOY_DIR/docker-compose.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/backups}"
DB_USER="${DB_USER:-${POSTGRES_USER:-openweb}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-openweb}}"

TS="$(date +%Y%m%d_%H%M%S)"
DEST="$BACKUP_ROOT/$TS"
mkdir -p "$DEST"

echo "[backup] writing backup to $DEST"

# Code snapshot (tracked files + current local patch)
git -C "$ROOT_DIR" archive --format=tar.gz -o "$DEST/source.tar.gz" HEAD
git -C "$ROOT_DIR" diff --binary > "$DEST/working-tree.patch" || true
git -C "$ROOT_DIR" rev-parse HEAD > "$DEST/git-commit.txt"

# Postgres SQL backup
API_CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps -q api)"
POSTGRES_CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps -q postgres)"

if [ -z "$POSTGRES_CONTAINER" ] || [ -z "$API_CONTAINER" ]; then
  echo "[backup] required services are not running. start stack first with docker compose up -d"
  exit 1
fi

docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" > "$DEST/postgres.sql"

# Uploads snapshot
docker cp "$API_CONTAINER":/app/apps/api/uploads "$DEST/uploads"

cat > "$DEST/metadata.txt" <<META
timestamp=$TS
compose_file=$COMPOSE_FILE
db_user=$DB_USER
db_name=$DB_NAME
META

echo "[backup] completed"
