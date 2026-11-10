#!/bin/sh
set -eu

# Long-running NODE01 software release consumer.
# NODE01 is software; systemd supervises this process in a separately managed
# execution environment. This process never fabricates LIVE evidence.

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

log() { printf '[NODE01][%s] %s\\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
retry() { sleep "$POLL_SECONDS"; }

command -v curl >/dev/null 2>&1 || { echo '[NODE01] curl is required' >&2; exit 2; }
command -v jq >/dev/null 2>&1 || { echo '[NODE01] jq is required' >&2; exit 2; }
case "$POLL_SECONDS" in ''|*[!0-9]*) echo '[NODE01] poll interval must be a positive integer' >&2; exit 2;; esac
[ "$POLL_SECONDS" -gt 0 ] || { echo '[NODE01] poll interval must be positive' >&2; exit 2; }
mkdir -p "$STATE_DIR" "$WORK_DIR"

while :; do
  contract="$WORK_DIR/CURRENT.json"
  tmp="$contract.tmp"
  if ! curl -fsSL --retry 3 --connect-timeout 10 "$CURRENT_URL" -o "$tmp"; then
    log 'release contract unavailable; retrying'
    rm -f "$tmp"
    retry
    continue
  fi
  if ! jq -e '
    .schema == "izakhono.node01/release/v2" and
    .state == "ready" and
    .app == "allegro-vibez" and
    (.revision | type == "string" and test("^[0-9a-f]{40}$")) and
    .logical_node_id == "NODE01" and
    .identity_type == "software-runtime" and
    .runtime_binding_schema == "izakhono.runtime-binding/v1" and
    .runtime_host_is_separate == true and
    .ownership == "izakhono-owned" and
    .executor == "NODE01" and
    .production_claim == "NOT_YET_PUBLIC" and
    .artifact_identity == "immutable-image-digest"
  ' "$tmp" >/dev/null; then
    log 'invalid or unsafe release contract; refusing execution'
    rm -f "$tmp"
    retry
    continue
  fi
  mv "$tmp" "$contract"

  revision="$(jq -r '.revision' "$contract")"
  source_repo="$(jq -r '.source_repository' "$contract")"
  source_commit="$(jq -r '.source_commit' "$contract")"
  contract_url="$(jq -r '.public_url' "$contract")"
  if [ "$source_repo" != "$REPO" ] || [ "$source_commit" != "$revision" ] || [ "$contract_url" != "$PUBLIC_URL" ]; then
    log 'release contract source or destination mismatch; refusing execution'
    retry
    continue
  fi

  last=""
  [ ! -f "$STATE_DIR/last-revision" ] || last="$(cat "$STATE_DIR/last-revision")"
  if [ "$revision" = "$last" ]; then retry; continue; fi

  log "release detected: $revision"
  printf '%s\\n' "$revision" > "$STATE_DIR/pending-revision"
  if [ "$EXECUTE" != "true" ]; then
    log 'execution disabled; contract validated and acknowledged, not deployed'
    retry
    continue
  fi

  [ -x "$RELEASE_AUTHORITY" ] || {
    log "release authority unavailable: $RELEASE_AUTHORITY"
    retry
    continue
  }

  if "$RELEASE_AUTHORITY" \\
      --application "$APP" \\
      --revision "$revision" \\
      --source-repository "$REPO" \\
      --public-url "$PUBLIC_URL" \\
      --logical-node "$NODE_ID" \\
      --release-contract "$contract" \\
      --state-root "$STATE_DIR"; then
    printf '%s\\n' "$revision" > "$STATE_DIR/last-revision"
    rm -f "$STATE_DIR/pending-revision"
    log "release handoff completed for $revision; independent acceptance remains required"
  else
    log "release handoff failed for $revision; revision remains pending"
  fi
  retry
done
