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
formats={
 "drive":{
   "music_lanes":["amapiano"],
   "max_paid_minutes_per_hour":1,
   "sequence":["station_id","music","music","ad","talk_hook","music","ad","promo"]
 }
}
imaging={
 "station_id":{"path":"/media/imaging/station.wav","title":"Station ID"},
 "promo":{"path":"/media/imaging/promo.wav","title":"Promo"}
}
programs[0]["format_id"]="drive"
queue=a.build_queue(programs,tracks,ads,formats=formats,imaging=imaging,now=datetime(2026,9,7,15,30,tzinfo=timezone.utc),seed=1)
ids=[x["id"] for x in queue["items"] if x["type"]=="track"]
assert "bad1" not in ids
assert "t1" in ids or "t2" in ids
assert any(x["type"]=="ad" for x in queue["items"])
assert any(x["type"]=="marker" and x.get("marker")=="talk_hook" for x in queue["items"])
assert queue["format_id"]=="drive"
assert queue["commercial_cap_seconds_per_clock"]==60
for item in queue["items"]:
    if item["type"] in ("track","ad"):
        assert item.get("clearance_reference")

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
