#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
STACK_FILE="$DEPLOY_DIR/docker-stack.yml"
ENV_FILE="$DEPLOY_DIR/.env"

POSTGRES_DB=""
POSTGRES_USER=""
POSTGRES_PASSWORD=""
JWT_SECRET=""
MODE="compose"
STACK_NAME="openweb"
HAS_BACKUP="no"
BACKUP_ZIP=""

COLOR_RESET=""
COLOR_DIM=""
COLOR_CYAN=""
COLOR_GREEN=""
COLOR_YELLOW=""
COLOR_RED=""

TOTAL_STEPS=6

init_colors() {
  if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
    COLOR_RESET="$(tput sgr0)"
    COLOR_DIM="$(tput dim)"
    COLOR_CYAN="$(tput setaf 6)"
    COLOR_GREEN="$(tput setaf 2)"
    COLOR_YELLOW="$(tput setaf 3)"
    COLOR_RED="$(tput setaf 1)"
  fi
}

screen_clear() {
  if command -v clear >/dev/null 2>&1; then
    clear
  else
    printf '\033c'
  fi
}

ui_hr() {
  printf '+------------------------------------------------------------------+\n'
}

ui_empty() {
  printf '|                                                                  |\n'
}

ui_line() {
  local text="$1"
  printf '| %-64s |\n' "$text"
}

ui_header() {
  local title="$1"
  local step="${2:-}"
  screen_clear
  ui_hr
  ui_line "OpenWeb Deployment Wizard"
  if [ -n "$step" ]; then
    ui_line "Step $step/$TOTAL_STEPS"
  fi
  ui_hr
  ui_line "$title"
  ui_hr
}

status_info() {
  printf '%s[INFO]%s %s\n' "$COLOR_CYAN" "$COLOR_RESET" "$1"
}

status_ok() {
  printf '%s[OK]%s   %s\n' "$COLOR_GREEN" "$COLOR_RESET" "$1"
}

status_warn() {
  printf '%s[WARN]%s %s\n' "$COLOR_YELLOW" "$COLOR_RESET" "$1"
}

fatal() {
  printf '%s[ERROR]%s %s\n' "$COLOR_RED" "$COLOR_RESET" "$1" >&2
  exit 1
}

pause_continue() {
  printf '\nPress Enter to continue... '
  read -r _
}

to_lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fatal "Missing required command: $1"
  fi
}

prompt_input() {
  local label="$1"
  local default_value="$2"
  local value=""
  while true; do
    printf '%s [%s]: ' "$label" "$default_value" >&2
    read -r value
    if [ -z "$value" ]; then
      value="$default_value"
    fi
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return
    fi
    status_warn "Value cannot be empty." >&2
  done
}

prompt_secret() {
  local label="$1"
  local default_value="$2"
  local value=""
  while true; do
    printf '%s [%s]: ' "$label" "$default_value" >&2
    stty -echo
    read -r value
    stty echo
    printf '\n' >&2
    if [ -z "$value" ]; then
      value="$default_value"
    fi
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return
    fi
    status_warn "Value cannot be empty." >&2
  done
}

prompt_yes_no() {
  local label="$1"
  local default_value="$2"
  local raw=""
  local value=""
  while true; do
    printf '%s [%s]: ' "$label" "$default_value" >&2
    read -r raw
    if [ -z "$raw" ]; then
      raw="$default_value"
    fi
    value="$(to_lower "$raw")"
    case "$value" in
      y|yes)
        printf 'yes'
        return
        ;;
      n|no)
        printf 'no'
        return
        ;;
      *)
        status_warn "Please type yes or no." >&2
        ;;
    esac
  done
}

generate_jwt_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n'
    return
  fi
  if [ -r /dev/urandom ] && command -v base64 >/dev/null 2>&1; then
    head -c 48 /dev/urandom | base64 | tr -d '\n'
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    date +%s | shasum | awk '{print $1}'
    return
  fi
  date +%s
}

check_prereqs() {
  ui_header "Prerequisites Check" 1
  status_info "Checking required tooling..."

  require_cmd docker
  status_ok "docker"

  require_cmd unzip
  status_ok "unzip"

  if ! docker compose version >/dev/null 2>&1; then
    fatal "Docker Compose plugin is required (docker compose)."
  fi
  status_ok "docker compose"

  ui_empty
  ui_line "All prerequisite checks passed."
  ui_hr
  pause_continue
}

