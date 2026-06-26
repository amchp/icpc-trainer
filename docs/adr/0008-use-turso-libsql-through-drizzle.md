# Use Turso/libSQL through Drizzle

We use Turso-compatible libSQL through Drizzle for all ICPC Trainer database access, including local development and tests. Local development uses `file:` databases and tests use `:memory:`, while remote Turso deployments use `ICPC_TRAINER_DATABASE_URL` plus `ICPC_TRAINER_DATABASE_AUTH_TOKEN`.

This supersedes the `better-sqlite3` driver choice from ADR 0004. The trade-off is that database access becomes async across the backend, but the app has one database driver path that can run locally and against Turso Cloud.
