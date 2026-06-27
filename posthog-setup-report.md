# PostHog post-wizard report

The wizard has completed a server-side PostHog integration for ICPC Trainer. The `posthog-node` SDK was installed in `apps/server`, a lazy singleton (`posthog.ts`) was created, and an `Analytics` interface was added to the shared tRPC context so all route handlers can emit events without taking a direct SDK dependency. Ten events are now tracked across the full mutation surface of the API.

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `judge_credentials_saved` | User successfully saved or updated credentials for a judge provider (Codeforces or QOJ). | `packages/api/src/credentials.ts` |
| `judge_credentials_cleared` | User cleared their stored credentials for a judge provider. | `packages/api/src/credentials.ts` |
| `contest_refetched` | User manually triggered a refetch of a contest's data. | `packages/api/src/upsolving.ts` |
| `friend_submissions_sync_started` | User started syncing friend contest submissions via the contest finder. | `packages/api/src/contestFinder.ts` |
| `team_member_added` | User added a new member to their team roster. | `packages/api/src/team.ts` |
| `team_roster_replaced` | User replaced their entire team roster with a new set of members. | `packages/api/src/team.ts` |
| `friend_added` | User added a new person to their friends list. | `packages/api/src/friends.ts` |
| `friends_roster_replaced` | User replaced their entire friends list with a new set of users. | `packages/api/src/friends.ts` |
| `catalog_sync_completed` | The scheduled contest catalog sync job finished running for all providers. | `apps/server/src/contestFinderCatalogSync.ts` |
| `user_signed_in` (identify) | A user was authenticated and their profile was upserted into the database. | `apps/server/src/auth.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard:** [Analytics basics (wizard)](https://us.posthog.com/project/488472/dashboard/1769260)
- [New Users Over Time](https://us.posthog.com/project/488472/insights/M2EkSLfM)
- [Judge Credentials Connected by Provider](https://us.posthog.com/project/488472/insights/kIKrTf5Z)
- [Friend Submission Syncs Started](https://us.posthog.com/project/488472/insights/YHShEW3J)
- [Contests Refetched](https://us.posthog.com/project/488472/insights/sZwXHBlz)
- [Team & Friend Building Activity](https://us.posthog.com/project/488472/insights/sFX5iGbP)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Confirm the returning-visitor path also calls `identify` — `upsertAuthenticatedUser` in `auth.ts` runs on every authenticated request, so every request re-identifies the user, which is correct. Verify this is still the case after any auth refactors.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
