#!/usr/bin/env python3
"""Independent ALLEGRO-VIBEZ catalogue and release-readiness engine.

This service owns ALLEGRO release validation and its local persistence boundary.
External distribution providers are adapters; they are never the source of truth.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8787"))
DATA_DIR = Path(os.environ.get("ALLEGRO_DATA_DIR", "/var/lib/allegro-engine"))
DB_PATH = Path(os.environ.get("ALLEGRO_DB_PATH", str(DATA_DIR / "allegro-vibez.sqlite3")))
MAX_BODY_BYTES = 1_048_576

REQUIRED_TEXT = ("release_id", "title", "primary_artist_id", "audio_asset_ref", "artwork_asset_ref")
REQUIRED_FLAGS = ("metadata_complete", "territory_rights_confirmed", "contributor_splits_confirmed")


def validate_release(payload: object) -> dict:
    """Return deterministic readiness findings; never contacts a provider."""
    if not isinstance(payload, dict):
        return {"eligible": False, "blockers": ["request_body_must_be_object"]}
    blockers = []
    for field in REQUIRED_TEXT:
        value = payload.get(field)
        if not isinstance(value, str) or not value.strip():
            blockers.append(f"{field}_required")
    for field in REQUIRED_FLAGS:
        if payload.get(field) is not True:
            blockers.append(f"{field}_not_confirmed")
    version = payload.get("version")
    if version is not None and (not isinstance(version, str) or not version.strip()):
        blockers.append("version_must_be_non_empty_text")
    return {"eligible": not blockers, "blockers": blockers}


def connect_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA foreign_keys=ON")
    return connection


def initialise_db() -> None:
    with connect_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS releases (
                release_id TEXT PRIMARY KEY,
                version TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


def store_release(payload: dict) -> tuple[dict, int]:
    readiness = validate_release(payload)
    if not readiness["eligible"]:
        return {"error": "release_not_ready", **readiness}, 422

    release_id = payload["release_id"].strip()
    version = str(payload.get("version") or "1").strip()
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    created_at = datetime.now(timezone.utc).isoformat()

    with connect_db() as db:
        existing = db.execute(
            "SELECT version, payload_json, created_at FROM releases WHERE release_id = ?",
            (release_id,),
        ).fetchone()
        if existing:
            if existing["version"] == version and existing["payload_json"] == canonical:
                return {
                    "release_id": release_id,
                    "version": version,
                    "status": "already_recorded",
                    "created_at": existing["created_at"],
                }, 200
            return {
                "error": "release_id_conflict",
                "message": "A release ID is immutable. Submit a new release_id for a changed version.",
            }, 409
        db.execute(
            "INSERT INTO releases (release_id, version, payload_json, created_at) VALUES (?, ?, ?, ?)",
            (release_id, version, canonical, created_at),
        )
    return {
        "release_id": release_id,
        "version": version,
        "status": "recorded",
        "created_at": created_at,
    }, 201


def read_release(release_id: str) -> dict | None:
    with connect_db() as db:
        row = db.execute(
            "SELECT release_id, version, payload_json, created_at FROM releases WHERE release_id = ?",
            (release_id,),
        ).fetchone()
    if row is None:
        return None
    return {
        "release_id": row["release_id"],
        "version": row["version"],
        "payload": json.loads(row["payload_json"]),
        "created_at": row["created_at"],
    }


class EngineHandler(BaseHTTPRequestHandler):
    server_version = "ALLEGRO-VIBEZ-Engine/1.0"
    sys_version = ""

    def log_message(self, _format: str, *_args) -> None:
        # Avoid request logging that could become behavioural telemetry.
        return

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> object:
        raw_length = self.headers.get("Content-Length", "")
        if not raw_length.isdigit():
            raise ValueError("content_length_required")
        length = int(raw_length)
        if length < 1 or length > MAX_BODY_BYTES:
            raise ValueError("request_body_size_invalid")
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError("invalid_json") from exc

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/healthz":
            try:
                with connect_db() as db:
                    db.execute("SELECT 1").fetchone()
                self.send_json(200, {"status": "ok", "engine": "allegro-vibez", "storage": "ok"})
            except sqlite3.Error:
                self.send_json(503, {"status": "degraded", "engine": "allegro-vibez", "storage": "unavailable"})
            return
        if path == "/v1/capabilities":
            self.send_json(200, {
                "engine": "allegro-vibez",
                "version": "1.0.0",
                "capabilities": ["catalogue.release-validation", "catalogue.release-records", "rights-readiness"],
                "provider_adapters": ["digital-distribution"],
                "behavioural_tracking": False,
                "profiling": False,
                "silent_analytics": False,
            })
            return
        match = re.fullmatch(r"/v1/releases/([^/]+)", path)
        if match:
            release = read_release(unquote(match.group(1)))
            if release is None:
                self.send_json(404, {"error": "release_not_found"})
            else:
                self.send_json(200, release)
            return
        self.send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path not in ("/v1/releases/validate", "/v1/releases"):
            self.send_json(404, {"error": "not_found"})
            return
        try:
            payload = self.read_json()
        except ValueError as exc:
            self.send_json(400, {"error": str(exc)})
            return
        if path.endswith("/validate"):
            self.send_json(200, validate_release(payload))
            return
        if not isinstance(payload, dict):
            self.send_json(400, {"error": "request_body_must_be_object"})
            return
        result, status = store_release(payload)
        self.send_json(status, result)


def main() -> None:
    initialise_db()
    server = ThreadingHTTPServer((HOST, PORT), EngineHandler)
    print(f"ALLEGRO-VIBEZ engine listening on {HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
