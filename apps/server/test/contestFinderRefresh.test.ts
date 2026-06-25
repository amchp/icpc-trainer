import type { ContestFinderRefreshEvent } from "@icpc-trainer/api";
import { type DatabaseService, DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { Judge, RefreshContestFinderInput, RefreshContestFinderResult } from "../judges/judges.js";
import { createContestFinderRefreshService } from "../src/contestFinderRefresh.js";

const { contests } = schema;

const nextTick = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const withDatabase = async <A>(run: (database: DatabaseService) => Promise<A>): Promise<A> => {
  const program = Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    return yield* Effect.promise(() => run(database));
  });

  return await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))));
};

const seedRefreshTarget = (database: DatabaseService): void => {
  const timestamp = new Date("2026-01-01T00:00:00.000Z");
  database.db.insert(contests).values({
    judgeId: "100",
    judge: JUDGES.Codeforces,
    name: "Refresh Target",
    link: "https://codeforces.com/gym/100",
    participants: null,
    stars: null,
    simulated: false,
    createdAt: timestamp,
    updatedAt: timestamp
  }).run();
};

const testJudge = (
  findContest: (input: RefreshContestFinderInput) => Effect.Effect<RefreshContestFinderResult>
): Judge => ({
  sync: async function* () {},
  findContest,
  refetchContest: () => Effect.void
});

describe("createContestFinderRefreshService", () => {
  it("observes idle state before refresh starts", async () => {
    await withDatabase(async (database) => {
      const service = createContestFinderRefreshService(database, {});
      const observer = service.observeContestFinderRefresh({ provider: "codeforces" })[Symbol.asyncIterator]();
      const state = await observer.next();

      expect(state.value).toMatchObject({
        type: "state",
        provider: "codeforces",
        status: "idle",
        progress: 0,
        current: null
      });
      await observer.return?.();
    });
  });

  it("sends latest running state to late observers", async () => {
    await withDatabase(async (database) => {
      seedRefreshTarget(database);
      let finish: (() => void) | undefined;
      let service: ReturnType<typeof createContestFinderRefreshService> | undefined;
      const emitted = new Promise<void>((resolve) => {
        const judge = testJudge((input) =>
          Effect.gen(function* () {
            const event: ContestFinderRefreshEvent = {
              type: "catalog.syncing",
              provider: "codeforces",
              step: "catalog",
              stepsTotal: 2,
              stepsLeft: 1
            };
            if (input.emit !== undefined) {
              yield* input.emit(event);
            }
            resolve();
            yield* Effect.promise(() =>
              new Promise<void>((finishResolve) => {
                finish = finishResolve;
              })
            );
            return {
              contestsUpserted: 3,
              friendsProcessed: 0
            };
          })
        );
        service = createContestFinderRefreshService(database, { codeforces: judge });
        void service.startContestFinderRefresh();
      });

      await emitted;
      if (service === undefined) {
        throw new Error("Expected refresh service to be created.");
      }

      const observer = service.observeContestFinderRefresh({ provider: "codeforces" })[Symbol.asyncIterator]();
      const state = await observer.next();

      expect(state.value).toMatchObject({
        type: "state",
        provider: "codeforces",
        status: "running",
        progress: 50,
        current: "Refreshing contest catalog",
        stepsTotal: 2,
        stepsLeft: 1
      });
      finish?.();
      await nextTick();
      await observer.return?.();
    });
  });

  it("retains latest completed state for new observers", async () => {
    await withDatabase(async (database) => {
      seedRefreshTarget(database);
      const service = createContestFinderRefreshService(database, {
        codeforces: testJudge(() => Effect.succeed({
          contestsUpserted: 2,
          friendsProcessed: 0
        }))
      });

      await service.startContestFinderRefresh();
      for (let index = 0; index < 5; index += 1) {
        await nextTick();
      }

      const observer = service.observeContestFinderRefresh({ provider: "codeforces" })[Symbol.asyncIterator]();
      const state = await observer.next();

      expect(state.value).toMatchObject({
        type: "state",
        provider: "codeforces",
        status: "completed",
        progress: 100,
        stepsLeft: 0,
        contestsUpserted: 2
      });
      await observer.return?.();
    });
  });
});
