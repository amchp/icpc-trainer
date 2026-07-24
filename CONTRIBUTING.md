# Contributing

Thanks for helping improve ICPC Trainer. By contributing, you agree that your contributions are licensed under the repository's MIT License.

## Development Setup

Use the same toolchain documented in [README.md](README.md):

```bash
pnpm install
cp .env.example .env.local
```

Fill `.env.local` with local Clerk credentials, `ICPC_TRAINER_CREDENTIAL_KEY`, and `TASK_TOKEN`. Never commit real `.env` files, judge credentials, database files, Playwright auth state, or generated reports.

## Workflow

1. Open an issue for bugs, design changes, or larger features before doing broad implementation work.
2. Create a focused branch with a small, reviewable change.
3. Follow the existing TypeScript, tRPC, Effect, Drizzle, React, and test patterns already in the repo.
4. Add or update tests for changed behavior. Keep tests close to the layer being changed.
5. Update `README.md`, `CONTEXT.md`, or `docs/adr/` when behavior, setup, or architecture changes.
6. Run the relevant checks before opening a pull request.

```bash
pnpm typecheck
pnpm test
pnpm build
```

Run `pnpm test:e2e` when a change affects authenticated web flows, routing, judge connection, sync, Contest Finder, or table behavior. E2E tests require a Clerk test or development instance.

## Pull Requests

Pull requests should include:

- A short summary of the user-facing or developer-facing change.
- The commands you ran and their result.
- Screenshots or short recordings for visible UI changes.
- Notes for migrations, environment changes, deployment changes, or follow-up work.

Keep unrelated refactors out of feature and bug-fix pull requests. If a cleanup is useful, make it a separate PR unless it is required for the current change.

Pull requests to `main` must pass the `verify` status check and receive code-owner approval. Pushing new reviewable commits dismisses earlier approvals, so request review again after the final push. Maintainers merge accepted pull requests with squash merge.
