import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, PROVIDER_STATE_EVENT_TYPES, RUN_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";
import { attachJudgeUser, createTestAppUser } from "./testAppUser.js";

const { contests, userContestStates, users } = schema;

describe("contest finder router", () => {
  it("ranks unattempted contests by friend participation from both judges", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      const appUser = yield* Effect.promise(() => createTestAppUser(database));

      yield* Effect.promise(() => database.db.insert(users).values([
        {
          username: "cf-friend",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          username: "qoj-friend",
          judge: JUDGES.Qoj,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          username: "team",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run());

      yield* Effect.promise(() => database.db.insert(contests).values([
        {
          judgeId: "100",
          judge: JUDGES.Codeforces,
          name: "Codeforces Candidate",
          link: "https://codeforces.com/gym/100",
          participants: null,
          stars: null,
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
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "400",
          judge: JUDGES.Codeforces,
          name: "No Friend State",
          link: "https://codeforces.com/gym/400",
          participants: null,
          stars: null,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run());

      const userRows = yield* Effect.promise(() => database.db.select().from(users).all());
      const contestRows = yield* Effect.promise(() => database.db.select().from(contests).all());
      const cfFriend = userRows.find((user) => user.username === "cf-friend");
      const qojFriend = userRows.find((user) => user.username === "qoj-friend");
      const team = userRows.find((user) => user.username === "team");
      const cfContest = contestRows.find((contest) => contest.judgeId === "100");
      const qojContest = contestRows.find((contest) => contest.judgeId === "200");
      const simulatedContest = contestRows.find((contest) => contest.judgeId === "300");
      if (!cfFriend || !qojFriend || !team || !cfContest || !qojContest || !simulatedContest) {
        throw new Error("Expected seeded rows.");
      }
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, cfFriend.id, USER_TYPES.Friend));
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, qojFriend.id, USER_TYPES.Friend));
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, team.id, USER_TYPES.Team));

      yield* Effect.promise(() => database.db.insert(userContestStates).values([
        {
          userId: cfFriend.id,
          contestId: cfContest.id,
          submissionCount: 1,
          acceptedCount: 0,
          distinctProblemCount: 1,
          simulated: false,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        },
        {
          userId: qojFriend.id,
          contestId: qojContest.id,
          submissionCount: 1,
          acceptedCount: 0,
          distinctProblemCount: 1,
          simulated: false,
          lastSubmissionAt: null,
          updatedAt: timestamp
        },
        {
          userId: team.id,
          contestId: cfContest.id,
          submissionCount: 5,
          acceptedCount: 1,
          distinctProblemCount: 2,
          simulated: true,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        },
        {
          userId: cfFriend.id,
          contestId: simulatedContest.id,
          submissionCount: 1,
          acceptedCount: 1,
          distinctProblemCount: 1,
          simulated: false,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        },
        {
          userId: team.id,
          contestId: simulatedContest.id,
          submissionCount: 2,
          acceptedCount: 1,
          distinctProblemCount: 2,
          simulated: true,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        }
      ]).run());

      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined,
          startContestFinderRefresh: async () => undefined,
          observeContestFinderRefresh: async function* (input) {
            yield {
              type: PROVIDER_STATE_EVENT_TYPES.State,
              provider: input.provider,
              status: RUN_STATUSES.Idle,
              progress: 0,
              stepsTotal: 0,
              stepsLeft: 0,
              current: null,
              contestsUpserted: 0,
              friendsProcessed: 0,
              warnings: []
            };
          }
        }
      });

      return yield* Effect.promise(() => caller.contestFinder.overview());
    });

    const overview = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" })))
    );

    expect(overview.contests.map((contest) => contest.judgeId)).toEqual(["200"]);
    expect(overview.contests).toEqual([
      expect.objectContaining({
        judgeId: "200",
        friendCount: 1,
        handles: ["qoj-friend"]
      })
    ]);
  });
});
