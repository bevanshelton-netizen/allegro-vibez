#!/usr/bin/env bash
set -euo pipefail

BUNDLE="${1:-}"
[[ "$(id -u)" -eq 0 ]] || { echo "Run as root on each IZAKHONO node." >&2; exit 2; }
[[ -n "$BUNDLE" && -f "$BUNDLE" ]] || { echo "Usage: sudo $0 <allegro-radio-cluster-v1.tar>" >&2; exit 2; }
command -v k3s >/dev/null || { echo "k3s is required." >&2; exit 2; }

if [[ -f "$BUNDLE.sha256" ]]; then
  (cd "$(dirname "$BUNDLE")" && sha256sum -c "$(basename "$BUNDLE").sha256")
fi

k3s ctr images import "$BUNDLE"

for image in   docker.io/izakhono/allegro-radio-autopilot:cluster-v1   docker.io/izakhono/allegro-radio-icecast:cluster-v1   docker.io/savonet/liquidsoap:v2.4.5   docker.io/library/busybox:1.37
do
  k3s ctr images list -q | grep -Fx "$image" >/dev/null || {
    echo "Missing imported image: $image" >&2
    exit 4
  }
done

echo "ALLEGRO_CLUSTER_IMAGES=PASS node=$(hostname -s)"
