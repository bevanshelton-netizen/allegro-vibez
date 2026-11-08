# ALLEGRO VIBEZ — NODE01 Software Execution Gate

Status: SOURCE CONTRACT READY; RUNTIME EXECUTION AND ACCEPTANCE NOT VERIFIED

## Identity and execution model

NODE01 is IZAKHONO software: a logical runtime/control-plane identity. NODE01 is not a physical server, computer, laptop, VM, or GitHub runner.

The execution environment is separate infrastructure. A runtime binding connects NODE01 software to authorized execution services. The binding must not conflate the software identity with the infrastructure that runs it.

## Execution chain

1. GitHub-hosted CI validates source and publishes an immutable release contract.
2. NODE01 software observes and validates that contract.
3. A separately bound IZAKHONO execution environment runs the authorized release authority.
4. THE CHANCELLOR migration and proof.
5. ALLEGRO VIBEZ sovereign migration and proof.
6. IZAKHONO EDGE/TLS and public HTTPS acceptance.
7. Backup/restore, rollback and post-rollback health verification.
8. OWNED LIVE VERIFIED only after every required gate has independently verifiable evidence.

## Hard evidence requirements

THE CHANCELLOR must produce `THE-CHANCELLOR-MIGRATION-PROOF.json` with `appHealthPassed=true` and `rollbackPassed=true` before ALLEGRO migration proceeds.

ALLEGRO must produce `ALLEGRO-VIBEZ-MIGRATION-PROOF.json` with application health and rollback proof.

No public DNS or traffic cutover is authorized merely by this source-control record. A successful GitHub publisher workflow is not runtime proof. No live status may be claimed without runtime, public and recovery evidence.

## Infrastructure rule

IZAKHONO-owned infrastructure is the primary destination. External infrastructure remains only as a reversible fallback where required for continuity.

## Release rule

Advertising remains gated until the owned runtime and public HTTPS acceptance, including recovery gates, are independently verified.
