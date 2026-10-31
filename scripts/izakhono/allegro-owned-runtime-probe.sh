#!/usr/bin/env sh
set -eu
CORE_URL="${VITE_IZAKHONO_CORE_URL:-https://ai.izakhono.co.za}"
case "$CORE_URL" in https://*) ;; *) echo "Owned core must use HTTPS: $CORE_URL" >&2; exit 2;; esac
printf '%s\n' "ALLEGRO owned-runtime probe: $CORE_URL"
for path in /api/health /healthz /readyz; do
  code="$(curl -sS -o /tmp/allegro-owned-runtime-probe.out -w '%{http_code}' --max-time 8 "$CORE_URL$path" || true)"
  printf '%s %s\n' "$path" "$code"
  if [ "$code" = "200" ]; then
    printf '%s\n' "Owned runtime endpoint accepted: $path"
    exit 0
  fi
done
echo "Owned runtime is not publicly reachable; no deployment is claimed." >&2
exit 1
