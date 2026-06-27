import type { FriendSubmissionSyncEvent } from "@icpc-trainer/api";
import { type DatabaseService, DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { Judge, SyncFriendSubmissionsInput, SyncFriendSubmissionsResult } from "../judges/judges.js";
import { createFriendSubmissionSyncService } from "../src/friendSubmissionSync.js";
import { createTestAppUser } from "./testAppUser.js";

const { appUserJudgeUsers, contests, users } = schema;

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

const seedFriendSyncTarget = async (database: DatabaseService, appUserId: number): Promise<void> => {
  const timestamp = new Date("2026-01-01T00:00:00.000Z");
  const [friend] = await database.db.insert(users).values({
    username: `friend-${appUserId}`,
    judge: JUDGES.Codeforces,
    createdAt: timestamp,
    updatedAt: timestamp
  }).returning().all();

  if (friend === undefined) {
    throw new Error("Expected seeded friend.");
  }

  await database.db.insert(appUserJudgeUsers).values({
    appUserId,
    userId: friend.id,
    role: USER_TYPES.Friend,
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
  syncFriendSubmissions: (input: SyncFriendSubmissionsInput) => Effect.Effect<SyncFriendSubmissionsResult>
): Judge => ({
  sync: async function* () {},
  syncFriendSubmissions,
  syncContestFinderCatalog: () => Effect.succeed({
    contestsUpserted: 0,
    regularContestsImported: 0,
    regularProblemsImported: 0
  }),
  refetchContest: () => Effect.void
});

describe("createFriendSubmissionSyncService", () => {
  it("observes idle state before sync starts", async () => {
    await withDatabase(async (database) => {
      const service = createFriendSubmissionSyncService(database, {});
      const observer = service.observeFriendSubmissionSync({ provider: "codeforces", appUserId: 1 })[Symbol.asyncIterator]();
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
      await seedFriendSyncTarget(database, appUser.id);
      let finish: (() => void) | undefined;
      let service: ReturnType<typeof createFriendSubmissionSyncService> | undefined;
      const emitted = new Promise<void>((resolve) => {
        const judge = testJudge((input) =>
          Effect.gen(function* () {
            const event: FriendSubmissionSyncEvent = {
              type: "friend.syncing",
              provider: "codeforces",
              userHandle: "tourist",
              friendIndex: 1,
              friendsTotal: 2,
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
              friendsProcessed: 0
            };
          })
        );
        service = createFriendSubmissionSyncService(database, { codeforces: judge });
        void service.startFriendSubmissionSync({ appUserId: appUser.id });
      });

      await emitted;
      if (service === undefined) {
        throw new Error("Expected sync service to be created.");
      }

      const observer = service.observeFriendSubmissionSync({ provider: "codeforces", appUserId: appUser.id })[Symbol.asyncIterator]();
      const state = await observer.next();

      expect(state.value).toMatchObject({
        type: "state",
        provider: "codeforces",
        status: "running",
        progress: 50,
        current: "tourist (1/2)",
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
      await seedFriendSyncTarget(database, appUser.id);
      const service = createFriendSubmissionSyncService(database, {
        codeforces: testJudge(() => Effect.succeed({
          friendsProcessed: 1
        }))
      });

      await service.startFriendSubmissionSync({ appUserId: appUser.id });
      for (let index = 0; index < 5; index += 1) {
        await nextTick();
      }

      const observer = service.observeFriendSubmissionSync({ provider: "codeforces", appUserId: appUser.id })[Symbol.asyncIterator]();
      const state = await observer.next();

      expect(state.value).toMatchObject({
        type: "state",
        provider: "codeforces",
        status: "completed",
        progress: 100,
        stepsLeft: 0,
        friendsProcessed: 1
      });
      await observer.return?.();
    });
  });

  it("does not start a sync from another user's global contest rows", async () => {
    await withDatabase(async (database) => {
      await seedGlobalContest(database);
      let calls = 0;
      const service = createFriendSubmissionSyncService(database, {
        codeforces: testJudge(() => {
          calls += 1;
          return Effect.succeed({
            friendsProcessed: 0
          });
        })
      });

      await service.startFriendSubmissionSync({ appUserId: 1 });
      for (let index = 0; index < 5; index += 1) {
        await nextTick();
      }

      const observer = service.observeFriendSubmissionSync({ provider: "codeforces", appUserId: 1 })[Symbol.asyncIterator]();
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
