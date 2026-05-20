#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# OpenWeb — Deployment Wizard
# -----------------------------------------------------------------------------
# TUI ARCHITECTURE NOTES
#
#  All display functions (ui_*, status_*, prompt_*) write DIRECTLY to /dev/tty.
#  This means they are safe to call from any context, including $() subshells,
#  because /dev/tty always resolves to the controlling terminal regardless of
#  how stdout is redirected.
#
#  prompt_* functions NEVER return a value via stdout. Instead, they store the
#  result in the global _REPLY variable. Callers read $_REPLY after the call.
#  This avoids the $() subshell trap that makes prompts invisible.
#
#  All `read` calls use `</dev/tty` so they always read from the terminal.
#  `read -s` is used for secret input (bash built-in, safer than stty).
#  Mouse tracking is disabled on init so mouse clicks don't corrupt reads.
# -----------------------------------------------------------------------------
# -u  : treat unset variables as errors
# -o pipefail : pipe fails if any stage fails
# NOTE: -e (errexit) is intentionally NOT set. Interactive deploy scripts must
# handle errors explicitly — set -e exits silently on any non-zero command
# (e.g. `docker compose ps` returning 1 when no containers exist), which looks
# like a crash with no message. Every critical command below uses || die instead.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
STACK_FILE="$DEPLOY_DIR/docker-stack.yml"
ENV_FILE="$DEPLOY_DIR/.env"

# ─── State variables ──────────────────────────────────────────────────────────
POSTGRES_DB=""
POSTGRES_USER=""
POSTGRES_PASSWORD=""
JWT_SECRET=""
MODE="compose"
STACK_NAME="openweb"
PUBLIC_HTTP_PORT="802"
PUBLIC_HTTPS_PORT="843"
HAS_BACKUP="no"
BACKUP_ZIP=""
DETECTED_MODE=""
DETECTED_STACK_NAME=""
DETECTED_IS_UP="no"
DETECTED_UP_DETAILS=""
DOMAIN=""
ALLOW_SUBDOMAINS="yes"
EXTRA_DOMAINS=""

# ─── TUI globals ─────────────────────────────────────────────────────────────
C0=""   # reset
CD=""   # dim
CB=""   # bold
CC=""   # cyan
CG=""   # green
CY=""   # yellow
CR=""   # red

TUI_ACTIVE=0
BOX_W=70
_BOX_TOP=""
_BOX_MID=""
_BOX_BOT=""

# Return-value slot for prompt functions — avoids $() subshell capture.
_REPLY=""

# Set this before calling exit so the EXIT trap can show the message.
_EXIT_MSG=""

TOTAL_STEPS=7

# ─── Color init ───────────────────────────────────────────────────────────────
init_colors() {
  if [ -t 1 ] && command -v tput >/dev/null 2>&1 \
     && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
    C0="$(tput sgr0    2>/dev/null || printf '')"
    CD="$(tput dim     2>/dev/null || printf '')"
    CB="$(tput bold    2>/dev/null || printf '')"
    CC="$(tput setaf 6 2>/dev/null || printf '')"
    CG="$(tput setaf 2 2>/dev/null || printf '')"
    CY="$(tput setaf 3 2>/dev/null || printf '')"
    CR="$(tput setaf 1 2>/dev/null || printf '')"
  fi
}

# ─── TUI lifecycle ────────────────────────────────────────────────────────────

init_tui() {
  [ -t 1 ] || return 0
  command -v tput >/dev/null 2>&1 || return 0
  tput smcup  >/dev/tty 2>/dev/null || true   # enter alternate screen
  tput civis  >/dev/tty 2>/dev/null || true   # hide cursor
  # Disable common mouse-tracking modes so clicks don't inject escape bytes
  printf '\033[?1000l\033[?1002l\033[?1003l\033[?1006l' >/dev/tty 2>/dev/null || true
  TUI_ACTIVE=1
}

cleanup_tui() {
  tput cnorm  >/dev/tty 2>/dev/null || true   # always restore cursor visibility
  if [ "$TUI_ACTIVE" = "1" ]; then
    tput rmcup  >/dev/tty 2>/dev/null || true   # leave alternate screen
  fi
  stty echo   </dev/tty 2>/dev/null || true
}

# Cursor helpers always target /dev/tty so they work in any subshell context.
_cur_show() { tput cnorm >/dev/tty 2>/dev/null || true; }
_cur_hide() { tput civis >/dev/tty 2>/dev/null || true; }

# ─── Box sizing ───────────────────────────────────────────────────────────────

_update_box() {
  local tw
  tw="$(tput cols 2>/dev/null || echo 80)"
  if   [ "$tw" -gt 96 ]; then BOX_W=90
  elif [ "$tw" -gt 76 ]; then BOX_W=$(( tw - 4 ))
  else                         BOX_W=72
  fi
  local r
  r="$(printf '─%.0s' $(seq 1 "$BOX_W"))"
  _BOX_TOP="╭${r}╮"
  _BOX_MID="├${r}┤"
  _BOX_BOT="╰${r}╯"
}

_cls() {
  _update_box
  if [ "$TUI_ACTIVE" = "1" ]; then
    tput clear >/dev/tty 2>/dev/null || printf '\033[2J\033[H' >/dev/tty
  else
    printf '\033[2J\033[H' >/dev/tty
  fi
}

# ─── Box primitives ───────────────────────────────────────────────────────────
# All write to /dev/tty directly.

_top()   { printf '%s\n' "$_BOX_TOP" >/dev/tty; }
_mid()   { printf '%s\n' "$_BOX_MID" >/dev/tty; }
_bot()   { printf '%s\n' "$_BOX_BOT" >/dev/tty; }
_blank() { printf '│%*s│\n' "$BOX_W" "" >/dev/tty; }

_row() {
  # Plain text row, left-padded 2 spaces, right-padded 2 spaces.
  local text="${1:-}"
  printf '│  %-*s  │\n' "$((BOX_W - 4))" "$text" >/dev/tty
}

_row_bold() {
  local text="${1:-}"
  printf '│  %s%-*s%s  │\n' "$CB" "$((BOX_W - 4))" "$text" "$C0" >/dev/tty
}

_row_dim() {
  local text="${1:-}"
  printf '│  %s  %-*s%s  │\n' "$CD" "$((BOX_W - 7))" "$text" "$C0" >/dev/tty
}

_row_kv() {
  local key="$1" val="$2"
  printf '│  %s%-18s%s %s%-*s%s  │\n' \
    "$CD" "$key"  "$C0" \
    "$CB" "$((BOX_W - 4 - 19))" "$val" "$C0" >/dev/tty
}

_row_logo() {
  local t="✦  OpenWeb  ·  Deployment Wizard"
  printf '│  %s%-*s%s  │\n' "${CB}${CC}" "$((BOX_W - 4))" "$t" "$C0" >/dev/tty
}

