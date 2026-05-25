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
TERM_W=80          # detected terminal width
TERM_H=24          # detected terminal height
BOX_W=72           # inner box width (responsive)
BOX_H=12           # max content rows per page (responsive)
_BOX_TOP=""
_BOX_MID=""
_BOX_BOT=""

# Buffered-render state — _header switches into buffered mode, _bot paints
# and exits buffered mode. Splash / completion screens stay in direct mode.
SCREEN_BUFFERED=0
SCREEN_TITLE=""
SCREEN_STEP=""
SCREEN_LINES=()
PAGE_INDEX=0

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

# ─── Responsive sizing ───────────────────────────────────────────────────────
#
# _measure reads the live terminal size on every call so screens always paint
# at the current geometry. BOX_W is clamped to a readable range; BOX_H is the
# number of content rows that fit between top chrome and the prompt area.

_measure() {
  TERM_W="$(tput cols 2>/dev/null || echo 80)"
  TERM_H="$(tput lines 2>/dev/null || echo 24)"

  # Inner width: at least 50, at most 110 (readable line length), else
  # terminal-4. On very narrow terminals fall back to terminal-2.
  BOX_W=$(( TERM_W - 4 ))
  [ "$BOX_W" -gt 110 ] && BOX_W=110
  [ "$BOX_W" -lt 50 ]  && BOX_W=50
  if [ "$BOX_W" -gt "$TERM_W" ]; then BOX_W=$(( TERM_W - 2 )); fi
  [ "$BOX_W" -lt 30 ]  && BOX_W=30

  # Chrome rows used outside the content area:
  #   top border (1) + logo (1) + mid (1) + step (1) + progress (1)
  #   + spacer (1) + title (1) + mid (1) + bottom (1) + pager line (2)
  # ≈ 13 rows. Min content height = 4 rows.
  BOX_H=$(( TERM_H - 13 ))
  [ "$BOX_H" -lt 4 ] && BOX_H=4

  local r
  r="$(printf '─%.0s' $(seq 1 "$BOX_W"))"
  _BOX_TOP="╭${r}╮"
  _BOX_MID="├${r}┤"
  _BOX_BOT="╰${r}╯"
}

# Back-compat alias — older call sites used _update_box.
_update_box() { _measure; }

_cls() {
  _measure
  if [ "$TUI_ACTIVE" = "1" ]; then
    tput clear >/dev/tty 2>/dev/null || printf '\033[2J\033[H' >/dev/tty
  else
    printf '\033[2J\033[H' >/dev/tty
  fi
}

# ─── Row formatters ──────────────────────────────────────────────────────────
# Each _fmt_* helper returns a fully-formed box row as a string (no newline,
# no /dev/tty write). Mode-aware wrappers (_blank, _row, …) below decide to
# either append the formatted row to SCREEN_LINES (buffered) or write it
# directly to /dev/tty (direct, used by splash/completion).

_fmt_blank() { printf '│%*s│' "$BOX_W" ""; }

_fmt_row() {
  printf '│  %-*s  │' "$((BOX_W - 4))" "${1:-}"
}

_fmt_row_bold() {
  printf '│  %s%-*s%s  │' "$CB" "$((BOX_W - 4))" "${1:-}" "$C0"
}

_fmt_row_dim() {
  # 2-space indent inside the box for visual hierarchy.
  printf '│  %s  %-*s%s  │' "$CD" "$((BOX_W - 6))" "${1:-}" "$C0"
}

_fmt_row_kv() {
  local key="$1" val="$2"
  local key_w=18
  local val_w=$(( BOX_W - 4 - key_w - 1 ))
  [ "$val_w" -lt 4 ] && val_w=4
  if [ "${#val}" -gt "$val_w" ]; then val="${val:0:$((val_w - 1))}…"; fi
  printf '│  %s%-*s%s %s%-*s%s  │' \
    "$CD" "$key_w" "$key" "$C0" \
    "$CB" "$val_w" "$val" "$C0"
}

_fmt_row_logo() {
  local t="✦  OpenWeb  ·  Deployment Wizard"
  local inner=$(( BOX_W - 4 ))
  [ "${#t}" -gt "$inner" ] && t="${t:0:$inner}"
  printf '│  %s%-*s%s  │' "${CB}${CC}" "$inner" "$t" "$C0"
}

_fmt_row_step() {
  local cur="$1" tot="$2" label="Step $cur of $tot"
  # Right-aligned step indicator.
  printf '│  %s%*s%s  │' "$CD" "$((BOX_W - 4))" "$label" "$C0"
}

_fmt_row_progress() {
  local cur="$1" tot="$2"
  local bw=$(( BOX_W - 4 ))
  [ "$bw" -lt 4 ] && bw=4
  local filled=$(( bw * cur / tot )) empty=$(( bw - bw * cur / tot ))
  local bar="" i=0
  while [ "$i" -lt "$filled" ]; do bar="${bar}█"; i=$(( i+1 )); done
  i=0
  while [ "$i" -lt "$empty"  ]; do bar="${bar}░"; i=$(( i+1 )); done
  printf '│  %s%-*s%s  │' "$CG" "$bw" "$bar" "$C0"
}

