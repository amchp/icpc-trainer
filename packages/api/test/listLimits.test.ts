import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { expect, it } from "vitest";

import { appRouter } from "../src/index.js";
import { createTestAppUser } from "./testAppUser.js";

it("supports a limited and full response for every table endpoint", async () => {
  await Effect.runPromise(Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    yield* Effect.promise(async () => {
      const appUser = await createTestAppUser(database);
      const now = new Date("2026-01-01T00:00:00Z");
      const contests = await database.db.insert(schema.contests).values(
        Array.from({ length: 120 }, (_, i) => ({ judgeId: `c${i}`, judge: JUDGES.Codeforces,
          name: `Contest ${String(i).padStart(3, "0")}`, link: `https://example.com/c/${i}`,
          createdAt: now, updatedAt: now }))
      ).returning().all();
      const problems = await database.db.insert(schema.problems).values(contests.map((contest, i) => ({
        contestId: contest.id, judgeId: `p${i}`, judge: JUDGES.Codeforces, name: `Problem ${i}`,
        link: `https://example.com/p/${i}`, rating: 800, solves: 0, solvePercentage: 0,
        createdAt: now, updatedAt: now
      }))).returning().all();
      const users = await database.db.insert(schema.users).values(
        Array.from({ length: 62 }, (_, i) => ({ username: `user-${String(i).padStart(3, "0")}`,
          judge: JUDGES.Codeforces, createdAt: now, updatedAt: now }))
      ).returning().all();
      await database.db.insert(schema.appUserJudgeUsers).values(users.map((user, i) => ({
        userId: user.id, appUserId: appUser.id, role: i < 2 ? USER_TYPES.Team : USER_TYPES.Friend,
        createdAt: now, updatedAt: now
      }))).run();
      await database.db.insert(schema.userContestStates).values(contests.map((contest, i) => ({
        userId: users[i < 60 ? 0 : 2]!.id, contestId: contest.id, simulated: i < 60,
        submissionCount: 1, acceptedCount: 1, distinctProblemCount: 1, updatedAt: now
      }))).run();
      await database.db.insert(schema.submissions).values([
        ...problems.slice(0, 60).map((problem, i) => ({ userId: users[0]!.id, problemId: problem.id, judgeId: `team-${i}` })),
        ...users.slice(1).map((user, i) => ({ userId: user.id, problemId: problems[0]!.id, judgeId: `other-${i}` }))
      ].map((row) => ({ ...row, judge: JUDGES.Codeforces, status: SUBMISSION_STATUSES.AC,
        submittedAt: now, createdAt: now, updatedAt: now }))).run();

      const caller = appRouter.createCaller({ database, appUser });
      const [smallProblems, allProblems] = await Promise.all([
        caller.findProblems.overview({ limit: 50 }), caller.findProblems.overview()
      ]);
      expect(smallProblems.rows).toEqual(allProblems.rows.slice(0, 50));
      expect(allProblems.rows).toHaveLength(60);
      const [smallUpsolving, allUpsolving] = await Promise.all([
        caller.upsolving.overview({ limit: 50 }), caller.upsolving.overview()
      ]);
      expect(allUpsolving.rows).toHaveLength(60);
      expect(smallUpsolving.rows).toEqual(allUpsolving.rows.slice(0, 50));
      expect(smallUpsolving.contests).toEqual(allUpsolving.contests.slice(0, 50));
      const [smallContests, allContests] = await Promise.all([
        caller.contestFinder.overview({ limit: 50 }), caller.contestFinder.overview()
      ]);
      expect(allContests.contests).toHaveLength(60);
      expect(smallContests.contests).toEqual(allContests.contests.slice(0, 50));
      const [smallFriends, allFriends] = await Promise.all([
        caller.friends.roster({ limit: 50 }), caller.friends.roster()
      ]);
      expect(allFriends.users).toHaveLength(60);
      expect(smallFriends.users).toEqual(allFriends.users.slice(0, 50));
      const [smallTeam, allTeam] = await Promise.all([
        caller.team.roster({ limit: 1 }), caller.team.roster()
      ]);
      expect(allTeam.users).toHaveLength(2);
      expect(smallTeam.users).toEqual(allTeam.users.slice(0, 1));
      const [smallRanking, allRanking] = await Promise.all([
        caller.leaderboard.list({ scope: "all", limit: 50 }), caller.leaderboard.list({ scope: "all" })
      ]);
      expect(allRanking.rows).toHaveLength(62);
      expect(smallRanking.rows).toEqual(allRanking.rows.slice(0, 50));
      expect(allRanking.hasNextPage).toBe(false);
      expect(smallRanking.hasNextPage).toBe(true);
      for (const read of [caller.findProblems.overview, caller.upsolving.overview,
        caller.contestFinder.overview, caller.team.roster, caller.friends.roster]) {
        await expect(read({ limit: 51 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
      }
    });
  }).pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
});