_row_step() {
  local cur="$1" tot="$2"
  local label="Step $cur of $tot"
  printf '│  %s%*s%s  │\n' "$CD" "$((BOX_W - 4 - ${#label} + ${#label}))" "$label" "$C0" >/dev/tty
}

_row_progress() {
  local cur="$1" tot="$2"
  local bw=$(( BOX_W - 8 ))
  local filled=$(( bw * cur / tot )) empty=$(( bw - bw * cur / tot ))
  local bar="" i=0
  while [ "$i" -lt "$filled" ]; do bar="${bar}█"; i=$(( i+1 )); done
  i=0
  while [ "$i" -lt "$empty"  ]; do bar="${bar}░"; i=$(( i+1 )); done
  printf '│  %s%s%s  │\n' "$CG" "$bar" "$C0" >/dev/tty
}

_row_center() {
  # $1 = visible text, $2 = optional ANSI prefix, $3 = optional ANSI suffix
  local t="$1" pre="${2:-}" suf="${3:-}"
  local lpad=$(( (BOX_W - ${#t}) / 2 ))
  local rpad=$(( BOX_W - lpad - ${#t} ))
  printf '│%*s%s%s%s%*s│\n' "$lpad" "" "$pre" "$t" "$suf" "$rpad" "" >/dev/tty
}

# ─── Screen header ────────────────────────────────────────────────────────────

_header() {
  local title="$1" step="${2:-}"
  _cls
  _top
  _row_logo
  _mid
  if [ -n "$step" ]; then
    _row_step     "$step" "$TOTAL_STEPS"
    _row_progress "$step" "$TOTAL_STEPS"
    _blank
  fi
  _row_bold "$title"
  _mid
}

# ─── Status lines ─────────────────────────────────────────────────────────────

_info() { printf '  %s·%s  %s\n' "$CC" "$C0" "$1" >/dev/tty; }
_ok()   { printf '  %s✓%s  %s\n' "$CG" "$C0" "$1" >/dev/tty; }
_warn() { printf '  %s⚠%s  %s\n' "$CY" "$C0" "$1" >/dev/tty; }

# die: show an error box and exit.
# Use this instead of relying on set -e to crash silently.
die() {
  _EXIT_MSG="${1:-An unexpected error occurred.}"
  _show_error_screen
  exit 1
}

# Alias kept for back-compat with internal calls.
fatal() { die "$1"; }

_show_error_screen() {
  local msg="${_EXIT_MSG:-}"
  [ -z "$msg" ] && return   # clean exit — nothing to show
  _update_box 2>/dev/null || true
  printf '\n' >/dev/tty 2>/dev/null || true
  _top  >/dev/tty 2>/dev/null || true
  printf '│  %s%-*s%s  │\n' "${CR}${CB}" "$((BOX_W - 4))" "Deployment Error" "$C0" \
    >/dev/tty 2>/dev/null || true
  printf '%s\n' "$_BOX_MID" >/dev/tty 2>/dev/null || true
  printf '│  %-*s  │\n' "$((BOX_W - 4))" "$msg" >/dev/tty 2>/dev/null || true
  printf '│  %-*s  │\n' "$((BOX_W - 4))" "" >/dev/tty 2>/dev/null || true
  printf '%s\n' "$_BOX_BOT" >/dev/tty 2>/dev/null || true
  printf '\n  %sPress Enter to exit…%s ' "$CD" "$C0" >/dev/tty 2>/dev/null || true
  tput cnorm >/dev/tty 2>/dev/null || true
  IFS= read -r _ </dev/tty 2>/dev/null || true
}

# ─── Input primitives ─────────────────────────────────────────────────────────
#
# KEY DESIGN: All input functions write prompts directly to /dev/tty.
# They NEVER print the result to stdout.  The result is stored in _REPLY.
# Callers do:
#   prompt_input "label" "default"
#   MY_VAR="$_REPLY"
#
# This avoids the $() subshell trap where stdout is a pipe and all
# printf display goes to the capture buffer instead of the terminal.

_pause() {
  printf '\n  %sPress Enter to continue…%s ' "$CD" "$C0" >/dev/tty
  _cur_show
  IFS= read -r _ </dev/tty
  _cur_hide
}

to_lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

sql_escape() { printf "%s" "$1" | sed "s/'/''/g"; }

is_valid_port() {
  local p="$1"
  [ -n "$p" ] || return 1
  printf '%s' "$p" | grep -qE '^[0-9]+$' || return 1
  [ "$p" -ge 1 ] 2>/dev/null && [ "$p" -le 65535 ] 2>/dev/null
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fatal "Missing required command: $1"
}

prompt_input() {
  # $1 = label, $2 = default value → result in _REPLY
  local label="$1" def="$2" val=""
  _REPLY=""
  while true; do
    printf '\n  %s›%s  %s%s%s' "$CC" "$C0" "$CB" "$label" "$C0" >/dev/tty
    [ -n "$def" ] && printf ' %s[%s]%s' "$CD" "$def" "$C0" >/dev/tty
    printf ': ' >/dev/tty
    _cur_show
    IFS= read -r val </dev/tty
    _cur_hide
    [ -z "$val" ] && val="$def"
    if [ -n "$val" ]; then _REPLY="$val"; return; fi
    printf '  %s⚠%s  Value cannot be empty.\n' "$CY" "$C0" >/dev/tty
  done
}

prompt_secret() {
  # $1 = label, $2 = default value → result in _REPLY
  # Uses `read -s` (bash built-in) — never stty, so echo is always safe.
  local label="$1" def="$2" val=""
  _REPLY=""
  while true; do
    printf '\n  %s›%s  %s%s%s' "$CC" "$C0" "$CB" "$label" "$C0" >/dev/tty
    [ -n "$def" ] && printf ' %s[%s]%s' "$CD" "$def" "$C0" >/dev/tty
    printf ': ' >/dev/tty
    _cur_show
    IFS= read -r -s val </dev/tty
    _cur_hide
    printf '\n' >/dev/tty
    [ -z "$val" ] && val="$def"
    if [ -n "$val" ]; then _REPLY="$val"; return; fi
    printf '  %s⚠%s  Value cannot be empty.\n' "$CY" "$C0" >/dev/tty
  done
}

prompt_yes_no() {
  # $1 = label, $2 = default (yes|no) → result in _REPLY
  local label="$1" def="$2" raw="" lv=""
  _REPLY=""
  while true; do
    printf '\n  %s›%s  %s%s%s' "$CC" "$C0" "$CB" "$label" "$C0" >/dev/tty
    [ -n "$def" ] && printf ' %s[%s]%s' "$CD" "$def" "$C0" >/dev/tty
    printf ': ' >/dev/tty
    _cur_show
    IFS= read -r raw </dev/tty
    _cur_hide
    [ -z "$raw" ] && raw="$def"
    lv="$(to_lower "$raw")"
    case "$lv" in
      y|yes) _REPLY="yes"; return ;;
      n|no)  _REPLY="no";  return ;;
      *) printf '  %s⚠%s  Please enter %syes%s or %sno%s.\n' \
           "$CY" "$C0" "$CB" "$C0" "$CB" "$C0" >/dev/tty ;;
    esac
  done
}

prompt_choice() {
  # $1 = default choice (number string) → result in _REPLY
  local def="$1" val=""
  _REPLY=""
  printf '\n  %s›%s  %sChoice%s %s[%s]%s: ' \
    "$CC" "$C0" "$CB" "$C0" "$CD" "$def" "$C0" >/dev/tty
  _cur_show
  IFS= read -r val </dev/tty
  _cur_hide
  [ -z "$val" ] && val="$def"
  _REPLY="$val"
}

generate_jwt_secret() {
  # This one is fine with $() — it has no TUI output.
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n'; return
  fi
  if [ -r /dev/urandom ] && command -v base64 >/dev/null 2>&1; then
    head -c 48 /dev/urandom | base64 | tr -d '\n'; return
  fi
  date +%s
}

run_compose() {
  if [ -f "$ENV_FILE" ]; then
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
  else
    docker compose -f "$COMPOSE_FILE" "$@"
  fi
}

get_env_value() {
  local key="$1"
  [ -f "$ENV_FILE" ] || { printf ''; return; }
  awk -v k="$key" -F= '$1==k {print substr($0, index($0,"=")+1); exit}' "$ENV_FILE"
}

set_env_value() {
  local key="$1" value="$2"
  mkdir -p "$DEPLOY_DIR"
  touch "$ENV_FILE"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" -F= '
      $1==k { print k "=" v; next }
      { print $0 }
    ' "$ENV_FILE" > "$tmp"
    mv "$tmp" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

# ─── Splash screen ────────────────────────────────────────────────────────────

show_splash() {
  local th; th="$(tput lines 2>/dev/null || echo 24)"
  _cls
  local top_pad=$(( (th - 16) / 2 ))
  [ "$top_pad" -lt 0 ] && top_pad=0
  local i=0
  while [ "$i" -lt "$top_pad" ]; do printf '\n' >/dev/tty; i=$(( i+1 )); done

  _top
  _blank
  _blank
  _row_center "✦  OpenWeb" "${CB}${CC}" "$C0"
  _row_center "Deployment Wizard" "$CD" "$C0"
  _blank
  _mid
  _blank
  _row_center "Interactive setup for self-hosted deployments"
  _blank
  _mid
  _blank
  _row_center "Press  Enter  to begin" "$CD" "$C0"
  _blank
  _bot

  _cur_show
  IFS= read -r _ </dev/tty
  _cur_hide
}

# ─── Step 1 — Prerequisites ───────────────────────────────────────────────────

detect_existing_deployment() {
  local swarm_state="" stack="" hs_api="" hs_web="" ca="" cw=""
  DETECTED_MODE=""; DETECTED_STACK_NAME=""

  swarm_state="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null \
    || printf 'inactive')"
  if [ "$swarm_state" = "active" ]; then
    while IFS= read -r stack; do
      [ -n "$stack" ] || continue
      hs_api="$(docker service ls --format '{{.Name}}' \
        | grep -E "^${stack}_api$" || true)"
      hs_web="$(docker service ls --format '{{.Name}}' \
        | grep -E "^${stack}_web$" || true)"
      if [ -n "$hs_api" ] && [ -n "$hs_web" ]; then
        DETECTED_MODE="swarm"; DETECTED_STACK_NAME="$stack"; return
      fi
    done <<EOF
$(docker stack ls --format '{{.Name}}' 2>/dev/null || true)
EOF
  fi

  ca="$(run_compose ps -q api 2>/dev/null || true)"
  cw="$(run_compose ps -q web 2>/dev/null || true)"
  if [ -n "$ca" ] || [ -n "$cw" ]; then
    DETECTED_MODE="compose"; DETECTED_STACK_NAME="openweb"
  fi
}

check_detected_deployment_up() {
  DETECTED_IS_UP="no"
  DETECTED_UP_DETAILS=""
  [ -n "$DETECTED_MODE" ] || return 0

  if [ "$DETECTED_MODE" = "compose" ]; then
    local running="" required="" missing="" certbot_status=""
    running="$(run_compose ps --services --status running 2>/dev/null || true)"
    required="api web proxy postgres"
    for svc in $required; do
      printf '%s\n' "$running" | grep -qx "$svc" || missing="$missing $svc"
    done
    if [ -z "$missing" ]; then
      DETECTED_IS_UP="yes"
      certbot_status="$(printf '%s\n' "$running" | grep -qx certbot && echo "running" || echo "not running")"
      DETECTED_UP_DETAILS="Compose deployment is running. certbot: $certbot_status."
    else
      DETECTED_UP_DETAILS="Compose deployment detected but not fully running. Missing:$missing"
    fi
    return 0
  fi

  local stack="$DETECTED_STACK_NAME" required="" svc="" line="" reps="" cur="" des="" missing="" certbot_line=""
  required="api web proxy postgres"
  for svc in $required; do
    line="$(docker service ls --format '{{.Name}} {{.Replicas}}' 2>/dev/null | awk -v n="${stack}_${svc}" '$1==n {print; exit}')"
    if [ -z "$line" ]; then
      missing="$missing ${stack}_${svc}"
      continue
    fi
    reps="$(printf '%s' "$line" | awk '{print $2}')"
    cur="${reps%/*}"
    des="${reps#*/}"
    case "$cur/$des" in
      ''|*/'' ) missing="$missing ${stack}_${svc}" ;;
      *)
        [ "$des" -ge 1 ] 2>/dev/null || missing="$missing ${stack}_${svc}"
        [ "$cur" -ge 1 ] 2>/dev/null || missing="$missing ${stack}_${svc}"
        ;;
    esac
  done
  if [ -z "$missing" ]; then
    DETECTED_IS_UP="yes"
    certbot_line="$(docker service ls --format '{{.Name}} {{.Replicas}}' 2>/dev/null | awk -v n="${stack}_certbot" '$1==n {print $2; exit}')"
    [ -n "$certbot_line" ] || certbot_line="not deployed"
    DETECTED_UP_DETAILS="Swarm deployment is running. certbot: $certbot_line."
  else
    DETECTED_UP_DETAILS="Swarm deployment detected but not fully running. Missing:$missing"
  fi
}

check_prereqs() {
  _header "Prerequisites Check" 1
  _blank
  _row "Verifying required tools before setup begins."
  _bot
  printf '\n' >/dev/tty

  require_cmd docker;  _ok "docker"
  require_cmd unzip;   _ok "unzip"
  docker compose version >/dev/null 2>&1 \
    || fatal "Docker Compose plugin is required (docker compose)."
  _ok "docker compose"

  printf '\n' >/dev/tty
  _ok "All prerequisite checks passed."
  _pause
}

# ─── Step 2 — Domain Configuration ───────────────────────────────────────────

build_server_name() {
  if [ -z "$DOMAIN" ]; then printf '_'; return; fi
  local n="$DOMAIN"
  [ "$ALLOW_SUBDOMAINS" = "yes" ] && n="$n *.${DOMAIN}"
  [ -n "$EXTRA_DOMAINS" ] && n="$n $EXTRA_DOMAINS"
  printf '%s' "$n"
}

collect_domain() {
  local raw=""

  while true; do
    _header "Domain Configuration" 2
    _blank
    _row "Enter the primary domain where OpenWeb will be served."
    _row_dim "Leave blank to accept all connections (IP / local setup)."
    _blank
    _row "Examples:"
    _row "   example.com"
    _row "   myapp.io"
    _row "   staging.mycompany.com"
    _blank
    _row "nginx server_name and wildcard subdomains will be"
    _row "configured automatically."
    _bot

    printf '\n  %s›%s  %sPrimary domain%s %s[leave blank for any]%s: ' \
      "$CC" "$C0" "$CB" "$C0" "$CD" "$C0" >/dev/tty
    _cur_show
    IFS= read -r raw </dev/tty
    _cur_hide

    # Strip protocol and path
    raw="$(printf '%s' "$raw" \
      | sed 's|^https\?://||' | sed 's|/.*||' \
      | tr '[:upper:]' '[:lower:]' | sed 's/[[:space:]]//g')"

    if [ -z "$raw" ]; then
      DOMAIN=""; ALLOW_SUBDOMAINS="no"; EXTRA_DOMAINS=""
      printf '\n' >/dev/tty
      _ok "No domain set — nginx will accept all requests (server_name _)."
      _pause; return
    fi

    if printf '%s' "$raw" | grep -qE \
      '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    then
      DOMAIN="$raw"; break
    fi

    printf '\n' >/dev/tty
    _warn "\"$raw\" does not look like a valid domain. Try again."
    _pause
  done

  # ── Subdomain wildcard ────────────────────────────────────────────────────
  _header "Domain Configuration" 2
  _blank
  _row "Subdomain Policy"
  _mid
  _row "Allow all subdomains of  $DOMAIN ?"
  _row_dim "Adds  *.${DOMAIN}  to the nginx server_name directive."
  _row_dim "Recommended: yes — covers app.$DOMAIN, api.$DOMAIN, etc."
  _bot

  prompt_yes_no "Allow *.${DOMAIN}" "yes"
  ALLOW_SUBDOMAINS="$_REPLY"

  # ── Extra domains ─────────────────────────────────────────────────────────
  _header "Domain Configuration" 2
  _blank
  _row "Additional Domains  (optional)"
  _mid
  _row_dim "Enter extra domains separated by spaces, or leave blank."
  _row_dim "Example:  www.example.com  cdn.example.com"
  _bot

  printf '\n  %s›%s  %sExtra domains%s %s[leave blank to skip]%s: ' \
    "$CC" "$C0" "$CB" "$C0" "$CD" "$C0" >/dev/tty
  _cur_show
  IFS= read -r EXTRA_DOMAINS </dev/tty
  _cur_hide
  EXTRA_DOMAINS="$(printf '%s' "$EXTRA_DOMAINS" \
    | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

  # ── Summary ───────────────────────────────────────────────────────────────
  local sn; sn="$(build_server_name)"
  printf '\n' >/dev/tty
  _ok "Primary domain:  $DOMAIN"
  [ "$ALLOW_SUBDOMAINS" = "yes" ] \
    && _ok   "Subdomains:      *.${DOMAIN}" \
    || _info "Subdomains:      disabled"
  [ -n "$EXTRA_DOMAINS" ] && _ok "Extra domains:   $EXTRA_DOMAINS"
  printf '\n' >/dev/tty
  _info "nginx server_name →  ${CB}${sn}${C0}"
  _pause
}

# ─── Step 3 — Database & Security ────────────────────────────────────────────

collect_database() {
  _header "Database & Security" 3
  _blank
  _row "Provide credentials that the containers will use."
  _row_dim "These are written to deploy/.env and never leave this server."
  _bot

  prompt_input  "Postgres database name" "openweb";    POSTGRES_DB="$_REPLY"
  prompt_input  "Postgres username"      "openweb";    POSTGRES_USER="$_REPLY"
  prompt_secret "Postgres password"      "change_me";  POSTGRES_PASSWORD="$_REPLY"
  JWT_SECRET="$(generate_jwt_secret)"

  printf '\n' >/dev/tty
  _ok "JWT secret auto-generated (64-byte random)."
  _pause
}

# ─── Step 4 — Docker Runtime Mode ────────────────────────────────────────────

collect_mode() {
  local def="1"
  [ -n "$DETECTED_MODE" ] && def="3"

  while true; do
    _header "Docker Runtime Mode" 4
    _blank
    _row "1)  Docker Compose   — single-node, simplest setup"
    _row "2)  Docker Swarm     — multi-replica, autoscaler enabled"
    if [ -n "$DETECTED_MODE" ]; then
      if [ "$DETECTED_MODE" = "swarm" ]; then
        _row "3)  Resume detected  — swarm stack: $DETECTED_STACK_NAME"
      else
        _row "3)  Resume detected  — compose deployment"
      fi
    fi
    _bot

    prompt_choice "$def"
    local choice="$_REPLY"

    case "$choice" in
      1)
        MODE="compose"; STACK_NAME="openweb"
        printf '\n' >/dev/tty; _ok "Mode: Docker Compose"
        _pause; return
        ;;
      2)
        MODE="swarm"
        _header "Docker Runtime Mode" 4
        _blank
        _row "Docker Swarm selected."
        _bot
        prompt_input "Swarm stack name" "openweb"; STACK_NAME="$_REPLY"
        printf '\n' >/dev/tty; _ok "Mode: Docker Swarm  (stack: $STACK_NAME)"
        _pause; return
        ;;
      3)
        if [ -z "$DETECTED_MODE" ]; then
          printf '\n' >/dev/tty; _warn "No existing deployment detected."
          _pause; continue
        fi
        MODE="$DETECTED_MODE"
        [ "$MODE" = "swarm" ] && STACK_NAME="$DETECTED_STACK_NAME" \
                               || STACK_NAME="openweb"
        printf '\n' >/dev/tty; _ok "Using detected mode: $MODE  (stack: $STACK_NAME)"
        _pause; return
        ;;
      *)
        printf '\n' >/dev/tty; _warn "Invalid choice: $choice"
        _pause
        ;;
    esac
  done
}

