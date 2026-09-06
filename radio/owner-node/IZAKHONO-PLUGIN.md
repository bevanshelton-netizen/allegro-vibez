# Plug ALLEGRO Radio into IZAKHONO

ALLEGRO Radio can run directly on IZAKHONO Node. Railway or another hosted runtime is not required once the owner node is online.

## Components

- `docker-compose.izakhono.yml` — the multi-service radio stack for IZAKHONO Service Plug.
- `izakhono-service.json` — the signed deployment job consumed by IZAKHONO CONTROL/NODE.
- `prepare-izakhono-node.sh` — creates persistent radio folders, safe empty catalogues and generated service secrets.

## Persistent owner data

The radio software comes from the ALLEGRO repository. The actual station data stays outside Git:

- `/var/lib/izakhono-radio/media`
- `/var/lib/izakhono-radio/config`
- `/var/lib/izakhono-radio/state`
- `/var/lib/izakhono-radio/logs`
- `/etc/izakhono/apps/allegro-radio.env`

This makes code replaceable without deleting the station catalogue or exposing secrets.

## Network boundary

Icecast listener origin and Liquidsoap live ingest initially bind only to localhost:
- 127.0.0.1:8000
- 127.0.0.1:8080

Public listening should later be exposed through IZAKHONO EDGE/TLS. Do not open the live-ingest port directly to the public internet.

## Launch proof

A real station is proven only after:
1. an owner node runs the stack;
2. rights-cleared audio is loaded;
3. Icecast health passes;
4. the stream plays continuously;
5. public TLS routing is connected;
6. at least a 24-hour uninterrupted stream test passes.
