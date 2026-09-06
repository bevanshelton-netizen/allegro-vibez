# ALLEGRO RADIO

A 24/7 online radio layer for ALLEGRO-VIBEZ.

## What is built in this release

- public `/radio` station experience
- scheduled programming grid
- rights-aware track eligibility
- artist and track separation rules
- advertiser campaign selection
- ad-break insertion into hourly clocks
- live-presenter takeover model with automatic return to autopilot
- radio database schema for programmes, tracks, ad campaigns, live sessions and proof-of-play logs
- public now-playing view
- launch-gate tests for the autopilot scheduler

## Autopilot principle

The station should never go silent because a presenter is unavailable.

The playout service follows this order:

1. approved live presenter/DJ feed when a scheduled live session is active;
2. scheduled programme clock;
3. rights-cleared ALLEGRO catalogue;
4. approved advertising breaks;
5. station jingles / emergency fallback audio;
6. resume normal autopilot automatically after live input ends.

## Music-rights boundary

Only audio with both `rights_status = verified` and `radio_clearance = cleared` is eligible for automatic music scheduling.

Our own artists can grant the required radio/digital rights through ALLEGRO agreements. Music from other catalogues must be covered by the appropriate direct licence, label/aggregator agreement and/or collective-management licences before it is broadcast.

## Commercial model

Revenue inventory can include 15s/30s/60s audio spots, sponsored programme blocks, sponsored charts, branded interviews, presenter reads, artist launch takeovers, event promotion and later regional targeting.

Every delivered advert should create a proof-of-play record for billing and reporting.

## Owner-node playout

The React application is the listener interface. Continuous audio should run on an always-on owner-controlled Linux node with an Icecast-compatible listener stream, Liquidsoap-compatible live/autopilot playout, controlled object storage, health checks, stream monitoring, proof-of-play events and TLS edge.

The browser receives only the public stream URL through `VITE_ALLEGRO_RADIO_STREAM_URL`.

## Launch gates

Do not claim the station is broadcasting until all are true:

- 24/7 stream endpoint is online
- at least 24 hours of rights-cleared programming is loaded
- SAMRO/SAMPRA/direct-rights position is documented
- any applicable ICASA position is confirmed for the service architecture
- advertising terms and approval workflow are in place
- live ingest is authenticated and tested
- proof-of-play logging is working
- silence/failover monitoring is working
