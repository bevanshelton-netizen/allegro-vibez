# NODE01 GitHub Runner Bootstrap

The ALLEGRO production workflow intentionally targets the IZAKHONO self-hosted label:
`[self-hosted, linux, x64, izakhono]`.

The sovereign NODE01 WSL2 package starts the internal IZAKHONO deployment `runner` container, but that is not the GitHub Actions runner service. Both are required for the current cutover workflow.

## Required one-time binding

On NODE01, install/register the GitHub Actions runner for `bevanshelton-netizen/allegro-vibez` with labels:

- `self-hosted`
- `linux`
- `x64`
- `izakhono`

The registration token must be obtained from GitHub Actions runner settings and supplied only on NODE01. It must never be committed to this repository.

After registration, configure the runner as a service and verify that it is online. The existing queued production job will then be eligible for pickup; no workflow change or external hosting provider is required.

## Security boundary

Do not place a runner registration token in Git, workflow YAML, application environment files, or deployment receipts. Use the short-lived GitHub-generated registration token only on the NODE01 host.

## Release gate

The ALLEGRO release is considered public only after the NODE01 job completes successfully, the deployment receipt exists, and `https://allegrovibez.com` passes external HTTPS acceptance.
