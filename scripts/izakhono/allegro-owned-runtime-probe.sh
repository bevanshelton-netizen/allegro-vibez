#!/usr/bin/env sh
set -eu

# Diagnostic only: verify the local owned NODE01 runtime boundary.
# This probe never deploys, changes DNS, or marks the application live.
BINDING="${IZAKHONO_NODE01_BINDING:-infra/izakhono/runtime-binding.NODE01.json}"
NODE_READY_URL="${IZAKHONO_NODE01_READY_URL:-http://127.0.0.1:9191/readyz}"
CONTROL_HEALTH_URL="${IZAKHONO_CONTROL_HEALTH_URL:-http://127.0.0.1:9292/healthz}"
RELEASE_AUTHORITY="${IZAKHONO_RELEASE_AUTHORITY:-/opt/izakhono/bin/izakhono-release}"

fail() { echo "NODE01-PROBE-FAIL: $*" >&2; exit 1; }

command -v python3 >/dev/null 2>&1 || fail "python3 is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
[ -f "$BINDING" ] || fail "runtime binding file missing: $BINDING"
[ -x "$RELEASE_AUTHORITY" ] || fail "IZAKHONO release authority is missing or not executable: $RELEASE_AUTHORITY"

python3 - "$BINDING" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
b = json.loads(p.read_text())
expected = {
    "schema": "izakhono.runtime-binding/v1",
    "logical_node_id": "NODE01",
    "identity_type": "software-runtime",
    "runtime_class": "oci-docker",
    "ownership": "izakhono-owned",
    "runtime_host_is_separate": True,
    "live": False,
}
for key, value in expected.items():
    if b.get(key) != value:
        raise SystemExit(f"NODE01 binding mismatch: {key}={b.get(key)!r}; expected {value!r}")
host = str(b.get("runtime_host", "")).strip()
if not host or host in {"APPROVED_RUNTIME_HOST", "REPLACE_WITH_VERIFIED_HOST"}:
    raise SystemExit("NODE01 runtime_host is still a placeholder; bind the verified owner-host first")
print(f"NODE01 binding identity: PASS ({host})")
PY

printf '%s\n' "Checking NODE01 readiness: $NODE_READY_URL"
curl -fsS --max-time 8 "$NODE_READY_URL" >/dev/null || fail "NODE01 readiness endpoint failed"
printf '%s\n' "Checking IZAKHONO control health: $CONTROL_HEALTH_URL"
curl -fsS --max-time 8 "$CONTROL_HEALTH_URL" >/dev/null || fail "IZAKHONO control health endpoint failed"
printf '%s\n' "NODE01 owner-runtime boundary: PASS"
printf '%s\n' "This is a readiness diagnostic only; no deployment or public-live claim is made."
