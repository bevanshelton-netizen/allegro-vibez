#!/usr/bin/env python3
import argparse
import json
import os
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
CONFIG_DIR = Path(os.getenv("ALLEGRO_RADIO_CONFIG", ROOT / "config"))
STATE_DIR = Path(os.getenv("ALLEGRO_RADIO_STATE", ROOT / "state"))
TIMEZONE = os.getenv("ALLEGRO_RADIO_TIMEZONE", "Africa/Johannesburg")
TERRITORY = os.getenv("ALLEGRO_RADIO_TERRITORY", "ZA")
QUEUE_ITEMS = int(os.getenv("ALLEGRO_RADIO_QUEUE_ITEMS", "80"))
AD_EVERY_TRACKS = int(os.getenv("ALLEGRO_RADIO_AD_EVERY_TRACKS", "5"))
REFRESH_SECONDS = int(os.getenv("ALLEGRO_RADIO_REFRESH_SECONDS", "300"))

def load_json(name, default):
    path = CONFIG_DIR / name
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))

def atomic_write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(text, encoding="utf-8")
    temp.replace(path)

def minutes(value):
    hour, minute = [int(x) for x in str(value).split(":", 1)]
    if hour not in range(24) or minute not in range(60):
        raise ValueError("invalid_time")
    return hour * 60 + minute

def program_for_now(programs, now=None):
    zone = ZoneInfo(TIMEZONE)
    now = now.astimezone(zone) if now else datetime.now(zone)
    day = now.strftime("%a").lower()[:3]
    minute = now.hour * 60 + now.minute
    matches = []
    for program in programs:
        if program.get("active", True) is False:
            continue
        if program.get("day", "daily") not in ("daily", day):
            continue
        start = minutes(program["start"])
        end = minutes(program["end"])
        active = start <= minute < end if end > start else minute >= start or minute < end
        if active:
            matches.append(program)
    matches.sort(key=lambda p: int(p.get("priority", 0)), reverse=True)
    return matches[0] if matches else None

def rights_cleared(track, program, music_lanes=None):
    if track.get("active", True) is False:
        return False
    if track.get("rights_status") != "verified":
        return False
    if track.get("radio_clearance") != "cleared":
        return False
    if not str(track.get("clearance_reference") or "").strip():
        return False
    territories = track.get("territories") or []
    if territories and "*" not in territories and TERRITORY not in territories:
        return False
    if program and program.get("explicit_allowed", True) is False and track.get("explicit") is True:
        return False
    genres = [str(x).strip().lower() for x in track.get("genres") or []]
    lanes = [str(x).strip().lower() for x in (music_lanes or []) if str(x).strip()]
    if lanes and not any(x in ("mixed","all") for x in lanes):
        if not any(lane in genres for lane in lanes):
            return False
    else:
        wanted = str((program or {}).get("genre") or "").strip().lower()
        if wanted and wanted not in ("mixed", "all") and wanted not in genres:
            return False
    path = Path(str(track.get("path") or ""))
    return path.is_absolute() or str(path).startswith("/")

def choose_track(tracks, recent_track_ids, recent_artist_ids, rng):
    pool = [t for t in tracks if t.get("id") not in recent_track_ids and t.get("artist_id") not in recent_artist_ids]
    if not pool:
        pool = [t for t in tracks if t.get("id") not in recent_track_ids]
    if not pool:
        pool = list(tracks)
    if not pool:
        return None
    weighted = []
    for track in pool:
        weight = max(1, min(20, int(track.get("rotation_weight", 5))))
        weighted.extend([track] * weight)
    return rng.choice(weighted)

def parse_dt(value):
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)

def eligible_ads(campaigns, now_utc):
    out = []
    for campaign in campaigns:
        if campaign.get("approved") is not True or campaign.get("status") != "active":
            continue
        start = parse_dt(campaign.get("starts_at"))
        end = parse_dt(campaign.get("ends_at"))
        if start and now_utc < start:
            continue
        if end and now_utc > end:
            continue
        path = str(campaign.get("path") or "")
        if not path.startswith("/"):
            continue
        out.append(campaign)
    out.sort(key=lambda x: int(x.get("priority", 0)), reverse=True)
    return out

def imaging_item(kind, imaging):
    item = imaging.get(kind) if isinstance(imaging, dict) else None
    if not isinstance(item, dict):
        return {"type": "marker", "title": kind.replace("_", " ").title(), "marker": kind}
    path = str(item.get("path") or "")
    if path.startswith("/"):
        return {"type": "imaging", "title": item.get("title") or kind, "artist": "ALLEGRO Radio", "path": path, "marker": kind}
    return {"type": "marker", "title": item.get("title") or kind, "marker": kind}

def ad_item(ad):
    return {
        "type": "ad",
        "id": ad.get("id"),
        "title": ad.get("campaign_name") or ad.get("advertiser_name") or "Advert",
        "artist": ad.get("advertiser_name") or "Advertiser",
        "path": ad["path"],
        "duration_seconds": int(ad.get("duration_seconds") or 30),
        "clearance_reference": ad.get("approval_reference") or "approved-campaign",
    }

