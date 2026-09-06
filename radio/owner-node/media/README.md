# Radio media folders

Place only legally cleared audio in these folders.

- `music/` — music masters cleared for ALLEGRO Radio
- `ads/` — approved advertiser audio
- `fallback/station-id.mp3` — mandatory emergency fallback/station ident

The autopilot does not discover files automatically. Every music track must also be listed in `config/tracks.json` with `rights_status=verified`, `radio_clearance=cleared`, a `clearance_reference`, territory scope and an absolute container path beginning with `/media/`.

Never copy music from consumer streaming services into these folders.