collect_database() {
  ui_header "Database & Security" 2
  printf 'Provide database credentials that containers will use.\n\n'

  POSTGRES_DB="$(prompt_input "Postgres database name" "openweb")"
  POSTGRES_USER="$(prompt_input "Postgres username" "openweb")"
  POSTGRES_PASSWORD="$(prompt_secret "Postgres password" "change_me")"
  JWT_SECRET="$(generate_jwt_secret)"

  printf '\n'
  status_ok "JWT secret auto-generated."
  pause_continue
}

collect_mode() {
  local choice=""
  while true; do
    ui_header "Docker Runtime Mode" 3
    ui_line "1) Docker Compose (single node)"
    ui_line "2) Docker Swarm (autoscaler enabled)"
    ui_hr
    printf 'Choose mode [1]: '
    read -r choice
    choice="${choice:-1}"
    case "$choice" in
      1)
        MODE="compose"
        STACK_NAME="openweb"
        status_ok "Mode selected: Docker Compose"
        pause_continue
        return
        ;;
      2)
        MODE="swarm"
        STACK_NAME="$(prompt_input "Swarm stack name" "openweb")"
        status_ok "Mode selected: Docker Swarm"
        pause_continue
        return
        ;;
      *)
        status_warn "Invalid option: $choice"
        pause_continue
        ;;
    esac
  done
}

collect_backup() {
  ui_header "Optional Backup Restore" 4
  ui_line "You can restore a backup ZIP during setup."
  ui_line "Required in ZIP: database.sql"
  ui_line "Optional in ZIP: uploads/"
  ui_hr

  HAS_BACKUP="$(prompt_yes_no "Do you want to restore a backup ZIP now?" "no")"

  if [ "$HAS_BACKUP" = "yes" ]; then
    while true; do
      printf 'Backup ZIP path: '
      read -r BACKUP_ZIP
      BACKUP_ZIP="${BACKUP_ZIP/#\~/$HOME}"
      if [ -f "$BACKUP_ZIP" ]; then
        status_ok "Backup file found."
        break
      fi
      status_warn "File not found: $BACKUP_ZIP"
    done
  else
    BACKUP_ZIP=""
  fi

  pause_continue
}

print_summary() {
  ui_line "Postgres DB:      $POSTGRES_DB"
  ui_line "Postgres User:    $POSTGRES_USER"
  ui_line "Docker Mode:      $MODE"
  if [ "$MODE" = "swarm" ]; then
    ui_line "Stack Name:       $STACK_NAME"
  fi
  ui_line "Restore Backup:   $HAS_BACKUP"
  if [ "$HAS_BACKUP" = "yes" ]; then
    ui_line "Backup ZIP:       $BACKUP_ZIP"
  fi
}

review_and_confirm() {
  local choice=""
  while true; do
    ui_header "Review & Confirm" 5
    print_summary
    ui_hr
    ui_line "1) Deploy now"
    ui_line "2) Edit database settings"
    ui_line "3) Edit docker mode"
    ui_line "4) Edit backup restore"
    ui_line "5) Exit without changes"
    ui_hr
    printf 'Choose action [1]: '
    read -r choice
    choice="${choice:-1}"

    case "$choice" in
      1) return ;;
      2) collect_database ;;
      3) collect_mode ;;
      4) collect_backup ;;
      5)
        ui_header "Cancelled"
        ui_line "No changes were applied."
        ui_hr
        exit 0
        ;;
      *)
        status_warn "Invalid option: $choice"
        pause_continue
        ;;
    esac
  done
}

write_env_file() {
  cat > "$ENV_FILE" <<ENV
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET

STACK_NAME=$STACK_NAME
API_MIN_REPLICAS=2
API_MAX_REPLICAS=10
WEB_MIN_REPLICAS=2
WEB_MAX_REPLICAS=10
SCALE_UP_CPU=70
SCALE_DOWN_CPU=25
CHECK_INTERVAL_SECONDS=30
COOLDOWN_SECONDS=120
ENV
}

