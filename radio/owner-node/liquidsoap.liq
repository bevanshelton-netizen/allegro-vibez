settings.log.stdout := true
settings.log.level := 3

source_password = environment.get("ICECAST_SOURCE_PASSWORD")
live_password = environment.get("ALLEGRO_LIVE_PASSWORD")

autopilot = playlist(reload=300, reload_mode="watch", "/state/autopilot.m3u")
fallback_id = single("/media/fallback/station-id.mp3")

live = input.harbor(
  "live",
  port=8080,
  password=live_password,
  buffer=2.0,
  max=10.0
)

station = fallback(track_sensitive=false, [live, autopilot, fallback_id])
station = mksafe(station)

output.icecast(
  %mp3(bitrate=128, stereo=true),
  host="icecast",
  port=8000,
  password=source_password,
  mount="allegro.mp3",
  name="ALLEGRO Radio",
  description="Africa to the World",
  genre="African Music",
  public=true,
  station
)