_fmt_row_center() {
  local t="$1" pre="${2:-}" suf="${3:-}"
  local vw="${#t}"
  [ "$vw" -gt "$BOX_W" ] && { t="${t:0:$BOX_W}"; vw="$BOX_W"; }
  local lpad=$(( (BOX_W - vw) / 2 ))
  local rpad=$(( BOX_W - lpad - vw ))
  [ "$lpad" -lt 0 ] && lpad=0
  [ "$rpad" -lt 0 ] && rpad=0
  printf '│%*s%s%s%s%*s│' "$lpad" "" "$pre" "$t" "$suf" "$rpad" ""
}

# ─── Mode-aware emit ─────────────────────────────────────────────────────────
# In buffered mode, append to SCREEN_LINES so _paint_screen can paginate.
# In direct mode, write straight to /dev/tty (used by splash / completion).

_emit() {
  if [ "$SCREEN_BUFFERED" = "1" ]; then
    SCREEN_LINES+=("$1")
  else
    printf '%s\n' "$1" >/dev/tty
  fi
}

# ─── Box primitives (back-compat names) ──────────────────────────────────────

_top()   {
  if [ "$SCREEN_BUFFERED" = "1" ]; then
    # In buffered mode, _header already arranges the top chrome; ignore extra _top.
    return
  fi
  printf '%s\n' "$_BOX_TOP" >/dev/tty
}

_mid()   { _emit "$_BOX_MID"; }
_bot()   {
  if [ "$SCREEN_BUFFERED" = "1" ]; then
    _paint_screen
    SCREEN_BUFFERED=0
  else
    printf '%s\n' "$_BOX_BOT" >/dev/tty
  fi
}
_blank() { _emit "$(_fmt_blank)"; }

_row()          { _emit "$(_fmt_row          "${1:-}")"; }
_row_bold()     { _emit "$(_fmt_row_bold     "${1:-}")"; }
_row_dim()      { _emit "$(_fmt_row_dim      "${1:-}")"; }
_row_kv()       { _emit "$(_fmt_row_kv       "$1" "$2")"; }
_row_logo()     { _emit "$(_fmt_row_logo)"; }
_row_step()     { _emit "$(_fmt_row_step     "$1" "$2")"; }
_row_progress() { _emit "$(_fmt_row_progress "$1" "$2")"; }
_row_center()   { _emit "$(_fmt_row_center   "$1" "${2:-}" "${3:-}")"; }

# ─── Buffered screen header & paint ──────────────────────────────────────────
#
# _header starts a buffered screen. Every subsequent _row/_blank/_mid call is
# appended to SCREEN_LINES instead of printed. _bot triggers _paint_screen,
# which writes the box top chrome, the current page of content, and (when
# the content overflows the terminal) a pager prompt that consumes n/p/Enter.

_header() {
  local title="$1" step="${2:-}"
  _measure
  SCREEN_TITLE="$title"
  SCREEN_STEP="$step"
  SCREEN_LINES=()
  PAGE_INDEX=0
  SCREEN_BUFFERED=1
}

_paint_chrome() {
  printf '%s\n' "$_BOX_TOP"            >/dev/tty
  printf '%s\n' "$(_fmt_row_logo)"     >/dev/tty
  printf '%s\n' "$_BOX_MID"            >/dev/tty
  if [ -n "$SCREEN_STEP" ]; then
    printf '%s\n' "$(_fmt_row_step     "$SCREEN_STEP" "$TOTAL_STEPS")" >/dev/tty
    printf '%s\n' "$(_fmt_row_progress "$SCREEN_STEP" "$TOTAL_STEPS")" >/dev/tty
    printf '%s\n' "$(_fmt_blank)"      >/dev/tty
  fi
  printf '%s\n' "$(_fmt_row_bold "$SCREEN_TITLE")" >/dev/tty
  printf '%s\n' "$_BOX_MID"            >/dev/tty
}

_paint_screen() {
  local total="${#SCREEN_LINES[@]}"
  local page_size="$BOX_H"
  [ "$page_size" -lt 1 ] && page_size=1
  local total_pages=$(( (total + page_size - 1) / page_size ))
  [ "$total_pages" -lt 1 ] && total_pages=1
  [ "$PAGE_INDEX" -ge "$total_pages" ] && PAGE_INDEX=$(( total_pages - 1 ))
  [ "$PAGE_INDEX" -lt 0 ] && PAGE_INDEX=0

  while true; do
    _cls
    _paint_chrome

    local start=$(( PAGE_INDEX * page_size ))
    local end=$(( start + page_size ))
    [ "$end" -gt "$total" ] && end="$total"
    local i="$start"
    while [ "$i" -lt "$end" ]; do
      printf '%s\n' "${SCREEN_LINES[$i]}" >/dev/tty
      i=$(( i + 1 ))
    done

    # Keep a stable height when paginating so the box doesn't shrink on the
    # final page (which makes the chrome appear to jump).
    if [ "$total_pages" -gt 1 ]; then
      local painted=$(( end - start ))
      local pad=$(( page_size - painted ))
      while [ "$pad" -gt 0 ]; do
        printf '%s\n' "$(_fmt_blank)" >/dev/tty
        pad=$(( pad - 1 ))
      done
    fi

    printf '%s\n' "$_BOX_BOT" >/dev/tty

    # Single-page screens return immediately so the caller can prompt.
    [ "$total_pages" -le 1 ] && return

    printf '  %sPage %d / %d  ·  [n/space] next  [p] prev  [Enter] continue%s ' \
      "$CD" "$(( PAGE_INDEX + 1 ))" "$total_pages" "$C0" >/dev/tty
    _cur_show
    local key=""
    IFS= read -rsn1 key </dev/tty
    _cur_hide
    printf '\n' >/dev/tty
    case "$key" in
      n|' '|j) PAGE_INDEX=$(( PAGE_INDEX + 1 )) ;;
      p|k)     PAGE_INDEX=$(( PAGE_INDEX - 1 )) ;;
      '')      return ;;
      *)       : ;;  # ignore unknown keys, stay on current page
    esac
    [ "$PAGE_INDEX" -ge "$total_pages" ] && PAGE_INDEX=$(( total_pages - 1 ))
    [ "$PAGE_INDEX" -lt 0 ] && PAGE_INDEX=0
  done
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

