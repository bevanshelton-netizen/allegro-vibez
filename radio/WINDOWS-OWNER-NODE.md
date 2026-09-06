# ALLEGRO Radio — Windows Owner Node

This package turns the dedicated Windows laptop into the first ALLEGRO Radio owner node.

## One-click owner executable

GitHub CI produces:

`IZAKHONO-ALLEGRO-RADIO.exe`

The executable:

- downloads the current ALLEGRO Radio source package
- preserves all station data under `%LOCALAPPDATA%\IzakhonoRadio\data`
- installs Docker Desktop with winget when it is missing
- starts Docker Desktop when needed
- generates radio service secrets locally
- creates an ALLEGRO station-ident WAV locally
- starts Autopilot + Liquidsoap + Icecast
- keeps Icecast and live ingest bound to localhost initially
- checks the Icecast health endpoint and stream mount
- writes owner-node evidence to `%LOCALAPPDATA%\IzakhonoRadio\owner-node-proof.json`

## Truthful readiness states

The executable may prove **technical stream readiness** even before music is loaded because the station-ident fallback can keep the audio chain alive.

It does **not** mark public readiness true.

Public launch still requires:

1. rights-cleared music in the catalogue;
2. public delivery through IZAKHONO EDGE/TLS;
3. actual listener validation;
4. a continuous 24-hour stream test;
5. required legal/music-rights gates.

## Music data

Never put uncleared music into the station just to make the test pass.

The owner catalogue lives at:

`%LOCALAPPDATA%\IzakhonoRadio\data\config\tracks.json`

Audio lives at:

`%LOCALAPPDATA%\IzakhonoRadio\data\media\music`

A track is counted as cleared only when it has:

- `rights_status = verified`
- `radio_clearance = cleared`
- a non-empty `clearance_reference`

## Security

The executable does not disable Windows Defender, SmartScreen, the firewall or other Windows security controls.

The EXE is currently unsigned, so Windows may display the normal SmartScreen publisher warning. Do not disable SmartScreen globally.
