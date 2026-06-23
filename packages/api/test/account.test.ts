import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";

const { contests } = schema;

describe("account router", () => {
  it("reports synced contest data by judge", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      const emptyStatus = yield* Effect.promise(() => caller.account.dataStatus());

      database.db.insert(contests).values([
        {
          judgeId: "100",
          judge: JUDGES.Codeforces,
          name: "Synced",
          link: "https://codeforces.com/gym/100",
          participants: 1,
          stars: 1,
          synced: true,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "200",
          judge: JUDGES.Qoj,
          name: "Unsynced",
          link: "https://qoj.ac/contest/200",
          participants: 1,
          stars: 1,
          synced: false,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      const populatedStatus = yield* Effect.promise(() => caller.account.dataStatus());
      return { emptyStatus, populatedStatus };
    });

    await expect(
      Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))))
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
