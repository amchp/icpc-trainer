import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { JUDGES, SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { and, eq, sql } from "drizzle-orm";
import process from "node:process";

import { DatabaseLive, DatabaseServiceTag, schema } from "../src/index.js";

describe("DatabaseLive", () => {
  it("can be composed as an Effect layer", async () => {
    const layer = Layer.provideMerge(DatabaseLive({ url: ":memory:" }), Layer.empty);
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      return database.url;
    });

    await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).resolves.toBe(":memory:");
  });

  it("requires the migration journal to be current and keeps migration idempotent", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const before = yield* Effect.promise(() =>
        database.db.values<[number]>(sql`select count(*) from __drizzle_migrations`)
      );
      yield* database.migrate;
      const health = yield* database.healthCheck;
      const after = yield* Effect.promise(() =>
        database.db.values<[number]>(sql`select count(*) from __drizzle_migrations`)
      );
      return {
        health,
        before: before[0]?.[0] ?? 0,
        after: after[0]?.[0] ?? 0
      };
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" })))
    );
    expect(result.health).toBe("ok");
    expect(result.before).toBeGreaterThan(0);
    expect(result.after).toBe(result.before);
  });

  it("rejects a database whose migration journal is behind the release", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      yield* Effect.promise(() => database.db.run(sql`
        delete from __drizzle_migrations
        where created_at = (select max(created_at) from __drizzle_migrations)
      `));
      return yield* database.healthCheck;
    });

    await expect(Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" })))
    )).rejects.toThrow(/migration journal is behind.*expected.*applied/i);
  });

  it("rejects a database with a missing migration journal", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      yield* Effect.promise(() => database.db.run(sql`drop table __drizzle_migrations`));
      return yield* database.healthCheck;
    });

    await expect(Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" })))
    )).rejects.toThrow(/migration journal is missing or unreadable.*expected/i);
  });

  it("accepts a database whose migration journal is ahead of the release", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      yield* Effect.promise(() => database.db.run(sql`
        insert into __drizzle_migrations (hash, created_at)
        select 'synthetic-ahead', max(created_at) + 1 from __drizzle_migrations
      `));
      return yield* database.healthCheck;
    });

    await expect(Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" })))
    )).resolves.toBe("ok");
  });

  it("stores judge submission time and enforces external judge uniqueness", async () => {
    const layer = Layer.provideMerge(DatabaseLive({ url: ":memory:" }), Layer.empty);
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      return yield* Effect.promise(async () => {
        const timestamp = new Date("2025-01-01T00:00:00.000Z");
        await database.db.insert(schema.users).values({
          username: "tourist",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }).run();
        const user = await database.db.select().from(schema.users).where(eq(schema.users.username, "tourist")).get();
        await database.db.insert(schema.contests).values({
          judgeId: "566",
          judge: JUDGES.Codeforces,
          name: "Testing Round #566",
          link: "https://codeforces.com/gym/566",
          participants: 1,
          stars: 0,
          createdAt: timestamp,
          updatedAt: timestamp
        }).run();
        const contest = await database.db
          .select()
          .from(schema.contests)
          .where(and(eq(schema.contests.judge, JUDGES.Codeforces), eq(schema.contests.judgeId, "566")))
          .get();
        if (user === undefined || contest === undefined) {
          throw new Error("Expected test user and contest to be inserted.");
        }
        await database.db.insert(schema.problems).values({
          judgeId: "566A",
          judge: JUDGES.Codeforces,
          name: "A. Sample",
          link: "https://codeforces.com/gym/566/problem/A",
          contestId: contest.id,
          solves: 1,
          rating: 0,
          createdAt: timestamp,
          updatedAt: timestamp
        }).run();
        const problem = await database.db
          .select()
          .from(schema.problems)
          .where(and(eq(schema.problems.judge, JUDGES.Codeforces), eq(schema.problems.judgeId, "566A")))
          .get();
        if (problem === undefined) {
          throw new Error("Expected test problem to be inserted.");
        }

        await database.db.insert(schema.submissions).values([
          {
            judgeId: "1",
            judge: JUDGES.Codeforces,
            problemId: problem.id,
            userId: user.id,
            status: SUBMISSION_STATUSES.WA,
            submittedAt: new Date("2025-02-01T00:00:00.000Z"),
            createdAt: timestamp,
            updatedAt: timestamp
          },
          {
            judgeId: "2",
            judge: JUDGES.Codeforces,
            problemId: problem.id,
            userId: user.id,
            status: SUBMISSION_STATUSES.AC,
            submittedAt: new Date("2025-02-01T00:10:00.000Z"),
            createdAt: timestamp,
            updatedAt: timestamp
          }
        ]).run();

        return database.db.select().from(schema.submissions).all();
      });
    });

    await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).resolves.toMatchObject([
      {
        judgeId: "1",
        submittedAt: new Date("2025-02-01T00:00:00.000Z")
      },
      {
        judgeId: "2",
        submittedAt: new Date("2025-02-01T00:10:00.000Z")
      }
    ]);
  });

  it("scopes user uniqueness to each judge", async () => {
    const layer = Layer.provideMerge(DatabaseLive({ url: ":memory:" }), Layer.empty);
    const timestamp = new Date("2026-01-01T00:00:00.000Z");
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;

      return yield* Effect.promise(async () => {
        await database.db.insert(schema.users).values([
          {
            username: "juancs",
            judge: JUDGES.Codeforces,
            createdAt: timestamp,
            updatedAt: timestamp
          },
          {
            username: "juancs",
            judge: JUDGES.Qoj,
            createdAt: timestamp,
            updatedAt: timestamp
          }
        ]).run();

        await expect(database.db.insert(schema.users).values({
          username: "juancs",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }).run()).rejects.toThrow();

        await expect(database.db.insert(schema.users).values({
          username: "Juancs",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }).run()).rejects.toThrow();

        return database.db.select().from(schema.users).where(eq(schema.users.username, "juancs")).all();
      });
    });

    await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).resolves.toMatchObject([
      {
        username: "juancs",
        judge: JUDGES.Codeforces
      },
      {
        username: "juancs",
        judge: JUDGES.Qoj
      }
    ]);
  });

  it("stores one contest participation state per user and contest", async () => {
    const layer = Layer.provideMerge(DatabaseLive({ url: ":memory:" }), Layer.empty);
    const timestamp = new Date("2026-01-01T00:00:00.000Z");
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;

      return yield* Effect.promise(async () => {
        await database.db.insert(schema.users).values({
          username: "friend",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }).run();
        await database.db.insert(schema.contests).values({
          judgeId: "100",
          judge: JUDGES.Codeforces,
          name: "Candidate",
          link: "https://codeforces.com/gym/100",
          participants: null,
          stars: null,
          createdAt: timestamp,
          updatedAt: timestamp
        }).run();

        const user = await database.db.select().from(schema.users).get();
        const contest = await database.db.select().from(schema.contests).get();
        if (user === undefined || contest === undefined) {
          throw new Error("Expected seeded rows.");
        }

        await database.db.insert(schema.userContestStates).values({
          userId: user.id,
          contestId: contest.id,
          submissionCount: 1,
          acceptedCount: 0,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        }).run();

        await expect(database.db.insert(schema.userContestStates).values({
          userId: user.id,
          contestId: contest.id,
          submissionCount: 2,
          acceptedCount: 1,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        }).run()).rejects.toThrow();

        return database.db.select().from(schema.userContestStates).all();
      });
    });

    await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).resolves.toMatchObject([
      {
        submissionCount: 1,
        acceptedCount: 0
      }
    ]);
  });
});

const tursoSmokeDatabaseUrl = process.env.ICPC_TRAINER_TURSO_SMOKE_DATABASE_URL;
const tursoSmokeAuthToken = process.env.ICPC_TRAINER_TURSO_SMOKE_AUTH_TOKEN;
const smokeIt = tursoSmokeDatabaseUrl !== undefined && tursoSmokeAuthToken !== undefined ? it : it.skip;

describe("Turso smoke", () => {
  smokeIt("migrates and queries a remote Turso database", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      yield* database.healthCheck;

      return yield* Effect.promise(async () => {
        const timestamp = new Date();
        await database.db.insert(schema.healthChecks).values({
          createdAt: timestamp,
          updatedAt: timestamp
        }).run();

        return database.db.select().from(schema.healthChecks).all();
      });
    });

    await expect(Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({
        url: tursoSmokeDatabaseUrl ?? ":memory:",
        authToken: tursoSmokeAuthToken
      })))
    )).resolves.not.toHaveLength(0);
  });
});
