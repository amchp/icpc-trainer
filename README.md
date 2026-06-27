# ICPC Trainer

Local-first ICPC training app for tracking judge accounts, credentials, contests, problems, submissions, contest participation, contest discovery, and upsolving work.

The repository contains:

- React + Vite web app with Clerk authentication
- TanStack Router, Query, and Table
- Tailwind CSS 4 and shadcn-style UI primitives
- tRPC typed HTTP API
- Effect-backed backend services
- Drizzle ORM with libSQL/Turso
- Clerk-owned app users mapped to judge users marked as team users or friends

## Open Source

ICPC Trainer is open source under the [MIT License](LICENSE). Contributions are accepted under the same license; see [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

The npm `private` flags in the workspace manifests are publish guards for the monorepo apps and internal packages. They do not restrict source-code use under the MIT License.

This project is not affiliated with ICPC, Codeforces, QOJ, or Clerk.

## Requirements

- Node `>=24 <26`
- pnpm `10.33.4`
- A Clerk development or test instance for local auth and e2e tests

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Fill `.env.local` with Clerk test or development keys, `ICPC_TRAINER_CREDENTIAL_KEY`, and `TASK_TOKEN`. Do not commit real `.env` files.

`VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_PUBLISHABLE_KEY` are both accepted for the public Clerk key; the value is intentionally available to the Vite frontend. `CLERK_SECRET_KEY` is a backend secret and is also required by the Playwright setup so it can create or reuse the e2e test user through Clerk's Backend API.

## Commands

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm dev
pnpm dev:reset
pnpm catalog:sync
pnpm catalog:sync:task
pnpm test:e2e
```

`pnpm dev` starts the server on `http://127.0.0.1:3774` and the web app on Vite's local dev URL. The backend default is `http://127.0.0.1:3773` when run directly.

`pnpm catalog:sync` refreshes the shared Contest Finder catalog for all judges and imports regular Codeforces contest/problem rows. Run it from cron or your scheduler once per day so user-triggered friend submission syncs only update friend participation. Schedulers can also call `POST /internal/tasks/catalog-sync` with `Authorization: Bearer $TASK_TOKEN`.

For a Railway scheduled task service, use `pnpm catalog:sync:task`. Set `ICPC_TRAINER_API_URL` to the deployed API service URL and set `TASK_TOKEN` to the same secret configured on the API service. A 404 usually means `ICPC_TRAINER_API_URL` points at the web service, an old API deployment, or a URL that is not serving this backend.

On Railway, the API service reads Railway's `PORT` automatically and binds to `0.0.0.0`. Do not set `ICPC_TRAINER_HOST` or `ICPC_TRAINER_PORT` on Railway unless you intentionally want to override that behavior.

## Environment

```bash
ICPC_TRAINER_HOST=127.0.0.1
ICPC_TRAINER_PORT=3773
ICPC_TRAINER_DATABASE_URL=file:.local/icpc-trainer.sqlite
# ICPC_TRAINER_DATABASE_AUTH_TOKEN=
ICPC_TRAINER_CREDENTIAL_KEY=...
TASK_TOKEN=...
VITE_API_BASE_URL=http://127.0.0.1:3773

# ICPC_TRAINER_API_URL=https://your-api.up.railway.app

VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
# or CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# CLERK_JWT_KEY=
# CLERK_ALLOWED_ORIGINS=http://127.0.0.1:5173

E2E_CLERK_USER_EMAIL=icpc-trainer-e2e+clerk_test@example.com
E2E_CLERK_USER_PASSWORD=ICPC-Trainer-E2E-Password-424242!

E2E_CODEFORCES_HANDLE=drew138
# E2E_CODEFORCES_API_KEY=
# E2E_CODEFORCES_API_SECRET=
```

`ICPC_TRAINER_DATABASE_URL` accepts local libSQL URLs such as `file:.local/icpc-trainer.sqlite` and `:memory:`, or remote Turso/libSQL URLs such as `libsql://...`. Local `file:` and `:memory:` databases auto-migrate on server startup. Remote Turso databases do not auto-migrate.

`ICPC_TRAINER_CREDENTIAL_KEY` is required for credential encryption and must come from `.env`; generate it with `openssl rand -base64 32`. `TASK_TOKEN` protects internal task endpoints and should be a separate high-entropy secret.

To use Turso Cloud:

```bash
export ICPC_TRAINER_DATABASE_URL=libsql://your-database.turso.io
export ICPC_TRAINER_DATABASE_AUTH_TOKEN=...
export ICPC_TRAINER_CREDENTIAL_KEY=...
export TASK_TOKEN=...
pnpm --filter @icpc-trainer/db db:migrate
pnpm --filter @icpc-trainer/server dev
```

## Local Database Reset

If local database state is stale after schema changes, stop the dev server and run:

```bash
pnpm dev:reset
```

This deletes `apps/server/.local/icpc-trainer.sqlite`. Local app data and saved judge credentials will be removed.

## E2E Tests

`pnpm test:e2e` runs Playwright against a real Clerk instance. It loads root env files in this order when present: `.env.e2e.local`, `.env.e2e`, `.env.local`, `.env`.

Required for e2e:

- `CLERK_SECRET_KEY`
- `ICPC_TRAINER_CREDENTIAL_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY` or `CLERK_PUBLISHABLE_KEY`

Optional:

- `E2E_CLERK_USER_EMAIL`
- `E2E_CLERK_USER_PASSWORD`
- `E2E_CODEFORCES_HANDLE` (defaults to `drew138`)
- `E2E_CODEFORCES_API_KEY`
- `E2E_CODEFORCES_API_SECRET`

The default e2e email uses the `+clerk_test` subaddress. The global setup creates the user if it does not already exist, signs in with Clerk's testing helpers, and stores auth state under `apps/web/playwright/.clerk/`.

The Codeforces sync e2e test is skipped unless `E2E_CODEFORCES_API_KEY` and `E2E_CODEFORCES_API_SECRET` are set. When enabled, it computes the expected live Codeforces totals for `E2E_CODEFORCES_HANDLE`, syncs that user, and checks that the Contests and Upsolving table counts match.

CI must provide the same Clerk and credential encryption secrets as protected secrets. The Playwright config starts the API on `127.0.0.1:43773` with an in-memory libSQL database and the web app on `127.0.0.1:5173`.
