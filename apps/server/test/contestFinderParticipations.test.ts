import { type DatabaseService, DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { upsertContestFinderParticipations } from "../judges/contestFinder/index.js";

const { contests, userContestStates, users } = schema;

const withDatabase = async <A>(run: (database: DatabaseService) => Promise<A>): Promise<A> => {
  const program = Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    return yield* Effect.promise(() => run(database));
  });

  return await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
};

describe("upsertContestFinderParticipations", () => {
  it("records friend participation only for contests already loaded by the catalog task", async () => {
    const result = await withDatabase(async (database) => {
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      await database.db.insert(contests).values({
        judgeId: "known",
        judge: JUDGES.Qoj,
        name: "Known Catalog Contest",
        link: "https://qoj.ac/contest/known",
        participants: null,
        stars: null,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const [friend] = await database.db.insert(users).values({
        username: "friend",
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).returning().all();

      if (friend === undefined) {
        throw new Error("Expected seeded friend.");
      }

      await Effect.runPromise(upsertContestFinderParticipations(database, "qoj", JUDGES.Qoj, [
        {
          user: friend,
          contestJudgeId: "known",
          contestName: "Known Catalog Contest",
          contestLink: "https://qoj.ac/contest/known",
          submissions: []
        },
        {
          user: friend,
          contestJudgeId: "missing",
          contestName: "Missing Page Contest",
          contestLink: "https://qoj.ac/contest/missing",
          submissions: []
        }
      ]));

      return {
        contestRows: await database.db.select().from(contests).all(),
        stateRows: await database.db.select().from(userContestStates).all()
      };
    });

    expect(result.contestRows.map((contest) => contest.judgeId)).toEqual(["known"]);
    expect(result.stateRows).toHaveLength(1);
    expect(result.stateRows[0]).toEqual(expect.objectContaining({
      submissionCount: 1,
      acceptedCount: 0,
      distinctProblemCount: 0,
      simulated: false
    }));
  });
});
