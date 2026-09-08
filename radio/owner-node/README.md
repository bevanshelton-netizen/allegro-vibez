# ALLEGRO Radio Owner Node

This package is the self-hosted 24/7 stream layer for ALLEGRO Radio.

## Architecture

The listener path is:

`ALLEGRO website -> HTTPS radio hostname -> Caddy edge -> private Icecast -> Liquidsoap -> live presenter or autopilot`

The Windows owner node keeps these sensitive services local-only:

- Icecast origin: `127.0.0.1:8000`
- live presenter ingest: `127.0.0.1:8080`

Only ports 80/443 are published by the optional public edge.

## Services

- **autopilot** — builds the active programme queue from rights-cleared music and approved ads
- **playout** — Liquidsoap live/autopilot source selection
- **icecast** — private listener-stream origin
- **edge** — Caddy HTTPS reverse proxy for the public listener URL
- **public-monitor** — continuously samples Icecast health and stream bytes and records uptime evidence

## Private technical activation

On the dedicated Windows owner laptop, run the current `IZAKHONO-ALLEGRO-RADIO.exe`.

It creates owner-node data under:

`%LOCALAPPDATA%\IzakhonoRadio\data`

and proves the private stream at:

`http://127.0.0.1:8000/allegro.mp3`

The executable does not claim public readiness.

## Public activation

Before running the public edge:

1. Choose a radio hostname, for example `radio.example.com`.
2. Point that hostname to the owner node's public route.
3. Ensure TCP 80 and 443 can reach the node. If the internet connection is behind CGNAT or inbound ports cannot be opened, use an approved encrypted edge/tunnel instead of direct Caddy exposure.
4. Keep Icecast port 8000 and live-ingest port 8080 private.

Then, from the `radio/owner-node` directory:

```powershell
.\publish-radio.ps1 -PublicHost "radio.example.com" -TlsEmail "admin@example.com"
```

The script:

- writes the public hostname and TLS email into the local owner-node environment;
- starts the existing Windows radio stack plus Caddy and monitoring;
- requests HTTPS automatically;
- verifies the edge and stream URL;
- writes `public-launch-proof.json`;
- deliberately leaves `public_ready=false` until the remaining gates pass.

## Website player

Once the public stream is reachable, set the frontend production variable:

```
VITE_ALLEGRO_RADIO_STREAM_URL=https://radio.example.com/allegro.mp3
```

Deploy the exact tested frontend commit. The existing `/radio` player already consumes this variable.

## 24-hour proof

The public monitor writes:

`%LOCALAPPDATA%\IzakhonoRadio\data\state\public-stream-health.json`

It records:

- Icecast status health
- stream-byte reachability
- continuous healthy seconds
- `continuous_24h_passed`

Any interruption resets the continuous timer.

## Live presenters

Liquidsoap exposes a live ingest input on port 8080. On the Windows owner-node package it is bound to localhost. Do not publish it directly to the internet. Remote presenter access should later be routed through an authenticated private network/VPN or a dedicated protected ingest service.

When live input is present it takes priority. When it drops, Liquidsoap falls back to autopilot and then to the station-ident file.

## Rights gate

Autopilot refuses music unless all of these are present:

- `rights_status=verified`
- `radio_clearance=cleared`
- non-empty `clearance_reference`
- allowed territory
- compatible programme/genre rules

That software safeguard does not replace the underlying music, neighbouring-rights, advertising, privacy or other legal permissions that may apply.

## Public launch gate

Do not market ALLEGRO Radio as fully live until all of these are true:

- the HTTPS listener URL is reachable from an external network;
- rights-cleared programming is loaded;
- the relevant legal/music-rights position has been confirmed;
- live takeover and automatic fallback are tested;
- proof-of-play logging is operating for paid advertising;
- the continuous 24-hour stream test has passed;
- the production website player is pointed to the verified HTTPS stream.

The technical stack can be built and tested before those commercial/legal gates are complete.
