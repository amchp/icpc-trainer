import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { DatabaseLive, DatabaseServiceTag } from "@icpc-trainer/db";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { appRouter } from "../src/index.js";
import { createTestAppUser } from "./testAppUser.js";

const judges = {
  run: async () => ({ ok: true as const, result: { ok: true } }),
  validateCredentials: async () => undefined
};

describe("learningProgress router", () => {
  it("stores progress per App User and keeps start idempotent", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const firstUser = yield* Effect.promise(() => createTestAppUser(database, "learner_one"));
      const secondUser = yield* Effect.promise(() => createTestAppUser(database, "learner_two"));
      const firstCaller = appRouter.createCaller({ database, judges, appUser: firstUser });
      const secondCaller = appRouter.createCaller({ database, judges, appUser: secondUser });

      return yield* Effect.promise(async () => {
        const started = await firstCaller.learningProgress.start({
          guideId: LEARNING_GUIDE_IDS.ProgrammingFundamentals
        });
        const startedAgain = await firstCaller.learningProgress.start({
          guideId: LEARNING_GUIDE_IDS.ProgrammingFundamentals
        });
        const introduction = await firstCaller.learningProgress.start({
          guideId: LEARNING_GUIDE_IDS.Introduction
        });
        const timeComplexity = await firstCaller.learningProgress.start({
          guideId: LEARNING_GUIDE_IDS.TimeComplexity
        });
        const dataStructures = await firstCaller.learningProgress.start({
          guideId: LEARNING_GUIDE_IDS.DataStructures
        });
        return {
          started,
          startedAgain,
          introduction,
          timeComplexity,
          dataStructures,
          first: await firstCaller.learningProgress.list(),
          second: await secondCaller.learningProgress.list()
        };
      });
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
    expect(result.started.status).toBe(LEARNING_PROGRESS_STATUSES.InProgress);
    expect(result.started.updatedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(result.started.updatedAt))).toBe(false);
    expect(result.startedAgain.startedAt).toBe(result.started.startedAt);
    expect(result.introduction.guideId).toBe(LEARNING_GUIDE_IDS.Introduction);
    expect(result.timeComplexity.guideId).toBe(LEARNING_GUIDE_IDS.TimeComplexity);
    expect(result.dataStructures.guideId).toBe(LEARNING_GUIDE_IDS.DataStructures);
    expect(result.first).toHaveLength(4);
    expect(result.first.map(({ guideId }) => guideId).sort()).toEqual([
      LEARNING_GUIDE_IDS.DataStructures,
      LEARNING_GUIDE_IDS.Introduction,
      LEARNING_GUIDE_IDS.ProgrammingFundamentals,
      LEARNING_GUIDE_IDS.TimeComplexity
    ]);
    expect(result.second).toEqual([]);
  });

  it("completes, does not downgrade on reopen, and allows an explicit reset", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database));
      const caller = appRouter.createCaller({ database, judges, appUser });

      return yield* Effect.promise(async () => {
        await caller.learningProgress.start({ guideId: LEARNING_GUIDE_IDS.DataStructures });
        const completed = await caller.learningProgress.setStatus({
          guideId: LEARNING_GUIDE_IDS.DataStructures,
          status: LEARNING_PROGRESS_STATUSES.Completed
        });
        const reopened = await caller.learningProgress.start({
          guideId: LEARNING_GUIDE_IDS.DataStructures
        });
        const reset = await caller.learningProgress.setStatus({
          guideId: LEARNING_GUIDE_IDS.DataStructures,
          status: LEARNING_PROGRESS_STATUSES.InProgress
        });
        return { completed, reopened, reset };
      });
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
    expect(result.completed.completedAt).not.toBeNull();
    expect(result.reopened.status).toBe(LEARNING_PROGRESS_STATUSES.Completed);
    expect(result.reset).toMatchObject({ status: LEARNING_PROGRESS_STATUSES.InProgress, completedAt: null });
    expect(Date.parse(result.reset.updatedAt)).toBeGreaterThanOrEqual(Date.parse(result.completed.updatedAt));
  });

  it("requires an authenticated App User", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const caller = appRouter.createCaller({ database, judges });
      return yield* Effect.promise(() => caller.learningProgress.list());
    });

    await expect(Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))))).rejects.toThrow(
      "Sign in to use ICPC Trainer."
    );
  });
});
