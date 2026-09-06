#!/usr/bin/env python3
import importlib.util
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

spec=importlib.util.spec_from_file_location("owner_autopilot",Path(__file__).resolve().parents[1]/"radio"/"owner-node"/"autopilot.py")
a=importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)

programs=[
 {"id":"drive","name":"Africa Drive","day":"daily","start":"15:00","end":"19:00","genre":"amapiano","priority":10,"explicit_allowed":False}
]
tracks=[
 {"id":"t1","artist_id":"a1","artist_name":"Artist One","title":"One","path":"/media/music/one.mp3","genres":["amapiano"],"territories":["ZA"],"rights_status":"verified","radio_clearance":"cleared","clearance_reference":"CLR-1","explicit":False,"rotation_weight":5},
 {"id":"t2","artist_id":"a2","artist_name":"Artist Two","title":"Two","path":"/media/music/two.mp3","genres":["amapiano"],"territories":["ZA"],"rights_status":"verified","radio_clearance":"cleared","clearance_reference":"CLR-2","explicit":False,"rotation_weight":5},
 {"id":"bad1","artist_id":"a3","artist_name":"Blocked","title":"Blocked","path":"/media/music/bad.mp3","genres":["amapiano"],"territories":["ZA"],"rights_status":"pending","radio_clearance":"cleared","clearance_reference":"CLR-X","explicit":False}
]
ads=[
 {"id":"ad1","advertiser_name":"Sponsor","campaign_name":"Campaign","path":"/media/ads/ad.mp3","approved":True,"status":"active","starts_at":"2026-01-01T00:00:00Z","ends_at":"2026-12-31T23:59:59Z","priority":10}
]

a.QUEUE_ITEMS=12
a.AD_EVERY_TRACKS=2
queue=a.build_queue(programs,tracks,ads,now=datetime(2026,9,7,15,30,tzinfo=timezone.utc),seed=1)
ids=[x["id"] for x in queue["items"] if x["type"]=="track"]
assert "bad1" not in ids
assert "t1" in ids or "t2" in ids
assert any(x["type"]=="ad" for x in queue["items"])
assert all(x.get("clearance_reference") for x in queue["items"])

tmp=tempfile.TemporaryDirectory()
a.STATE_DIR=Path(tmp.name)
a.write_state(queue)
assert (a.STATE_DIR/"autopilot.m3u").exists()
assert (a.STATE_DIR/"queue.json").exists()
assert (a.STATE_DIR/"autopilot-decisions.jsonl").exists()
data=json.loads((a.STATE_DIR/"queue.json").read_text())
assert data["program"]["id"]=="drive"
print("ALLEGRO_RADIO_OWNER_NODE_TEST=PASS")
tmp.cleanup()
