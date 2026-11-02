#!/bin/sh
set -eu

# NODE01 is the IZAKHONO sovereign software runtime.
# This poller consumes the release contract produced by GitHub and executes
# the existing owned-first production cutover only after the release contract
# is valid. It never changes the public-live truth boundary itself.

APP="allegro-vibez"
REPO="${IZAKHONO_SOURCE_REPOSITORY:-bevanshelton-netizen/allegro-vibez}"
BRANCH="${IZAKHONO_RELEASE_BRANCH:-main}"
PUBLIC_URL="${IZAKHONO_PUBLIC_APP_URL:-https://allegrovibez.com}"
NODE_ID="${IZAKHONO_NODE_ID:-NODE01}"
STATE_DIR="${IZAKHONO_NODE01_STATE_DIR:-./.node01-state/$APP}"
WORK_DIR="${IZAKHONO_NODE01_WORK_DIR:-./.node01-work/$APP}"
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

  revision="$(sed -n 's/.*"revision"[[:space:]]*:[[:space:]]*"\([0-9a-f][0-9a-f]*\)".*/\1/p' "$contract" | head -n 1)"
  state="$(sed -n 's/.*"state"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$contract" | head -n 1)"
  app="$(sed -n 's/.*"app"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$contract" | head -n 1)"

  if [ "$app" != "$APP" ] || [ "$state" != "ready" ] || [ -z "$revision" ]; then
    log "invalid release contract; retrying"; sleep "$POLL_SECONDS"; continue
  fi

  last=""
  [ -f "$STATE_DIR/last-revision" ] && last="$(cat "$STATE_DIR/last-revision")"
  if [ "$revision" = "$last" ]; then sleep "$POLL_SECONDS"; continue; fi

  log "new ALLEGRO release detected: $revision"
  printf '%s\n' "$revision" > "$STATE_DIR/pending-revision"
  if [ "$EXECUTE" != "true" ]; then
    log "execution disabled; contract acknowledged but not promoted"; sleep "$POLL_SECONDS"; continue
  fi

  release="$WORK_DIR/$revision"
  rm -rf "$release"; mkdir -p "$release"
  archive="$WORK_DIR/$revision.tar.gz"
  source_url="https://github.com/$REPO/archive/$revision.tar.gz"
  if ! curl -fsSL --retry 3 --connect-timeout 15 "$source_url" -o "$archive"; then
    log "source download failed; retrying"; sleep "$POLL_SECONDS"; continue
  fi
  tar -xzf "$archive" --strip-components=1 -C "$release"
  rm -f "$archive"

  if [ ! -f "$release/scripts/izakhono/production-cutover.sh" ]; then
    log "release $revision has no production cutover engine; refusing promotion"; sleep "$POLL_SECONDS"; continue
  fi

  log "executing owned-first production cutover for $revision"
  if (
    cd "$release"
    export GITHUB_SHA="$revision"
    export IZAKHONO_NODE_ID="$NODE_ID"
    export IZAKHONO_PUBLIC_APP_URL="$PUBLIC_URL"
    export IZAKHONO_RECEIPT_DIR="$STATE_DIR/deployment-receipts/$revision"
    sh scripts/izakhono/production-cutover.sh
  ); then
    printf '%s\n' "$revision" > "$STATE_DIR/last-revision"
    rm -f "$STATE_DIR/pending-revision"
    log "ALLEGRO NODE01 cutover completed for $revision; receipt retained locally"
  else
    log "ALLEGRO NODE01 cutover failed for $revision; no success state recorded"
  fi
  sleep "$POLL_SECONDS"
done
