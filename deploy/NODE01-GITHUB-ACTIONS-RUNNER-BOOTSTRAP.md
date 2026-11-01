# ALLEGRO NODE01 — GitHub Actions Runner Bootstrap

## Purpose

This document closes the remaining CI/CD handoff between GitHub and the owned IZAKHONO NODE01 runtime. The production cutover workflow is intentionally pinned to a self-hosted runner with labels:

- `self-hosted`
- `linux`
- `x64`
- `izakhono`

The existing IZAKHONO deployment worker is **not** the GitHub Actions runner. A GitHub Actions runner must be installed separately on NODE01.

## Required runner registration

Create a short-lived GitHub Actions runner registration token from the repository's **Settings → Actions → Runners → New self-hosted runner** flow. Never commit the token to this repository, a script, an image, or an environment file stored in Git.

On NODE01, install the runner using GitHub's official runner package and configure it with:

```text
name: IZAKHONO-NODE01
labels: self-hosted,linux,x64,izakhono
work folder: _work
```

Run the runner as a persistent service so it survives reboots.

## Production contract

Once the runner is online, the existing workflow:

`.github/workflows/izakhono-production-cutover.yml`

will execute the owned-first production cutover against NODE01. It builds the ALLEGRO image locally, performs the canary checks, promotes port 8080, performs the public HTTPS acceptance checks for `https://allegrovibez.com`, and writes the deployment receipt.

## Safety gates

Do not mark ALLEGRO as `OWNED LIVE VERIFIED` merely because the GitHub job is green. The deployment receipt and public-side acceptance evidence must exist. Backup/restore and rollback gates must also be satisfied under the IZAKHONO infrastructure directive.

## Expected first successful signal

The GitHub Actions job named:

`Promote ALLEGRO on IZAKHONO NODE01`

must move from `queued` to `in_progress` and then `success`. Its artifact should contain:

`allegro-izakhono-deployment-receipt-<run_id>`

Only after those acceptance gates pass should the launch advertising automation be allowed to act.