collect_mode_and_ports() {
  local default_http default_https
  collect_mode

  default_http="$(get_env_value PUBLIC_HTTP_PORT)"
  default_https="$(get_env_value PUBLIC_HTTPS_PORT)"
  [ -n "$default_http" ] || default_http="$([ "$MODE" = "swarm" ] && echo 80 || echo 802)"
  [ -n "$default_https" ] || default_https="843"
  collect_public_ports "$default_http" "$default_https"
}

collect_public_ports() {
  local def_http="$1" def_https="$2"
  while true; do
    _header "Public Port Forwarding" 4
    _blank
    _row "Choose host ports forwarded to Docker proxy."
    _row_dim "HTTP  host:<port> -> container:80"
    _row_dim "HTTPS host:<port> -> container:443"
    _bot

    prompt_input "Public HTTP port" "$def_http"; PUBLIC_HTTP_PORT="$_REPLY"
    if ! is_valid_port "$PUBLIC_HTTP_PORT"; then
      printf '\n' >/dev/tty; _warn "Invalid HTTP port: $PUBLIC_HTTP_PORT"; _pause; continue
    fi

    prompt_input "Public HTTPS port" "$def_https"; PUBLIC_HTTPS_PORT="$_REPLY"
    if ! is_valid_port "$PUBLIC_HTTPS_PORT"; then
      printf '\n' >/dev/tty; _warn "Invalid HTTPS port: $PUBLIC_HTTPS_PORT"; _pause; continue
    fi

    if [ "$PUBLIC_HTTP_PORT" = "$PUBLIC_HTTPS_PORT" ]; then
      printf '\n' >/dev/tty; _warn "HTTP and HTTPS ports must be different."; _pause; continue
    fi

    printf '\n' >/dev/tty
    _ok "Port forwarding set: ${PUBLIC_HTTP_PORT}->80 and ${PUBLIC_HTTPS_PORT}->443"
    _pause
    return
  done
}