set_env_clear() {
  local key="$1"
  [ -f "$ENV_FILE" ] || return 0
  grep -qE "^${key}=" "$ENV_FILE" || return 0
  local tmp
  tmp="$(mktemp)"
  awk -v k="$key" -F= '$1!=k {print}' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}

# ─── ENV catalog ──────────────────────────────────────────────────────────────
# Format: KEY|type|label|default|secret
#   type   = text | secret | port
#   secret = 1 → mask value in listings
ENV_CATALOG=(
  "POSTGRES_DB|text|Postgres database|openweb|0"
  "POSTGRES_USER|text|Postgres user|openweb|0"
  "POSTGRES_PASSWORD|secret|Postgres password|change_me|1"
  "JWT_SECRET|secret|JWT signing secret||1"
  "PUBLIC_HTTP_PORT|port|Public HTTP port|802|0"
  "PUBLIC_HTTPS_PORT|port|Public HTTPS port|843|0"
  "ANTHROPIC_API_KEY|secret|Anthropic API key (app)||1"
  "ANTHROPIC_ADMIN_KEY|secret|Anthropic Admin API key (usage)||1"
  "SSO_GOOGLE_CLIENT_ID|text|Google SSO client ID||0"
  "SSO_GOOGLE_CLIENT_SECRET|secret|Google SSO client secret||1"
  "SSO_MICROSOFT_CLIENT_ID|text|Microsoft SSO client ID||0"
  "SSO_MICROSOFT_CLIENT_SECRET|secret|Microsoft SSO client secret||1"
  "SSO_MICROSOFT_TENANT_ID|text|Microsoft tenant ID|common|0"
  "SSO_OIDC_LABEL|text|OIDC display label|SSO|0"
  "SSO_OIDC_CLIENT_ID|text|OIDC client ID||0"
  "SSO_OIDC_CLIENT_SECRET|secret|OIDC client secret||1"
  "SSO_OIDC_AUTH_URL|text|OIDC auth URL||0"
  "SSO_OIDC_TOKEN_URL|text|OIDC token URL||0"
  "SSO_OIDC_USERINFO_URL|text|OIDC userinfo URL||0"
  "REDIS_URL|text|Redis URL||0"
  "REDIS_PASSWORD|secret|Redis password||1"
  "OPENWEB_BASE_DOMAIN|text|Base domain for tenant subdomains||0"
)

# Tracks which keys changed during the current edit session so we know which
# services to recreate on save.
ENV_DIRTY=()

_env_catalog_field() {
  # $1 = catalog entry, $2 = field index (1..5)
  local entry="$1" idx="$2"
  printf '%s' "$entry" | awk -v i="$idx" -F'|' '{print $i}'
}

_env_mark_dirty() {
  local key="$1" k
  for k in "${ENV_DIRTY[@]:-}"; do
    [ "$k" = "$key" ] && return 0
  done
  ENV_DIRTY+=("$key")
}

_env_display_value() {
  # $1 = current value, $2 = secret? (1|0)
  local val="$1" is_secret="$2"
  if [ -z "$val" ]; then
    printf '%s(unset)%s' "$CD" "$C0"
    return
  fi
  if [ "$is_secret" = "1" ]; then
    local n="${#val}"
    [ "$n" -le 4 ] && { printf '%s****%s' "$CD" "$C0"; return; }
    printf '%s%s…%s%s' "$CD" "${val:0:2}" "${val: -2}" "$C0"
    return
  fi
  local maxw=40
  if [ "${#val}" -gt "$maxw" ]; then
    printf '%s…' "${val:0:$((maxw - 1))}"
  else
    printf '%s' "$val"
  fi
}

_env_apply_changes() {
  # Recreate the right services based on which keys changed.
  if [ "${#ENV_DIRTY[@]}" -eq 0 ]; then
    _ok "No changes to apply."
    return 0
  fi
  _info "Applying env changes: ${ENV_DIRTY[*]}"

  local need_api=0 need_proxy=0 need_postgres=0 key
  for key in "${ENV_DIRTY[@]}"; do
    case "$key" in
      POSTGRES_*)                                  need_postgres=1; need_api=1 ;;
      JWT_SECRET|ANTHROPIC_*|SSO_*|REDIS_*|OPENWEB_BASE_DOMAIN|WEB_PURGE_URL)
                                                   need_api=1 ;;
      PUBLIC_HTTP_PORT|PUBLIC_HTTPS_PORT)          need_proxy=1 ;;
      *)                                           need_api=1 ;;
    esac
  done

  if [ "$need_postgres" = "1" ]; then
    _warn "Postgres credentials changed — use 'Update database credentials' to apply safely."
    _warn "Env file was written; restart skipped to avoid breaking the existing DB."
    return 0
  fi

  if [ -z "${DETECTED_MODE:-}" ] && [ -z "${MODE:-}" ]; then
    _info "No running deployment detected — env file saved only."
    return 0
  fi

  local mode="${MODE:-$DETECTED_MODE}"

  if [ "$need_api" = "1" ]; then
    _info "Recreating api service..."
    if [ "$mode" = "compose" ]; then
      run_compose up -d --force-recreate --no-deps api \
        || _warn "Compose api recreate returned non-zero."
    else
      docker service update --force --env-add "$(_env_pairs_for_admin)" \
        "${STACK_NAME}_api" >/dev/null 2>&1 \
        || docker service update --force "${STACK_NAME}_api" >/dev/null 2>&1 \
        || _warn "Swarm api service update returned non-zero."
    fi
    _ok "api service updated."
  fi

  if [ "$need_proxy" = "1" ]; then
    _info "Recreating proxy service..."
    if [ "$mode" = "compose" ]; then
      run_compose up -d --force-recreate --no-deps proxy \
        || _warn "Compose proxy recreate returned non-zero."
      verify_nginx_compose || _warn "NGINX validation failed."
    else
      docker service update --force "${STACK_NAME}_proxy" >/dev/null 2>&1 \
        || _warn "Swarm proxy service update returned non-zero."
      verify_nginx_swarm || _warn "NGINX validation failed."
    fi
    _ok "proxy service updated."
  fi

  ENV_DIRTY=()
}

