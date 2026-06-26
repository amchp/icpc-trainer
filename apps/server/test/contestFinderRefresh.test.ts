import type { ContestFinderRefreshEvent } from "@icpc-trainer/api";
import { type DatabaseService, DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { Judge, RefreshContestFinderInput, RefreshContestFinderResult } from "../judges/judges.js";
import { createContestFinderRefreshService } from "../src/contestFinderRefresh.js";
import { createTestAppUser } from "./testAppUser.js";

const { contests, providerCredentials } = schema;

const nextTick = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const withDatabase = async <A>(run: (database: DatabaseService) => Promise<A>): Promise<A> => {
  const program = Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    return yield* Effect.promise(() => run(database));
  });

  return await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ url: ":memory:" }))));
};

const seedCredentialRefreshTarget = async (database: DatabaseService, appUserId: number): Promise<void> => {
  const timestamp = new Date("2026-01-01T00:00:00.000Z");
  await database.db.insert(providerCredentials).values({
    appUserId,
    provider: JUDGES.Codeforces,
    providerUserKey: "default",
    credentialType: "api_credentials",
    encryptedPayload: "encrypted",
    lastValidatedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp
  }).run();
};

const seedGlobalContest = async (database: DatabaseService): Promise<void> => {
  const timestamp = new Date("2026-01-01T00:00:00.000Z");
  await database.db.insert(contests).values({
    judgeId: "100",
    judge: JUDGES.Codeforces,
    name: "Global Contest",
    link: "https://codeforces.com/gym/100",
    participants: null,
    stars: null,
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
      const observer = service.observeContestFinderRefresh({ provider: "codeforces", appUserId: 1 })[Symbol.asyncIterator]();
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
      const appUser = await createTestAppUser(database);
      await seedCredentialRefreshTarget(database, appUser.id);
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
        void service.startContestFinderRefresh({ appUserId: appUser.id });
      });

      await emitted;
      if (service === undefined) {
        throw new Error("Expected refresh service to be created.");
      }

      const observer = service.observeContestFinderRefresh({ provider: "codeforces", appUserId: appUser.id })[Symbol.asyncIterator]();
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
      const appUser = await createTestAppUser(database);
      await seedCredentialRefreshTarget(database, appUser.id);
      const service = createContestFinderRefreshService(database, {
        codeforces: testJudge(() => Effect.succeed({
          contestsUpserted: 2,
          friendsProcessed: 0
        }))
      });

      await service.startContestFinderRefresh({ appUserId: appUser.id });
      for (let index = 0; index < 5; index += 1) {
        await nextTick();
      }

      const observer = service.observeContestFinderRefresh({ provider: "codeforces", appUserId: appUser.id })[Symbol.asyncIterator]();
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

  it("does not start a refresh from another user's global contest rows", async () => {
    await withDatabase(async (database) => {
      await seedGlobalContest(database);
      let calls = 0;
      const service = createContestFinderRefreshService(database, {
        codeforces: testJudge(() => {
          calls += 1;
          return Effect.succeed({
            contestsUpserted: 0,
            friendsProcessed: 0
          });
        })
      });

      await service.startContestFinderRefresh({ appUserId: 1 });
      for (let index = 0; index < 5; index += 1) {
        await nextTick();
      }

      const observer = service.observeContestFinderRefresh({ provider: "codeforces", appUserId: 1 })[Symbol.asyncIterator]();
      const state = await observer.next();

      expect(calls).toBe(0);
      expect(state.value).toMatchObject({
        type: "state",
        provider: "codeforces",
        status: "idle"
      });
      await observer.return?.();
    });
  });
});