# ─── Step 5 — Backup Restore ─────────────────────────────────────────────────

collect_backup() {
  _header "Optional Backup Restore" 5
  _blank
  _row "Restore a backup ZIP created by OpenWeb's backup system."
  _blank
  _row "Required in ZIP:  database.sql"
  _row "Optional in ZIP:  uploads/"
  _bot

  prompt_yes_no "Restore a backup ZIP now?" "no"
  HAS_BACKUP="$_REPLY"

  if [ "$HAS_BACKUP" = "yes" ]; then
    while true; do
      printf '\n  %s›%s  %sBackup ZIP path%s: ' \
        "$CC" "$C0" "$CB" "$C0" >/dev/tty
      _cur_show
      IFS= read -r BACKUP_ZIP </dev/tty
      _cur_hide
      BACKUP_ZIP="${BACKUP_ZIP/#\~/$HOME}"
      if [ -f "$BACKUP_ZIP" ]; then
        printf '\n' >/dev/tty; _ok "Backup file found: $BACKUP_ZIP"; break
      fi
      printf '\n' >/dev/tty; _warn "File not found: $BACKUP_ZIP"
    done
  else
    BACKUP_ZIP=""
  fi

  _pause
}

# ─── Step 6 — Review & Confirm ───────────────────────────────────────────────

