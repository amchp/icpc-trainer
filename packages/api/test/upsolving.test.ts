import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";
import { attachJudgeUser, createTestAppUser } from "./testAppUser.js";

const { contests, problems, submissions, userContestStates, users } = schema;

describe("upsolving router", () => {
  it("returns all simulated problem rows with team user status only", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      const appUser = yield* Effect.promise(() => createTestAppUser(database));

      yield* Effect.promise(() => database.db.insert(users).values([
        {
          username: "other",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          username: "teammate",
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
      ]).run());

      yield* Effect.promise(() => database.db.insert(contests).values([
        {
          judgeId: "100",
          judge: JUDGES.Codeforces,
          name: "Simulated Contest",
          link: "https://codeforces.com/gym/100",
          participants: 50,
          stars: 2,
          createdAt: timestamp,
          updatedAt: new Date("2026-01-02T00:00:00.000Z")
        },
        {
          judgeId: "200",
          judge: JUDGES.Qoj,
          name: "Another Simulated Contest",
          link: "https://qoj.ac/contest/200",
          participants: null,
          stars: null,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "300",
          judge: JUDGES.Codeforces,
          name: "Unsimulated Contest",
          link: "https://codeforces.com/gym/300",
          participants: 10,
          stars: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run());

      const contestRows = yield* Effect.promise(() => database.db.select().from(contests).all());
      const syncedContest = contestRows.find((contest) => contest.judgeId === "100");
      const qojContest = contestRows.find((contest) => contest.judgeId === "200");
      const unsyncedContest = contestRows.find((contest) => contest.judgeId === "300");
      if (!syncedContest || !qojContest || !unsyncedContest) {
        throw new Error("Expected seeded contests.");
      }

      yield* Effect.promise(() => database.db.insert(problems).values([
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
          name: "Unsimulated Problem",
          link: "https://codeforces.com/gym/300/problem/A",
          contestId: unsyncedContest.id,
          solves: 1,
          solvePercentage: 10,
          rating: 1000,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run());

      const userRows = yield* Effect.promise(() => database.db.select().from(users).all());
      const problemRows = yield* Effect.promise(() => database.db.select().from(problems).all());
      const other = userRows.find((user) => user.username === "other");
      const teammate = userRows.find((user) => user.username === "teammate");
      const friend = userRows.find((user) => user.username === "friend");
      const solved = problemRows.find((problem) => problem.judgeId === "100A");
      const attempted = problemRows.find((problem) => problem.judgeId === "100B");
      const newProblem = problemRows.find((problem) => problem.judgeId === "200A");
      if (!other || !teammate || !friend || !solved || !attempted || !newProblem) {
        throw new Error("Expected seeded users and problems.");
      }
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, teammate.id, USER_TYPES.Team));
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, friend.id, USER_TYPES.Friend));
      yield* Effect.promise(() => database.db.insert(userContestStates).values([
        {
          userId: teammate.id,
          contestId: syncedContest.id,
          submissionCount: 2,
          acceptedCount: 1,
          distinctProblemCount: 2,
          simulated: true,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        },
        {
          userId: friend.id,
          contestId: qojContest.id,
          submissionCount: 2,
          acceptedCount: 1,
          distinctProblemCount: 2,
          simulated: true,
          lastSubmissionAt: timestamp,
          updatedAt: timestamp
        }
      ]).run());

      yield* Effect.promise(() => database.db.insert(submissions).values([
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
          userId: other.id,
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
      ]).run());

      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });

      return yield* Effect.promise(() => caller.upsolving.overview());
    });

    const overview = await Effect.runPromise(
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" })))
    );

    expect(overview.rows).toHaveLength(2);
    expect(overview.rows.map((row) => row.problemJudgeId)).not.toContain("300A");
    expect(overview.rows.map((row) => row.problemJudgeId)).not.toContain("200A");
    expect(overview.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        problemJudgeId: "100A",
        problemName: "A. Team Solved",
        status: "solved"
      }),
      expect.objectContaining({
        problemJudgeId: "100B",
        status: "upsolved"
      })
    ]));
    expect(overview.rows[0]).not.toHaveProperty("submissionCount");
    expect(overview.rows[0]).not.toHaveProperty("contestId");
    expect(overview.rows[0]).not.toHaveProperty("problemId");
    expect(overview.contests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        judgeId: "100",
        problemCount: 2,
        solvedCount: 1
      })
    ]));
    expect(overview.contests.map((contest) => contest.judgeId)).not.toContain("200");
    expect(overview.summary).toEqual({
      contestCount: 1,
      problemCount: 2,
      solvedCount: 1,
      attemptedCount: 0
    });
  });

  it("rejects refetching regular Codeforces rounds", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const [contest] = yield* Effect.promise(() =>
        database.db.insert(contests).values({
          judgeId: "566",
          judge: JUDGES.Codeforces,
          name: "Codeforces Round 566 (Div. 2)",
          link: "https://codeforces.com/contest/566",
          participants: null,
          stars: null,
          createdAt: timestamp,
          updatedAt: timestamp
        }).returning().all()
      );
      if (contest === undefined) {
        throw new Error("Expected seeded contest.");
      }

      let refetchCalls = 0;
      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined,
          refetchContest: async () => {
            refetchCalls += 1;
          }
        }
      });

      yield* Effect.promise(() =>
        expect(caller.upsolving.refetchContest({ contestId: contest.id }))
          .rejects.toThrow("Codeforces rounds are refreshed by the catalog sync and cannot be refetched individually.")
      );
      return refetchCalls;
    });

    await expect(
      Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))))
    ).resolves.toBe(0);
  });

  it("allows refetching Codeforces Gym contests", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const [contest] = yield* Effect.promise(() =>
        database.db.insert(contests).values({
          judgeId: "100566",
          judge: JUDGES.Codeforces,
          name: "ICPC Training Camp Invitational",
          link: "https://codeforces.com/gym/100566",
          participants: null,
          stars: null,
          createdAt: timestamp,
          updatedAt: timestamp
        }).returning().all()
      );
      if (contest === undefined) {
        throw new Error("Expected seeded contest.");
      }

      const refetchInputs: unknown[] = [];
      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined,
          refetchContest: async (input) => {
            refetchInputs.push(input);
          }
        }
      });

      yield* Effect.promise(() => caller.upsolving.refetchContest({ contestId: contest.id }));
      return refetchInputs;
    });

    await expect(
      Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))))
    ).resolves.toEqual([
      expect.objectContaining({
        provider: "codeforces",
        contestJudgeId: "100566"
      })
    ]);
  });
});
