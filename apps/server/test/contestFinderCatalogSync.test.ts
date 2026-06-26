import { type DatabaseService, DatabaseLive, DatabaseServiceTag } from "@icpc-trainer/db";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { Judge } from "../judges/judges.js";
import { runContestFinderCatalogSyncJob } from "../src/contestFinderCatalogSync.js";

const withDatabase = async <A>(run: (database: DatabaseService) => Promise<A>): Promise<A> => {
  const program = Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    return yield* Effect.promise(() => run(database));
  });

  return await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
};

const testJudge = (syncContestFinderCatalog: Judge["syncContestFinderCatalog"]): Judge => ({
  sync: async function* () {},
  findContest: () => Effect.succeed({
    contestsUpserted: 0,
    friendsProcessed: 0
  }),
  syncContestFinderCatalog,
  refetchContest: () => Effect.void
});

describe("runContestFinderCatalogSyncJob", () => {
  it("runs every judge catalog sync", async () => {
    await withDatabase(async (database) => {
      const result = await runContestFinderCatalogSyncJob(database, {
        codeforces: testJudge(() => Effect.succeed({
          contestsUpserted: 2,
          regularContestsImported: 1,
          regularProblemsImported: 3
        })),
        qoj: testJudge(() => Effect.succeed({
          contestsUpserted: 4,
          regularContestsImported: 0,
          regularProblemsImported: 0
        }))
      });

      expect(result).toEqual({
        ok: true,
        providers: [
          {
            provider: "codeforces",
            ok: true,
            contestsUpserted: 2,
            regularContestsImported: 1,
            regularProblemsImported: 3
          },
          {
            provider: "qoj",
            ok: true,
            contestsUpserted: 4,
            regularContestsImported: 0,
            regularProblemsImported: 0
          }
        ]
      });
    });
  });

  it("reports a judge failure as a failed job result", async () => {
    await withDatabase(async (database) => {
      const result = await runContestFinderCatalogSyncJob(database, {
        codeforces: testJudge(() => Effect.succeed({
          contestsUpserted: 2,
          regularContestsImported: 1,
          regularProblemsImported: 3
        })),
        qoj: testJudge(() => Effect.fail(new Error("QOJ catalog unavailable")))
      });

      expect(result).toEqual({
        ok: false,
        providers: [
          {
            provider: "codeforces",
            ok: true,
            contestsUpserted: 2,
            regularContestsImported: 1,
            regularProblemsImported: 3
          },
          {
            provider: "qoj",
            ok: false,
            contestsUpserted: 0,
            regularContestsImported: 0,
            regularProblemsImported: 0,
            error: "QOJ catalog unavailable"
          }
        ]
      });
    });
  });
});
