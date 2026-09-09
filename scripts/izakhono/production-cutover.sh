#!/usr/bin/env sh
set -eu

: "${VITE_IZAKHONO_CORE_URL:?VITE_IZAKHONO_CORE_URL is required}"
: "${VITE_IZAKHONO_PUBLIC_KEY:?VITE_IZAKHONO_PUBLIC_KEY is required}"
: "${IZAKHONO_PUBLIC_APP_URL:?IZAKHONO_PUBLIC_APP_URL is required}"

case "$VITE_IZAKHONO_CORE_URL" in
  https://*) ;;
  *) echo "IZAKHONO Core must use public HTTPS for production." >&2; exit 1 ;;
esac

case "$IZAKHONO_PUBLIC_APP_URL" in
  https://*) ;;
  *) echo "Public ALLEGRO URL must use HTTPS." >&2; exit 1 ;;
esac

app_name="allegro-vibez"
core_project="allegro-vibez"
canary_name="${app_name}-canary"
revision="${GITHUB_SHA:-manual}"
short_revision="$(printf '%s' "$revision" | cut -c1-12)"
image="${app_name}:izakhono-${short_revision}"
canary_port="${IZAKHONO_CANARY_PORT:-18080}"
production_port="${IZAKHONO_PRODUCTION_PORT:-8080}"

core_base="${VITE_IZAKHONO_CORE_URL%/}"
public_base="${IZAKHONO_PUBLIC_APP_URL%/}"

echo "Checking owner-controlled IZAKHONO Core..."
curl --fail --silent --show-error "$core_base/healthz" >/dev/null
curl --fail --silent --show-error "$core_base/readyz" >/dev/null

for table in public_profiles published_releases subscription_plans public_artist_booking_settings; do
  curl --fail --silent --show-error \
    -H "X-Project-Key: $VITE_IZAKHONO_PUBLIC_KEY" \
    "$core_base/v1/data/$core_project/$table?limit=1" >/dev/null
done

echo "Building ALLEGRO against IZAKHONO Core project $core_project..."
docker build \
  --build-arg "VITE_IZAKHONO_CORE_URL=$core_base" \
  --build-arg "VITE_IZAKHONO_PROJECT=$core_project" \
  --build-arg "VITE_IZAKHONO_PUBLIC_KEY=$VITE_IZAKHONO_PUBLIC_KEY" \
  --label "za.co.izakhono.product=ALLEGRO VIBEZ" \
  --label "za.co.izakhono.commit=$revision" \
  --label "za.co.izakhono.channel=production-candidate" \
  -t "$image" .

docker rm -f "$canary_name" >/dev/null 2>&1 || true
docker run -d --name "$canary_name" -p "127.0.0.1:${canary_port}:8080" "$image" >/dev/null
cleanup_canary() { docker rm -f "$canary_name" >/dev/null 2>&1 || true; }
trap cleanup_canary EXIT INT TERM

attempt=0
until curl --fail --silent --show-error "http://127.0.0.1:${canary_port}/healthz" >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker logs "$canary_name" || true
    echo "Canary failed its health gate; production was not changed." >&2
    exit 1
  fi
  sleep 2
done

for route in / /radio /artists /join-artists /career /revenue /radio-academy /creator-hub /login /register; do
  if ! curl --fail --silent --show-error "http://127.0.0.1:${canary_port}$route" | grep -q 'id="root"'; then
    echo "Candidate route failed: $route" >&2
    exit 1
  fi
done

old_image=""
if docker container inspect "$app_name" >/dev/null 2>&1; then
  old_image="$(docker container inspect --format '{{.Config.Image}}' "$app_name")"
  docker rm -f "$app_name" >/dev/null
fi

rollback() {
  docker rm -f "$app_name" >/dev/null 2>&1 || true
  if [ -n "$old_image" ]; then
    docker run -d --name "$app_name" --restart unless-stopped \
      -p "127.0.0.1:${production_port}:8080" "$old_image" >/dev/null
  fi
}

if ! docker run -d --name "$app_name" --restart unless-stopped \
  -p "127.0.0.1:${production_port}:8080" "$image" >/dev/null; then
  rollback
  echo "Promotion failed; previous ALLEGRO image restored." >&2
  exit 1
fi

attempt=0
until curl --fail --silent --show-error "http://127.0.0.1:${production_port}/healthz" >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker logs "$app_name" || true
    rollback
    echo "Promoted container failed; previous ALLEGRO image restored." >&2
    exit 1
  fi
  sleep 2
done

if ! curl --fail --silent --show-error "$public_base/healthz" >/dev/null; then
  rollback
  echo "External HTTPS health acceptance failed; previous ALLEGRO image restored." >&2
  exit 1
fi

if ! curl --fail --silent --show-error "$public_base/" | grep -qi 'ALLEGRO'; then
  rollback
  echo "External ALLEGRO landing-page acceptance failed; previous ALLEGRO image restored." >&2
  exit 1
fi

if ! curl --fail --silent --show-error "$public_base/radio" | grep -q 'id="root"'; then
  rollback
  echo "External ALLEGRO Radio route failed; previous ALLEGRO image restored." >&2
  exit 1
fi

echo "ALLEGRO-VIBEZ promoted successfully on owner-controlled IZAKHONO infrastructure."
