import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";
import { attachJudgeUser, createTestAppUser } from "./testAppUser.js";

const { contests, problems, problemTags, submissions, users } = schema;

describe("find problems router", () => {
  it("returns saved Codeforces problems with tags and rating range", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      const appUser = createTestAppUser(database);

      database.db.insert(users).values([
        {
          username: "team",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          username: "friend",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      database.db.insert(contests).values([
        {
          judgeId: "100",
          judge: JUDGES.Codeforces,
          name: "Codeforces Round",
          link: "https://codeforces.com/contest/100",
          participants: null,
          stars: null,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "200",
          judge: JUDGES.Qoj,
          name: "QOJ Contest",
          link: "https://qoj.ac/contest/200",
          participants: null,
          stars: null,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      const contestRows = database.db.select().from(contests).all();
      const codeforcesContest = contestRows.find((contest) => contest.judgeId === "100");
      const qojContest = contestRows.find((contest) => contest.judgeId === "200");
      if (!codeforcesContest || !qojContest) {
        throw new Error("Expected seeded contests.");
      }

      database.db.insert(problems).values([
        {
          judgeId: "100A",
          judge: JUDGES.Codeforces,
          name: "A. Untagged",
          link: "https://codeforces.com/contest/100/problem/A",
          contestId: codeforcesContest.id,
          solves: 2000,
          solvePercentage: 80,
          rating: 800,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "100B",
          judge: JUDGES.Codeforces,
          name: "B. Tagged",
          link: "https://codeforces.com/contest/100/problem/B",
          contestId: codeforcesContest.id,
          solves: 100,
          solvePercentage: 20,
          rating: 1400,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "100C",
          judge: JUDGES.Codeforces,
          name: "C. Duplicate Tag Source",
          link: "https://codeforces.com/contest/100/problem/C",
          contestId: codeforcesContest.id,
          solves: 50,
          solvePercentage: 10,
          rating: 2400,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "200A",
          judge: JUDGES.Qoj,
          name: "QOJ Problem",
          link: "https://qoj.ac/contest/200/problem/1",
          contestId: qojContest.id,
          solves: 10,
          solvePercentage: 5,
          rating: 3000,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      const problemRows = database.db.select().from(problems).all();
      const userRows = database.db.select().from(users).all();
      const team = userRows.find((user) => user.username === "team");
      const friend = userRows.find((user) => user.username === "friend");
      const untagged = problemRows.find((problem) => problem.judgeId === "100A");
      const tagged = problemRows.find((problem) => problem.judgeId === "100B");
      const duplicateTagSource = problemRows.find((problem) => problem.judgeId === "100C");
      if (!team || !friend || !untagged || !tagged || !duplicateTagSource) {
        throw new Error("Expected seeded users and problems.");
      }
      attachJudgeUser(database, appUser.id, team.id, USER_TYPES.Team);
      attachJudgeUser(database, appUser.id, friend.id, USER_TYPES.Friend);

      database.db.insert(problemTags).values([
        { problemId: tagged.id, tag: "dp" },
        { problemId: tagged.id, tag: "math" },
        { problemId: duplicateTagSource.id, tag: "dp" }
      ]).run();

      database.db.insert(submissions).values([
        {
          judgeId: "team-wa",
          judge: JUDGES.Codeforces,
          problemId: untagged.id,
          userId: team.id,
          status: SUBMISSION_STATUSES.WA,
          submittedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "friend-ac",
          judge: JUDGES.Codeforces,
          problemId: tagged.id,
          userId: friend.id,
          status: SUBMISSION_STATUSES.AC,
          submittedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "team-ac",
          judge: JUDGES.Codeforces,
          problemId: duplicateTagSource.id,
          userId: team.id,
          status: SUBMISSION_STATUSES.AC,
          submittedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      return yield* Effect.promise(() => caller.findProblems.overview());
    });

    const overview = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" })))
    );

    expect(overview.rows.map((row) => row.problemJudgeId)).toEqual(["100A", "100B"]);
    expect(overview.rows.find((row) => row.problemJudgeId === "100A")).toEqual(expect.objectContaining({
      tags: [],
      rating: 800,
      solvePercentage: 80
    }));
    expect(overview.rows.find((row) => row.problemJudgeId === "100B")).toEqual(expect.objectContaining({
      contestName: "Codeforces Round",
      contestLink: "https://codeforces.com/contest/100",
      tags: ["dp", "math"]
    }));
    expect(overview.tags).toEqual([
      { name: "dp", count: 1 },
      { name: "math", count: 1 }
    ]);
    expect(overview.ratingRange).toEqual({ min: 800, max: 1400 });
  });
});
