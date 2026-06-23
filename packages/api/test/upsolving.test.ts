import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";

const { contests, problems, submissions, users } = schema;

describe("upsolving router", () => {
  it("returns all synced problem rows with primary and teammate status", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");

      database.db.insert(users).values([
        {
          username: "primary",
          type: USER_TYPES.Primary,
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          username: "teammate",
          type: USER_TYPES.Team,
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          username: "friend",
          type: USER_TYPES.Friend,
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      database.db.insert(contests).values([
        {
          judgeId: "100",
          judge: JUDGES.Codeforces,
          name: "Synced Contest",
          link: "https://codeforces.com/gym/100",
          participants: 50,
          stars: 2,
          synced: true,
          createdAt: timestamp,
          updatedAt: new Date("2026-01-02T00:00:00.000Z")
        },
        {
          judgeId: "200",
          judge: JUDGES.Qoj,
          name: "Another Synced Contest",
          link: "https://qoj.ac/contest/200",
          participants: null,
          stars: null,
          synced: true,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "300",
          judge: JUDGES.Codeforces,
          name: "Unsynced Contest",
          link: "https://codeforces.com/gym/300",
          participants: 10,
          stars: 1,
          synced: false,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      const contestRows = database.db.select().from(contests).all();
      const syncedContest = contestRows.find((contest) => contest.judgeId === "100");
      const qojContest = contestRows.find((contest) => contest.judgeId === "200");
      const unsyncedContest = contestRows.find((contest) => contest.judgeId === "300");
      if (!syncedContest || !qojContest || !unsyncedContest) {
        throw new Error("Expected seeded contests.");
      }

      database.db.insert(problems).values([
        {
          judgeId: "100A",
          judge: JUDGES.Codeforces,
          name: "A. Team Solved",
          link: "https://codeforces.com/gym/100/problem/A",
          contestId: syncedContest.id,
          solves: 25,
          solvePercentage: 50,
          rating: 900,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "100B",
          judge: JUDGES.Codeforces,
          name: "B. Team Tried",
          link: "https://codeforces.com/gym/100/problem/B",
          contestId: syncedContest.id,
          solves: 5,
          solvePercentage: 10,
          rating: 1400,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "200A",
          judge: JUDGES.Qoj,
          name: "QOJ New",
          link: "https://qoj.ac/contest/200/problem/1",
          contestId: qojContest.id,
          solves: 1,
          solvePercentage: 1,
          rating: 1800,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "300A",
          judge: JUDGES.Codeforces,
          name: "Unsynced Problem",
          link: "https://codeforces.com/gym/300/problem/A",
          contestId: unsyncedContest.id,
          solves: 1,
          solvePercentage: 10,
          rating: 1000,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      const userRows = database.db.select().from(users).all();
      const problemRows = database.db.select().from(problems).all();
      const primary = userRows.find((user) => user.username === "primary");
      const teammate = userRows.find((user) => user.username === "teammate");
      const friend = userRows.find((user) => user.username === "friend");
      const solved = problemRows.find((problem) => problem.judgeId === "100A");
      const attempted = problemRows.find((problem) => problem.judgeId === "100B");
      const newProblem = problemRows.find((problem) => problem.judgeId === "200A");
      if (!primary || !teammate || !friend || !solved || !attempted || !newProblem) {
        throw new Error("Expected seeded users and problems.");
      }

      database.db.insert(submissions).values([
        {
          judgeId: "sub-1",
          judge: JUDGES.Codeforces,
          problemId: solved.id,
          userId: teammate.id,
          status: SUBMISSION_STATUSES.AC,
          submittedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "sub-2",
          judge: JUDGES.Codeforces,
          problemId: attempted.id,
          userId: primary.id,
          status: SUBMISSION_STATUSES.WA,
          submittedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "sub-3",
          judge: JUDGES.Qoj,
          problemId: newProblem.id,
          userId: friend.id,
          status: SUBMISSION_STATUSES.AC,
          submittedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      const caller = appRouter.createCaller({
        database,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      return yield* Effect.promise(() => caller.upsolving.overview());
    });

    const overview = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" })))
    );

    expect(overview.rows).toHaveLength(3);
    expect(overview.rows.map((row) => row.problemJudgeId)).not.toContain("300A");
    expect(overview.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        problemJudgeId: "100A",
        problemName: "A. Team Solved",
        status: "solved"
      }),
      expect.objectContaining({
        problemJudgeId: "100B",
        status: "attempted"
      }),
      expect.objectContaining({
        problemJudgeId: "200A",
        status: "new"
      })
    ]));
    expect(overview.rows[0]).not.toHaveProperty("submissionCount");
    expect(overview.rows[0]).not.toHaveProperty("contestId");
    expect(overview.rows[0]).not.toHaveProperty("problemId");
    expect(overview.summary).toEqual({
      contestCount: 2,
      problemCount: 3,
      solvedCount: 1,
      attemptedCount: 1
    });
  });
});
