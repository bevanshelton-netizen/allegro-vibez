#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo '=== IZAKHONO / ALLEGRO PREFLIGHT ==='
npm ci --ignore-scripts --no-audit --no-fund
npm run verify:all

echo '[PASS] Allegro project preflight completed.'