# Helper: emit "K=V K=V …" pairs for the dirty set (used by swarm --env-add).
_env_pairs_for_admin() {
  local key val out=""
  for key in "${ENV_DIRTY[@]:-}"; do
    val="$(get_env_value "$key")"
    out="${out}${key}=${val} "
  done
  printf '%s' "$out"
}

maintenance_edit_env() {
  ENV_DIRTY=()
  local sel="" entry="" key="" type="" label="" def="" secret="" current="" newval=""

  while true; do
    _header "Edit environment variables"
    _blank
    _row "deploy/.env  — values are written immediately to the file."
    _row_dim "Service recreate happens when you choose [s] save & apply."
    _mid
    if [ "${#ENV_DIRTY[@]}" -gt 0 ]; then
      _row_kv "Pending changes:" "${ENV_DIRTY[*]}"
      _mid
    fi
    local i=0
    while [ "$i" -lt "${#ENV_CATALOG[@]}" ]; do
      entry="${ENV_CATALOG[$i]}"
      key="$(_env_catalog_field "$entry" 1)"
      label="$(_env_catalog_field "$entry" 3)"
      secret="$(_env_catalog_field "$entry" 5)"
      current="$(get_env_value "$key")"
      _row "$(printf '%2d)  %-30s  %s' "$(( i + 1 ))" "$label" "$(_env_display_value "$current" "$secret")")"
      i=$(( i + 1 ))
    done
    _mid
    _row "  a)  Add custom variable (KEY=VALUE)"
    _row "  c)  Clear (remove) a variable"
    _row "  s)  Save & apply"
    _row "  q)  Back (changes already written to file)"
    _bot

    printf '\n  %s›%s  %sChoice%s: ' "$CC" "$C0" "$CB" "$C0" >/dev/tty
    _cur_show; IFS= read -r sel </dev/tty; _cur_hide
    sel="$(to_lower "$sel")"

    case "$sel" in
      q|'') return 0 ;;
      s)    _env_apply_changes; _pause; return 0 ;;
      a)
        prompt_input "Custom KEY (uppercase, no spaces)" ""
        key="$_REPLY"
        if ! printf '%s' "$key" | grep -qE '^[A-Z][A-Z0-9_]*$'; then
          _warn "Invalid key: $key"; _pause; continue
        fi
        prompt_input "Value for $key" ""
        newval="$_REPLY"
        set_env_value "$key" "$newval"
        _env_mark_dirty "$key"
        _ok "$key written."
        _pause
        ;;
      c)
        prompt_input "KEY to remove" ""
        key="$_REPLY"
        if [ -z "$(get_env_value "$key")" ]; then
          _warn "$key is not present in deploy/.env."; _pause; continue
        fi
        set_env_clear "$key"
        _env_mark_dirty "$key"
        _ok "$key cleared."
        _pause
        ;;
      *)
        # numeric selection
        if ! printf '%s' "$sel" | grep -qE '^[0-9]+$'; then
          _warn "Unknown option: $sel"; _pause; continue
        fi
        if [ "$sel" -lt 1 ] || [ "$sel" -gt "${#ENV_CATALOG[@]}" ]; then
          _warn "Out of range: $sel"; _pause; continue
        fi
        entry="${ENV_CATALOG[$(( sel - 1 ))]}"
        key="$(_env_catalog_field "$entry" 1)"
        type="$(_env_catalog_field "$entry" 2)"
        label="$(_env_catalog_field "$entry" 3)"
        def="$(_env_catalog_field "$entry" 4)"
        secret="$(_env_catalog_field "$entry" 5)"
        current="$(get_env_value "$key")"
        local prompt_def="${current:-$def}"

        _header "Edit: $key"
        _blank
        _row_kv "Variable:" "$key"
        _row_kv "Label:"    "$label"
        _row_kv "Type:"     "$type"
        _row_kv "Current:"  "$(_env_display_value "$current" "$secret")"
        _mid
        _row "Enter the new value, or leave blank to keep current."
        _row "Type 'clear' to remove the variable entirely."
        _bot

        if [ "$type" = "secret" ]; then
          prompt_secret "New value (input hidden)" ""
        else
          prompt_input "New value" ""
        fi
        newval="$_REPLY"

        if [ -z "$newval" ]; then
          _info "Unchanged."; _pause; continue
        fi
        if [ "$newval" = "clear" ]; then
          set_env_clear "$key"
          _env_mark_dirty "$key"
          _ok "$key cleared."
          _pause; continue
        fi
        if [ "$type" = "port" ] && ! is_valid_port "$newval"; then
          _warn "Invalid port: $newval"; _pause; continue
        fi
        set_env_value "$key" "$newval"
        _env_mark_dirty "$key"
        _ok "$key updated."
        _pause
        ;;
    esac
  done
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

