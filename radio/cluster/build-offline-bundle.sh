#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIST="$ROOT/dist"
BUNDLE="$DIST/allegro-radio-cluster-v1.tar"

command -v docker >/dev/null || { echo "Docker is required on the build workstation." >&2; exit 2; }
mkdir -p "$DIST"

docker build   -t izakhono/allegro-radio-autopilot:cluster-v1   -f "$ROOT/radio/cluster/Dockerfile.autopilot"   "$ROOT"

docker build   -t izakhono/allegro-radio-icecast:cluster-v1   -f "$ROOT/radio/owner-node/Dockerfile.icecast"   "$ROOT/radio/owner-node"

docker pull savonet/liquidsoap:v2.4.5
docker pull busybox:1.37

docker save   izakhono/allegro-radio-autopilot:cluster-v1   izakhono/allegro-radio-icecast:cluster-v1   savonet/liquidsoap:v2.4.5   busybox:1.37   -o "$BUNDLE"

sha256sum "$BUNDLE" | tee "$BUNDLE.sha256"
echo "ALLEGRO_CLUSTER_BUNDLE=$BUNDLE"
