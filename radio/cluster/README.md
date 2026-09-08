# ALLEGRO Radio — IZAKHONO four-node workload

This package migrates the ALLEGRO Radio engine from one Windows owner node to the four-node IZAKHONO k3s cluster.

## Recovery model

- Icecast runs with two replicas on different nodes.
- The playout/autopilot engine runs as one active unit.
- Its media and state live on Longhorn volumes with three storage replicas.
- If the active node fails, Kubernetes can recreate the engine on another Ready node and reattach the replicated volume.
- NODE 01 is preferred, but not required.
- Images are preloaded onto all four nodes and use imagePullPolicy: Never so an internet registry outage cannot block failover.
- Public traffic remains behind IZAKHONO EDGE. No database/admin/container port is exposed directly.

This is failover, not zero-interruption broadcast. A hard failure of the active playout node can cause a short listener interruption while the engine is recreated. True active/active playout requires a separate synchronized broadcast design and is intentionally not claimed here.

## Prerequisites

1. IZAKHONO four-node cluster installed and all nodes Ready.
2. IZAKHONO DATA / Longhorn StorageClass named `longhorn` healthy.
3. All four nodes are x86_64 for the first offline image bundle.
4. A Docker-capable build workstation.
5. Rights-cleared ALLEGRO media and metadata.
6. An owner-only secrets file; never commit it.

## Build the offline runtime bundle

From repository root:

```bash
./radio/cluster/build-offline-bundle.sh
```

Copy the resulting tar file to each node and run:

```bash
sudo ./radio/cluster/import-offline-bundle.sh ./dist/allegro-radio-cluster-v1.tar
```

## Secrets

Create an owner-only env file such as `/etc/izakhono/allegro-radio.env`:

```text
ICECAST_SOURCE_PASSWORD=<random>
ICECAST_RELAY_PASSWORD=<random>
ICECAST_ADMIN_PASSWORD=<random>
ALLEGRO_LIVE_PASSWORD=<random>
ICECAST_HOSTNAME=radio.izakhonoafrica.co.za
ALLEGRO_RADIO_TIMEZONE=Africa/Johannesburg
ALLEGRO_RADIO_TERRITORY=ZA
ALLEGRO_RADIO_QUEUE_ITEMS=80
ALLEGRO_RADIO_AD_EVERY_TRACKS=5
ALLEGRO_RADIO_REFRESH_SECONDS=300
```

## Programming configuration

Provide a private configuration directory containing:

- programs.json
- tracks.json
- ads.json

Only tracks with:

- rights_status = verified
- radio_clearance = cleared
- non-empty clearance_reference

are eligible for the ALLEGRO autopilot.

## Deploy

Run on NODE 01 from repository root:

```bash
sudo ALLEGRO_SECRET_FILE=/etc/izakhono/allegro-radio.env \
  ALLEGRO_CONFIG_DIR=/srv/izakhono/allegro/config \
  ./radio/cluster/deploy.sh
```

Then seed rights-cleared audio into the `allegro-radio-media` PVC and run `verify-failover.sh`.

## Edge contract

IZAKHONO EDGE should route:

- public listener path -> `allegro-radio/allegro-radio-stream:8000/allegro.mp3`
- authenticated presenter ingest -> `allegro-radio/allegro-radio-live:8080`

The services are ClusterIP only. The cluster workload does not publish NodePorts or LoadBalancers.

## Production proof

Do not call the four-node radio live until all of these pass:

- both Icecast replicas Ready
- radio engine Ready
- internal stream produces bytes
- rights-cleared playlist generated
- replicated volumes healthy
- controlled NODE 01 shutdown test
- engine successfully rescheduled when needed
- public IZAKHONO EDGE listener test
- continuous 24-hour stream test
- music-rights/legal gates