_print_summary() {
  local sn; sn="$(build_server_name)"
  if [ -z "$DOMAIN" ]; then
    _row_kv "Domain:" "(any — server_name _)"
  else
    _row_kv "Domain:" "$DOMAIN"
    [ "$ALLOW_SUBDOMAINS" = "yes" ] && _row_kv "Subdomains:" "*.${DOMAIN}  (wildcard)"
    [ -n "$EXTRA_DOMAINS" ]         && _row_kv "Extra domains:" "$EXTRA_DOMAINS"
  fi
  _row_kv "nginx server_name:" "$sn"
  _mid
  _row_kv "Postgres DB:"   "$POSTGRES_DB"
  _row_kv "Postgres User:" "$POSTGRES_USER"
  _row_kv "Postgres Pass:" "$(printf '%s' "$POSTGRES_PASSWORD" | sed 's/./*/g')"
  _mid
  _row_kv "Docker mode:"   "$MODE"
  [ "$MODE" = "swarm" ] && _row_kv "Stack name:" "$STACK_NAME"
  _row_kv "Public HTTP:"   "${PUBLIC_HTTP_PORT} -> 80"
  _row_kv "Public HTTPS:"  "${PUBLIC_HTTPS_PORT} -> 443"
  _mid
  _row_kv "Restore backup:" "$HAS_BACKUP"
  [ "$HAS_BACKUP" = "yes" ] && _row_kv "Backup ZIP:" "$(basename "$BACKUP_ZIP")"
}

review_and_confirm() {
  while true; do
    _header "Review & Confirm" 6
    _blank
    _print_summary
    _blank
    _row "1)  Deploy now"
    _row "2)  Edit domain configuration"
    _row "3)  Edit database settings"
    _row "4)  Edit docker mode and ports"
    _row "5)  Edit public ports only"
    _row "6)  Edit backup restore"
    _row "7)  Exit without changes"
    _bot

    prompt_choice "1"
    local choice="$_REPLY"

    case "$choice" in
      1) return ;;
      2) collect_domain ;;
      3) collect_database ;;
      4) collect_mode_and_ports ;;
      5)
        collect_public_ports "${PUBLIC_HTTP_PORT:-802}" "${PUBLIC_HTTPS_PORT:-843}"
        ;;
      6) collect_backup ;;
      7)
        _cls
        _top; _row_logo; _mid
        _blank
        _row "No changes were applied. Run the script again to redeploy."
        _blank
        _bot
        printf '\n  %sPress Enter to exit…%s ' "$CD" "$C0" >/dev/tty
        _cur_show
        IFS= read -r _ </dev/tty 2>/dev/null || true
        exit 0
        ;;
      *)
        printf '\n' >/dev/tty; _warn "Invalid option: $choice"
        _pause
        ;;
    esac
  done
}

# ─── NGINX helpers ────────────────────────────────────────────────────────────

prepare_nginx_config() {
  local conf="$DEPLOY_DIR/nginx/nginx.conf"
  local vhost="$DEPLOY_DIR/nginx/conf.d/openweb.conf"
  local tmp=""

  [ -f "$conf" ]  || fatal "Missing NGINX config: $conf"
  [ -f "$vhost" ] || fatal "Missing NGINX vhost:  $vhost"

  tmp="$(mktemp)"
  awk '
    BEGIN { inserted=0 }
    /^[[:space:]]*thread_pool[[:space:]]+/ { next }
    {
      print
      if ($0 ~ /^[[:space:]]*worker_rlimit_nofile[[:space:]]+/ && !inserted) {
        print "thread_pool io_pool threads=32 max_queue=65536;"
        inserted=1
      }
    }
  ' "$conf" > "$tmp"
  mv "$tmp" "$conf"
  _ok "NGINX config prepared (thread_pool normalised)."

  local sn; sn="$(build_server_name)"
  tmp="$(mktemp)"
  sed "s|server_name .*;|server_name ${sn};|g" "$vhost" > "$tmp"
  mv "$tmp" "$vhost"
  _ok "NGINX server_name set to: ${CB}${sn}${C0}"
}