wait_for_container() {
  local mode="$1"
  local service_name="$2"
  local stack_name="${3:-}"
  local i=1
  local cid=""

  while [ "$i" -le 40 ]; do
    if [ "$mode" = "compose" ]; then
      cid="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q "$service_name" || true)"
    else
      cid="$(docker ps -q --filter "label=com.docker.swarm.service.name=${stack_name}_${service_name}" | head -n 1 || true)"
    fi

    if [ -n "$cid" ]; then
      printf '%s\n' "$cid"
      return
    fi

    sleep 2
    i=$((i + 1))
  done

  fatal "Timed out waiting for container: $service_name"
}

wait_for_postgres_compose() {
  local i=1
  status_info "Waiting for Postgres readiness (Compose)"
  while [ "$i" -le 60 ]; do
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
      pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      status_ok "Postgres is ready."
      return
    fi
    sleep 2
    i=$((i + 1))
  done
  fatal "Postgres did not become ready in time (Compose)."
}

wait_for_postgres_swarm() {
  local pg_container=""
  local i=1
  status_info "Waiting for Postgres readiness (Swarm)"
  pg_container="$(wait_for_container swarm postgres "$STACK_NAME")"
  while [ "$i" -le 60 ]; do
    if docker exec "$pg_container" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      status_ok "Postgres is ready."
      return
    fi
    sleep 2
    i=$((i + 1))
  done
  fatal "Postgres did not become ready in time (Swarm)."
}

prepare_nginx_config() {
  local conf="$DEPLOY_DIR/nginx/nginx.conf"
  local tmp_file=""

  [ -f "$conf" ] || fatal "Missing NGINX config: $conf"
  tmp_file="$(mktemp)"

  # Keep a single thread_pool directive in main context (after worker_rlimit_nofile).
  awk '
    BEGIN { inserted = 0 }
    /^[[:space:]]*thread_pool[[:space:]]+/ { next }
    {
      print $0
      if ($0 ~ /^[[:space:]]*worker_rlimit_nofile[[:space:]]+/ && inserted == 0) {
        print "thread_pool io_pool threads=32 max_queue=65536;"
        inserted = 1
      }
    }
  ' "$conf" > "$tmp_file"

  mv "$tmp_file" "$conf"
  status_ok "NGINX config prepared (thread_pool in main context)."
}

verify_nginx_compose() {
  local proxy_container=""
  status_info "Validating NGINX config (Compose)"
  proxy_container="$(wait_for_container compose proxy)"
  if ! docker exec "$proxy_container" nginx -t >/dev/null 2>&1; then
    docker exec "$proxy_container" nginx -t || true
    fatal "NGINX validation failed in Compose."
  fi
  status_ok "NGINX config valid (Compose)."
}

verify_nginx_swarm() {
  local proxy_container=""
  status_info "Validating NGINX config (Swarm)"
  proxy_container="$(wait_for_container swarm proxy "$STACK_NAME")"
  if ! docker exec "$proxy_container" nginx -t >/dev/null 2>&1; then
    docker exec "$proxy_container" nginx -t || true
    fatal "NGINX validation failed in Swarm."
  fi
  status_ok "NGINX config valid (Swarm)."
}

