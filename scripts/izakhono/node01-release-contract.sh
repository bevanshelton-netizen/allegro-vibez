#!/bin/sh
set -eu

# NODE01 is the IZAKHONO software runtime/control plane.
# This contract intentionally does not depend on a GitHub self-hosted runner.

APP="allegro-vibez"
PUBLIC_URL="${IZAKHONO_PUBLIC_APP_URL:-https://allegrovibez.com}"
REVISION="${GITHUB_SHA:-unknown}"
RECEIPT_DIR="${IZAKHONO_RECEIPT_DIR:-./deployment-receipts}"

mkdir -p "$RECEIPT_DIR"

printf '%s\n' "NODE01 sovereign release contract" 
printf 'app=%s\nrevision=%s\npublic_url=%s\n' "$APP" "$REVISION" "$PUBLIC_URL"

# NODE01 must provide the actual build/promotion implementation.
# Never report PUBLIC LIVE from this contract unless the runtime writes
# a verified acceptance receipt after health, TLS, canary and rollback gates.

if [ -x "./scripts/izakhono/production-cutover.sh" ]; then
  exec ./scripts/izakhono/production-cutover.sh
fi

printf '%s\n' "ERROR: NODE01 production cutover implementation is unavailable." >&2
exit 1
