# Security

ALLEGRO-VIBEZ is being rebuilt as a portable artist-prosperity platform.

## Reporting

Do not publish suspected vulnerabilities, private credentials, payment information, unreleased music, or personal data in public issues. Report security concerns privately to the project owner through the repository's configured private contact channel.

## Security principles

- No secrets or private API credentials in browser code.
- User-generated content must be treated as untrusted input.
- Rights, royalty, payment and identity records require server-side controls before production use.
- Payment and financial status must be verified server-side; the frontend must never invent settlement state.
- Media uploads require controlled storage, content validation, authorization and abuse controls.
- Production integrations must have explicit verification boundaries and auditable records.
- Hosting should remain portable so the platform is not locked to one vendor.

## Current rebuild boundary

The clean rebuild contains local demonstration state only. It does not claim live payment settlement, royalty accounting, music distribution, custody, or licensed media delivery until those services are implemented and verified end-to-end.
