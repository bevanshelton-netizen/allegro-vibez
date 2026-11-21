#!/bin/sh
set -eu

app="allegro-vibez"
domain="${ALLEGRO_DOMAIN:-allegrovibez.com}"
compose_file="deploy/izakhono/docker-compose.allegro.yml"
project_dir="$(CDPATH= cd -- "$(dirname "$compose_file")/../.." && pwd)"
receipt_dir="${IZAKHONO_RECEIPT_DIR:-${project_dir}/deploy/izakhono/receipts}"
revision="${IZAKHONO_RELEASE_REVISION:-$(git rev-parse --short=12 HEAD 2>/dev/null || printf unversioned)}"
image="${app}:izakhono-${revision}"
canary="${app}-canary-${revision}"
previous_image=""
promotion_started=0
mkdir -p "$receipt_dir"

fail() { echo "ALLEGRO-CUTOVER-FAIL: $*" >&2; exit 1; }

rollback_on_failure() {
  rc=$?
  trap - EXIT
  if [ "$rc" -ne 0 ] && [ "$promotion_started" -eq 1 ] && [ -n "$previous_image" ]; then
    echo "[ROLLBACK] Restoring previously accepted image: $previous_image" >&2
    export ALLEGRO_DOMAIN="$domain"
    export ALLEGRO_IMAGE="$previous_image"
    if docker compose -f "$compose_file" up -d --no-build; then
      i=0
      while [ "$i" -lt 30 ]; do
        if docker compose -f "$compose_file" exec -T "$app" wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1; then
          echo "[ROLLBACK] Previous application image is healthy." >&2
          exit "$rc"
        fi
        i=$((i+1)); sleep 2
      done
      echo "[ROLLBACK-FAIL] Previous image did not recover application health." >&2
    else
      echo "[ROLLBACK-FAIL] Could not restore the previous compose release." >&2
    fi
  fi
  exit "$rc"
}
trap rollback_on_failure EXIT

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

printf '%s\n' "[1/8] Building immutable owned ALLEGRO image $image"
docker build --label "org.izakhono.owner=IZAKHONO" --label "org.izakhono.product=ALLEGRO-VIBEZ" --label "org.izakhono.commit=$revision" -t "$image" "$project_dir"

printf '%s\n' "[2/8] Canary-testing image before production promotion"
docker rm -f "$canary" >/dev/null 2>&1 || true
docker run -d --name "$canary" --read-only --tmpfs /var/cache/nginx --tmpfs /var/run --security-opt no-new-privileges "$image" >/dev/null
canary_cleanup() { docker rm -f "$canary" >/dev/null 2>&1 || true; }
trap 'canary_cleanup; rollback_on_failure' EXIT
i=0
while [ "$i" -lt 30 ]; do
  if docker exec "$canary" wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1; then break; fi
  i=$((i+1)); sleep 2
done
[ "$i" -lt 30 ] || fail "canary application health failed"
docker exec "$canary" wget -qO- http://127.0.0.1:8080/ | grep -q 'id="platform"' || fail "canary homepage route failed"
docker exec "$canary" wget -qO- http://127.0.0.1:8080/artists/ | grep -q 'Meet the artists' || fail "canary artist directory route failed"
docker exec "$canary" wget -qO- http://127.0.0.1:8080/artists/canary-artist | grep -q 'This artist page' || fail "canary artist profile route failed"
canary_cleanup
trap rollback_on_failure EXIT

printf '%s\n' "[3/8] Checking edge ports before promotion"
for port in 80 443; do
  if command -v ss >/dev/null 2>&1 && ss -ltn "sport = :$port" | tail -n +2 | grep -q .; then
    if ! docker ps --format '{{.Names}} {{.Ports}}' | grep -qE "(^|[[:space:]])${port}->|:${port}->"; then
      fail "host port $port is already occupied outside this ALLEGRO stack"
    fi
  fi
done

printf '%s\n' "[4/8] Starting the owned runtime and TLS edge"
cd "$project_dir"
export ALLEGRO_DOMAIN="$domain"
export ALLEGRO_IMAGE="$image"
promotion_started=1
docker compose -f "$compose_file" up -d

printf '%s\n' "[5/8] Waiting for application health"
i=0
while [ "$i" -lt 30 ]; do
  if docker compose -f "$compose_file" exec -T "$app" wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1; then break; fi
  i=$((i+1)); sleep 2
done
[ "$i" -lt 30 ] || fail "application health gate failed"

printf '%s\n' "[6/8] Validating critical public HTTPS routes"
public_ok=0
i=0
while [ "$i" -lt 30 ]; do
  if command -v curl >/dev/null 2>&1 &&
     curl -fsS --max-time 8 "https://${domain}/healthz" | grep -q ALLEGRO_OK &&
     curl -fsS --max-time 8 "https://${domain}/" | grep -q 'id="platform"' &&
     curl -fsS --max-time 8 "https://${domain}/artists/" | grep -q 'Meet the artists' &&
     curl -fsS --max-time 8 "https://${domain}/artists/acceptance-check" | grep -q 'This artist page'; then
    public_ok=1
    break
  fi
  i=$((i+1)); sleep 2
done
[ "$public_ok" -eq 1 ] || fail "public HTTPS acceptance failed for critical ALLEGRO routes"

printf '%s\n' "[7/8] Pinning promoted image and recording deployment receipt"
docker tag "$image" "$app:izakhono-current"
timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
receipt="$receipt_dir/allegro-${revision}.json"
image_id="$(docker image inspect --format '{{.Id}}' "$image")"
cat > "$receipt" <<EOF
{
  "schema":"izakhono.runtime-handoff/v1",
  "product":"ALLEGRO-VIBEZ",
  "deployment_authority":"IZAKHONO",
  "node_id":"${IZAKHONO_NODE_ID:-NODE01}",
  "node_identity_type":"software-runtime",
  "runtime_binding_schema":"izakhono.runtime-binding/v1",
  "commit":"$revision",
  "image":"$image",
  "image_id":"$image_id",
  "public_url":"https://$domain",
  "health_url":"https://$domain/healthz",
  "status":"PROMOTED_PENDING_ACCEPTANCE",
  "application_health":"PASS",
  "canary":"PASS",
  "public_https":"PASS",
  "backup_restore":"PENDING",
  "rollback_test":"PENDING",
  "post_rollback_health":"PENDING",
  "live_claim":false,
  "timestamp":"$timestamp",
  "rollback_image":"${previous_image:-none}"
}
EOF

printf '%s\n' "[8/8] Handoff receipt created: $receipt"
printf '%s\n' "ALLEGRO-VIBEZ promoted to the IZAKHONO runtime; independent backup/restore and rollback acceptance remain required."
