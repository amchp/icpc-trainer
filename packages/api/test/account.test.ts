import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { APP_LOCALES, JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";
import { attachJudgeUser, createTestAppUser } from "./testAppUser.js";

const { contests, userContestStates, users } = schema;

describe("account router", () => {
  it("reads and updates the authenticated App User locale", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      const initial = yield* Effect.promise(() => caller.account.locale());
      const updated = yield* Effect.promise(() => caller.account.setLocale({ locale: APP_LOCALES.Spanish }));
      const saved = yield* Effect.promise(() => database.db.select().from(schema.appUsers).get());
      return { initial, updated, savedLocale: saved?.preferredLocale };
    });

    await expect(
      Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))))
    ).resolves.toEqual({
      initial: { locale: null },
      updated: { locale: APP_LOCALES.Spanish },
      savedLocale: APP_LOCALES.Spanish
    });
  });

  it("rejects unsupported locale values", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      return yield* Effect.promise(() => caller.account.setLocale({ locale: "fr" as APP_LOCALES }));
    });

    await expect(
      Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))))
    ).rejects.toThrow();
  });

  it("isolates locale preferences by App User", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const firstUser = yield* Effect.promise(() => createTestAppUser(database, "first_user"));
      const secondUser = yield* Effect.promise(() => createTestAppUser(database, "second_user"));
      const judges = {
        run: async <T>(input: T) => ({ ok: true as const, result: input }),
        validateCredentials: async () => undefined
      };
      const firstCaller = appRouter.createCaller({ database, appUser: firstUser, judges });
      const secondCaller = appRouter.createCaller({ database, appUser: secondUser, judges });

      yield* Effect.promise(() => firstCaller.account.setLocale({ locale: APP_LOCALES.Spanish }));
      return {
        first: yield* Effect.promise(() => firstCaller.account.locale()),
        second: yield* Effect.promise(() => secondCaller.account.locale())
      };
    });

    await expect(
      Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))))
    ).resolves.toEqual({ first: { locale: APP_LOCALES.Spanish }, second: { locale: null } });
  });

  it("reports simulated contest data by judge", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      const emptyStatus = yield* Effect.promise(() => caller.account.dataStatus());

      yield* Effect.promise(() => database.db.insert(users).values({
        username: "team",
        judge: JUDGES.Codeforces,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run());
      const team = yield* Effect.promise(() => database.db.select().from(users).get());
      if (team === undefined) {
        throw new Error("Expected team judge user.");
      }
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, team.id, USER_TYPES.Team));

      yield* Effect.promise(() => database.db.insert(contests).values([
        {
          judgeId: "100",
          judge: JUDGES.Codeforces,
          name: "Simulated",
          link: "https://codeforces.com/gym/100",
          participants: 1,
          stars: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "200",
          judge: JUDGES.Qoj,
          name: "Unsimulated",
          link: "https://qoj.ac/contest/200",
          participants: 1,
          stars: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run());
      const simulatedContest = (yield* Effect.promise(() => database.db.select().from(contests).all()))
        .find((contest) => contest.judgeId === "100");
      if (simulatedContest === undefined) {
        throw new Error("Expected simulated contest.");
      }
      yield* Effect.promise(() => database.db.insert(userContestStates).values({
        userId: team.id,
        contestId: simulatedContest.id,
        submissionCount: 2,
        acceptedCount: 1,
        distinctProblemCount: 2,
        simulated: true,
        lastSubmissionAt: timestamp,
        updatedAt: timestamp
      }).run());

      const populatedStatus = yield* Effect.promise(() => caller.account.dataStatus());
      return { emptyStatus, populatedStatus };
    });

    await expect(
      Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))))
    ).resolves.toEqual({
      emptyStatus: {
        hasSyncedContests: false,
        syncedContestJudges: []
      },
      populatedStatus: {
        hasSyncedContests: true,
        syncedContestJudges: ["codeforces"]
      }
    });
  });
});
