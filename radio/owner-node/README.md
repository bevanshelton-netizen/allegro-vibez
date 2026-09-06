# ALLEGRO Radio Owner Node

This package is the self-hosted 24/7 stream layer.

## Services

- **autopilot** — builds the active programme queue from rights-cleared music and approved ads
- **playout** — Liquidsoap-compatible live/autopilot source selection
- **icecast** — listener stream origin

The public stream mount is designed as:

`http://<owner-node>:8000/allegro.mp3`

Put TLS/reverse-proxy protection in front of that URL before public launch.

## First boot

1. Copy `.env.example` to `.env` and replace every `CHANGE_ME` value.
2. Copy `config/tracks.example.json` to `config/tracks.json`.
3. Copy `config/ads.example.json` to `config/ads.json`.
4. Replace example entries with actual legally cleared files.
5. Put the files under `media/music` and `media/ads`.
6. Add a short station ident at `media/fallback/station-id.mp3`.
7. Run `python autopilot.py --once` and inspect `state/queue.json`.
8. Start the stack with Docker Compose on an always-on owner-controlled Linux node.
9. Test the stream for at least 24 continuous hours before public launch.

## Live presenters

Liquidsoap exposes a live ingest input on port 8080. Keep that port firewalled to trusted presenters/VPN access. The live password belongs only in `.env`.

When live input is present it takes priority. When it drops, Liquidsoap falls back to the autopilot queue and then to the station-ident file.

## Rights gate

Autopilot refuses music unless all of these are present:

- `rights_status=verified`
- `radio_clearance=cleared`
- non-empty `clearance_reference`
- allowed territory
- compatible programme/genre rules

That is a software safeguard, not a substitute for the underlying SAMRO/SAMPRA/direct licence.

## Current proof boundary

The queue generator and public radio application can be tested in CI. A real 24/7 broadcast is only proven after the owner node is running, the actual stream is monitored and a listener can hear the rights-cleared programme.
