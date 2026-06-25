# Clerk app users own judge state

Use Clerk for ICPC Trainer authentication and login identity linking. Google and GitHub identities belong to Clerk users; the app stores an **App User** row keyed by Clerk user id and lazily creates or refreshes it when authenticated tRPC requests arrive.

Keep **Judge Users** canonical and shared by `(username, judge)`. App-specific rosters are many-to-many relationships from App Users to Judge Users with a Team or Friend role, so the same handle can be Team for one App User and Friend for another.

Judge credentials and live judge sync streams are owned by App User. Credential status, save, clear, sync, and event streams are scoped by App User; identical judge credential material may be saved by different App Users without colliding.

Move simulation state from `contests` to the Judge User ↔ Contest state table. A contest is simulated for a Judge User only after that Judge User has submissions to at least two distinct identified Problems in that contest. Participation-only evidence can support Contest Finder but must not create or downgrade simulated state.

Reset the database migrations to a new initial Drizzle migration because no existing local data migration is required for this change.
