import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { and, eq } from "drizzle-orm";

import { DatabaseLive, DatabaseServiceTag, schema } from "../src/index.js";

describe("DatabaseLive", () => {
  it("can be composed as an Effect layer", async () => {
    const layer = Layer.provideMerge(DatabaseLive({ filename: ":memory:" }), Layer.empty);
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      return database.filename;
    });

    await expect(Effect.runPromise(program.pipe(Effect.provide(layer)))).resolves.toBe(":memory:");
  });

  it("stores judge submission time and enforces external judge uniqueness", async () => {
    const layer = Layer.provideMerge(DatabaseLive({ filename: ":memory:" }), Layer.empty);
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      database.db.insert(schema.users).values({
        username: "tourist",
        type: USER_TYPES.Primary,
        judge: JUDGES.Codeforces,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const user = database.db.select().from(schema.users).where(eq(schema.users.username, "tourist")).get();
      database.db.insert(schema.contests).values({
        judgeId: "566",
        judge: JUDGES.Codeforces,
        name: "Testing Round #566",
        link: "https://codeforces.com/gym/566",
        participants: 1,
        stars: 0,
        synced: true,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const contest = database.db
        .select()
        .from(schema.contests)
        .where(and(eq(schema.contests.judge, JUDGES.Codeforces), eq(schema.contests.judgeId, "566")))
        .get();
      if (user === undefined || contest === undefined) {
        throw new Error("Expected test user and contest to be inserted.");
      }
      database.db.insert(schema.problems).values({
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
      const problem = database.db
        .select()
        .from(schema.problems)
        .where(and(eq(schema.problems.judge, JUDGES.Codeforces), eq(schema.problems.judgeId, "566A")))
        .get();
      if (problem === undefined) {
        throw new Error("Expected test problem to be inserted.");
      }

      database.db.insert(schema.submissions).values([
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

      const rows = database.db.select().from(schema.submissions).all();
      return rows;
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
    const layer = Layer.provideMerge(DatabaseLive({ filename: ":memory:" }), Layer.empty);
    const timestamp = new Date("2026-01-01T00:00:00.000Z");
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;

      database.db.insert(schema.users).values([
        {
          username: "juancs",
          type: USER_TYPES.Primary,
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          username: "juancs",
          type: USER_TYPES.Team,
          judge: JUDGES.Qoj,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      expect(() => {
        database.db.insert(schema.users).values({
          username: "juancs",
          type: USER_TYPES.Team,
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }).run();
      }).toThrow();

      return database.db.select().from(schema.users).where(eq(schema.users.username, "juancs")).all();
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
});
