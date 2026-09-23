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
      const appUser = yield* Effect.promise(() => createTestAppUser(database));

      yield* Effect.promise(() => database.db.insert(users).values([
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
        },
        {
          username: "other-friend",
          judge: JUDGES.Codeforces,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run());

      yield* Effect.promise(() => database.db.insert(contests).values([
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
      ]).run());

      const contestRows = yield* Effect.promise(() => database.db.select().from(contests).all());
      const codeforcesContest = contestRows.find((contest) => contest.judgeId === "100");
      const qojContest = contestRows.find((contest) => contest.judgeId === "200");
      if (!codeforcesContest || !qojContest) {
        throw new Error("Expected seeded contests.");
      }

      yield* Effect.promise(() => database.db.insert(problems).values([
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
      ]).run());

      const problemRows = yield* Effect.promise(() => database.db.select().from(problems).all());
      const userRows = yield* Effect.promise(() => database.db.select().from(users).all());
      const team = userRows.find((user) => user.username === "team");
      const friend = userRows.find((user) => user.username === "friend");
      const otherFriend = userRows.find((user) => user.username === "other-friend");
      const untagged = problemRows.find((problem) => problem.judgeId === "100A");
      const tagged = problemRows.find((problem) => problem.judgeId === "100B");
      const duplicateTagSource = problemRows.find((problem) => problem.judgeId === "100C");
      if (!team || !friend || !otherFriend || !untagged || !tagged || !duplicateTagSource) {
        throw new Error("Expected seeded users and problems.");
      }
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, team.id, USER_TYPES.Team));
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, friend.id, USER_TYPES.Friend));
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, otherFriend.id, USER_TYPES.Friend));

      yield* Effect.promise(() => database.db.insert(problemTags).values([
        { problemId: tagged.id, tag: "dp" },
        { problemId: tagged.id, tag: "math" },
        { problemId: duplicateTagSource.id, tag: "dp" }
      ]).run());

      yield* Effect.promise(() => database.db.insert(submissions).values([
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
          judgeId: "friend-ac-repeat",
          judge: JUDGES.Codeforces,
          problemId: tagged.id,
          userId: friend.id,
          status: SUBMISSION_STATUSES.AC,
          submittedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "other-friend-ac",
          judge: JUDGES.Codeforces,
          problemId: tagged.id,
          userId: otherFriend.id,
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
      ]).run());

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
      program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" })))
    );

    expect(overview.rows.map((row) => row.problemJudgeId)).toEqual(["100A", "100B"]);
    expect(overview.rows.find((row) => row.problemJudgeId === "100A")).toEqual(expect.objectContaining({
      tags: [],
      rating: 800,
      solvePercentage: 80,
      friendSolvedCount: 0
    }));
    expect(overview.rows.find((row) => row.problemJudgeId === "100B")).toEqual(expect.objectContaining({
      contestName: "Codeforces Round",
      contestLink: "https://codeforces.com/contest/100",
      friendSolvedCount: 2,
      tags: ["dp", "math"]
    }));
    expect(overview.tags).toEqual([
      { name: "dp", count: 1 },
      { name: "math", count: 1 }
    ]);
    expect(overview.ratingRange).toEqual({ min: 800, max: 1400 });
  });

  it("limits joined rows directly and fills incomplete tags in the full response", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const otherAppUser = yield* Effect.promise(() => createTestAppUser(database, "other_app_user"));
      const seededContests = yield* Effect.promise(() => database.db.insert(contests).values(
        ["Z Contest", "A Contest"].map((name, index) => ({
          judgeId: `preview-${index}`, judge: JUDGES.Codeforces, name,
          link: `https://codeforces.com/contest/${index}`, createdAt: timestamp, updatedAt: timestamp
        }))
      ).returning().all());
      const seededProblems = yield* Effect.promise(() => database.db.insert(problems).values(
        Array.from({ length: 65 }, (_, index) => ({
          judgeId: `P${String(65 - index).padStart(3, "0")}`, judge: JUDGES.Codeforces,
          name: `Problem ${index}`, link: `https://codeforces.com/problem/${index}`,
          contestId: seededContests[index % 2]!.id, solves: 0, solvePercentage: 0,
          rating: index < 60 ? 800 : 1200, createdAt: timestamp, updatedAt: timestamp
        }))
      ).returning().all());
      yield* Effect.promise(() => database.db.insert(problemTags).values(
        seededProblems.flatMap((problem) => ["dp", "math", "trees"].map((tag) => ({ problemId: problem.id, tag })))
      ).run());
      const judgeUsers = yield* Effect.promise(() => database.db.insert(users).values(
        ["team", "friend", "foreign-team"].map((username) => ({
          username, judge: JUDGES.Codeforces, createdAt: timestamp, updatedAt: timestamp
        }))
      ).returning().all());
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, judgeUsers[0]!.id, USER_TYPES.Team));
      yield* Effect.promise(() => attachJudgeUser(database, appUser.id, judgeUsers[1]!.id, USER_TYPES.Friend));
      yield* Effect.promise(() => attachJudgeUser(database, otherAppUser.id, judgeUsers[2]!.id, USER_TYPES.Team));
      yield* Effect.promise(() => attachJudgeUser(database, otherAppUser.id, judgeUsers[0]!.id, USER_TYPES.Friend));
      yield* Effect.promise(() => database.db.insert(submissions).values([
        { userId: judgeUsers[0]!.id, problemId: seededProblems[1]!.id },
        { userId: judgeUsers[2]!.id, problemId: seededProblems[3]!.id },
        { userId: judgeUsers[1]!.id, problemId: seededProblems[3]!.id },
        { userId: judgeUsers[1]!.id, problemId: seededProblems[3]!.id },
        { userId: judgeUsers[1]!.id, problemId: seededProblems[64]!.id }
      ].map((submission, index) => ({
        ...submission, judgeId: `preview-ac-${index}`, judge: JUDGES.Codeforces,
        status: SUBMISSION_STATUSES.AC, submittedAt: timestamp, createdAt: timestamp, updatedAt: timestamp
      }))).run());
      // App authentication is sufficient: there are no saved Judge Credentials.
      const caller = appRouter.createCaller({ database, appUser });
      const preview = yield* Effect.promise(() => caller.findProblems.overview({ limit: 50 }));
      const full = yield* Effect.promise(() => caller.findProblems.overview());
      expect(full.rows).toHaveLength(64);
      expect(preview.rows).toHaveLength(17);
      expect(preview.rows.slice(0, 16)).toEqual(full.rows.slice(0, 16));
      expect(preview.rows[16]?.tags).toHaveLength(2);
      expect(full.rows[16]?.tags).toHaveLength(3);
      expect(preview.rows.some((row) => row.problemJudgeId === seededProblems[1]!.judgeId)).toBe(false);
      expect(full.rows.find((row) => row.problemJudgeId === seededProblems[3]!.judgeId)?.friendSolvedCount).toBe(1);
      expect(preview.ratingRange).toEqual({ min: 800, max: 800 });
      expect(full.ratingRange).toEqual({ min: 800, max: 1200 });
    });
    await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
  });

  it("accepts a simple limit without filtering out unrated problems", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const timestamp = new Date("2026-01-01T00:00:00.000Z");
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const [contest] = yield* Effect.promise(() => database.db.insert(contests).values({
        judgeId: "rating-test", judge: JUDGES.Codeforces, name: "Rating Test",
        link: "https://codeforces.com/contest/1", createdAt: timestamp, updatedAt: timestamp
      }).returning().all());
      yield* Effect.promise(() => database.db.insert(problems).values(
        Array.from({ length: 125 }, (_, index) => ({
          judgeId: `P${String(index).padStart(3, "0")}`, judge: JUDGES.Codeforces,
          name: `Problem ${index}`, link: `https://codeforces.com/problem/${index}`,
          contestId: contest!.id, solves: 0, solvePercentage: 0,
          rating: index < 60 ? 0 : index < 120 ? 800 : 2800,
          createdAt: timestamp, updatedAt: timestamp
        }))
      ).run());
      const caller = appRouter.createCaller({ database, appUser });
      const full = yield* Effect.promise(() => caller.findProblems.overview());
      const preview = yield* Effect.promise(() => caller.findProblems.overview({ limit: 50 }));
      expect(full.rows).toHaveLength(125);
      expect(preview.rows).toHaveLength(50);
      expect(preview.rows).toEqual(full.rows.slice(0, 50));
      for (const limit of [0, -1, 51, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        yield* Effect.promise(() => expect(caller.findProblems.overview({ limit }))
          .rejects.toMatchObject({ code: "BAD_REQUEST" }));
      }
    });
    await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
  });

  it("returns an empty preview and requires app authentication", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({ database, appUser });
      const preview = yield* Effect.promise(() => caller.findProblems.overview({ limit: 50 }));
      expect(preview).toEqual({ rows: [], tags: [], ratingRange: { min: null, max: null } });
      const anonymous = appRouter.createCaller({ database });
      yield* Effect.promise(() => expect(anonymous.findProblems.overview({ limit: 50 })).rejects.toMatchObject({ code: "UNAUTHORIZED" }));
    });
    await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
  });

});