def track_item(track):
    return {
        "type": "track",
        "id": track.get("id"),
        "title": track.get("title") or "Untitled",
        "artist": track.get("artist_name") or "Unknown artist",
        "artist_id": track.get("artist_id"),
        "path": track["path"],
        "duration_seconds": int(track.get("duration_seconds") or 180),
        "clearance_reference": track["clearance_reference"],
    }

def build_queue(programs, tracks, campaigns, formats=None, imaging=None, now=None, seed=None):
    now = now or datetime.now(timezone.utc)
    program = program_for_now(programs, now)
    if not program:
        raise RuntimeError("no_active_program")

    formats = formats or {}
    imaging = imaging or {}
    format_id = str(program.get("format_id") or "")
    fmt = formats.get(format_id, {}) if isinstance(formats, dict) else {}
    music_lanes = fmt.get("music_lanes") or []
    cleared = [t for t in tracks if rights_cleared(t, program, music_lanes)]
    if not cleared:
        raise RuntimeError("no_rights_cleared_tracks_for_program")

    ads = eligible_ads(campaigns, now.astimezone(timezone.utc))
    rng = random.Random(seed if seed is not None else int(now.timestamp() // 300))
    recent_tracks, recent_artists = [], []
    queue = []
    ad_index = 0

    sequence = fmt.get("sequence") if isinstance(fmt, dict) else None
    if not isinstance(sequence, list) or not sequence:
        sequence = ["music"] * max(1, AD_EVERY_TRACKS) + ["ad"]

    max_paid_seconds = max(0, int(float(fmt.get("max_paid_minutes_per_hour", 9)) * 60)) if isinstance(fmt, dict) else 540

    while len(queue) < QUEUE_ITEMS:
        paid_seconds = 0
        for slot in sequence:
            if len(queue) >= QUEUE_ITEMS:
                break
            slot = str(slot)

            if slot == "music":
                track = choose_track(cleared, recent_tracks, recent_artists, rng)
                if not track:
                    break
                queue.append(track_item(track))
                recent_tracks = [track.get("id")] + recent_tracks[:9]
                recent_artists = [track.get("artist_id")] + recent_artists[:4]
                continue

            if slot == "ad":
                if ads:
                    candidate = ads[ad_index % len(ads)]
                    seconds = int(candidate.get("duration_seconds") or 30)
                    if paid_seconds + seconds <= max_paid_seconds:
                        queue.append(ad_item(candidate))
                        paid_seconds += seconds
                        ad_index += 1
                continue

            if slot in imaging:
                queue.append(imaging_item(slot, imaging))
                continue

            queue.append({"type": "marker", "title": slot.replace("_", " ").title(), "marker": slot})

    return {
        "generated_at": now.astimezone(timezone.utc).isoformat(),
        "timezone": TIMEZONE,
        "territory": TERRITORY,
        "program": program,
        "format_id": format_id or None,
        "commercial_cap_seconds_per_clock": max_paid_seconds,
        "items": queue,
    }

def render_m3u(queue):
    lines = ["#EXTM3U"]
    for item in queue["items"]:
        path = str(item.get("path") or "")
        if not path.startswith("/") or not Path(path).exists():
            continue
        title = f'{item.get("artist","")} - {item.get("title","")}'.strip(" -")
        lines.append(f"#EXTINF:-1,{title}")
        lines.append(path)
    return "\n".join(lines) + "\n"

def write_state(queue):
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    atomic_write(STATE_DIR / "autopilot.m3u", render_m3u(queue))
    atomic_write(STATE_DIR / "queue.json", json.dumps(queue, indent=2))
    proof = {
        "generated_at": queue["generated_at"],
        "program_id": queue["program"].get("id"),
        "program_name": queue["program"].get("name"),
        "items": len(queue["items"]),
        "rights_gate": "verified+cleared+clearance_reference",
        "territory": queue["territory"],
    }
    with (STATE_DIR / "autopilot-decisions.jsonl").open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(proof, separators=(",", ":")) + "\n")

def cycle(seed=None):
    programs = load_json("programs.json", [])
    tracks = load_json("tracks.json", [])
    campaigns = load_json("ads.json", [])
    formats = load_json("formats.json", {})
    imaging = load_json("imaging.json", {})
    queue = build_queue(programs, tracks, campaigns, formats=formats, imaging=imaging, seed=seed)
    write_state(queue)
    return queue

def main():
    parser = argparse.ArgumentParser(description="ALLEGRO Radio rights-aware autopilot queue generator")
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--seed", type=int)
    args = parser.parse_args()
    if args.once:
        queue = cycle(args.seed)
        print(f"ALLEGRO_RADIO_AUTOPILOT=READY items={len(queue['items'])} program={queue['program'].get('name')}")
        return
    while True:
        try:
            queue = cycle(args.seed)
            print(f"ALLEGRO_RADIO_AUTOPILOT=READY items={len(queue['items'])} program={queue['program'].get('name')}", flush=True)
        except Exception as exc:
            print(f"ALLEGRO_RADIO_AUTOPILOT=DEGRADED error={str(exc)[:180]}", flush=True)
        time.sleep(REFRESH_SECONDS)

if __name__ == "__main__":
    main()
