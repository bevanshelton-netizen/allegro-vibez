#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
KUBECTL="${KUBECTL:-k3s kubectl}"
SECRET_FILE="${ALLEGRO_SECRET_FILE:-}"
CONFIG_DIR="${ALLEGRO_CONFIG_DIR:-}"

[[ "$(id -u)" -eq 0 ]] || { echo "Run on a k3s server node as root." >&2; exit 2; }
[[ -n "$SECRET_FILE" && -f "$SECRET_FILE" ]] || { echo "ALLEGRO_SECRET_FILE is required." >&2; exit 2; }
[[ -n "$CONFIG_DIR" && -d "$CONFIG_DIR" ]] || { echo "ALLEGRO_CONFIG_DIR is required." >&2; exit 2; }

for f in tracks.json ads.json; do
  [[ -f "$CONFIG_DIR/$f" ]] || { echo "Missing $CONFIG_DIR/$f" >&2; exit 3; }
done

PROGRAMS_FILE="$CONFIG_DIR/programs.json"
if [[ ! -f "$PROGRAMS_FILE" ]]; then
  PROGRAMS_FILE="$ROOT/radio/programming/programs.launch.json"
fi
[[ -f "$PROGRAMS_FILE" ]] || { echo "Missing ALLEGRO programme grid" >&2; exit 3; }

$KUBECTL get storageclass longhorn >/dev/null || {
  echo "Longhorn StorageClass is required before ALLEGRO deployment." >&2
  exit 4
}

python3 - "$CONFIG_DIR/tracks.json" <<'PY'
import json,sys
tracks=json.load(open(sys.argv[1],encoding="utf-8"))
cleared=[
 t for t in tracks
 if t.get("active",True) is not False
 and t.get("rights_status")=="verified"
 and t.get("radio_clearance")=="cleared"
 and str(t.get("clearance_reference") or "").strip()
 and str(t.get("path") or "").startswith("/media/")
]
if not cleared:
    raise SystemExit("No rights-cleared tracks with /media paths were supplied.")
print(f"RIGHTS_CLEARED_TRACKS={len(cleared)}")
PY

$KUBECTL apply -f "$ROOT/radio/cluster/workload.yaml"

$KUBECTL -n allegro-radio create secret generic allegro-radio-secrets   --from-env-file="$SECRET_FILE"   --dry-run=client -o yaml | $KUBECTL apply -f -

$KUBECTL -n allegro-radio create configmap allegro-radio-programming \
  --from-file=programs.json="$PROGRAMS_FILE" \
  --from-file=tracks.json="$CONFIG_DIR/tracks.json" \
  --from-file=ads.json="$CONFIG_DIR/ads.json" \
  --from-file=formats.json="$ROOT/radio/programming/formats.json" \
  --from-file=imaging.json="$ROOT/radio/programming/imaging.json" \
  --dry-run=client -o yaml | $KUBECTL apply -f -

$KUBECTL -n allegro-radio create configmap allegro-radio-runtime   --from-file=liquidsoap.liq="$ROOT/radio/cluster/liquidsoap.cluster.liq"   --dry-run=client -o yaml | $KUBECTL apply -f -

$KUBECTL -n allegro-radio rollout restart deployment/allegro-radio-engine

echo "ALLEGRO_CLUSTER_CONFIG=APPLIED"
echo "Seed rights-cleared audio and fallback/station-id.wav into allegro-radio-media, then verify the engine."
