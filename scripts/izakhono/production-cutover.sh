#!/bin/sh
set -eu

app="allegro-vibez"
domain="${ALLEGRO_DOMAIN:-allegrovibez.com}"
compose_file="deploy/izakhono/docker-compose.allegro.yml"
project_dir="$(CDPATH= cd -- "$(dirname "$compose_file")/../.." && pwd)"
receipt_dir="${IZAKHONO_RECEIPT_DIR:-${project_dir}/deploy/izakhono/receipts}"
revision="$(git rev-parse --short=12 HEAD)"
image="${app}:izakhono-${revision}"
previous_image=""
mkdir -p "$receipt_dir"

fail() { echo "ALLEGRO-CUTOVER-FAIL: $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "docker is required"
docker info >/dev/null 2>&1 || fail "docker daemon is unavailable"
[ -f "$project_dir/$compose_file" ] || fail "compose file missing: $compose_file"
[ -n "${ACME_EMAIL:-}" ] || fail "ACME_EMAIL is required"

case "$domain" in
  *.*) ;;
  *) fail "ALLEGRO_DOMAIN must be a real domain" ;;
esac

if docker image inspect "$app:izakhono-current" >/dev/null 2>&1; then
  previous_image="$app:izakhono-current"
fi

printf '%s\n' "[1/7] Building owned ALLEGRO image $image"
docker build --label "org.izakhono.owner=IZAKHONO" --label "org.izakhono.product=ALLEGRO-VIBEZ" --label "org.izakhono.commit=$revision" -t "$image" "$project_dir"

echo "[2/7] Checking edge ports before promotion"
for port in 80 443; do
  if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$port" | tail -n +2 | grep -q .; then
    if ! docker ps --format '{{.Names}} {{.Ports}}' | grep -qE "(^|[[:space:]])${port}->|:${port}->"; then
      fail "host port $port is already occupied outside this ALLEGRO stack"
    fi
  fi
done

printf '%s\n' "[3/7] Starting the owned runtime and TLS edge"
cd "$project_dir"
export ALLEGRO_DOMAIN="$domain"
docker compose -f "$compose_file" up -d --build

echo "[4/7] Waiting for application health"
i=0
while [ "$i" -lt 30 ]; do
  if docker compose -f "$compose_file" exec -T "$app" wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1; then break; fi
  i=$((i+1)); sleep 2
done
[ "$i" -lt 30 ] || fail "application health gate failed"

printf '%s\n' "[5/7] Validating public HTTPS"
public_ok=0
i=0
while [ "$i" -lt 30 ]; do
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 8 "https://${domain}/healthz" | grep -q . && curl -fsSI --max-time 8 "https://${domain}/" >/dev/null 2>&1; then
    public_ok=1
    break
  fi
  i=$((i+1)); sleep 2
done
[ "$public_ok" -eq 1 ] || fail "public HTTPS acceptance failed for https://${domain}"

printf '%s\n' "[6/7] Pinning promoted image"
docker tag "$image" "$app:izakhono-current"

printf '%s\n' "[7/7] Writing immutable deployment receipt"
timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
receipt="$receipt_dir/allegro-${revision}.json"
cat > "$receipt" <<EOF
{
  "product":"ALLEGRO-VIBEZ",
  "deployment_authority":"IZAKHONO",
  "node_id":"${IZAKHONO_NODE_ID:-unknown}",
  "commit":"$revision",
  "image":"$image",
  "public_url":"https://${domain}",
  "health_url":"https://${domain}/healthz",
  "status":"OWNED_LIVE_VERIFIED",
  "application_health":"PASS",
  "public_https":"PASS",
  "timestamp":"$timestamp",
  "rollback_image":"${previous_image:-none}"
}
EOF

printf '%s\n' "ALLEGRO-VIBEZ OWNED_LIVE_VERIFIED: https://${domain}"
printf '%s\n' "Receipt: $receipt"
