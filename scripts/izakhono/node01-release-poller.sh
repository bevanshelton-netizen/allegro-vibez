#!/bin/sh
set -eu

# ALLEGRO consumes the IZAKHONO App Fabric runtime contract.
# NODE01 is a logical software runtime; the actual runtime host executes the
# App Fabric release authority. This poller never fabricates LIVE evidence.

APP="allegro-vibez"
REPO="${IZAKHONO_SOURCE_REPOSITORY:-bevanshelton-netizen/allegro-vibez}"
BRANCH="${IZAKHONO_RELEASE_BRANCH:-main}"
PUBLIC_URL="${IZAKHONO_PUBLIC_APP_URL:-https://allegrovibez.com}"
NODE_ID="${IZAKHONO_NODE_ID:-NODE01}"
STATE_DIR="${IZAKHONO_NODE01_STATE_DIR:-/opt/izakhono/state/$APP}"
WORK_DIR="${IZAKHONO_NODE01_WORK_DIR:-/opt/izakhono/work/$APP}"
RELEASE_AUTHORITY="${IZAKHONO_RELEASE_AUTHORITY:-/opt/izakhono/bin/izakhono-release}"
POLL_SECONDS="${IZAKHONO_NODE01_POLL_SECONDS:-30}"
EXECUTE="${IZAKHONO_NODE01_EXECUTE:-false}"
CURRENT_URL="https://raw.githubusercontent.com/$REPO/$BRANCH/release-contracts/$APP/CURRENT.json"

mkdir -p "$STATE_DIR" "$WORK_DIR"
log() { printf '[NODE01][%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

while :; do
  contract="$WORK_DIR/CURRENT.json"
  tmp="$contract.tmp"
  if ! curl -fsSL --retry 3 --connect-timeout 10 "$CURRENT_URL" -o "$tmp"; then
    log "release contract unavailable; retrying"; sleep "$POLL_SECONDS"; continue
  fi
  mv "$tmp" "$contract"

  revision="$(sed -n 's/.*"revision"[[:space:]]*:[[:space:]]*"\([0-9a-f]\{40\}\)".*/\1/p' "$contract" | head -n 1)"
  state="$(sed -n 's/.*"state"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$contract" | head -n 1)"
  app="$(sed -n 's/.*"app"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$contract" | head -n 1)"
  logical_node="$(sed -n 's/.*"logical_node_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$contract" | head -n 1)"
  identity_type="$(sed -n 's/.*"identity_type"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$contract" | head -n 1)"
  binding_schema="$(sed -n 's/.*"runtime_binding_schema"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$contract" | head -n 1)"
  ownership="$(sed -n 's/.*"ownership"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$contract" | head -n 1)"
  executor="$(sed -n 's/.*"executor"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$contract" | head -n 1)"
  claim="$(sed -n 's/.*"production_claim"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$contract" | head -n 1)"

  if [ "$app" != "$APP" ] || [ "$state" != "ready" ] || [ -z "$revision" ] \
    || [ "$logical_node" != "$NODE_ID" ] \
    || [ "$identity_type" != "software-runtime" ] \
    || [ "$binding_schema" != "izakhono.runtime-binding/v1" ] \
    || [ "$ownership" != "izakhono-owned" ] \
    || [ "$executor" != "$NODE_ID" ] \
    || [ "$claim" != "NOT_YET_PUBLIC" ]; then
    log "invalid or unsafe logical NODE01 release contract; refusing promotion"; sleep "$POLL_SECONDS"; continue
  fi

  last=""
  [ -f "$STATE_DIR/last-revision" ] && last="$(cat "$STATE_DIR/last-revision")"
  if [ "$revision" = "$last" ]; then sleep "$POLL_SECONDS"; continue; fi

  log "new ALLEGRO release detected: $revision"
  printf '%s\n' "$revision" > "$STATE_DIR/pending-revision"
  if [ "$EXECUTE" != "true" ]; then
    log "execution disabled; contract acknowledged but not promoted"; sleep "$POLL_SECONDS"; continue
  fi

  if [ ! -x "$RELEASE_AUTHORITY" ]; then
    log "IZAKHONO release authority unavailable at $RELEASE_AUTHORITY; refusing promotion"
    sleep "$POLL_SECONDS"
    continue
  fi

  log "handing ALLEGRO release to IZAKHONO App Fabric release authority"
  if "$RELEASE_AUTHORITY" \
      --application "$APP" \
      --revision "$revision" \
      --source-repository "$REPO" \
      --public-url "$PUBLIC_URL" \
      --logical-node "$NODE_ID" \
      --release-contract "$contract" \
      --state-root "$STATE_DIR"; then
    printf '%s\n' "$revision" > "$STATE_DIR/last-revision"
    rm -f "$STATE_DIR/pending-revision"
    log "ALLEGRO App Fabric release accepted for $revision; independent acceptance remains required"
  else
    log "ALLEGRO App Fabric release failed for $revision; no success state recorded"
  fi
  sleep "$POLL_SECONDS"
done
