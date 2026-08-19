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

describe("Dynamic Programming learning progress", () => {
  it("starts and completes as guide-level progress", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database, "dp_learner"));
      const caller = appRouter.createCaller({ database, judges, appUser });
      return yield* Effect.promise(async () => {
        const started = await caller.learningProgress.start({ guideId: LEARNING_GUIDE_IDS.DynamicProgramming });
        const completed = await caller.learningProgress.setStatus({
          guideId: LEARNING_GUIDE_IDS.DynamicProgramming,
          status: LEARNING_PROGRESS_STATUSES.Completed
        });
        return { started, completed, listed: await caller.learningProgress.list() };
      });
    });

    const result = await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
    expect(result.started).toMatchObject({
      guideId: LEARNING_GUIDE_IDS.DynamicProgramming,
      status: LEARNING_PROGRESS_STATUSES.InProgress
    });
    expect(result.completed).toMatchObject({
      guideId: LEARNING_GUIDE_IDS.DynamicProgramming,
      status: LEARNING_PROGRESS_STATUSES.Completed
    });
    expect(result.listed).toHaveLength(1);
    expect(result.listed[0]?.guideId).toBe(LEARNING_GUIDE_IDS.DynamicProgramming);
  });
});
