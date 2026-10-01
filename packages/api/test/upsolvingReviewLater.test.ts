import { DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";
import { attachJudgeUser, createTestAppUser } from "./testAppUser.js";

const seed = (judge = JUDGES.Codeforces) => Effect.gen(function* () {
  const database = yield* DatabaseServiceTag;
  yield* database.migrate;
  const appUser = yield* Effect.promise(() => createTestAppUser(database));
  const otherAppUser = yield* Effect.promise(() => createTestAppUser(database, "other_app_user"));
  const now = new Date("2026-01-01T00:00:00Z");
  const [user] = yield* Effect.promise(() => database.db.insert(schema.users).values({
    username: "teammate", judge, createdAt: now, updatedAt: now
  }).returning().all());
  const [contest] = yield* Effect.promise(() => database.db.insert(schema.contests).values({
    judgeId: "100", judge, name: "Contest", link: "https://codeforces.com/contest/100",
    createdAt: now, updatedAt: now
  }).returning().all());
  if (!user || !contest) throw new Error("Missing seeded user or contest.");
  for (const owner of [appUser, otherAppUser]) {
    yield* Effect.promise(() => attachJudgeUser(database, owner.id, user.id, USER_TYPES.Team));
  }
  const problems = yield* Effect.promise(() => database.db.insert(schema.problems).values(["A", "B", "C"].map((letter) => ({
    judgeId: `100${letter}`, judge, name: letter,
    link: `https://codeforces.com/contest/100/problem/${letter}`, contestId: contest.id,
    solves: 0, rating: 1000, createdAt: now, updatedAt: now
  }))).returning().all());
  yield* Effect.promise(() => database.db.insert(schema.userContestStates).values({
    userId: user.id, contestId: contest.id, submissionCount: 2, acceptedCount: 0,
    distinctProblemCount: 2, simulated: true, updatedAt: now
  }).run());
  yield* Effect.promise(() => database.db.insert(schema.submissions).values(problems.slice(0, 2).map((problem) => ({
    judgeId: `seed-${problem.id}`, judge, problemId: problem.id,
    userId: user.id, status: SUBMISSION_STATUSES.WA, submittedAt: now, createdAt: now, updatedAt: now
  }))).run());
  const callerFor = (owner: typeof appUser | undefined) => appRouter.createCaller({
    database, appUser: owner,
    judges: { run: async (input) => ({ ok: true as const, result: input }), validateCredentials: async () => undefined }
  });
  return { database, appUser, otherAppUser, user, problems, now, callerFor };
});

describe("manual Upsolving status", () => {
  it.each([
    [JUDGES.Codeforces, "review_later"], [JUDGES.Codeforces, "in_progress"],
    [JUDGES.Qoj, "review_later"], [JUDGES.Qoj, "in_progress"]
  ] as const)("preserves %s %s through wrong submissions, promotes to Solved on AC, and stays private", async (judge, manualStatus) => {
    const program = Effect.gen(function* () {
      const { database, appUser, otherAppUser, user, problems, now, callerFor } = yield* seed(judge);
      const caller = callerFor(appUser);
      const otherCaller = callerFor(otherAppUser);
      const problem = problems.find((row) => row.judgeId === "100C")!;
      const input = { judge, problemJudgeId: problem.judgeId };
      const status = async (client = caller) => (await client.upsolving.overview()).rows.find((row) => row.problemJudgeId === problem.judgeId)?.status;
      yield* Effect.promise(() => caller.upsolving.setProblemStatus({ ...input, status: manualStatus }));
      yield* Effect.promise(() => caller.upsolving.setProblemStatus({ ...input, status: manualStatus }));
      expect(yield* Effect.promise(() => status())).toBe(manualStatus);
      expect(yield* Effect.promise(() => status(otherCaller))).toBe("upsolved");
      expect(yield* Effect.promise(() => database.db.select().from(schema.appUserProblemReviews).all())).toHaveLength(1);
      for (const verdict of [SUBMISSION_STATUSES.WA, SUBMISSION_STATUSES.AC]) {
        yield* Effect.promise(() => database.db.insert(schema.submissions).values({
          judgeId: `synced-${verdict}`, judge, problemId: problem.id, userId: user.id,
          status: verdict, submittedAt: now, createdAt: now, updatedAt: now
        }).run());
        expect(yield* Effect.promise(() => status())).toBe(verdict === SUBMISSION_STATUSES.AC ? "solved" : manualStatus);
        expect(yield* Effect.promise(() => status(otherCaller))).toBe(verdict === SUBMISSION_STATUSES.AC ? "solved" : "attempted");
      }
      expect((yield* Effect.promise(() => caller.upsolving.overview())).contests[0]?.solvedCount).toBe(1);
      yield* Effect.promise(() => expect(caller.upsolving.setProblemStatus({ ...input, status: manualStatus })).rejects.toMatchObject({ code: "BAD_REQUEST" }));
      yield* Effect.promise(() => caller.upsolving.setProblemStatus({ ...input, status: null }));
      expect(yield* Effect.promise(() => status())).toBe("solved");
    });
    await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
  });

  it("switches manual statuses and explicitly reverts to current standard status without affecting other owners", async () => {
    const program = Effect.gen(function* () {
      const { database, appUser, otherAppUser, user, problems, now, callerFor } = yield* seed();
      const caller = callerFor(appUser);
      const otherCaller = callerFor(otherAppUser);
      const problem = problems.find((row) => row.judgeId === "100C")!;
      const input = { judge: JUDGES.Codeforces, problemJudgeId: problem.judgeId };
      const status = async (client = caller) => (await client.upsolving.overview()).rows.find((row) => row.problemJudgeId === problem.judgeId)?.status;
      yield* Effect.promise(() => caller.upsolving.setProblemStatus({ ...input, status: "review_later" }));
      yield* Effect.promise(() => otherCaller.upsolving.setProblemStatus({ ...input, status: "in_progress" }));
      yield* Effect.promise(() => caller.upsolving.setProblemStatus({ ...input, status: "in_progress" }));
      expect(yield* Effect.promise(() => status())).toBe("in_progress");
      yield* Effect.promise(() => caller.upsolving.setProblemStatus({ ...input, status: null }));
      expect(yield* Effect.promise(() => status())).toBe("upsolved");
      // Older clients can still save Review later through the original endpoint.
      yield* Effect.promise(() => caller.upsolving.setReviewLater({ ...input, reviewLater: true }));
      expect(yield* Effect.promise(() => status())).toBe("review_later");
      yield* Effect.promise(() => database.db.insert(schema.submissions).values({
        judgeId: "new-wa", judge: JUDGES.Codeforces, problemId: problem.id, userId: user.id,
        status: SUBMISSION_STATUSES.WA, submittedAt: now, createdAt: now, updatedAt: now
      }).run());
      yield* Effect.promise(() => caller.upsolving.setProblemStatus({ ...input, status: null }));
      yield* Effect.promise(() => caller.upsolving.setProblemStatus({ ...input, status: null }));
      expect(yield* Effect.promise(() => status())).toBe("attempted");
      expect(yield* Effect.promise(() => status(otherCaller))).toBe("in_progress");
    });
    await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
  });

  it("requires sign-in, a simulated Team Contest and a valid manual status", async () => {
    const program = Effect.gen(function* () {
      const { database, appUser, callerFor } = yield* seed();
      const outsider = yield* Effect.promise(() => createTestAppUser(database, "outsider"));
      const input = { judge: JUDGES.Codeforces, problemJudgeId: "100A", status: "in_progress" as const };
      yield* Effect.promise(() => expect(callerFor(undefined).upsolving.setProblemStatus(input)).rejects.toMatchObject({ code: "UNAUTHORIZED" }));
      yield* Effect.promise(() => expect(callerFor(outsider).upsolving.setProblemStatus(input)).rejects.toMatchObject({ code: "NOT_FOUND" }));
      yield* Effect.promise(() => expect(callerFor(appUser).upsolving.setProblemStatus({ ...input, judge: JUDGES.Qoj })).rejects.toMatchObject({ code: "NOT_FOUND" }));
      yield* Effect.promise(() => expect(callerFor(appUser).upsolving.setProblemStatus({ ...input, problemJudgeId: "missing" })).rejects.toMatchObject({ code: "NOT_FOUND" }));
      yield* Effect.promise(() => expect(callerFor(appUser).upsolving.setProblemStatus({ ...input, status: "solved" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" }));
      expect(yield* Effect.promise(() => database.db.select().from(schema.appUserProblemReviews).all())).toHaveLength(0);
    });
    await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
  });
});