run_migrations_compose() {
  local f
  wait_for_postgres_compose
  status_info "Running DB migrations (Compose)"
  for f in "$ROOT_DIR"/apps/api/drizzle/*.sql; do
    [ -f "$f" ] || continue
    printf '  - %s\n' "$(basename "$f")"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$f"
  done
}

run_migrations_swarm() {
  local pg_container=""
  local f

  wait_for_postgres_swarm
  status_info "Running DB migrations (Swarm)"
  pg_container="$(wait_for_container swarm postgres "$STACK_NAME")"
  for f in "$ROOT_DIR"/apps/api/drizzle/*.sql; do
    [ -f "$f" ] || continue
    printf '  - %s\n' "$(basename "$f")"
    docker exec -i "$pg_container" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$f"
  done
}

restore_backup_zip_compose() {
  local backup_zip="$1"
  local tmp_dir=""
  local api_container=""

  tmp_dir="$(mktemp -d)"
  unzip -o "$backup_zip" -d "$tmp_dir" >/dev/null

  if [ ! -f "$tmp_dir/database.sql" ]; then
    rm -rf "$tmp_dir"
    fatal "Backup ZIP is missing database.sql"
  fi

  wait_for_postgres_compose
  status_info "Restoring backup (Compose)"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$tmp_dir/database.sql"

  if [ -d "$tmp_dir/uploads" ]; then
    api_container="$(wait_for_container compose api)"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api \
      sh -c 'rm -rf /app/apps/api/uploads/* && mkdir -p /app/apps/api/uploads'
    docker cp "$tmp_dir/uploads/." "$api_container":/app/apps/api/uploads
  fi

  rm -rf "$tmp_dir"
  status_ok "Backup restored."
}

restore_backup_zip_swarm() {
  local backup_zip="$1"
  local tmp_dir=""
  local pg_container=""
  local api_container=""

  tmp_dir="$(mktemp -d)"
  unzip -o "$backup_zip" -d "$tmp_dir" >/dev/null

  if [ ! -f "$tmp_dir/database.sql" ]; then
    rm -rf "$tmp_dir"
    fatal "Backup ZIP is missing database.sql"
  fi

  wait_for_postgres_swarm
  status_info "Restoring backup (Swarm)"
  pg_container="$(wait_for_container swarm postgres "$STACK_NAME")"
  api_container="$(wait_for_container swarm api "$STACK_NAME")"

  docker exec -i "$pg_container" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
  docker exec -i "$pg_container" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$tmp_dir/database.sql"

  if [ -d "$tmp_dir/uploads" ]; then
    docker exec "$api_container" sh -c 'rm -rf /app/apps/api/uploads/* && mkdir -p /app/apps/api/uploads'
    docker cp "$tmp_dir/uploads/." "$api_container":/app/apps/api/uploads
  fi

  rm -rf "$tmp_dir"
  status_ok "Backup restored."
}

deploy_compose() {
  status_info "Starting services with Docker Compose"
  prepare_nginx_config
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
  verify_nginx_compose
  run_migrations_compose
  if [ "$HAS_BACKUP" = "yes" ]; then
    restore_backup_zip_compose "$BACKUP_ZIP"
  fi
}

deploy_swarm() {
  local swarm_state="inactive"

  status_info "Building images for Swarm"
  prepare_nginx_config
  docker build -f "$ROOT_DIR/apps/api/Dockerfile" -t openweb-api:latest "$ROOT_DIR"
  docker build -f "$ROOT_DIR/apps/web/Dockerfile" -t openweb-web:latest "$ROOT_DIR"
  docker build -f "$ROOT_DIR/deploy/autoscaler/Dockerfile" -t openweb-autoscaler:latest "$ROOT_DIR"

  swarm_state="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || printf 'inactive')"
  if [ "$swarm_state" != "active" ]; then
    status_info "Initializing Docker Swarm"
    docker swarm init
  fi

  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a

  status_info "Deploying stack: $STACK_NAME"
  docker stack deploy -c "$STACK_FILE" "$STACK_NAME"

  verify_nginx_swarm
  run_migrations_swarm
  if [ "$HAS_BACKUP" = "yes" ]; then
    restore_backup_zip_swarm "$BACKUP_ZIP"
  fi
}

show_completion() {
  ui_header "Deployment Complete" 6
  ui_line "Setup completed successfully."
  ui_empty
  ui_line "App URL:          http://localhost"
  ui_line "Setup URL:        http://localhost/setup"
  ui_line "Admin URL:        http://localhost/admin"
  ui_hr
  printf '\n%sTip:%s update domain/TLS/reverse-proxy before going live.\n' "$COLOR_DIM" "$COLOR_RESET"
}

main() {
  trap 'stty echo 2>/dev/null || true' EXIT INT TERM

  init_colors
  check_prereqs
  collect_database
  collect_mode
  collect_backup
  review_and_confirm

  ui_header "Deploying" 6
  status_info "Writing env file: $ENV_FILE"
  write_env_file

  if [ "$MODE" = "compose" ]; then
    deploy_compose
  else
    deploy_swarm
  fi

  show_completion
}

main "$@"