verify_nginx_compose() {
  local cid=""
  _info "Validating NGINX config (Compose)"
  cid="$(wait_for_container compose proxy)"
  docker exec "$cid" nginx -t >/dev/null 2>&1 || {
    docker exec "$cid" nginx -t || true
    fatal "NGINX validation failed in Compose."
  }
  _ok "NGINX config valid (Compose)."
}

verify_nginx_swarm() {
  local cid=""
  _info "Validating NGINX config (Swarm)"
  cid="$(wait_for_container swarm proxy "$STACK_NAME")"
  docker exec "$cid" nginx -t >/dev/null 2>&1 || {
    docker exec "$cid" nginx -t || true
    fatal "NGINX validation failed in Swarm."
  }
  _ok "NGINX config valid (Swarm)."
}

# ─── Container / Postgres wait helpers ───────────────────────────────────────

wait_for_container() {
  local mode="$1" svc="$2" stk="${3:-}"
  local i=1 cid=""
  while [ "$i" -le 40 ]; do
    if [ "$mode" = "compose" ]; then
      cid="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
               ps -q "$svc" || true)"
    else
      cid="$(docker ps -q \
               --filter "label=com.docker.swarm.service.name=${stk}_${svc}" \
               | head -n 1 || true)"
    fi
    [ -n "$cid" ] && { printf '%s\n' "$cid"; return; }
    sleep 2; i=$(( i+1 ))
  done
  fatal "Timed out waiting for container: $svc"
}

wait_for_postgres_compose() {
  local i=1
  _info "Waiting for Postgres readiness (Compose)"
  while [ "$i" -le 60 ]; do
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
      pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1 \
      && { _ok "Postgres is ready."; return; }
    sleep 2; i=$(( i+1 ))
  done
  fatal "Postgres did not become ready in time (Compose)."
}

wait_for_postgres_swarm() {
  local cid="" i=1
  _info "Waiting for Postgres readiness (Swarm)"
  cid="$(wait_for_container swarm postgres "$STACK_NAME")"
  while [ "$i" -le 60 ]; do
    docker exec "$cid" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      >/dev/null 2>&1 && { _ok "Postgres is ready."; return; }
    sleep 2; i=$(( i+1 ))
  done
  fatal "Postgres did not become ready in time (Swarm)."
}

ensure_api_backup_tools() {
  local mode="$1" cid=""
  _info "Ensuring backup tools in API container ($mode)"
  if [ "$mode" = "compose" ]; then
    cid="$(wait_for_container compose api)"
  else
    cid="$(wait_for_container swarm api "$STACK_NAME")"
  fi
  docker exec "$cid" sh -lc \
    'command -v pg_dump >/dev/null && command -v zip >/dev/null' 2>/dev/null \
    && { _ok "Backup tools already present."; return; }
  _warn "Installing backup tools…"
  docker exec "$cid" sh -lc \
    'apk add --no-cache postgresql-client zip unzip 2>/dev/null \
     || apt-get install -y postgresql-client zip unzip 2>/dev/null \
     || true'
  _ok "Backup tools installed."
}

maintenance_rebuild_app() {
  _header "Maintenance: Rebuild App"
  _blank
  _row "Rebuilding and rolling out latest local app code..."
  _bot
  printf '\n' >/dev/tty

  if [ "$MODE" = "compose" ]; then
    run_compose up -d --build api web proxy certbot \
      || die "Compose rebuild failed."
    verify_nginx_compose
    ensure_api_backup_tools compose
    run_migrations_compose
  else
    docker build -f "$ROOT_DIR/apps/api/Dockerfile"          -t openweb-api:latest        "$ROOT_DIR" \
      || die "Failed building API image."
    docker build -f "$ROOT_DIR/apps/web/Dockerfile"          -t openweb-web:latest        "$ROOT_DIR" \
      || die "Failed building Web image."
    docker build -f "$ROOT_DIR/deploy/autoscaler/Dockerfile" -t openweb-autoscaler:latest "$ROOT_DIR" \
      || die "Failed building Autoscaler image."
    docker stack deploy -c "$STACK_FILE" "$STACK_NAME" \
      || die "Failed deploying stack."
    docker service update --force "${STACK_NAME}_api" >/dev/null 2>&1 || true
    docker service update --force "${STACK_NAME}_web" >/dev/null 2>&1 || true
    verify_nginx_swarm
    ensure_api_backup_tools swarm
    run_migrations_swarm
  fi

  printf '\n' >/dev/tty
  _ok "App rebuild/update complete."
  _pause
}

maintenance_update_db_credentials() {
  local old_db old_user old_pass new_db new_user new_pass pg_cid escaped_pass role_exists db_exists
  old_db="$(get_env_value POSTGRES_DB)"
  old_user="$(get_env_value POSTGRES_USER)"
  old_pass="$(get_env_value POSTGRES_PASSWORD)"

  _header "Maintenance: Database Credentials"
  _blank
  _row "Update DB credentials and apply them to running services."
  _row_dim "Existing DB remains; this updates role password and env wiring."
  _bot

  prompt_input  "Postgres database name" "${old_db:-openweb}";   new_db="$_REPLY"
  prompt_input  "Postgres username"      "${old_user:-openweb}"; new_user="$_REPLY"
  prompt_secret "Postgres password"      "${old_pass:-change_me}"; new_pass="$_REPLY"

  [ -n "$old_user" ] || old_user="$new_user"
  [ -n "$old_db" ] || old_db="$new_db"
  escaped_pass="$(sql_escape "$new_pass")"

  if [ "$MODE" = "compose" ]; then
    pg_cid="$(wait_for_container compose postgres)"
  else
    pg_cid="$(wait_for_container swarm postgres "$STACK_NAME")"
  fi

  _info "Applying role/database changes inside Postgres..."
  role_exists="$(docker exec -e PGPASSWORD="$old_pass" "$pg_cid" psql -U "$old_user" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${new_user}'" 2>/dev/null || true)"
  if [ "$role_exists" != "1" ]; then
    docker exec -e PGPASSWORD="$old_pass" "$pg_cid" psql -U "$old_user" -d postgres -c "CREATE ROLE \"${new_user}\" LOGIN PASSWORD '${escaped_pass}';" \
      || die "Failed creating Postgres role: $new_user"
  fi
  docker exec -e PGPASSWORD="$old_pass" "$pg_cid" psql -U "$old_user" -d postgres -c "ALTER ROLE \"${new_user}\" WITH LOGIN PASSWORD '${escaped_pass}';" \
    || die "Failed updating password for role: $new_user"

  db_exists="$(docker exec -e PGPASSWORD="$old_pass" "$pg_cid" psql -U "$old_user" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${new_db}'" 2>/dev/null || true)"
  if [ "$db_exists" != "1" ]; then
    docker exec -e PGPASSWORD="$old_pass" "$pg_cid" psql -U "$old_user" -d postgres -c "CREATE DATABASE \"${new_db}\" OWNER \"${new_user}\";" \
      || die "Failed creating database: $new_db"
  fi
  docker exec -e PGPASSWORD="$old_pass" "$pg_cid" psql -U "$old_user" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE \"${new_db}\" TO \"${new_user}\";" \
    || die "Failed granting privileges for: $new_user"

  set_env_value POSTGRES_DB "$new_db"
  set_env_value POSTGRES_USER "$new_user"
  set_env_value POSTGRES_PASSWORD "$new_pass"
  _ok "deploy/.env database credentials updated."

  POSTGRES_DB="$new_db"
  POSTGRES_USER="$new_user"
  POSTGRES_PASSWORD="$new_pass"

  _info "Redeploying DB/API services with updated credentials..."
  if [ "$MODE" = "compose" ]; then
    run_compose up -d --build postgres api || die "Failed redeploying compose postgres/api."
    wait_for_postgres_compose
    run_migrations_compose
  else
    docker build -f "$ROOT_DIR/apps/api/Dockerfile" -t openweb-api:latest "$ROOT_DIR" \
      || die "Failed building API image."
    docker stack deploy -c "$STACK_FILE" "$STACK_NAME" \
      || die "Failed deploying stack."
    run_migrations_swarm
  fi
  _ok "Database credentials updated and applied."
  _pause
}

