#!/usr/bin/env python3
import json
import os
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

STATE = Path(os.getenv("ALLEGRO_RADIO_STATE", "/state"))
OUTPUT = STATE / "public-stream-health.json"
STATUS_URL = os.getenv("ALLEGRO_RADIO_INTERNAL_STATUS_URL", "http://icecast:8000/status-json.xsl")
STREAM_URL = os.getenv("ALLEGRO_RADIO_INTERNAL_STREAM_URL", "http://icecast:8000/allegro.mp3")
INTERVAL = max(10, int(os.getenv("ALLEGRO_RADIO_MONITOR_SECONDS", "30")))


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def fetch_status():
    try:
        with urllib.request.urlopen(STATUS_URL, timeout=8) as response:
            body = response.read(512 * 1024)
            return 200 <= response.status < 400, response.status, len(body), ""
    except Exception as exc:
        return False, 0, 0, str(exc)[:300]


def fetch_stream():
    try:
        req = urllib.request.Request(
            STREAM_URL,
            headers={"User-Agent": "ALLEGRO-Radio-Monitor/1.0", "Icy-MetaData": "1"},
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            chunk = response.read(4096)
            ok = 200 <= response.status < 400 and len(chunk) > 0
            return ok, response.status, len(chunk), ""
    except Exception as exc:
        return False, 0, 0, str(exc)[:300]


def load_previous():
    try:
        return json.loads(OUTPUT.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_state(payload):
    STATE.mkdir(parents=True, exist_ok=True)
    temp = OUTPUT.with_suffix(".tmp")
    temp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temp.replace(OUTPUT)


def main():
    while True:
        previous = load_previous()
        status_ok, status_code, status_bytes, status_error = fetch_status()
        stream_ok, stream_code, stream_bytes, stream_error = fetch_stream()
        healthy = bool(status_ok and stream_ok)
        now_epoch = int(time.time())

        if healthy:
            continuous_since = previous.get("continuous_since_epoch") if previous.get("healthy") else now_epoch
            last_good = now_epoch
        else:
            continuous_since = None
            last_good = previous.get("last_good_epoch")

        continuous_seconds = now_epoch - continuous_since if continuous_since else 0

        payload = {
            "station": "ALLEGRO Radio",
            "checked_at": utc_now(),
            "healthy": healthy,
            "status_endpoint": {
                "ok": status_ok,
                "http_status": status_code,
                "bytes": status_bytes,
                "error": status_error,
            },
            "stream_mount": {
                "ok": stream_ok,
                "http_status": stream_code,
                "sample_bytes": stream_bytes,
                "error": stream_error,
            },
            "continuous_since_epoch": continuous_since,
            "continuous_seconds": continuous_seconds,
            "continuous_24h_passed": continuous_seconds >= 86400,
            "last_good_epoch": last_good,
        }
        write_state(payload)
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
