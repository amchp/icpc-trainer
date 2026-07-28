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

describe("Brute Force learning progress", () => {
  it("accepts the guide id and persists completion", async () => {
    const program = Effect.gen(function* () {
      const database = yield* DatabaseServiceTag;
      yield* database.migrate;
      const appUser = yield* Effect.promise(() => createTestAppUser(database, "brute_force_learner"));
      const caller = appRouter.createCaller({ database, judges, appUser });
      return yield* Effect.promise(async () => {
        await caller.learningProgress.start({ guideId: LEARNING_GUIDE_IDS.BruteForce });
        await caller.learningProgress.setStatus({ guideId: LEARNING_GUIDE_IDS.BruteForce, status: LEARNING_PROGRESS_STATUSES.Completed });
        return caller.learningProgress.list();
      });
    });

    const rows = await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
    expect(rows).toEqual([expect.objectContaining({ guideId: LEARNING_GUIDE_IDS.BruteForce, status: LEARNING_PROGRESS_STATUSES.Completed })]);
  });
});