maintenance_check_github_updates() {
  local remote_url local_sha remote_sha behind ahead
  _header "Maintenance: GitHub Updates"
  _blank
  _row "Checking origin/main for updates and optionally downloading."
  _bot
  printf '\n' >/dev/tty

  git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || die "Current directory is not a git repository."
  remote_url="$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null || true)"
  [ -n "$remote_url" ] || die "Git remote 'origin' is not configured."
  printf '%s' "$remote_url" | grep -qE 'elsenormanzana/openweb(\.git)?$' \
    || _warn "origin is '$remote_url' (expected elsenormanzana/openweb). Continuing anyway."

  _info "Fetching origin/main..."
  git -C "$ROOT_DIR" fetch origin main || die "Failed to fetch origin/main."
  local_sha="$(git -C "$ROOT_DIR" rev-parse HEAD)"
  remote_sha="$(git -C "$ROOT_DIR" rev-parse origin/main)"
  behind="$(git -C "$ROOT_DIR" rev-list --count HEAD..origin/main)"
  ahead="$(git -C "$ROOT_DIR" rev-list --count origin/main..HEAD)"

  _row_kv "Local HEAD:" "${local_sha:0:12}"
  _row_kv "origin/main:" "${remote_sha:0:12}"
  _row_kv "Behind:" "$behind commit(s)"
  _row_kv "Ahead:" "$ahead commit(s)"
  printf '\n' >/dev/tty

  if [ "${behind:-0}" -gt 0 ]; then
    prompt_yes_no "Download updates now (git pull --ff-only origin main)?" "yes"
    if [ "$_REPLY" = "yes" ]; then
      git -C "$ROOT_DIR" pull --ff-only origin main \
        || die "git pull failed (local changes/divergence). Resolve and retry."
      _ok "Updates downloaded from origin/main."
      prompt_yes_no "Rebuild app now?" "yes"
      [ "$_REPLY" = "yes" ] && maintenance_rebuild_app
    fi
  else
    _ok "No new commits to download from origin/main."
  fi
  _pause
}

maintenance_menu_if_running() {
  [ -n "$DETECTED_MODE" ] || return 0
  [ "$DETECTED_IS_UP" = "yes" ] || {
    printf '\n' >/dev/tty
    _warn "$DETECTED_UP_DETAILS"
    _warn "Proceeding to full deployment wizard."
    _pause
    return 0
  }

  MODE="$DETECTED_MODE"
  [ "$MODE" = "swarm" ] && STACK_NAME="$DETECTED_STACK_NAME" || STACK_NAME="openweb"
  POSTGRES_DB="$(get_env_value POSTGRES_DB)"
  POSTGRES_USER="$(get_env_value POSTGRES_USER)"
  POSTGRES_PASSWORD="$(get_env_value POSTGRES_PASSWORD)"
  JWT_SECRET="$(get_env_value JWT_SECRET)"
  PUBLIC_HTTP_PORT="$(get_env_value PUBLIC_HTTP_PORT)"
  PUBLIC_HTTPS_PORT="$(get_env_value PUBLIC_HTTPS_PORT)"
  [ -n "$PUBLIC_HTTP_PORT" ] || PUBLIC_HTTP_PORT="$([ "$MODE" = "swarm" ] && echo 80 || echo 802)"
  [ -n "$PUBLIC_HTTPS_PORT" ] || PUBLIC_HTTPS_PORT="843"

  while true; do
    _header "Detected Running Deployment"
    _blank
    _row "$DETECTED_UP_DETAILS"
    _row_dim "Mode: $MODE"
    [ "$MODE" = "swarm" ] && _row_dim "Stack: $STACK_NAME"
    _mid
    _row "1) Continue with full deployment wizard"
    _row "2) Update database credentials"
    _row "3) Rebuild/update app"
    _row "4) Check GitHub updates (origin/main) and download"
    _row "5) Exit"
    _bot

    prompt_choice "2"
    case "$_REPLY" in
      1) return 0 ;;
      2) maintenance_update_db_credentials; exit 0 ;;
      3) maintenance_rebuild_app; exit 0 ;;
      4) maintenance_check_github_updates; exit 0 ;;
      5) exit 0 ;;
      *) printf '\n' >/dev/tty; _warn "Invalid option: $_REPLY"; _pause ;;
    esac
  done
}

