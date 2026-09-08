#!/usr/bin/env bash
set -euo pipefail

KUBECTL="${KUBECTL:-k3s kubectl}"

[[ "$(id -u)" -eq 0 ]] || { echo "Run on a k3s server node as root." >&2; exit 2; }

for node in node01 node02 node03 node04; do
  ready="$($KUBECTL get node "$node" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || true)"
  [[ "$ready" == "True" ]] || { echo "FAIL: $node is not Ready." >&2; exit 3; }
done

$KUBECTL -n allegro-radio rollout status deployment/allegro-radio-icecast --timeout=5m
$KUBECTL -n allegro-radio rollout status deployment/allegro-radio-engine --timeout=5m

icecast_ready="$($KUBECTL -n allegro-radio get deployment allegro-radio-icecast -o jsonpath='{.status.readyReplicas}')"
[[ "${icecast_ready:-0}" -ge 2 ]] || { echo "FAIL: expected two Icecast replicas." >&2; exit 4; }

$KUBECTL -n allegro-radio exec deployment/allegro-radio-engine -c autopilot --   python /app/autopilot.py --once >/tmp/allegro-autopilot-proof.txt

grep -q "ALLEGRO_RADIO_AUTOPILOT=READY" /tmp/allegro-autopilot-proof.txt || {
  echo "FAIL: autopilot rights gate did not produce a queue." >&2
  exit 5
}

probe="$($KUBECTL -n allegro-radio run allegro-stream-proof   --image=busybox:1.37 --image-pull-policy=Never --restart=Never --rm -i   -- wget -qO- -T 10 http://allegro-radio-stream:8000/status-json.xsl 2>/dev/null || true)"
[[ "$probe" == *"icestats"* ]] || { echo "FAIL: internal Icecast status unavailable." >&2; exit 6; }

engine_node="$($KUBECTL -n allegro-radio get pod -l app=allegro-radio-engine -o jsonpath='{.items[0].spec.nodeName}')"

echo "ALLEGRO_CLUSTER=PASS"
echo "ENGINE_NODE=$engine_node"
echo "ICECAST_REPLICAS=$icecast_ready"
echo "RIGHTS_GATE=PASS"
echo "NEXT_PROOF=Controlled cordon/drain or physical power-off of the active node, then re-run this script."
