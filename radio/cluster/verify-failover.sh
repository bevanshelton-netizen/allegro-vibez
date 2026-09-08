#!/usr/bin/env bash
set -euo pipefail

KUBECTL="${KUBECTL:-k3s kubectl}"

[[ "$(id -u)" -eq 0 ]] || { echo "Run on a k3s server node as root." >&2; exit 2; }

for node in node01 node02 node03 node04; do
  ready="$($KUBECTL get node "$node" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || true)"
  [[ "$ready" == "True" ]] || { echo "FAIL: $node is not Ready." >&2; exit 3; }
done

$KUBECTL -n allegro-radio rollout status deployment/allegro-radio-engine --timeout=10m

pod="$($KUBECTL -n allegro-radio get pod -l app=allegro-radio-engine -o jsonpath='{.items[0].metadata.name}')"
engine_node="$($KUBECTL -n allegro-radio get pod "$pod" -o jsonpath='{.spec.nodeName}')"

for container in icecast autopilot playout; do
  ready="$($KUBECTL -n allegro-radio get pod "$pod" -o json | python3 -c 'import json,sys; d=json.load(sys.stdin); name=sys.argv[1]; print(next((str(x.get("ready",False)).lower() for x in d.get("status",{}).get("containerStatuses",[]) if x.get("name")==name),"false"))' "$container")"
  [[ "$ready" == "true" ]] || { echo "FAIL: $container is not Ready." >&2; exit 4; }
done

$KUBECTL -n allegro-radio exec "$pod" -c autopilot --   python /app/autopilot.py --once >/tmp/allegro-autopilot-proof.txt

grep -q "ALLEGRO_RADIO_AUTOPILOT=READY" /tmp/allegro-autopilot-proof.txt || {
  echo "FAIL: autopilot rights gate did not produce a queue." >&2
  exit 5
}

probe="$($KUBECTL -n allegro-radio run allegro-stream-proof   --image=busybox:1.37 --image-pull-policy=Never --restart=Never --rm -i   -- wget -qO- -T 10 http://allegro-radio-stream:8000/status-json.xsl 2>/dev/null || true)"
[[ "$probe" == *"icestats"* ]] || { echo "FAIL: internal Icecast status unavailable." >&2; exit 6; }

echo "ALLEGRO_CLUSTER=PASS"
echo "ENGINE_NODE=$engine_node"
echo "ENGINE_CONTAINERS=icecast,autopilot,playout"
echo "RIGHTS_GATE=PASS"
echo "NEXT_PROOF=Power off or isolate $engine_node during a controlled test, wait for rescheduling, then re-run this script."
