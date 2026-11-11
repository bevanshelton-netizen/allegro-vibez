#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
BIN_DIR="${IZAKHONO_BIN_DIR:-/opt/izakhono/bin}"
UNIT_DIR="${IZAKHONO_SYSTEMD_DIR:-/etc/systemd/system}"
CONFIG_DIR="${IZAKHONO_CONFIG_DIR:-/etc/izakhono}"

[ "$(id -u)" -eq 0 ] || { echo '[STOP] Run installer with required system privileges in the execution environment.' >&2; exit 1; }
command -v systemctl >/dev/null 2>&1 || { echo '[STOP] systemd is required for this installer.' >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo '[STOP] curl is required.' >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo '[STOP] jq is required.' >&2; exit 1; }
[ -x "$ROOT/scripts/izakhono/node01-release-poller.sh" ] || { echo '[STOP] release poller is not executable.' >&2; exit 1; }
[ -x "$BIN_DIR/izakhono-release" ] || { echo "[STOP] release authority missing: $BIN_DIR/izakhono-release" >&2; exit 1; }
[ -f "$ROOT/infra/izakhono/runtime-binding.NODE01.json" ] || { echo "[STOP] NODE01 runtime-binding template is missing." >&2; exit 1; }

install -d -m 0755 "$BIN_DIR" "$UNIT_DIR" "$CONFIG_DIR" /opt/izakhono/state/allegro-vibez /opt/izakhono/work/allegro-vibez
install -m 0755 "$ROOT/scripts/izakhono/node01-release-poller.sh" "$BIN_DIR/node01-release-poller"
install -m 0644 "$ROOT/deploy/izakhono/node01-allegro-release-poller.service" "$UNIT_DIR/node01-allegro-release-poller.service"
if [ ! -f "$CONFIG_DIR/runtime-binding.NODE01.json" ]; then
  install -m 0600 "$ROOT/infra/izakhono/runtime-binding.NODE01.json" "$CONFIG_DIR/runtime-binding.NODE01.json"
  echo "[HOLD] Installed binding template. Replace its placeholder runtime_host with the verified separate execution-environment locator before enabling execution."
fi

if [ ! -f "$CONFIG_DIR/node01-allegro.env" ]; then
  cat > "$CONFIG_DIR/node01-allegro.env" <<'EOF'
IZAKHONO_SOURCE_REPOSITORY=bevanshelton-netizen/allegro-vibez
IZAKHONO_RELEASE_BRANCH=main
IZAKHONO_PUBLIC_APP_URL=https://allegrovibez.com
IZAKHONO_NODE01_EXECUTE=false
EOF
  chmod 0600 "$CONFIG_DIR/node01-allegro.env"
fi

systemctl daemon-reload
systemctl enable --now node01-allegro-release-poller.service
systemctl --no-pager --full status node01-allegro-release-poller.service