run_migrations_compose() {
  local f
  wait_for_postgres_compose
  _info "Running DB migrations (Compose)"
  for f in "$ROOT_DIR"/apps/api/drizzle/*.sql; do
    [ -f "$f" ] || continue
    printf '       %s%s%s\n' "$CD" "$(basename "$f")" "$C0" >/dev/tty
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$f"
  done
  _ok "Migrations applied."
}

run_migrations_swarm() {
  local cid="" f
  wait_for_postgres_swarm
  _info "Running DB migrations (Swarm)"
  cid="$(wait_for_container swarm postgres "$STACK_NAME")"
  for f in "$ROOT_DIR"/apps/api/drizzle/*.sql; do
    [ -f "$f" ] || continue
    printf '       %s%s%s\n' "$CD" "$(basename "$f")" "$C0" >/dev/tty
    docker exec -i "$cid" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$f"
  done
  _ok "Migrations applied."
}

restore_backup_zip() {
  local mode="$1" zip="$2" tmp="" pg_cid="" api_cid=""
  tmp="$(mktemp -d)"
  unzip -o "$zip" -d "$tmp" >/dev/null
  [ -f "$tmp/database.sql" ] || { rm -rf "$tmp"; fatal "Backup ZIP missing database.sql"; }

  if [ "$mode" = "compose" ]; then
    wait_for_postgres_compose
    _info "Restoring database backup (Compose)"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
      psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$tmp/database.sql"
    if [ -d "$tmp/uploads" ]; then
      api_cid="$(wait_for_container compose api)"
      docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api \
        sh -c 'rm -rf /app/apps/api/uploads/* && mkdir -p /app/apps/api/uploads'
      docker cp "$tmp/uploads/." "$api_cid":/app/apps/api/uploads
    fi
  else
    wait_for_postgres_swarm
    _info "Restoring database backup (Swarm)"
    pg_cid="$(wait_for_container swarm postgres "$STACK_NAME")"
    api_cid="$(wait_for_container swarm api     "$STACK_NAME")"
    docker exec -i "$pg_cid" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
    docker exec -i "$pg_cid" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$tmp/database.sql"
    if [ -d "$tmp/uploads" ]; then
      docker exec "$api_cid" sh -c \
        'rm -rf /app/apps/api/uploads/* && mkdir -p /app/apps/api/uploads'
      docker cp "$tmp/uploads/." "$api_cid":/app/apps/api/uploads
    fi
  fi

  rm -rf "$tmp"
  _ok "Backup restored."
}

# ─── Step 7 — Deploy ─────────────────────────────────────────────────────────

write_env_file() {
  # Use printf so special characters ($, \, backticks) in passwords are not
  # interpreted by the shell. A bare heredoc (<<MARKER) expands variables,
  # which corrupts passwords containing shell-special characters.
  {
    printf 'POSTGRES_DB=%s\n'       "$POSTGRES_DB"
    printf 'POSTGRES_USER=%s\n'     "$POSTGRES_USER"
    printf 'POSTGRES_PASSWORD=%s\n' "$POSTGRES_PASSWORD"
    printf 'JWT_SECRET=%s\n'        "$JWT_SECRET"
    printf 'PUBLIC_HTTP_PORT=%s\n'  "$PUBLIC_HTTP_PORT"
    printf 'PUBLIC_HTTPS_PORT=%s\n' "$PUBLIC_HTTPS_PORT"
    printf '\n'
    printf 'STACK_NAME=%s\n'        "$STACK_NAME"
    printf 'API_MIN_REPLICAS=2\n'
    printf 'API_MAX_REPLICAS=10\n'
    printf 'WEB_MIN_REPLICAS=2\n'
    printf 'WEB_MAX_REPLICAS=10\n'
    printf 'SCALE_UP_CPU=70\n'
    printf 'SCALE_DOWN_CPU=25\n'
    printf 'CHECK_INTERVAL_SECONDS=30\n'
    printf 'COOLDOWN_SECONDS=120\n'
  } > "$ENV_FILE" || die "Could not write env file: $ENV_FILE"
  _ok "Environment file written: deploy/.env"
}

deploy_compose() {
  _info "Building & deploying with Docker Compose…"
  prepare_nginx_config
  run_compose up -d --build api web proxy postgres \
    || die "docker compose up failed — check output above for build errors."
  verify_nginx_compose
  ensure_api_backup_tools compose
  run_migrations_compose
  [ "$HAS_BACKUP" = "yes" ] && restore_backup_zip compose "$BACKUP_ZIP"
}

deploy_swarm() {
  local swarm_state="inactive"
  _info "Building images for Docker Swarm…"
  prepare_nginx_config
  docker build -f "$ROOT_DIR/apps/api/Dockerfile"          -t openweb-api:latest        "$ROOT_DIR"
  docker build -f "$ROOT_DIR/apps/web/Dockerfile"          -t openweb-web:latest        "$ROOT_DIR"
  docker build -f "$ROOT_DIR/deploy/autoscaler/Dockerfile" -t openweb-autoscaler:latest "$ROOT_DIR"

  swarm_state="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null \
    || printf 'inactive')"
  if [ "$swarm_state" != "active" ]; then
    _info "Initialising Docker Swarm…"
    docker swarm init
  fi

  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a

  _info "Deploying stack: $STACK_NAME"
  docker stack deploy -c "$STACK_FILE" "$STACK_NAME" \
    || die "docker stack deploy failed — check output above."
  docker service update --force "${STACK_NAME}_api" >/dev/null 2>&1 || true
  docker service update --force "${STACK_NAME}_web" >/dev/null 2>&1 || true

  verify_nginx_swarm
  ensure_api_backup_tools swarm
  run_migrations_swarm
  [ "$HAS_BACKUP" = "yes" ] && restore_backup_zip swarm "$BACKUP_ZIP"
}

# ─── Completion screen ────────────────────────────────────────────────────────

show_completion() {
  local base="http://localhost"
  [ -n "$DOMAIN" ] && base="http://${DOMAIN}"

  _cls
  _top
  _row_logo
  _mid
  printf '│  %s%-*s%s  │\n' \
    "${CG}${CB}" "$((BOX_W - 4))" "✦  Deployment Complete" "$C0" >/dev/tty
  _mid
  _blank
  _row_kv "App URL:"   "${base}/"
  _row_kv "Setup URL:" "${base}/setup"
  _row_kv "Admin URL:" "${base}/admin"
  if [ -n "$DOMAIN" ]; then
    _blank
    _row_kv "Domain:" "$DOMAIN"
    [ "$ALLOW_SUBDOMAINS" = "yes" ] && _row_kv "Subdomains:" "*.${DOMAIN}  (wildcard)"
    [ -n "$EXTRA_DOMAINS" ]         && _row_kv "Extra:"      "$EXTRA_DOMAINS"
  fi
  _blank
  _mid
  _row_dim "First visit /setup to create your admin account."
  if [ -z "$DOMAIN" ]; then
    _row_dim "Point a domain to this server and re-run setup to configure it."
  else
    _row_dim "DNS must resolve $DOMAIN to this server's IP address."
    _row_dim "Add TLS with Let's Encrypt (certbot) when ready for production."
  fi
  _blank
  _bot

  printf '\n  %sPress Enter to exit…%s ' "$CD" "$C0" >/dev/tty
  _cur_show
  IFS= read -r _ </dev/tty 2>/dev/null || true
  _cur_hide
}

# ─── Entrypoint ──────────────────────────────────────────────────────────────

main() {
  trap '_show_error_screen; cleanup_tui' EXIT INT TERM

  init_colors
  init_tui      # ← alternate screen engaged; only TUI is visible from here
  show_splash

  check_prereqs
  detect_existing_deployment
  check_detected_deployment_up
  maintenance_menu_if_running
  collect_domain
  collect_database
  collect_mode_and_ports
  collect_backup
  review_and_confirm

  _header "Deploying" 7
  write_env_file

  if [ "$MODE" = "compose" ]; then
    deploy_compose
  else
    deploy_swarm
  fi

  show_completion
  # EXIT trap → cleanup_tui → tput rmcup → original terminal restored cleanly
}

main "$@"
