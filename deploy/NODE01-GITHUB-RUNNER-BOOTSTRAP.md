# NODE01 Software Runtime — Execution Binding

## Identity

NODE01 is IZAKHONO software: a logical runtime and control-plane identity. It is not a physical computer or a GitHub Actions runner host.

The infrastructure that executes NODE01-controlled workloads is separate. Its identity and readiness belong in the execution-environment/runtime binding; they must never redefine NODE01's identity.

## CI/CD separation

The ALLEGRO workflow `.github/workflows/izakhono-owned-production.yml` uses GitHub-hosted `ubuntu-latest` to validate source and publish a release contract. It does not deploy production and does not require a self-hosted GitHub runner installed “on NODE01”.

The IZAKHONO deployment worker is a distinct execution service. NODE01 software validates and authorizes work; the separately bound execution environment carries it out using the IZAKHONO release authority.

## Required evidence before production

- NODE01 software readiness and control-plane health.
- A valid binding to a separately identified, IZAKHONO-authorized execution environment.
- Release-authority availability and immutable artifact identity.
- Application health and canary proof.
- Public DNS/TLS/HTTPS proof after an explicitly authorized edge cutover.
- Backup/restore, rollback and post-rollback health proof.

No runner registration token is required for the current GitHub-hosted publisher workflow. Never create or store one unless a future, separately approved workflow genuinely requires a self-hosted runner.

A successful source publisher job is not proof of NODE01 execution and is not permission to claim production live.
