# ALLEGRO — NODE01 Release Publisher and Runtime Execution

## Architecture rule

**NODE01 is software.** It is the IZAKHONO logical software runtime/control plane. It is not a physical server, computer, laptop, VM, GitHub runner, or hardware asset.

The execution environment is a separate infrastructure concern. Runtime services and workers execute under NODE01's software control through an explicit runtime binding. Never describe the execution environment as NODE01 itself.

## GitHub Actions responsibility

The current workflow `.github/workflows/izakhono-owned-production.yml` runs on GitHub-hosted `ubuntu-latest`. Its role is limited to validating source/release metadata and publishing an immutable NODE01 release contract.

It is **not** a production deployer, does not prove that NODE01 is running, and does not require installing a GitHub Actions self-hosted runner on NODE01.

The internal IZAKHONO execution worker and the GitHub-hosted release publisher are separate services with separate responsibilities.

## Release execution chain

1. GitHub validates source and publishes the immutable release contract.
2. NODE01 software observes and validates the release contract.
3. The separately bound IZAKHONO execution environment performs the authorized build and deployment through the release authority.
4. Application health and canary checks run.
5. IZAKHONO EDGE/TLS and public HTTPS are verified.
6. Backup/restore, rollback and post-rollback health evidence are collected.
7. Only complete, independently verifiable acceptance evidence can authorize an OWNED LIVE VERIFIED claim.

## Security and status gates

- Never commit runner registration tokens, deployment credentials, or secrets.
- Do not enable execution merely because a release contract was published.
- Do not change DNS or public traffic as a side effect of source publication.
- Do not treat a green GitHub publisher workflow as runtime proof.
- Do not mark the app live while any acceptance gate is pending.

The current release remains non-live until runtime execution and all public and recovery acceptance gates are proven.
