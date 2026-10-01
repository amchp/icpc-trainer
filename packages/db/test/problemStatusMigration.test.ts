import { migrate } from "drizzle-orm/libsql/migrator";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

import { DatabaseLive, DatabaseServiceTag, schema } from "../src/index.js";

it("preserves saved Review later rows when upgrading to support In Progress", async () => {
  const program = Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    const previousMigrations = yield* Effect.acquireRelease(
      Effect.sync(() => mkdtempSync(join(tmpdir(), "icpc-status-migration-"))),
      (folder) => Effect.sync(() => rmSync(folder, { recursive: true, force: true }))
    );
    const source = fileURLToPath(new URL("../drizzle/", import.meta.url));
    const journal = JSON.parse(readFileSync(join(source, "meta/_journal.json"), "utf8"));
    journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= 4);
    mkdirSync(join(previousMigrations, "meta"));
    writeFileSync(join(previousMigrations, "meta/_journal.json"), JSON.stringify(journal));
    for (const entry of journal.entries) copyFileSync(join(source, `${entry.tag}.sql`), join(previousMigrations, `${entry.tag}.sql`));
    yield* Effect.promise(() => migrate(database.db, { migrationsFolder: previousMigrations }));
    const now = new Date("2026-01-01T00:00:00Z");
    const [owner] = yield* Effect.promise(() => database.db.insert(schema.appUsers).values({ clerkUserId: "migration-owner", createdAt: now, updatedAt: now }).returning());
    const [contest] = yield* Effect.promise(() => database.db.insert(schema.contests).values({ judgeId: "100", judge: "codeforces", name: "Contest", link: "https://codeforces.com/contest/100", createdAt: now, updatedAt: now }).returning());
    const [problem] = yield* Effect.promise(() => database.db.insert(schema.problems).values({ judgeId: "100A", judge: "codeforces", name: "Problem", link: "https://codeforces.com/contest/100/problem/A", contestId: contest!.id, solves: 0, rating: 800, createdAt: now, updatedAt: now }).returning());
    yield* Effect.promise(() => database.db.run(sql`insert into app_user_problem_reviews (app_user_id, problem_id, created_at, updated_at) values (${owner!.id}, ${problem!.id}, ${now.getTime()}, ${now.getTime()})`));
    yield* database.migrate;
    const review = yield* Effect.promise(() => database.db.select().from(schema.appUserProblemReviews).get());
    expect(review).toEqual({ appUserId: owner!.id, problemId: problem!.id, status: "review_later", createdAt: now, updatedAt: now });
    yield* database.migrate;
    expect(yield* Effect.promise(() => database.db.select().from(schema.appUserProblemReviews).all())).toHaveLength(1);
  });
  await Effect.runPromise(Effect.scoped(program).pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
});
