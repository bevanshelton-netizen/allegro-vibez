# Relational persistence boundary

ALLEGRO-VIBEZ keeps domain services independent of a database vendor.

`server/adapters/relational.mjs` defines the repository boundary required by the application. A concrete PostgreSQL driver is supplied separately through the `query` dependency; credentials, connection pools and SQL remain outside domain services.

## Rules

- Production persistence must be PostgreSQL or another verified relational implementation.
- Financial and rights mutations must execute transactionally.
- Sessions must persist only token hashes, never bearer tokens.
- Money uses integer minor units plus explicit ISO currency.
- Rights splits must total exactly 100% before release submission.
- Database migrations, backups, restore testing, monitoring and audit logging are production gates.
- The in-memory adapter is test-only and must never be selected by production configuration.
- No provider is considered live until end-to-end verification succeeds.
