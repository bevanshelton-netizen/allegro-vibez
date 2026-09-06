#!/usr/bin/env bash
set -euo pipefail

ROOT="${ALLEGRO_RADIO_ROOT:-/var/lib/izakhono-radio}"
ENV_FILE="/etc/izakhono/apps/allegro-radio.env"

sudo mkdir -p "$ROOT"/{config,state,media/music,media/ads,media/fallback,logs}
sudo mkdir -p /etc/izakhono/apps

if [[ ! -f "$ROOT/config/programs.json" ]]; then
  sudo cp radio/owner-node/config/programs.json "$ROOT/config/programs.json"
fi
if [[ ! -f "$ROOT/config/tracks.json" ]]; then
  echo '[]' | sudo tee "$ROOT/config/tracks.json" >/dev/null
fi
if [[ ! -f "$ROOT/config/ads.json" ]]; then
  echo '[]' | sudo tee "$ROOT/config/ads.json" >/dev/null
fi

if [[ ! -f "$ENV_FILE" ]]; then
  source_password="$(python3 - <<'PY'
import secrets; print(secrets.token_urlsafe(32))
PY
)"
  admin_password="$(python3 - <<'PY'
import secrets; print(secrets.token_urlsafe(32))
PY
)"
  relay_password="$(python3 - <<'PY'
import secrets; print(secrets.token_urlsafe(32))
PY
)"
  live_password="$(python3 - <<'PY'
import secrets; print(secrets.token_urlsafe(32))
PY
)"
  sudo tee "$ENV_FILE" >/dev/null <<EOF
ICECAST_SOURCE_PASSWORD=$source_password
ICECAST_ADMIN_PASSWORD=$admin_password
ICECAST_RELAY_PASSWORD=$relay_password
ICECAST_HOSTNAME=radio.izakhono.local
ALLEGRO_LIVE_PASSWORD=$live_password
ALLEGRO_RADIO_TIMEZONE=Africa/Johannesburg
ALLEGRO_RADIO_TERRITORY=ZA
ALLEGRO_RADIO_QUEUE_ITEMS=80
ALLEGRO_RADIO_AD_EVERY_TRACKS=5
ALLEGRO_RADIO_REFRESH_SECONDS=300
ALLEGRO_RADIO_MEDIA_ROOT=$ROOT/media
ALLEGRO_RADIO_STATE_ROOT=$ROOT/state
ALLEGRO_RADIO_CONFIG_ROOT=$ROOT/config
ALLEGRO_RADIO_LOG_ROOT=$ROOT/logs
ALLEGRO_RADIO_ENV_FILE=$ENV_FILE
EOF
  sudo chmod 600 "$ENV_FILE"
fi

echo "ALLEGRO_RADIO_IZAKHONO_PREPARED=YES"
echo "media=$ROOT/media"
echo "config=$ROOT/config"
echo "env=$ENV_FILE"
echo "Next: add only rights-cleared audio and populate tracks.json."
