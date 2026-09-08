#!/usr/bin/env bash
set -euo pipefail

MEDIA_DIR="${ALLEGRO_MEDIA_DIR:-}"
CONFIG_DIR="${ALLEGRO_CONFIG_DIR:-}"
KUBECTL="${KUBECTL:-k3s kubectl}"

[[ "$(id -u)" -eq 0 ]] || { echo "Run on a k3s server node as root." >&2; exit 2; }
[[ -n "$MEDIA_DIR" && -d "$MEDIA_DIR" ]] || { echo "ALLEGRO_MEDIA_DIR is required." >&2; exit 2; }
[[ -n "$CONFIG_DIR" && -f "$CONFIG_DIR/tracks.json" ]] || { echo "ALLEGRO_CONFIG_DIR/tracks.json is required." >&2; exit 2; }

$KUBECTL -n allegro-radio delete pod allegro-media-loader --ignore-not-found=true
cat <<'YAML' | $KUBECTL apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: allegro-media-loader
  namespace: allegro-radio
spec:
  restartPolicy: Never
  containers:
    - name: loader
      image: busybox:1.37
      imagePullPolicy: Never
      command: ["sh","-lc","sleep 3600"]
      volumeMounts:
        - name: media
          mountPath: /media
  volumes:
    - name: media
      persistentVolumeClaim:
        claimName: allegro-radio-media
YAML

$KUBECTL -n allegro-radio wait --for=condition=Ready pod/allegro-media-loader --timeout=5m
$KUBECTL -n allegro-radio cp "$MEDIA_DIR/." allegro-media-loader:/media

python3 - "$CONFIG_DIR/tracks.json" > /tmp/allegro-cleared-paths.txt <<'PY'
import json,sys
for t in json.load(open(sys.argv[1],encoding="utf-8")):
    if (
      t.get("active",True) is not False
      and t.get("rights_status")=="verified"
      and t.get("radio_clearance")=="cleared"
      and str(t.get("clearance_reference") or "").strip()
    ):
        p=str(t.get("path") or "")
        if p.startswith("/media/"):
            print(p)
PY

count=0
while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  $KUBECTL -n allegro-radio exec allegro-media-loader -- test -f "$path" || {
    echo "Missing rights-cleared media file in replicated volume: $path" >&2
    exit 5
  }
  count=$((count+1))
done < /tmp/allegro-cleared-paths.txt

[[ "$count" -gt 0 ]] || { echo "No cleared media was validated." >&2; exit 6; }
$KUBECTL -n allegro-radio delete pod allegro-media-loader --wait=true

$KUBECTL -n allegro-radio rollout restart deployment/allegro-radio-engine
$KUBECTL -n allegro-radio rollout status deployment/allegro-radio-icecast --timeout=5m
$KUBECTL -n allegro-radio rollout status deployment/allegro-radio-engine --timeout=10m

echo "ALLEGRO_MEDIA_SEED=PASS files=$count"