_git_root_check() {
  git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

_git_current_branch() {
  git -C "$ROOT_DIR" symbolic-ref --short HEAD 2>/dev/null || true
}

_git_is_dirty() {
  # Returns 0 if there are uncommitted changes (tracked or untracked).
  [ -n "$(git -C "$ROOT_DIR" status --porcelain 2>/dev/null)" ]
}

_git_dirty_files() {
  git -C "$ROOT_DIR" status --porcelain 2>/dev/null | head -n 20
}

# Run a git command, capture combined stdout+stderr into a global so the
# caller can show it inside the box on failure. Sets _GIT_OUT and returns
# the underlying exit code.
_GIT_OUT=""
_git_capture() {
  _GIT_OUT="$(git -C "$ROOT_DIR" "$@" 2>&1)"
}

_render_git_log() {
  local txt="$1"
  if [ -z "$txt" ]; then return; fi
  _row_dim "git output:"
  local line
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    _row "  $line"
  done <<EOF
$txt
EOF
}

_render_dirty_files() {
  local line
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    _row "  $line"
  done <<EOF
$(_git_dirty_files)
EOF
}

_do_git_pull_clean() {
  _info "Pulling origin main (fast-forward)..."
  if ! _git_capture pull --ff-only origin main; then
    _header "GitHub Updates"
    _blank
    _row_bold "Pull failed"
    _mid
    _render_git_log "$_GIT_OUT"
    _bot
    _pause
    return 1
  fi
  _ok "Updates downloaded from origin/main."
  prompt_yes_no "Rebuild app now?" "yes"
  [ "$_REPLY" = "yes" ] && maintenance_rebuild_app
  return 0
}

_do_git_pull_with_stash() {
  local stash_tag="openweb-wizard-$(date +%s)"
  _info "Stashing local changes..."
  if ! _git_capture stash push -u -m "$stash_tag"; then
    _header "GitHub Updates"
    _blank
    _row_bold "Stash failed"
    _mid
    _render_git_log "$_GIT_OUT"
    _bot
    _pause
    return 1
  fi
  _info "Pulling origin main (fast-forward)..."
  if ! _git_capture pull --ff-only origin main; then
    _warn "Pull failed; restoring stashed changes."
    git -C "$ROOT_DIR" stash pop >/dev/null 2>&1 || true
    _header "GitHub Updates"
    _blank
    _row_bold "Pull failed after stash (local changes restored)"
    _mid
    _render_git_log "$_GIT_OUT"
    _bot
    _pause
    return 1
  fi
  _ok "Pulled. Reapplying stashed changes..."
  if ! _git_capture stash pop; then
    _warn "Stash reapply hit conflicts. Resolve them manually."
    _warn "Your changes are preserved in: git stash list"
    _header "GitHub Updates"
    _blank
    _row_bold "Stash pop hit conflicts"
    _row "Your changes are preserved. Run:"
    _row "  git stash list"
    _row "  git stash apply"
    _mid
    _render_git_log "$_GIT_OUT"
    _bot
    _pause
    return 0
  fi
  _ok "Updates applied; local changes preserved."
  prompt_yes_no "Rebuild app now?" "yes"
  [ "$_REPLY" = "yes" ] && maintenance_rebuild_app
  return 0
}

_do_git_hard_reset() {
  _header "GitHub Updates"
  _blank
  _row_bold "Discard local changes"
  _row "This will permanently delete all uncommitted edits AND any local"
  _row "commits not on origin/main. The working tree will exactly match"
  _row "origin/main."
  _mid
  _row "Files that will be discarded:"
  _render_dirty_files
  _bot
  prompt_yes_no "Permanently discard ALL local changes?" "no"
  [ "$_REPLY" = "yes" ] || { _info "Cancelled."; _pause; return 0; }

  _info "Hard-resetting to origin/main..."
  if ! _git_capture reset --hard origin/main; then
    _header "GitHub Updates"
    _blank
    _row_bold "Reset failed"
    _mid
    _render_git_log "$_GIT_OUT"
    _bot
    _pause
    return 1
  fi
  if ! _git_capture clean -fd; then
    _warn "git clean reported issues (continuing)."
  fi
  _ok "Reset to origin/main complete."
  prompt_yes_no "Rebuild app now?" "yes"
  [ "$_REPLY" = "yes" ] && maintenance_rebuild_app
  return 0
}

# ─── Anthropic Usage ─────────────────────────────────────────────────────────

# Format a positive integer with thousand separators. Pure bash to avoid
# depending on `numfmt` (missing on macOS) or locale settings.
_fmt_int() {
  local n="${1:-0}"
  printf '%s' "$n" | grep -qE '^-?[0-9]+$' || { printf '%s' "$n"; return; }
  local sign=""
  if [ "${n:0:1}" = "-" ]; then sign="-"; n="${n:1}"; fi
  local rev="" i len
  len="${#n}"
  i=$(( len - 1 ))
  while [ "$i" -ge 0 ]; do rev="${rev}${n:$i:1}"; i=$(( i - 1 )); done
  local grouped="" j=0 k
  k=0
  while [ "$k" -lt "${#rev}" ]; do
    grouped="${grouped}${rev:$k:1}"
    j=$(( j + 1 ))
    if [ $(( j % 3 )) -eq 0 ] && [ "$k" -lt $(( ${#rev} - 1 )) ]; then
      grouped="${grouped},"
    fi
    k=$(( k + 1 ))
  done
  local out="" m
  m=$(( ${#grouped} - 1 ))
  while [ "$m" -ge 0 ]; do out="${out}${grouped:$m:1}"; m=$(( m - 1 )); done
  printf '%s%s' "$sign" "$out"
}

# Return an ISO-8601 timestamp for N days ago at midnight UTC, portable
# across BSD (macOS) and GNU date implementations.
_date_days_ago_utc() {
  local days="$1"
  date -u -v-"${days}"d +%Y-%m-%dT00:00:00Z 2>/dev/null \
    || date -u --date="${days} days ago" +%Y-%m-%dT00:00:00Z 2>/dev/null \
    || date -u +%Y-%m-%dT00:00:00Z
}

# Minimal JSON value extraction: prefer python3 (always parses correctly),
# fall back to a regex if python3 is missing. The fallback only handles
# simple flat key/number pairs, which covers what we need.
_json_get_int() {
  local key="$1" json="$2"
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$json" | python3 -c "
import json, sys
try:
    d = json.loads(sys.stdin.read())
except Exception:
    print('')
    sys.exit(0)
def walk(o, k):
    if isinstance(o, dict):
        if k in o and isinstance(o[k], (int, float)):
            return int(o[k])
        for v in o.values():
            r = walk(v, k)
            if r is not None: return r
    elif isinstance(o, list):
        for v in o:
            r = walk(v, k)
            if r is not None: return r
    return None
r = walk(d, '$key')
print('' if r is None else r)
" 2>/dev/null
    return
  fi
  printf '%s' "$json" | grep -oE "\"${key}\"[[:space:]]*:[[:space:]]*-?[0-9]+" \
    | head -n1 | grep -oE -- '-?[0-9]+' | tail -n1
}

# Try to get the running api container ID; empty on no deployment.
_api_container_id() {
  local mode="${MODE:-$DETECTED_MODE}"
  if [ "$mode" = "compose" ]; then
    run_compose ps -q api 2>/dev/null | head -n 1
  elif [ "$mode" = "swarm" ]; then
    docker ps -q --filter "label=com.docker.swarm.service.name=${STACK_NAME}_api" 2>/dev/null | head -n 1
  fi
}

_fetch_local_usage() {
  # Calls the api container's localhost endpoint (which bypasses auth for 127.0.0.1).
  local range="${1:-30d}" cid=""
  cid="$(_api_container_id)"
  [ -n "$cid" ] || { printf ''; return; }
  docker exec "$cid" sh -lc \
    "wget -q -O - 'http://127.0.0.1:3000/api/anthropic/usage?range=${range}' 2>/dev/null \
     || curl -fsS 'http://127.0.0.1:3000/api/anthropic/usage?range=${range}' 2>/dev/null \
     || true" 2>/dev/null
}

_fetch_admin_usage() {
  # $1 = days (7|30). Empty output on failure or missing key.
  local days="$1" key starting
  key="$(get_env_value ANTHROPIC_ADMIN_KEY)"
  [ -n "$key" ] || { printf ''; return; }
  command -v curl >/dev/null 2>&1 || { printf ''; return; }
  starting="$(_date_days_ago_utc "$days")"
  curl -fsS --max-time 15 \
    -H "x-api-key: $key" \
    -H "anthropic-version: 2023-06-01" \
    "https://api.anthropic.com/v1/organizations/usage_report/messages?starting_at=${starting}" \
    2>/dev/null
}

_fetch_admin_cost() {
  local days="$1" key starting
  key="$(get_env_value ANTHROPIC_ADMIN_KEY)"
  [ -n "$key" ] || { printf ''; return; }
  command -v curl >/dev/null 2>&1 || { printf ''; return; }
  starting="$(_date_days_ago_utc "$days")"
  curl -fsS --max-time 15 \
    -H "x-api-key: $key" \
    -H "anthropic-version: 2023-06-01" \
    "https://api.anthropic.com/v1/organizations/cost_report?starting_at=${starting}" \
    2>/dev/null
}

_render_admin_usage_block() {
  # Parse usage + cost JSON and emit rows. Uses python3 when available for a
  # per-model breakdown; falls back to top-line totals via _json_get_int.
  local usage_json="$1" cost_json="$2"
  if [ -z "$usage_json" ]; then
    _row_dim "  (no response from Anthropic Admin API)"
    return
  fi

  if command -v python3 >/dev/null 2>&1; then
    local parsed
    parsed="$(python3 -c "
import json, sys
try:
    u = json.loads('''$(printf '%s' "$usage_json" | sed "s/'/'\\\\''/g")''')
except Exception:
    print('PARSE_FAILED'); sys.exit(0)
totals = {}
for entry in u.get('data', []):
    for r in entry.get('results', []):
        m = r.get('model', 'unknown')
        if m not in totals:
            totals[m] = {'in': 0, 'out': 0}
        totals[m]['in']  += int(r.get('uncached_input_tokens', 0) or 0)
        totals[m]['in']  += int(r.get('cache_creation_input_tokens', 0) or 0)
        totals[m]['in']  += int(r.get('cache_read_input_tokens', 0) or 0)
        totals[m]['out'] += int(r.get('output_tokens', 0) or 0)
for m, t in sorted(totals.items()):
    print(f\"{m}|{t['in']}|{t['out']}\")
" 2>/dev/null || true)"
    if [ -z "$parsed" ] || [ "$parsed" = "PARSE_FAILED" ]; then
      _row_dim "  (could not parse Admin API response)"
    else
      local line model in_t out_t
      while IFS='|' read -r model in_t out_t; do
        [ -n "$model" ] || continue
        _row "  $(printf '%-32s  %12s in / %12s out' \
          "${model:0:32}" "$(_fmt_int "$in_t")" "$(_fmt_int "$out_t")")"
      done <<EOF
$parsed
EOF
    fi
  else
    _row_dim "  (install python3 for per-model breakdown)"
  fi

  if [ -n "$cost_json" ]; then
    local total_cost
    if command -v python3 >/dev/null 2>&1; then
      total_cost="$(printf '%s' "$cost_json" | python3 -c "
import json, sys
try:
    d = json.loads(sys.stdin.read())
except Exception:
    print(''); sys.exit(0)
total = 0.0
for entry in d.get('data', []):
    for r in entry.get('results', []):
        try: total += float(r.get('amount', 0) or 0)
        except Exception: pass
print(f'{total:.2f}')
" 2>/dev/null)"
    else
      total_cost="$(_json_get_int amount "$cost_json")"
    fi
    [ -n "$total_cost" ] && _row_kv "Estimated spend:" "\$${total_cost} USD"
  fi
}

_render_local_usage_block() {
  local json="$1"
  if [ -z "$json" ]; then
    _row_dim "  (api not reachable — start the deployment first)"
    return
  fi
  local req in_t out_t last
  req="$(_json_get_int totalRequests    "$json")"
  in_t="$(_json_get_int totalInputTokens "$json")"
  out_t="$(_json_get_int totalOutputTokens "$json")"
  last="$(printf '%s' "$json" | grep -oE '"lastCall":"[^"]*"' | head -n1 \
    | sed 's/"lastCall":"//;s/"$//')"
  _row_kv "Requests:"      "${req:-0}"
  _row_kv "Input tokens:"  "$(_fmt_int "${in_t:-0}")"
  _row_kv "Output tokens:" "$(_fmt_int "${out_t:-0}")"
  [ -n "$last" ] && _row_kv "Last call:" "$last"
}

maintenance_anthropic_usage() {
  local range="30d" days=30 sel
  while true; do
    local local_json admin_usage admin_cost admin_key
    admin_key="$(get_env_value ANTHROPIC_ADMIN_KEY)"

    # Fetch (silent — show spinner-like info to stderr-free /dev/tty)
    _measure
    _cls
    printf '  %s·%s  Fetching usage data (range: %s)…\n' "$CC" "$C0" "$range" >/dev/tty
    local_json="$(_fetch_local_usage "$range")"
    if [ -n "$admin_key" ]; then
      admin_usage="$(_fetch_admin_usage "$days")"
      admin_cost="$(_fetch_admin_cost  "$days")"
    fi

    _header "Anthropic API Usage"
    _blank
    _row_bold "Local — this OpenWeb deployment (last ${range})"
    _render_local_usage_block "$local_json"
    _mid
    _row_bold "Organization — Anthropic Admin API (last ${range})"
    if [ -z "$admin_key" ]; then
      _row "  ANTHROPIC_ADMIN_KEY is not set."
      _row "  Use 'Edit environment variables' to add it and unlock org-wide"
      _row "  token totals and cost reporting."
    else
      _render_admin_usage_block "$admin_usage" "$admin_cost"
    fi
    _mid
    _row "  [7]  Last 7 days     [30]  Last 30 days     [r]  Refresh     [q]  Back"
    _bot

    printf '\n  %s›%s  %sChoice%s %s[%s]%s: ' \
      "$CC" "$C0" "$CB" "$C0" "$CD" "$range" "$C0" >/dev/tty
    _cur_show; IFS= read -r sel </dev/tty; _cur_hide
    sel="$(to_lower "$sel")"

    case "$sel" in
      7)        range="7d";  days=7  ;;
      30|'')    range="30d"; days=30 ;;
      r)        : ;;
      q)        return 0 ;;
      *)        _warn "Unknown option: $sel"; _pause ;;
    esac
  done
}

maintenance_check_github_updates() {
  local remote_url branch local_sha remote_sha behind ahead dirty

  # ── Repo sanity ────────────────────────────────────────────────────────────
  if ! _git_root_check; then
    _header "GitHub Updates"
    _blank
    _row_bold "Not a git repository"
    _row "Cannot check for updates. Re-clone the repo to enable this feature."
    _row_dim "$ROOT_DIR"
    _bot
    _pause
    return 0
  fi

  remote_url="$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null || true)"
  if [ -z "$remote_url" ]; then
    _header "GitHub Updates"
    _blank
    _row_bold "No 'origin' remote configured"
    _row "Add one with:"
    _row "  git remote add origin <url>"
    _bot
    _pause
    return 0
  fi

  branch="$(_git_current_branch)"
  if [ -z "$branch" ]; then
    _header "GitHub Updates"
    _blank
    _row_bold "HEAD is detached"
    _row "You're not on a branch — cannot pull updates."
    _row "Switch to main with:  git checkout main"
    _bot
    _pause
    return 0
  fi

  # ── Fetch ──────────────────────────────────────────────────────────────────
  _header "GitHub Updates"
  _blank
  _row "Checking origin/main for updates."
  _row_dim "Remote: $remote_url"
  _row_dim "Branch: $branch"
  _bot
  printf '\n' >/dev/tty
  _info "Fetching origin/main..."
  if ! _git_capture fetch origin main; then
    _header "GitHub Updates"
    _blank
    _row_bold "Fetch failed"
    _row "Could not reach the remote. Check network/credentials."
    _mid
    _render_git_log "$_GIT_OUT"
    _bot
    _pause
    return 0
  fi

  # ── Compute state ──────────────────────────────────────────────────────────
  local_sha="$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo unknown)"
  remote_sha="$(git -C "$ROOT_DIR" rev-parse origin/main 2>/dev/null || echo unknown)"
  behind="$(git -C "$ROOT_DIR" rev-list --count HEAD..origin/main 2>/dev/null || echo 0)"
  ahead="$(git -C "$ROOT_DIR" rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
  if _git_is_dirty; then dirty=1; else dirty=0; fi

  # ── Decision matrix ────────────────────────────────────────────────────────
  while true; do
    _header "GitHub Updates"
    _blank
    _row_kv "Remote:"      "$remote_url"
    _row_kv "Branch:"      "$branch"
    _row_kv "Local HEAD:"  "${local_sha:0:12}"
    _row_kv "origin/main:" "${remote_sha:0:12}"
    _row_kv "Behind:"      "$behind commit(s)"
    _row_kv "Ahead:"       "$ahead commit(s)"
    if [ "$dirty" = "1" ]; then
      _row_kv "Working tree:" "dirty (uncommitted changes)"
    else
      _row_kv "Working tree:" "clean"
    fi
    _mid

    if [ "${behind:-0}" -eq 0 ] && [ "${ahead:-0}" -eq 0 ]; then
      _row "Already up to date with origin/main."
      [ "$dirty" = "1" ] && _row_dim "(working tree has uncommitted changes)"
      _row ""
      _row "  [q]  back"
      _bot
      printf '\n  %s›%s  %sChoice%s %s[q]%s: ' \
        "$CC" "$C0" "$CB" "$C0" "$CD" "$C0" >/dev/tty
      _cur_show; IFS= read -r _REPLY </dev/tty; _cur_hide
      return 0
    fi

    if [ "${ahead:-0}" -gt 0 ] && [ "${behind:-0}" -gt 0 ]; then
      _row "Branch has diverged: $ahead local commit(s), $behind upstream."
      _row "Fast-forward is impossible."
      _row ""
      _row "  [1]  Show divergent commits"
      _row "  [2]  Discard local commits + changes (hard reset to origin/main)"
      _row "  [q]  Back"
      _bot
      prompt_choice "q"
      case "$_REPLY" in
        1)
          _header "GitHub Updates"
          _blank
          _row_bold "Local commits not on origin/main"
          _mid
          local line
          while IFS= read -r line; do
            [ -n "$line" ] || continue
            _row "$line"
          done <<EOF
$(git -C "$ROOT_DIR" log --oneline origin/main..HEAD 2>/dev/null | head -n 30)
EOF
          _bot
          _pause
          ;;
        2) _do_git_hard_reset; return 0 ;;
        *) return 0 ;;
      esac
      continue
    fi

    if [ "${ahead:-0}" -gt 0 ] && [ "${behind:-0}" -eq 0 ]; then
      _row "Local branch is $ahead commit(s) ahead of origin/main."
      _row "Nothing to pull. Use 'git push' to publish."
      _bot
      _pause
      return 0
    fi

    # behind > 0, ahead = 0
    if [ "$dirty" = "0" ]; then
      _row "$behind new commit(s) available on origin/main."
      _row ""
      _row "  [1]  Fast-forward pull"
      _row "  [q]  Back"
      _bot
      prompt_choice "1"
      case "$_REPLY" in
        1) _do_git_pull_clean; return 0 ;;
        *) return 0 ;;
      esac
    else
      _row "$behind new commit(s) available, but your working tree is dirty."
      _row ""
      _row "  [1]  Stash local changes, pull, then reapply"
      _row "  [2]  Discard local changes + pull (hard reset to origin/main)"
      _row "  [3]  Show dirty files"
      _row "  [q]  Back"
      _bot
      prompt_choice "1"
      case "$_REPLY" in
        1) _do_git_pull_with_stash; return 0 ;;
        2) _do_git_hard_reset; return 0 ;;
        3)
          _header "GitHub Updates"
          _blank
          _row_bold "Uncommitted changes"
          _mid
          _render_dirty_files
          _bot
          _pause
          ;;
        *) return 0 ;;
      esac
    fi
  done
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
    _row "3) Rebuild / update app"
    _row "4) Check GitHub updates (origin/main) and download"
    _row "5) Edit environment variables"
    _row "6) View Anthropic API usage"
    _row "7) Exit"
    _bot

    prompt_choice "2"
    case "$_REPLY" in
      1) return 0 ;;
      2) maintenance_update_db_credentials; exit 0 ;;
      3) maintenance_rebuild_app; exit 0 ;;
      4) maintenance_check_github_updates ;;
      5) maintenance_edit_env ;;
      6) maintenance_anthropic_usage ;;
      7) exit 0 ;;
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
