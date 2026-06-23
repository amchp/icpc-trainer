import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";

const { contests, userContestStates, users } = schema;

describe("contest finder router", () => {
  it("ranks unsimulated contests by friend participation from both judges", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");

      database.db.insert(users).values([
        {
          username: "cf-friend",
          type: USER_TYPES.Friend,
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          username: "qoj-friend",
          type: USER_TYPES.Friend,
          judge: JUDGES.Qoj,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          username: "team",
          type: USER_TYPES.Team,
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      database.db.insert(contests).values([
        {
          judgeId: "100",
          judge: JUDGES.Codeforces,
          name: "Codeforces Candidate",
          link: "https://codeforces.com/gym/100",
          participants: null,
          stars: null,
          simulated: false,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "200",
          judge: JUDGES.Qoj,
          name: "QOJ Candidate",
          link: "https://qoj.ac/contest/200",
          participants: null,
          stars: null,
          simulated: false,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "300",
          judge: JUDGES.Codeforces,
          name: "Already Simulated",
          link: "https://codeforces.com/gym/300",
          participants: null,
          stars: null,
          simulated: true,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      const userRows = database.db.select().from(users).all();
      const contestRows = database.db.select().from(contests).all();
      const cfFriend = userRows.find((user) => user.username === "cf-friend");
      const qojFriend = userRows.find((user) => user.username === "qoj-friend");
      const team = userRows.find((user) => user.username === "team");
      const cfContest = contestRows.find((contest) => contest.judgeId === "100");
      const qojContest = contestRows.find((contest) => contest.judgeId === "200");
      const simulatedContest = contestRows.find((contest) => contest.judgeId === "300");
      if (!cfFriend || !qojFriend || !team || !cfContest || !qojContest || !simulatedContest) {
        throw new Error("Expected seeded rows.");
      }

      database.db.insert(userContestStates).values([
        {
          userId: cfFriend.id,
          contestId: cfContest.id,
          submissionCount: 1,
          acceptedCount: 0,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        },
        {
          userId: qojFriend.id,
          contestId: qojContest.id,
          submissionCount: 1,
          acceptedCount: 0,
          lastSubmissionAt: null,
          updatedAt: timestamp
        },
        {
          userId: team.id,
          contestId: cfContest.id,
          submissionCount: 5,
          acceptedCount: 1,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        },
        {
          userId: cfFriend.id,
          contestId: simulatedContest.id,
          submissionCount: 1,
          acceptedCount: 1,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined,
          startContestFinderRefresh: async () => undefined,
          observeContestFinderRefresh: async function* (input) {
            yield { type: "snapshot" as const, provider: input.provider, running: false, events: [] };
          }
        }
      });

      return yield* Effect.promise(() => caller.contestFinder.overview());
    });

    const overview = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" })))
    );

    expect(overview.contests.map((contest) => contest.judgeId)).toEqual(["100", "200"]);
    expect(overview.contests).toEqual([
      expect.objectContaining({
        judgeId: "100",
        friendCount: 1,
        handles: ["cf-friend"]
      }),
      expect.objectContaining({
        judgeId: "200",
        friendCount: 1,
        handles: ["qoj-friend"]
      })
    ]);
  });
});
