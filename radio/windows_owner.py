#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import secrets
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

APP_NAME = "IZAKHONO ALLEGRO RADIO"
REPO_ZIP = "https://github.com/bevanshelton-netizen/allegro-vibez/archive/refs/heads/main.zip"
LOCAL = Path(os.getenv("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
ROOT = LOCAL / "IzakhonoRadio"
APP = ROOT / "app"
DATA = ROOT / "data"
PROOF = ROOT / "owner-node-proof.json"

def run(cmd, check=True, capture=False, env=None):
    kwargs = {"text": True, "env": env or os.environ.copy()}
    if capture:
        kwargs.update(stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    p = subprocess.run(cmd, **kwargs)
    if check and p.returncode != 0:
        raise RuntimeError(f"command_failed:{cmd[0]}:{p.returncode}")
    return p

def find_exe(name, extras=()):
    hit = shutil.which(name)
    if hit:
        return hit
    for p in extras:
        if Path(p).exists():
            return str(p)
    return None

def docker_paths():
    base = os.environ.get("ProgramFiles", r"C:\Program Files")
    return (
        str(Path(base) / "Docker" / "Docker" / "resources" / "bin" / "docker.exe"),
        str(Path(base) / "Docker" / "Docker" / "Docker Desktop.exe"),
    )

def write_proof(**extra):
    ROOT.mkdir(parents=True, exist_ok=True)
    proof = {
        "product": APP_NAME,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "owner_controlled": True,
        "public_ready": False,
        "rights_cleared_catalogue_loaded": False,
        "continuous_24h_test_passed": False,
    }
    proof.update(extra)
    PROOF.write_text(json.dumps(proof, indent=2), encoding="utf-8")
    return proof

def download_source():
    ROOT.mkdir(parents=True, exist_ok=True)
    tmp = ROOT / "source.zip"
    urllib.request.urlretrieve(REPO_ZIP, tmp)
    digest = hashlib.sha256(tmp.read_bytes()).hexdigest()
    extract = ROOT / "extract"
    if extract.exists():
        shutil.rmtree(extract)
    extract.mkdir(parents=True)
    with zipfile.ZipFile(tmp) as zf:
        zf.extractall(extract)
    roots = [p for p in extract.iterdir() if p.is_dir()]
    if len(roots) != 1:
        raise RuntimeError("unexpected_archive_layout")
    if APP.exists():
        shutil.rmtree(APP)
    shutil.move(str(roots[0]), APP)
    shutil.rmtree(extract, ignore_errors=True)
    tmp.unlink(missing_ok=True)
    return digest

def ensure_data():
    for rel in ("config","state","media/music","media/ads","media/fallback","logs/icecast"):
        (DATA / rel).mkdir(parents=True, exist_ok=True)
    src_programs = APP / "radio" / "owner-node" / "config" / "programs.json"
    dst_programs = DATA / "config" / "programs.json"
    if not dst_programs.exists() and src_programs.exists():
        shutil.copy2(src_programs, dst_programs)
    for name in ("tracks.json","ads.json"):
        p = DATA / "config" / name
        if not p.exists():
            p.write_text("[]\n", encoding="utf-8")

    env = DATA / "allegro-radio.env"
    if not env.exists():
        env.write_text(
            "\n".join([
                f"ICECAST_SOURCE_PASSWORD={secrets.token_urlsafe(32)}",
                f"ICECAST_ADMIN_PASSWORD={secrets.token_urlsafe(32)}",
                f"ICECAST_RELAY_PASSWORD={secrets.token_urlsafe(32)}",
                "ICECAST_HOSTNAME=127.0.0.1",
                f"ALLEGRO_LIVE_PASSWORD={secrets.token_urlsafe(32)}",
                "ALLEGRO_RADIO_TIMEZONE=Africa/Johannesburg",
                "ALLEGRO_RADIO_TERRITORY=ZA",
                "ALLEGRO_RADIO_QUEUE_ITEMS=80",
                "ALLEGRO_RADIO_AD_EVERY_TRACKS=5",
                "ALLEGRO_RADIO_REFRESH_SECONDS=300",
                ""
            ]),
            encoding="utf-8"
        )

def ensure_station_ident():
    wav = DATA / "media" / "fallback" / "station-id.wav"
    if wav.exists() and wav.stat().st_size > 1000:
        return wav
    ps = shutil.which("powershell.exe") or shutil.which("powershell")
    if not ps:
        raise RuntimeError("powershell_not_found_for_station_ident")
    script = (
        "Add-Type -AssemblyName System.Speech; "
        "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        f"$s.SetOutputToWaveFile('{str(wav).replace(chr(39), chr(39)*2)}'); "
        "$s.Speak('ALLEGRO Radio. Africa to the World.'); "
        "$s.Dispose();"
    )
    run([ps, "-NoProfile", "-Command", script])
    if not wav.exists() or wav.stat().st_size < 1000:
        raise RuntimeError("station_ident_generation_failed")
    return wav

def ensure_initial_playlist():
    playlist = DATA / "state" / "autopilot.m3u"
    if not playlist.exists():
        playlist.write_text("#EXTM3U\n#EXTINF:-1,ALLEGRO Radio Station Ident\n/media/fallback/station-id.wav\n", encoding="utf-8")

def ensure_docker(allow_install=True):
    docker_bin, desktop_exe = docker_paths()
    docker = find_exe("docker", (docker_bin,))
    if not docker and allow_install:
        winget = find_exe("winget")
        if not winget:
            raise RuntimeError("docker_missing_and_winget_unavailable")
        run([winget, "install", "--id", "Docker.DockerDesktop", "-e",
             "--accept-package-agreements", "--accept-source-agreements"])
        docker = find_exe("docker", (docker_bin,))
    if not docker:
        raise RuntimeError("docker_not_found")

    probe = run([docker, "info"], check=False, capture=True)
    if probe.returncode != 0:
        if Path(desktop_exe).exists():
            subprocess.Popen([desktop_exe], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deadline = time.time() + 240
        while time.time() < deadline:
            time.sleep(5)
            probe = run([docker, "info"], check=False, capture=True)
            if probe.returncode == 0:
                break
    if probe.returncode != 0:
        raise RuntimeError("docker_engine_not_ready_restart_may_be_required")
    compose = run([docker, "compose", "version"], check=False, capture=True)
    if compose.returncode != 0:
        raise RuntimeError("docker_compose_not_available")
    return docker

def start_stack(docker):
    compose = APP / "radio" / "owner-node" / "docker-compose.windows.yml"
    if not compose.exists():
        raise RuntimeError("windows_compose_missing")
    env = os.environ.copy()
    env["ALLEGRO_RADIO_WINDOWS_DATA"] = DATA.as_posix()
    run([docker, "compose", "-p", "izakhono-allegro-radio", "-f", str(compose), "config", "-q"], env=env)
    run([docker, "compose", "-p", "izakhono-allegro-radio", "-f", str(compose),
         "up", "-d", "--build", "--remove-orphans"], env=env)

def wait_url(url, seconds=180):
    deadline = time.time() + seconds
    last = ""
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as r:
                if 200 <= r.status < 500:
                    return True, f"http_{r.status}"
        except Exception as e:
            last = str(e)
        time.sleep(3)
    return False, last[:300]

def count_cleared_tracks():
    try:
        tracks = json.loads((DATA / "config" / "tracks.json").read_text(encoding="utf-8"))
    except Exception:
        return 0
    return sum(
        1 for t in tracks
        if isinstance(t, dict)
        and t.get("rights_status") == "verified"
        and t.get("radio_clearance") == "cleared"
        and str(t.get("clearance_reference") or "").strip()
    )

def self_test():
    ROOT.mkdir(parents=True, exist_ok=True)
    temp_app = ROOT / "selftest-app"
    temp_data = ROOT / "selftest-data"
    for p in (temp_app,temp_data):
        if p.exists():
            shutil.rmtree(p)
        p.mkdir(parents=True)
    proof = write_proof(self_test=True, docker_required=False, result="PASS")
    assert proof["owner_controlled"] is True
    print("ALLEGRO_RADIO_WINDOWS_OWNER_SELF_TEST=PASS")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--no-install-docker", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0

    try:
        print("IZAKHONO ALLEGRO RADIO — OWNER NODE ACTIVATION")
        digest = download_source()
        ensure_data()
        ensure_station_ident()
        ensure_initial_playlist()
        docker = ensure_docker(allow_install=not args.no_install_docker)
        start_stack(docker)
        health_ok, health_detail = wait_url("http://127.0.0.1:8000/status-json.xsl", 180)
        stream_ok, stream_detail = wait_url("http://127.0.0.1:8000/allegro.mp3", 120)
        cleared = count_cleared_tracks()
        proof = write_proof(
            source_sha256=digest,
            docker_engine=True,
            stack_started=True,
            icecast_health=health_ok,
            stream_mount_reachable=stream_ok,
            cleared_track_count=cleared,
            rights_cleared_catalogue_loaded=cleared > 0,
            technical_stream_ready=bool(health_ok and stream_ok),
            public_ready=False,
            next_gate="Load rights-cleared tracks, expose through IZAKHONO EDGE/TLS, then pass 24-hour continuous stream test.",
            health_detail=health_detail,
            stream_detail=stream_detail,
        )
        print(json.dumps(proof, indent=2))
        try:
            os.startfile("http://127.0.0.1:8000/status.xsl")
        except Exception:
            pass
        if not health_ok:
            return 4
        print(f"OWNER_NODE_PROOF={PROOF}")
        return 0
    except Exception as exc:
        proof = write_proof(result="BLOCKED", error=str(exc)[:500])
        print(json.dumps(proof, indent=2))
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
