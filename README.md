# ICPC Trainer

Local-first starter base for a future ICPC training application.

This repository intentionally contains no contest, problem, account, or training domain model yet. It only proves the chosen stack compiles and runs:

- pnpm workspace
- React + Vite web app
- TanStack Router, Query, and Table
- Tailwind CSS 4 and shadcn-style UI primitives
- tRPC typed HTTP API
- Effect-backed backend services
- Drizzle ORM with `better-sqlite3`

## Requirements

- Node `>=24 <26`
- pnpm `10.33.4`

## Commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
pnpm test:e2e
```

The backend defaults to `http://127.0.0.1:3773` and stores its SQLite database at `.local/icpc-trainer.sqlite`.

## Environment

```bash
ICPC_TRAINER_HOST=127.0.0.1
ICPC_TRAINER_PORT=3773
ICPC_TRAINER_SQLITE_PATH=.local/icpc-trainer.sqlite
VITE_API_BASE_URL=http://127.0.0.1:3773
```
