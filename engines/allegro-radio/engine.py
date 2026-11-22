#!/usr/bin/env python3
"""Independent ALLEGRO Radio broadcast-control engine.

This service stores queue/schedule control records only. It never stores audio,
creates rights, authenticates end users, or streams media. Run on a private
network until FORTRESS authentication and authorization are integrated.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

DATA_DIR = Path(os.environ.get("ALLEGRO_RADIO_DATA_DIR", "/var/lib/allegro-radio"))
DB_PATH = DATA_DIR / "radio-engine.sqlite3"
HOST = os.environ.get("ALLEGRO_RADIO_HOST", "0.0.0.0")
PORT = int(os.environ.get("ALLEGRO_RADIO_PORT", "8788"))
MAX_BODY = 64 * 1024
REQUIRED = (
    "item_id", "artist_id", "track_id", "title", "artist_name",
    "agreement_ref", "agreement_status", "broadcast_clearance_ref",
    "broadcast_clearance_status", "publication_status", "audio_asset_ref",
    "audio_asset_status", "evidence_issuer", "evidence_verified_at",
)
STATES = {"scheduled", "ready", "playing", "completed", "blocked"}
TRANSITIONS = {
    "scheduled": {"ready", "blocked"},
    "ready": {"playing", "blocked"},
    "playing": {"completed", "blocked"},
    "completed": set(),
    "blocked": set(),
}
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def validate_item(item: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(item, dict):
        return ["request body must be a JSON object"]
    for key in REQUIRED:
        if not isinstance(item.get(key), str) or not item[key].strip():
            errors.append(f"{key} is required")
    if errors:
        return errors
    if not ID_RE.fullmatch(item["item_id"]):
        errors.append("item_id has an invalid format")
    for key in ("artist_id", "track_id"):
        if not ID_RE.fullmatch(item[key]):
            errors.append(f"{key} has an invalid format")
    if item["agreement_status"] != "active":
        errors.append("artist agreement is not verified active")
    if item["broadcast_clearance_status"] != "cleared":
        errors.append("track-specific broadcast clearance is not verified")
    if item["publication_status"] != "published":
        errors.append("track is not published")
    if item["audio_asset_status"] != "verified":
        errors.append("a real, verified audio asset is required")
    try:
        verified = datetime.fromisoformat(item["evidence_verified_at"].replace("Z", "+00:00"))
        if verified.tzinfo is None:
            errors.append("evidence_verified_at must include a timezone")
    except ValueError:
        errors.append("evidence_verified_at must be an ISO-8601 timestamp")
    for key in ("agreement_ref", "broadcast_clearance_ref", "audio_asset_ref"):
        if item[key].strip().lower() in {"none", "null", "unknown", "pending"}:
            errors.append(f"{key} must reference authoritative evidence")
    return errors


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("""
        CREATE TABLE IF NOT EXISTS broadcast_queue (
            item_id TEXT PRIMARY KEY,
            payload_json TEXT NOT NULL,
            state TEXT NOT NULL CHECK(state IN ('scheduled','ready','playing','completed','blocked')),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_broadcast_queue_state ON broadcast_queue(state, created_at)")
    return db


def enqueue(item: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    errors = validate_item(item)
    if errors:
        raise ValueError("; ".join(errors))
    canonical = json.dumps(item, sort_keys=True, separators=(",", ":"))
    now = utc_now()
    with connect() as db:
        row = db.execute("SELECT payload_json,state,created_at,updated_at FROM broadcast_queue WHERE item_id=?", (item["item_id"],)).fetchone()
        if row:
            if row["payload_json"] != canonical:
                raise FileExistsError("item_id already exists with a different payload")
            return {
                "item_id": item["item_id"], "state": row["state"],
                "created_at": row["created_at"], "updated_at": row["updated_at"],
            }, False
        db.execute(
            "INSERT INTO broadcast_queue(item_id,payload_json,state,created_at,updated_at) VALUES(?,?,?,?,?)",
            (item["item_id"], canonical, "scheduled", now, now),
        )
    return {"item_id": item["item_id"], "state": "scheduled", "created_at": now, "updated_at": now}, True


def get_item(item_id: str) -> dict[str, Any] | None:
    with connect() as db:
        row = db.execute("SELECT payload_json,state,created_at,updated_at FROM broadcast_queue WHERE item_id=?", (item_id,)).fetchone()
    if not row:
        return None
    return {
        "item": json.loads(row["payload_json"]), "state": row["state"],
        "created_at": row["created_at"], "updated_at": row["updated_at"],
    }


def list_queue() -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT item_id,state,created_at,updated_at FROM broadcast_queue ORDER BY created_at,item_id").fetchall()
    return [dict(row) for row in rows]


def transition(item_id: str, next_state: str) -> dict[str, Any]:
    if next_state not in STATES:
        raise ValueError("unsupported state")
    now = utc_now()
    with connect() as db:
        row = db.execute("SELECT payload_json,state,created_at FROM broadcast_queue WHERE item_id=?", (item_id,)).fetchone()
        if not row:
            raise KeyError("queue item not found")
        current = row["state"]
        if next_state == current:
            return {"item_id": item_id, "state": current, "created_at": row["created_at"], "updated_at": now}
        if next_state not in TRANSITIONS[current]:
            raise ValueError(f"invalid state transition: {current} -> {next_state}")
        # Re-check all eligibility fields immediately before the item can become ready/playing.
        if next_state in {"ready", "playing"}:
            errors = validate_item(json.loads(row["payload_json"]))
            if errors:
                raise ValueError("broadcast eligibility failed: " + "; ".join(errors))
        db.execute("UPDATE broadcast_queue SET state=?,updated_at=? WHERE item_id=?", (next_state, now, item_id))
    return {"item_id": item_id, "state": next_state, "created_at": row["created_at"], "updated_at": now}


class Handler(BaseHTTPRequestHandler):
    server_version = "ALLEGRO-Radio-Engine/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        # Request data and identifiers are intentionally not written to logs.
        return

    def send_json(self, status: int, value: Any) -> None:
        body = json.dumps(value, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> Any:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_BODY:
            raise ValueError("request body is missing or too large")
        return json.loads(self.rfile.read(length))

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/healthz":
            self.send_json(200, {"ok": True, "service": "allegro-radio-engine"})
        elif path == "/v1/capabilities":
            self.send_json(200, {
                "service": "allegro-radio-engine",
                "capabilities": ["broadcast-eligibility-validation", "queue-persistence", "queue-state-control"],
                "media_streaming": False,
                "provider_adapters": "integration-boundary-only",
                "authorization": "external-fortress-gate-required",
            })
        elif path == "/v1/queue":
            self.send_json(200, {"items": list_queue()})
        elif path.startswith("/v1/queue/"):
            item_id = unquote(path.removeprefix("/v1/queue/"))
            record = get_item(item_id)
            self.send_json(200 if record else 404, record or {"error": "not_found"})
        else:
            self.send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            payload = self.read_json()
            if path == "/v1/queue/validate":
                errors = validate_item(payload)
                self.send_json(200 if not errors else 422, {"eligible": not errors, "errors": errors})
            elif path == "/v1/queue":
                record, created = enqueue(payload)
                self.send_json(201 if created else 200, {"created": created, **record})
            elif path.startswith("/v1/queue/") and path.endswith("/state"):
                item_id = unquote(path[len("/v1/queue/"):-len("/state")].strip("/"))
                if not isinstance(payload, dict) or not isinstance(payload.get("state"), str):
                    raise ValueError("state is required")
                self.send_json(200, transition(item_id, payload["state"]))
            else:
                self.send_json(404, {"error": "not_found"})
        except FileExistsError as exc:
            self.send_json(409, {"error": str(exc)})
        except KeyError as exc:
            self.send_json(404, {"error": str(exc)})
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json(422, {"error": str(exc)})

    def do_PUT(self) -> None:
        self.send_json(405, {"error": "method_not_allowed"})

    def do_DELETE(self) -> None:
        self.send_json(405, {"error": "method_not_allowed"})


def main() -> None:
    connect().close()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
