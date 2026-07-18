import {
  AppUserIdTag,
  appRouter,
  type JudgeSyncEvent,
  JudgeSyncEventType,
  JudgeSyncStep,
  SyncStepStatus
} from "@icpc-trainer/api";
import { type DatabaseService, DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES, type JudgeProvider } from "@icpc-trainer/shared";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { Buffer } from "node:buffer";
import process from "node:process";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeCodeforcesJudge } from "../judges/codeforces.js";
import {
  JudgeAPIError,
  type Judge,
  type SyncFriendSubmissionsResult
} from "../judges/judges.js";
import type { QojPlaygroundClient } from "../judges/qoj.js";
import { createCodeforcesJudgeSync, type CodeforcesSyncOperations } from "../judges/sync/sync_codeforces.js";
import { createQojJudgeSync } from "../judges/sync/sync_qoj.js";
import { createJudgeSyncService } from "../judges/sync/sync.js";
import { createTestAppUser } from "./testAppUser.js";

const { appUserJudgeUsers, contests, problems, problemTags, submissions, userContestStates, users } = schema;

const originalCredentialKey = process.env.ICPC_TRAINER_CREDENTIAL_KEY;

const jsonResponse = (payload: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => payload
  }) as Response;

const collect = async <T>(iterable: AsyncIterable<T>): Promise<readonly T[]> => {
  const values: T[] = [];
  for await (const value of iterable) {
    values.push(value);
  }
  return values;
};

const expectStepEvent = (
  step: JudgeSyncStep,
  values: {
    readonly stepStatus?: SyncStepStatus;
    readonly current?: string;
    readonly total?: number;
    readonly processed?: number;
  } = {}
): unknown =>
  expect.objectContaining({
    type: JudgeSyncEventType.Step,
    step,
    ...values
  });

const isStepEvent = (
  event: JudgeSyncEvent,
  step: JudgeSyncStep,
  values: {
    readonly stepStatus?: SyncStepStatus;
    readonly current?: string;
    readonly total?: number;
    readonly processed?: number;
  } = {}
): boolean =>
  event.type === JudgeSyncEventType.Step &&
  event.step === step &&
  (values.stepStatus === undefined || event.stepStatus === values.stepStatus) &&
  (values.current === undefined || event.current === values.current) &&
  (values.total === undefined || event.total === values.total) &&
  (values.processed === undefined || event.processed === values.processed);

const nextTick = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const withDatabase = async <A>(
  run: (database: DatabaseService, appUserId: number) => Promise<A>,
  options: {
    readonly saveCredentials?: boolean;
    readonly onQuery?: () => void;
  } = {}
): Promise<A> => {
  process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

  const program = Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    const appUser = yield* Effect.promise(() => createTestAppUser(database));
    if (options.saveCredentials !== false) {
      const caller = appRouter.createCaller({
        database,
        appUser,
        judges: {
          run: async (input) => ({ ok: true as const, result: input }),
          validateCredentials: async () => undefined
        }
      });
      yield* Effect.promise(() =>
        caller.credentials.save({
          provider: "codeforces",
          providerUserKey: "tourist",
          codeforces: {
            apiKey: "key",
            apiSecret: "secret"
          }
        })
      );
    }

    return yield* Effect.promise(() => run(database, appUser.id));
  });

  return await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({
    url: ":memory:",
    onQuery: options.onQuery
  }))));
};

const attachTeamUser = async (
  database: DatabaseService,
  appUserId: number,
  username: string,
  judge: JUDGES
): Promise<void> => {
  const user = await database.db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.username, username), eq(users.judge, judge)))
    .get();
  if (user === undefined) {
    throw new Error(`Expected ${judge} user ${username} to exist.`);
  }

  const timestamp = new Date("2025-01-01T00:00:00.000Z");
  await database.db
    .insert(appUserJudgeUsers)
    .values({
      appUserId,
      userId: user.id,
      role: USER_TYPES.Team,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoNothing()
    .run();
};

const codeforcesResponse = (result: unknown): Response =>
  jsonResponse({ status: "OK", result });

type CodeforcesTestJudge = CodeforcesSyncOperations;
type TestJudge = CodeforcesTestJudge | QojPlaygroundClient;

const withTestSync = (
  database: DatabaseService,
  provider: JudgeProvider,
  judge: TestJudge | Judge
): Judge => {
  if ("sync" in judge) {
    return judge;
  }

  let syncedJudge: Judge;
  syncedJudge = {
    sync: (input) => provider === "codeforces"
      ? createCodeforcesJudgeSync(database, input, judge as CodeforcesTestJudge)
      : createQojJudgeSync(database, input, judge as QojPlaygroundClient),
    syncFriendSubmissions: () => Effect.succeed({
      friendsProcessed: 0
    } satisfies SyncFriendSubmissionsResult),
    syncContestFinderCatalog: () => Effect.succeed({
      contestsUpserted: 0,
      regularContestsImported: 0,
      regularProblemsImported: 0
    }),
    refetchContest: () => Effect.void
  };

  return syncedJudge;
};

const createSyncService = (
  database: DatabaseService,
  registry: Partial<Record<JudgeProvider, TestJudge | Judge>> = {}
) => createJudgeSyncService({
  codeforces: makeCodeforcesJudge(database),
  ...Object.fromEntries(
    Object.entries(registry).map(([provider, judge]) => [
      provider,
      withTestSync(database, provider as JudgeProvider, judge)
    ])
  )
});

describe("createJudgeSyncService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalCredentialKey === undefined) {
      delete process.env.ICPC_TRAINER_CREDENTIAL_KEY;
    } else {
      process.env.ICPC_TRAINER_CREDENTIAL_KEY = originalCredentialKey;
    }
  });

  it("completes without Codeforces calls when there are no team users", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const events = await withDatabase(
      (database, appUserId) => collect(createSyncService(database).sync({ provider: "codeforces", appUserId })),
      { saveCredentials: false }
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(events.at(-1)).toMatchObject({
      type: "completed",
      stepsLeft: 0,
      summary: {
        usersProcessed: 0,
        errors: 0
      }
    });
  });

  it("observes idle state before sync starts", async () => {
    const service = createJudgeSyncService({});
    const observer = service.observe({ provider: "codeforces", appUserId: 1 })[Symbol.asyncIterator]();
    const state = await observer.next();

    expect(state.value).toMatchObject({
      type: "state",
      provider: "codeforces",
      status: "idle",
      latestEvent: null
    });
    await observer.return?.();
  });

  it("keeps one active sync per provider and sends latest active state to late observers", async () => {
    let runCount = 0;
    let finish: (() => void) | undefined;
    const started: JudgeSyncEvent = {
      type: "started",
      provider: "codeforces",
      stepsTotal: 1,
      stepsLeft: 1
    };
    const completed: JudgeSyncEvent = {
      type: "completed",
      provider: "codeforces",
      stepsTotal: 1,
      stepsLeft: 0,
      summary: {
        usersProcessed: 0,
        submissionsFetched: 0,
        submissionsInserted: 0,
        submissionsUpdated: 0,
        submissionsSkipped: 0,
        contestsSynced: 0,
        regularContestsImported: 0,
        regularProblemsImported: 0,
        regularPendingSubmissionsRetried: 0,
        errors: 0
      }
    };
    const judge: Judge = {
      sync: async function* () {
        runCount += 1;
        yield started;
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        yield completed;
      },
      syncFriendSubmissions: () => Effect.succeed({
        friendsProcessed: 0
      }),
      syncContestFinderCatalog: () => Effect.succeed({
        contestsUpserted: 0,
        regularContestsImported: 0,
        regularProblemsImported: 0
      }),
      refetchContest: () => Effect.void
    };

    const service = createJudgeSyncService({ codeforces: judge });
    await service.start({ provider: "codeforces", appUserId: 1 });
    await service.start({ provider: "codeforces", appUserId: 1 });
    await nextTick();

    const observer = service.observe({ provider: "codeforces", appUserId: 1 })[Symbol.asyncIterator]();
    const snapshot = await observer.next();

    expect(runCount).toBe(1);
    expect(snapshot.value).toMatchObject({
      type: "state",
      provider: "codeforces",
      status: "running",
      latestEvent: started
    });

    finish?.();
    const finalEvent = await observer.next();
    expect(finalEvent.value).toMatchObject({
      type: "state",
      provider: "codeforces",
      status: "completed",
      latestEvent: completed,
      summary: completed.summary
    });
    await observer.return?.();
  });

  it("keeps active sync state isolated per app user and provider", async () => {
    const startedFor = (appUserId: number): JudgeSyncEvent => ({
      type: "started",
      provider: "codeforces",
      stepsTotal: appUserId,
      stepsLeft: appUserId
    });
    const completedFor = (appUserId: number): JudgeSyncEvent => ({
      type: "completed",
      provider: "codeforces",
      stepsTotal: appUserId,
      stepsLeft: 0,
      summary: {
        usersProcessed: appUserId,
        submissionsFetched: 0,
        submissionsInserted: 0,
        submissionsUpdated: 0,
        submissionsSkipped: 0,
        contestsSynced: 0,
        regularContestsImported: 0,
        regularProblemsImported: 0,
        regularPendingSubmissionsRetried: 0,
        errors: 0
      }
    });
    const finishes = new Map<number, () => void>();
    const judge: Judge = {
      sync: async function* (input) {
        yield startedFor(input.appUserId);
        await new Promise<void>((resolve) => finishes.set(input.appUserId, resolve));
        yield completedFor(input.appUserId);
      },
      syncFriendSubmissions: () => Effect.succeed({
        friendsProcessed: 0
      }),
      syncContestFinderCatalog: () => Effect.succeed({
        contestsUpserted: 0,
        regularContestsImported: 0,
        regularProblemsImported: 0
      }),
      refetchContest: () => Effect.void
    };

    const service = createJudgeSyncService({ codeforces: judge });
    await service.start({ provider: "codeforces", appUserId: 1 });
    await service.start({ provider: "codeforces", appUserId: 2 });
    await nextTick();

    const firstObserver = service.observe({ provider: "codeforces", appUserId: 1 })[Symbol.asyncIterator]();
    const secondObserver = service.observe({ provider: "codeforces", appUserId: 2 })[Symbol.asyncIterator]();

    expect((await firstObserver.next()).value).toMatchObject({
      status: "running",
      latestEvent: startedFor(1)
    });
    expect((await secondObserver.next()).value).toMatchObject({
      status: "running",
      latestEvent: startedFor(2)
    });

    finishes.get(1)?.();
    expect((await firstObserver.next()).value).toMatchObject({
      status: "completed",
      latestEvent: completedFor(1)
    });
    const lateSecondObserver = service.observe({ provider: "codeforces", appUserId: 2 })[Symbol.asyncIterator]();
    expect((await lateSecondObserver.next()).value).toMatchObject({
      status: "running",
      latestEvent: startedFor(2)
    });

    finishes.get(2)?.();
    expect((await secondObserver.next()).value).toMatchObject({
      status: "completed",
      latestEvent: completedFor(2)
    });
    await firstObserver.return?.();
    await secondObserver.return?.();
    await lateSecondObserver.return?.();
  });

  it("sends terminal completed state to reload observers", async () => {
    const started: JudgeSyncEvent = {
      type: "started",
      provider: "codeforces",
      stepsTotal: 1,
      stepsLeft: 1
    };
    const completed: JudgeSyncEvent = {
      type: "completed",
      provider: "codeforces",
      stepsTotal: 1,
      stepsLeft: 0,
      summary: {
        usersProcessed: 0,
        submissionsFetched: 0,
        submissionsInserted: 0,
        submissionsUpdated: 0,
        submissionsSkipped: 0,
        contestsSynced: 0,
        regularContestsImported: 0,
        regularProblemsImported: 0,
        regularPendingSubmissionsRetried: 0,
        errors: 0
      }
    };
    const judge: Judge = {
      sync: async function* () {
        yield started;
        yield completed;
      },
      syncFriendSubmissions: () => Effect.succeed({
        friendsProcessed: 0
      }),
      syncContestFinderCatalog: () => Effect.succeed({
        contestsUpserted: 0,
        regularContestsImported: 0,
        regularProblemsImported: 0
      }),
      refetchContest: () => Effect.void
    };

    const service = createJudgeSyncService({ codeforces: judge });
    await service.start({ provider: "codeforces", appUserId: 1 });
    await nextTick();

    const observer = service.observe({ provider: "codeforces", appUserId: 1 })[Symbol.asyncIterator]();
    const snapshot = await observer.next();

    expect(snapshot.value).toMatchObject({
      type: "state",
      provider: "codeforces",
      status: "completed",
      latestEvent: completed,
      summary: completed.summary
    });
    await observer.return?.();
  });

  it("imports matching submissions idempotently when the problem already exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      codeforcesResponse([
        {
          id: 49644212,
          contestId: 100566,
          creationTimeSeconds: 1450000000,
          problem: { contestId: 100566, index: "A", name: "Matching Names" },
          verdict: "OK"
        }
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    await withDatabase(async (database, appUserId) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      const user = await database.db.select().from(users).where(eq(users.username, "tourist")).get();
      await database.db.insert(contests).values({
        judgeId: "100566",
        judge: JUDGES.Codeforces,
        name: "Testing Round #100566",
        link: "https://codeforces.com/gym/100566",
        participants: 1,
        stars: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const contest = await database.db
        .select()
        .from(contests)
        .where(and(eq(contests.judge, JUDGES.Codeforces), eq(contests.judgeId, "100566")))
        .get();
      if (user === undefined || contest === undefined) {
        throw new Error("Expected test user and contest to be inserted.");
      }
      await database.db.insert(problems).values({
        judgeId: "100566A",
        judge: JUDGES.Codeforces,
        name: "A. Matching Names",
        link: "https://codeforces.com/gym/100566/problem/A",
        contestId: contest.id,
        solves: 1,
        rating: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));
      const secondEvents = await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));

      const rows = await database.db.select().from(submissions).all();
      const contestStates = await database.db.select().from(userContestStates).all();
      expect(user.username).toBe("tourist");
      expect(rows).toHaveLength(1);
      expect(contestStates).toEqual([
        expect.objectContaining({
          userId: user.id,
          contestId: contest.id,
          submissionCount: 1,
          acceptedCount: 1,
          distinctProblemCount: 1,
          simulated: false
        })
      ]);
      expect(rows[0]).toMatchObject({
        judgeId: "49644212",
        judge: JUDGES.Codeforces,
        status: SUBMISSION_STATUSES.AC,
        submittedAt: new Date(1450000000 * 1000)
      });
      expect(secondEvents.at(-1)).toMatchObject({
        type: "completed",
        summary: {
          submissionsInserted: 0,
          submissionsUpdated: 0,
          submissionsSkipped: 1
        }
      });
    });
  });

  it("keeps the same external submission id for multiple simulated users", async () => {
    const timestamp = new Date("2025-01-01T00:00:00.000Z");
    const sharedSubmission = {
      judgeId: "49644212",
      judgeContestId: "100566",
      judgeProblemId: "100566A",
      problemName: "Matching Names",
      verdict: SUBMISSION_STATUSES.AC,
      submittedAt: new Date("2025-02-01T00:00:00.000Z")
    };
    const judge: TestJudge = {
      getContests: () => Effect.succeed([]),
      getContest: (contestId) => Effect.succeed({
        judgeId: contestId,
        name: `Contest ${contestId}`,
        participants: 1,
        problems: [],
        stars: 0
      }),
      getUser: (handle) => Effect.succeed({ handle }),
      getSubmissions: ({ userHandle }) =>
        Effect.succeed(userHandle === "tourist" || userHandle === "teammate" ? [sharedSubmission] : [])
    };

    await withDatabase(async (database, appUserId) => {
      await database.db.insert(users).values({
        username: "teammate",
        judge: JUDGES.Codeforces,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      await attachTeamUser(database, appUserId, "teammate", JUDGES.Codeforces);
      await database.db.insert(contests).values({
        judgeId: "100566",
        judge: JUDGES.Codeforces,
        name: "Testing Round #100566",
        link: "https://codeforces.com/gym/100566",
        participants: 1,
        stars: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const contest = await database.db
        .select()
        .from(contests)
        .where(and(eq(contests.judge, JUDGES.Codeforces), eq(contests.judgeId, "100566")))
        .get();
      if (contest === undefined) {
        throw new Error("Expected test contest to be inserted.");
      }
      await database.db.insert(problems).values({
        judgeId: "100566A",
        judge: JUDGES.Codeforces,
        name: "A. Matching Names",
        link: "https://codeforces.com/gym/100566/problem/A",
        contestId: contest.id,
        solves: 1,
        rating: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      const events = await collect(createSyncService(database, { codeforces: judge }).sync({ provider: "codeforces", appUserId }));
      const rows = await database.db.select().from(submissions).all();

      expect(events.at(-1)).toMatchObject({
        type: "completed",
        summary: {
          usersProcessed: 2,
          submissionsInserted: 2,
          errors: 0
        }
      });
      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.judgeId)).toEqual(["49644212", "49644212"]);
      expect(new Set(rows.map((row) => row.userId)).size).toBe(2);
    });
  });

  it("keeps known submission import query count bounded by chunks instead of rows", async () => {
    let queryCount = 0;

    await withDatabase(async (database, appUserId) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      const contestInputs = Array.from({ length: 20 }, (_, index) => ({
        judgeId: String(2000 + index),
        judge: JUDGES.Codeforces,
        name: `Known Contest ${index}`,
        link: `https://codeforces.com/gym/${2000 + index}`,
        participants: 10,
        stars: 2,
        createdAt: timestamp,
        updatedAt: timestamp
      }));
      await database.db.insert(contests).values(contestInputs).run();
      const contestRows = await database.db.select().from(contests).all();
      await database.db.insert(problems).values(contestRows.map((contest, index) => ({
        judgeId: `${contest.judgeId}A`,
        judge: JUDGES.Codeforces,
        name: `A. Known ${index}`,
        link: `${contest.link}/problem/A`,
        contestId: contest.id,
        solves: 1,
        rating: 800,
        createdAt: timestamp,
        updatedAt: timestamp
      }))).run();

      const judge: TestJudge = {
        getContest: (contestId) => Effect.fail(new Error(`Contest ${contestId} should not be fetched.`)),
        getSubmissions: () => Effect.succeed(contestRows.map((contest, index) => ({
          judgeId: `known-${index}`,
          judgeContestId: contest.judgeId,
          judgeProblemId: `${contest.judgeId}A`,
          problemName: `A. Known ${index}`,
          verdict: SUBMISSION_STATUSES.AC,
          submittedAt: new Date(timestamp.getTime() + index * 1000)
        })))
      };

      queryCount = 0;
      const events = await collect(createSyncService(database, { codeforces: judge }).sync({ provider: "codeforces", appUserId }));

      expect(events.at(-1)).toMatchObject({
        type: "completed",
        summary: {
          submissionsInserted: 20,
          errors: 0
        }
      });
      expect(queryCount).toBeLessThanOrEqual(12);
    }, {
      onQuery: () => {
        queryCount += 1;
      }
    });
  });

  it("emits a clear Codeforces unavailable error when the API is down", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      ({
        ok: false,
        status: 503,
        text: async () => JSON.stringify({
          status: "FAILED",
          comment: "Service unavailable."
        })
      }) as Response
    );
    vi.stubGlobal("fetch", fetchMock);

    await withDatabase(async (database, appUserId) => {
      const events = await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));
      const errorEvent = events.find((event) => event.type === "error");

      expect(errorEvent).toMatchObject({
        type: "error",
        provider: "codeforces",
        phase: "submissions",
        step: "submissions",
        message: {
          code: "sync_operation_failed",
          params: { judge: "codeforces" },
          technicalDetail: "Codeforces API is unavailable (HTTP 503): Service unavailable."
        }
      });
      expect(events.at(-1)).toMatchObject({
        type: "completed",
        summary: {
          errors: 1
        }
      });
    });
  });

  it("uses the supplied judge when syncing QOJ submissions", async () => {
    const timestamp = new Date("2025-01-01T00:00:00.000Z");
    const qojJudge: TestJudge = {
      getContests: () => Effect.succeed([]),
      getContest: (contestId) => Effect.succeed({
        judgeId: contestId,
        name: `QOJ Contest ${contestId}`,
        participants: 1,
        problems: [],
        stars: 0
      }),
      getUser: (handle) => Effect.succeed({ handle }),
      getSubmissions: () => Effect.succeed([
        {
          judgeId: "98765",
          judgeContestId: "1113",
          judgeProblemId: "11785",
          problemName: "Archery Tournament",
          verdict: SUBMISSION_STATUSES.AC,
          submittedAt: new Date("2025-02-01T00:00:00.000Z")
        }
      ])
    };

    await withDatabase(async (database, appUserId) => {
      await database.db.insert(users).values({
        username: "qoj-user",
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      await attachTeamUser(database, appUserId, "qoj-user", JUDGES.Qoj);
      await database.db.insert(contests).values({
        judgeId: "1113",
        judge: JUDGES.Qoj,
        name: "QOJ Contest 1113",
        link: "https://qoj.ac/contest/1113",
        participants: 1,
        stars: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const contest = await database.db
        .select()
        .from(contests)
        .where(and(eq(contests.judge, JUDGES.Qoj), eq(contests.judgeId, "1113")))
        .get();
      if (contest === undefined) {
        throw new Error("Expected QOJ contest to be inserted.");
      }
      await database.db.insert(problems).values({
        judgeId: "11785",
        judge: JUDGES.Qoj,
        name: "Archery Tournament",
        link: "https://qoj.ac/contest/1113/problem/11785",
        contestId: contest.id,
        solves: 1,
        rating: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj", appUserId }));

      expect(events.at(-1)).toMatchObject({
        type: "completed",
        provider: "qoj",
        summary: {
          usersProcessed: 1,
          submissionsInserted: 1,
          errors: 0
        }
      });
      await expect(database.db.select().from(submissions).all()).resolves.toEqual([
        expect.objectContaining({
          judgeId: "98765",
          judge: JUDGES.Qoj,
          status: SUBMISSION_STATUSES.AC
        })
      ]);
    }, { saveCredentials: false });
  });

  it("updates an existing QOJ submission when the accepted verdict arrives later", async () => {
    const timestamp = new Date("2025-01-01T00:00:00.000Z");
    const submittedAt = new Date("2025-02-01T00:00:00.000Z");
    const qojJudge: TestJudge = {
      getContests: () => Effect.succeed([]),
      getContest: (contestId) => Effect.succeed({
        judgeId: contestId,
        name: `QOJ Contest ${contestId}`,
        participants: 1,
        problems: [],
        stars: 0
      }),
      getUser: (handle) => Effect.succeed({ handle }),
      getSubmissions: () => Effect.succeed([
        {
          judgeId: "98765",
          judgeContestId: "1113",
          judgeProblemId: "11785",
          problemName: "Archery Tournament",
          verdict: SUBMISSION_STATUSES.AC,
          submittedAt
        }
      ])
    };

    await withDatabase(async (database, appUserId) => {
      await database.db.insert(users).values({
        username: "qoj-user",
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      await attachTeamUser(database, appUserId, "qoj-user", JUDGES.Qoj);
      const user = await database.db
        .select()
        .from(users)
        .where(and(eq(users.judge, JUDGES.Qoj), eq(users.username, "qoj-user")))
        .get();
      await database.db.insert(contests).values({
        judgeId: "1113",
        judge: JUDGES.Qoj,
        name: "QOJ Contest 1113",
        link: "https://qoj.ac/contest/1113",
        participants: 1,
        stars: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const contest = await database.db
        .select()
        .from(contests)
        .where(and(eq(contests.judge, JUDGES.Qoj), eq(contests.judgeId, "1113")))
        .get();
      if (user === undefined || contest === undefined) {
        throw new Error("Expected QOJ user and contest to be inserted.");
      }
      await database.db.insert(problems).values({
        judgeId: "11785",
        judge: JUDGES.Qoj,
        name: "Archery Tournament",
        link: "https://qoj.ac/contest/1113/problem/11785",
        contestId: contest.id,
        solves: 1,
        rating: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const problem = await database.db
        .select()
        .from(problems)
        .where(and(eq(problems.judge, JUDGES.Qoj), eq(problems.judgeId, "11785")))
        .get();
      if (problem === undefined) {
        throw new Error("Expected QOJ problem to be inserted.");
      }
      await database.db.insert(submissions).values({
        judgeId: "98765",
        judge: JUDGES.Qoj,
        problemId: problem.id,
        userId: user.id,
        status: SUBMISSION_STATUSES.WA,
        submittedAt,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj", appUserId }));

      expect(events.at(-1)).toMatchObject({
        type: "completed",
        provider: "qoj",
        summary: {
          submissionsInserted: 0,
          submissionsUpdated: 1,
          submissionsSkipped: 0,
          errors: 0
        }
      });
      await expect(database.db.select().from(submissions).all()).resolves.toEqual([
        expect.objectContaining({
          judgeId: "98765",
          judge: JUDGES.Qoj,
          status: SUBMISSION_STATUSES.AC
        })
      ]);
    }, { saveCredentials: false });
  });

  it("emits a clear error when user submissions fail", async () => {
    const timestamp = new Date("2025-01-01T00:00:00.000Z");
    const qojJudge: TestJudge = {
      getContests: () => Effect.succeed([]),
      getContest: (contestId) => Effect.succeed({
        judgeId: contestId,
        name: `QOJ Contest ${contestId}`,
        participants: 1,
        problems: [],
        stars: 0
      }),
      getUser: (handle) => Effect.succeed({ handle }),
      getSubmissions: () => Effect.fail(new JudgeAPIError({ judgeId: "qoj", cause: "rate limited" }))
    };

    const events = await withDatabase(async (database, appUserId) => {
      await database.db.insert(users).values({
        username: "qoj-user",
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      await attachTeamUser(database, appUserId, "qoj-user", JUDGES.Qoj);

      return await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj", appUserId }));
    }, { saveCredentials: false });

    expect(events).toContainEqual(expect.objectContaining({
      type: "error",
      phase: "submissions",
      step: "submissions",
      userHandle: "qoj-user",
      message: {
        code: "sync_operation_failed",
        params: { judge: "qoj" },
        technicalDetail: "Judge API rejected the request for qoj. rate limited"
      }
    }));
  });

  it("syncs a contest when two missing problems from that contest are seen", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 1,
            contestId: 100566,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 100566, index: "A", name: "Matching Names" },
            verdict: "OK"
          },
          {
            id: 2,
            contestId: 100566,
            creationTimeSeconds: 1450000300,
            problem: { contestId: 100566, index: "B", name: "Replicating Processes" },
            verdict: "TIME_LIMIT_EXCEEDED"
          }
        ]);
      }

      return codeforcesResponse({
        contest: {
          id: 100566,
          name: "Testing Round #100566",
          type: "ICPC",
          phase: "FINISHED",
          difficulty: 2
        },
        problems: [
          { contestId: 100566, index: "A", name: "Matching Names" },
          { contestId: 100566, index: "B", name: "Replicating Processes" }
        ],
        rows: [
          { party: {}, rank: 1, points: 2, penalty: 0, problemResults: [{ points: 1 }, { points: 1 }] }
        ]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await withDatabase(async (database, appUserId) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      const events = await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));

      expect(events).toContainEqual(expect.objectContaining({
        type: JudgeSyncEventType.Step,
        step: JudgeSyncStep.Submissions,
        stepStatus: SyncStepStatus.Running,
        total: 1,
        processed: 0,
        stepsTotal: 1,
        stepsLeft: 1
      }));
      expect(events).toContainEqual(expect.objectContaining({
        type: JudgeSyncEventType.Step,
        step: JudgeSyncStep.Contests,
        stepStatus: SyncStepStatus.Running,
        total: 1,
        processed: 0,
        stepsTotal: 1,
        stepsLeft: 1
      }));
      expect(events).toContainEqual(expect.objectContaining({
        type: JudgeSyncEventType.Step,
        step: JudgeSyncStep.Contests,
        stepStatus: SyncStepStatus.Completed,
        current: "100566",
        total: 1,
        processed: 1
      }));
      const problemRows = await database.db.select().from(problems).all();
      expect(problemRows).toHaveLength(2);
      expect(problemRows).toEqual([
        expect.objectContaining({ judgeId: "100566A", name: "A. Matching Names", solvePercentage: 100, rating: 700 }),
        expect.objectContaining({ judgeId: "100566B", name: "B. Replicating Processes", solvePercentage: 100, rating: 700 })
      ]);
      await expect(database.db.select().from(submissions).all()).resolves.toHaveLength(2);
      await expect(database.db.select().from(contests).get()).resolves.toMatchObject({
        judgeId: "100566"
      });
      await expect(database.db.select().from(userContestStates).all()).resolves.toEqual([
        expect.objectContaining({
          distinctProblemCount: 2,
          simulated: true
        })
      ]);
    });
  });

  it("does not sync a contest when one missing problem from that contest is seen", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 49644212,
            contestId: 100566,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 100566, index: "A", name: "Matching Names" },
            verdict: "OK"
          }
        ]);
      }

      throw new Error("Contest details should not be requested for one missing problem.");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await withDatabase(async (database, appUserId) => {
      const events = await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));
      return {
        events,
        contestRows: await database.db.select().from(contests).all(),
        contestStateRows: await database.db.select().from(userContestStates).all(),
        problemRows: await database.db.select().from(problems).all()
      };
    });

    expect(result.events).not.toContainEqual(expect.objectContaining({
      type: JudgeSyncEventType.Step,
      step: JudgeSyncStep.Contests,
      stepStatus: SyncStepStatus.Completed,
      current: "100566"
    }));
    expect(result.events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        submissionsInserted: 0,
        submissionsSkipped: 1,
        contestsSynced: 0,
        errors: 0
      }
    });
    expect(result.contestRows).toHaveLength(0);
    expect(result.contestStateRows).toHaveLength(0);
    expect(result.problemRows).toHaveLength(0);
  });

  it("does not record Codeforces participation from one accepted submission", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 49644212,
            contestId: 100566,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 100566, index: "A", name: "Matching Names" },
            verdict: "OK"
          },
          {
            id: 49644213,
            contestId: 566,
            creationTimeSeconds: 1450000300,
            problem: { contestId: 566, index: "A", name: "Regular Match" },
            verdict: "WRONG_ANSWER"
          },
          {
            id: 49644214,
            contestId: 568,
            creationTimeSeconds: 1450000600,
            problem: { contestId: 568, index: "A", name: "Skipped Challenge" },
            verdict: "OK"
          }
        ]);
      }

      throw new Error("Contest details should not be requested for one missing problem.");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await withDatabase(async (database, appUserId) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      await database.db.insert(contests).values({
        judgeId: "100566",
        judge: JUDGES.Codeforces,
        name: "Finder Candidate",
        link: "https://codeforces.com/gym/100566",
        participants: null,
        stars: null,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      const events = await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));
      return {
        events,
        contestRows: await database.db.select().from(contests).all(),
        contestStateRows: await database.db.select().from(userContestStates).all(),
        problemRows: await database.db.select().from(problems).all()
      };
    });

    expect(result.events).not.toContainEqual(expect.objectContaining({
      type: JudgeSyncEventType.Step,
      step: JudgeSyncStep.Contests,
      stepStatus: SyncStepStatus.Completed,
      current: "100566"
    }));
    expect(result.contestRows).toEqual([
      expect.objectContaining({
        judgeId: "100566"
      })
    ]);
    expect(result.contestStateRows).toHaveLength(0);
    expect(result.problemRows).toHaveLength(0);
  });

  it("stores Codeforces catalog rows and regular contest problems from Codeforces catalogs", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/contest.list") {
        return codeforcesResponse([
          {
            id: 100566,
            name: "ICPC Training Camp Invitational",
            phase: "FINISHED",
            type: "ICPC"
          },
          {
            id: 566,
            name: "Codeforces Round 566 (Div. 2)",
            phase: "FINISHED",
            type: "CF"
          },
          {
            id: 568,
            name: "Communication Challenge",
            phase: "FINISHED",
            type: "CF"
          }
        ]);
      }

      if (url.pathname === "/api/problemset.problems") {
        return codeforcesResponse({
          problems: [
            {
              contestId: 566,
              index: "A",
              name: "Regular First",
              rating: 1200,
              tags: ["dp", "math"]
            },
            {
              contestId: 566,
              index: "B",
              name: "Regular Second",
              tags: ["greedy"]
            },
            {
              contestId: 568,
              index: "A",
              name: "Skipped Challenge",
              rating: 800,
              tags: ["weird"]
            }
          ],
          problemStatistics: [
            { contestId: 566, index: "A", solvedCount: 100 },
            { contestId: 566, index: "B", solvedCount: 25 },
            { contestId: 568, index: "A", solvedCount: 40 }
          ]
        });
      }

      throw new Error(`Unexpected Codeforces API path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await withDatabase(async (database) => {
      const syncResult = await Effect.runPromise(
        makeCodeforcesJudge(database).syncContestFinderCatalog().pipe(
          Effect.provideService(DatabaseServiceTag, database)
        )
      );

      return {
        syncResult,
        contestRows: await database.db.select().from(contests).all(),
        problemRows: await database.db.select().from(problems).all(),
        tagRows: await database.db.select().from(problemTags).all()
      };
    });

    expect(result.syncResult).toEqual({
      contestsUpserted: 2,
      regularContestsImported: 1,
      regularProblemsImported: 2
    });
    expect(result.contestRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        judgeId: "566",
        name: "Codeforces Round 566 (Div. 2)",
        link: "https://codeforces.com/contest/566"
      }),
      expect.objectContaining({
        judgeId: "100566",
        name: "ICPC Training Camp Invitational"
      })
    ]));
    expect(result.contestRows.map((contest) => contest.judgeId)).not.toContain("568");
    expect(result.problemRows).toEqual([
      expect.objectContaining({
        judgeId: "566A",
        name: "A. Regular First",
        link: "https://codeforces.com/contest/566/problem/A",
        solves: 100,
        rating: 1200
      }),
      expect.objectContaining({
        judgeId: "566B",
        name: "B. Regular Second",
        link: "https://codeforces.com/contest/566/problem/B",
        solves: 25
      })
    ]);
    const problemIdByJudgeId = new Map(result.problemRows.map((problem) => [problem.judgeId, problem.id]));
    expect(result.tagRows).toEqual(expect.arrayContaining([
      { problemId: problemIdByJudgeId.get("566A"), tag: "dp" },
      { problemId: problemIdByJudgeId.get("566A"), tag: "math" },
      { problemId: problemIdByJudgeId.get("566B"), tag: "greedy" }
    ]));
    expect(fetchMock.mock.calls
      .filter((call) => new URL(String(call[0])).pathname === "/api/contest.list")
      .map((call) => new URL(String(call[0])).searchParams.get("gym"))
    ).toEqual(["true", null]);
    expect(fetchMock.mock.calls.filter((call) => new URL(String(call[0])).pathname === "/api/problemset.problems"))
      .toHaveLength(1);
  });

  it("syncs Codeforces friend submissions from the cached Contest Finder catalog", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 49644212,
            contestId: 100566,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 100566, index: "A", name: "Matching Names" },
            verdict: "OK"
          },
          {
            id: 49644215,
            contestId: 100566,
            creationTimeSeconds: 1450000150,
            problem: { contestId: 100566, index: "B", name: "Replicating Processes" },
            verdict: "WRONG_ANSWER"
          },
          {
            id: 49644213,
            contestId: 566,
            creationTimeSeconds: 1450000300,
            problem: { contestId: 566, index: "A", name: "Regular Match" },
            verdict: "WRONG_ANSWER"
          },
          {
            id: 49644214,
            contestId: 568,
            creationTimeSeconds: 1450000600,
            problem: { contestId: 568, index: "A", name: "Skipped Challenge" },
            verdict: "OK"
          }
        ]);
      }

      throw new Error(`Unexpected Codeforces API path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await withDatabase(async (database, appUserId) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      await database.db.insert(contests).values([
        {
          judgeId: "100566",
          judge: JUDGES.Codeforces,
          name: "ICPC Training Camp Invitational",
          link: "https://codeforces.com/gym/100566",
          participants: null,
          stars: null,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "566",
          judge: JUDGES.Codeforces,
          name: "Codeforces Round 566 (Div. 2)",
          link: "https://codeforces.com/contest/566",
          participants: null,
          stars: null,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();
      const regularContest = await database.db
        .select({ id: contests.id })
        .from(contests)
        .where(and(eq(contests.judge, JUDGES.Codeforces), eq(contests.judgeId, "566")))
        .get();
      if (regularContest === undefined) {
        throw new Error("Expected seeded regular contest.");
      }
      await database.db.insert(problems).values({
        judgeId: "566A",
        judge: JUDGES.Codeforces,
        name: "Regular Match",
        link: "https://codeforces.com/contest/566/problem/A",
        contestId: regularContest.id,
        solves: 1200,
        solvePercentage: 50,
        rating: 800,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const [friend] = await database.db.insert(users).values({
        username: "friend",
        judge: JUDGES.Codeforces,
        createdAt: timestamp,
        updatedAt: timestamp
      }).returning().all();

      if (friend === undefined) {
        throw new Error("Expected seeded friend.");
      }

      await Effect.runPromise(
        makeCodeforcesJudge(database).syncFriendSubmissions({ friends: [friend] }).pipe(
          Effect.provideService(DatabaseServiceTag, database),
          Effect.provideService(AppUserIdTag, appUserId)
        )
      );

      return {
        contestRows: await database.db.select().from(contests).all(),
        contestStateRows: await database.db.select().from(userContestStates).all(),
        submissionRows: await database.db.select().from(submissions).all()
      };
    });

    expect(result.contestRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        judgeId: "566",
        name: "Codeforces Round 566 (Div. 2)"
      }),
      expect.objectContaining({
        judgeId: "100566",
        name: "ICPC Training Camp Invitational"
      })
    ]));
    expect(result.contestRows.map((contest) => contest.judgeId)).not.toContain("568");
    const contestIdByJudgeId = new Map(result.contestRows.map((contest) => [contest.judgeId, contest.id]));
    expect(result.contestStateRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        contestId: contestIdByJudgeId.get("100566"),
        submissionCount: 2,
        acceptedCount: 1,
        distinctProblemCount: 2,
        simulated: true
      }),
      expect.objectContaining({
        contestId: contestIdByJudgeId.get("566"),
        submissionCount: 1,
        acceptedCount: 0,
        distinctProblemCount: 1,
        simulated: false
      })
    ]));
    expect(result.contestStateRows).toHaveLength(2);
    expect(result.submissionRows).toEqual([
      expect.objectContaining({
        judgeId: "49644213",
        status: SUBMISSION_STATUSES.WA
      })
    ]);
    expect(fetchMock.mock.calls
      .filter((call) => new URL(String(call[0])).pathname === "/api/contest.list")
      .map((call) => new URL(String(call[0])).searchParams.get("gym"))
    ).toEqual([]);
  });

  it("does not sync a contest when submissions only cover one unique missing problem", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 49644212,
            contestId: 100566,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 100566, index: "A", name: "Matching Names" },
            verdict: "OK"
          },
          {
            id: 49644213,
            contestId: 100566,
            creationTimeSeconds: 1450000300,
            problem: { contestId: 100566, index: "A", name: "Matching Names" },
            verdict: "WRONG_ANSWER"
          }
        ]);
      }

      throw new Error("Contest details should not be requested for duplicate missing problems.");
    });
    vi.stubGlobal("fetch", fetchMock);

    const events = await withDatabase(async (database, appUserId) => {
      return await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));
    });

    expect(events).not.toContainEqual(expect.objectContaining({
      type: JudgeSyncEventType.Step,
      step: JudgeSyncStep.Contests,
      stepStatus: SyncStepStatus.Completed,
      current: "100566"
    }));
    expect(events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        submissionsInserted: 0,
        submissionsSkipped: 2,
        contestsSynced: 0,
        errors: 0
      }
    });
  });

  it("syncs a contest when two unique missing problems from that contest are seen", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 49644212,
            contestId: 100566,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 100566, index: "A", name: "Matching Names" },
            verdict: "OK"
          },
          {
            id: 49644213,
            contestId: 100566,
            creationTimeSeconds: 1450000300,
            problem: { contestId: 100566, index: "B", name: "Replicating Processes" },
            verdict: "WRONG_ANSWER"
          }
        ]);
      }

      return codeforcesResponse({
        contest: {
          id: 100566,
          name: "Testing Round #100566",
          type: "ICPC",
          phase: "FINISHED",
          difficulty: 2
        },
        problems: [
          { contestId: 100566, index: "A", name: "Matching Names" },
          { contestId: 100566, index: "B", name: "Replicating Processes" }
        ],
        rows: [
          { party: {}, rank: 1, points: 2, penalty: 0, problemResults: [{ points: 1 }, { points: 1 }] }
        ]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await withDatabase(async (database, appUserId) => {
      const events = await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));
      return {
        events,
        contestRows: await database.db.select().from(contests).all(),
        contestStateRows: await database.db.select().from(userContestStates).all()
      };
    });

    expect(result.events).toContainEqual(expect.objectContaining({
      type: JudgeSyncEventType.Step,
      step: JudgeSyncStep.Contests,
      stepStatus: SyncStepStatus.Completed,
      current: "100566",
      total: 1,
      processed: 1
    }));
    expect(result.events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        submissionsInserted: 2,
        submissionsSkipped: 0,
        contestsSynced: 1,
        errors: 0
      }
    });
    expect(result.contestStateRows).toEqual([
      expect.objectContaining({
        contestId: result.contestRows[0]?.id,
        submissionCount: 2,
        acceptedCount: 1
      })
    ]);
  });

  it("uses the Codeforces three-star fallback when contest stars are unknown", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 49644212,
            contestId: 100566,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 100566, index: "A", name: "Matching Names" },
            verdict: "OK"
          },
          {
            id: 49644213,
            contestId: 100566,
            creationTimeSeconds: 1450000300,
            problem: { contestId: 100566, index: "B", name: "Replicating Processes" },
            verdict: "WRONG_ANSWER"
          }
        ]);
      }

      return codeforcesResponse({
        contest: {
          id: 100566,
          name: "Testing Round #100566",
          type: "ICPC",
          phase: "FINISHED"
        },
        problems: [
          { contestId: 100566, index: "A", name: "Matching Names" },
          { contestId: 100566, index: "B", name: "Replicating Processes" }
        ],
        rows: [
          { party: {}, rank: 1, points: 2, penalty: 0, problemResults: [{ points: 1 }, { points: 1 }] }
        ]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await withDatabase(async (database, appUserId) => {
      await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));

      await expect(database.db
        .select({ solvePercentage: problems.solvePercentage, rating: problems.rating })
        .from(problems)
        .all()).resolves.toEqual([
        { solvePercentage: 100, rating: 1100 },
        { solvePercentage: 100, rating: 1100 }
      ]);
    });
  });

  it("syncs regular Codeforces submissions from the daily catalog without catalog requests", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 49644212,
            contestId: 566,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 566, index: "A", name: "Regular First" },
            verdict: "OK"
          },
          {
            id: 49644213,
            contestId: 566,
            creationTimeSeconds: 1450000300,
            problem: { contestId: 566, index: "B", name: "Regular Second" },
            verdict: "WRONG_ANSWER"
          }
        ]);
      }

      throw new Error(`Unexpected Codeforces API path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await withDatabase(async (database, appUserId) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      await database.db.insert(contests).values({
        judgeId: "566",
        judge: JUDGES.Codeforces,
        name: "Codeforces Round 566 (Div. 2)",
        link: "https://codeforces.com/contest/566",
        participants: null,
        stars: 4,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const contest = await database.db.select().from(contests).get();
      if (contest === undefined) {
        throw new Error("Expected seeded contest.");
      }
      await database.db.insert(problems).values([
        {
          judgeId: "566A",
          judge: JUDGES.Codeforces,
          name: "A. Regular First",
          link: "https://codeforces.com/contest/566/problem/A",
          contestId: contest.id,
          solves: 100,
          solvePercentage: 100,
          rating: 1200,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          judgeId: "566B",
          judge: JUDGES.Codeforces,
          name: "B. Regular Second",
          link: "https://codeforces.com/contest/566/problem/B",
          contestId: contest.id,
          solves: 25,
          solvePercentage: 25,
          rating: 1100,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]).run();

      const events = await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));

      const contestRows = await database.db.select().from(contests).all();
      const problemRows = await database.db.select().from(problems).all();
      const submissionRows = await database.db.select().from(submissions).all();

      expect(events).not.toContainEqual(expect.objectContaining({
        type: JudgeSyncEventType.Step,
        step: JudgeSyncStep.RegularCatalog
      }));
      expect(events.at(-1)).toMatchObject({
        type: "completed",
        summary: {
          submissionsInserted: 2,
          submissionsSkipped: 0,
          contestsSynced: 0,
          regularContestsImported: 0,
          regularProblemsImported: 0,
          regularPendingSubmissionsRetried: 0,
          errors: 0
        }
      });
      expect(contestRows).toEqual([
        expect.objectContaining({
          judgeId: "566",
          name: "Codeforces Round 566 (Div. 2)",
          link: "https://codeforces.com/contest/566",
          stars: 4,
          participants: null
        })
      ]);
      await expect(database.db.select().from(userContestStates).all()).resolves.toEqual([
        expect.objectContaining({
          distinctProblemCount: 2,
          simulated: true
        })
      ]);
      expect(problemRows).toEqual([
        expect.objectContaining({
          judgeId: "566A",
          name: "A. Regular First",
          solves: 100,
          solvePercentage: 100,
          rating: 1200
        }),
        expect.objectContaining({
          judgeId: "566B",
          name: "B. Regular Second",
          solves: 25,
          solvePercentage: 25,
          rating: 1100
        })
      ]);
      expect(submissionRows).toHaveLength(2);
      expect(fetchMock.mock.calls.map((call) => new URL(String(call[0])).pathname)).toEqual([
        "/api/user.status"
      ]);
    });
  });

  it("does not request regular Codeforces catalogs for missing regular submissions", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 49644212,
            contestId: 999,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 999, index: "A", name: "Missing Regular" },
            verdict: "OK"
          },
          {
            id: 49644213,
            contestId: 999,
            creationTimeSeconds: 1450000300,
            problem: { contestId: 999, index: "B", name: "Missing Regular Second" },
            verdict: "WRONG_ANSWER"
          }
        ]);
      }

      throw new Error(`Unexpected Codeforces API path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await withDatabase(async (database, appUserId) => {
      const events = await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }));
      return {
        events,
        submissions: await database.db.select().from(submissions).all(),
        contests: await database.db.select().from(contests).all(),
        problems: await database.db.select().from(problems).all()
      };
    });

    expect(result.events).not.toContainEqual(expect.objectContaining({
      type: JudgeSyncEventType.Step,
      step: JudgeSyncStep.RegularCatalog
    }));
    expect(result.events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        submissionsInserted: 0,
        submissionsSkipped: 2,
        regularPendingSubmissionsRetried: 0,
        errors: 0
      }
    });
    expect(result.submissions).toHaveLength(0);
    expect(result.contests).toHaveLength(0);
    expect(result.problems).toHaveLength(0);
    expect(fetchMock.mock.calls.map((call) => new URL(String(call[0])).pathname)).toEqual([
      "/api/user.status"
    ]);
  });

  it("does not retry unsimulated contests unless current user submissions need them", async () => {
    const timestamp = new Date("2025-01-01T00:00:00.000Z");
    const getContest = vi.fn((contestId: string) => Effect.succeed({
      judgeId: contestId,
      name: `QOJ Contest ${contestId}`,
      participants: 1,
      problems: [],
      stars: 0
    }));
    const qojJudge: TestJudge = {
      getContests: () => Effect.succeed([]),
      getContest,
      getUser: (handle) => Effect.succeed({ handle }),
      getSubmissions: () => Effect.succeed([])
    };

    await withDatabase(async (database, appUserId) => {
      await database.db.insert(users).values({
        username: "qoj-user",
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      await attachTeamUser(database, appUserId, "qoj-user", JUDGES.Qoj);
      await database.db.insert(contests).values({
        judgeId: "stale",
        judge: JUDGES.Qoj,
        name: "Stale contest",
        link: "https://qoj.ac/contest/stale",
        participants: 0,
        stars: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj", appUserId }));

      expect(getContest).not.toHaveBeenCalled();
      expect(events).toContainEqual(expectStepEvent(JudgeSyncStep.Contests, {
        stepStatus: SyncStepStatus.Completed,
        total: 0,
        processed: 0
      }));
    }, { saveCredentials: false });
  });

  it("syncs eligible QOJ profile contests before importing profile submissions", async () => {
    await withDatabase(async (database, appUserId) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      await database.db.insert(users).values({
        username: "qoj-user",
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      await attachTeamUser(database, appUserId, "qoj-user", JUDGES.Qoj);

      const qojJudge: TestJudge = {
        getContests: () => Effect.succeed([
          { judgeId: "111", name: "QOJ Contest 111" },
          { judgeId: "222", name: "QOJ Contest 222" }
        ]),
        getContest: (contestId) => {
          return Effect.succeed({
            judgeId: contestId,
            name: `QOJ Contest ${contestId}`,
            participants: 1,
            problems: contestId === "111"
              ? [
                  {
                    judgeId: "111-A",
                    name: "A. First",
                    link: "https://qoj.ac/contest/111/problem/A",
                    solves: 1
                  },
                  {
                    judgeId: "111-B",
                    name: "B. Second",
                    link: "https://qoj.ac/contest/111/problem/B",
                    solves: 1
                  }
                ]
              : [
                  {
                    judgeId: `${contestId}-A`,
                    name: "A. Test",
                    link: `https://qoj.ac/contest/${contestId}/problem/A`,
                    solves: 1
                  }
                ],
            stars: 0
          });
        },
        getUser: (handle) => Effect.succeed({ handle }),
        getSubmissions: () => Effect.succeed([
          {
            judgeId: "first",
            judgeProblemId: "111-A",
            problemName: "A. First",
            verdict: SUBMISSION_STATUSES.AC,
            submittedAt: new Date("2025-02-01T00:00:00.000Z")
          },
          {
            judgeId: "second",
            judgeProblemId: "111-B",
            problemName: "B. Second",
            verdict: SUBMISSION_STATUSES.AC,
            submittedAt: new Date("2025-02-01T00:10:00.000Z")
          },
          {
            judgeId: "third",
            judgeProblemId: "222-A",
            problemName: "A. Third",
            verdict: SUBMISSION_STATUSES.AC,
            submittedAt: new Date("2025-02-01T00:20:00.000Z")
          }
        ])
      };

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj", appUserId }));

      expect(events).not.toContainEqual(expect.objectContaining({
        type: JudgeSyncEventType.Error,
        contestJudgeId: "222"
      }));
      expect(events).toContainEqual(expectStepEvent(JudgeSyncStep.Contests, {
        current: "222",
        stepStatus: SyncStepStatus.Completed
      }));
      expect(events.slice(0, 3)).toEqual([
        expect.objectContaining({ type: JudgeSyncEventType.Started, provider: "qoj" }),
        expect.objectContaining({
          type: JudgeSyncEventType.Step,
          provider: "qoj",
          step: JudgeSyncStep.Submissions,
          total: 1,
          processed: 0
        }),
        expect.objectContaining({
          type: JudgeSyncEventType.Step,
          provider: "qoj",
          step: JudgeSyncStep.Submissions,
          current: "qoj-user"
        })
      ]);
      const importSubmissionsIndex = events.findLastIndex(
        (event) => isStepEvent(event, JudgeSyncStep.Submissions, { processed: 0 })
      );
      expect(events.findIndex((event) => isStepEvent(event, JudgeSyncStep.Contests, {
        current: "111",
        stepStatus: SyncStepStatus.Completed
      })))
        .toBeLessThan(importSubmissionsIndex);
      await expect(database.db.select().from(submissions).all()).resolves.toHaveLength(3);
      await expect(database.db.select().from(userContestStates).all()).resolves.toEqual([
        expect.objectContaining({
          submissionCount: 2,
          acceptedCount: 2,
          distinctProblemCount: 2,
          simulated: true
        }),
        expect.objectContaining({
          submissionCount: 1,
          acceptedCount: 1,
          distinctProblemCount: 1,
          simulated: false
        })
      ]);
    }, { saveCredentials: false });
  });

  it("syncs a QOJ profile contest with only one unique submitted problem", async () => {
    await withDatabase(async (database, appUserId) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      await database.db.insert(users).values({
        username: "qoj-user",
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      await attachTeamUser(database, appUserId, "qoj-user", JUDGES.Qoj);

      const qojJudge: TestJudge = {
        getContests: () => Effect.succeed([
          { judgeId: "111", name: "QOJ Contest 111" }
        ]),
        getContest: (contestId) => Effect.succeed({
          judgeId: contestId,
          name: `QOJ Contest ${contestId}`,
          participants: 1,
          problems: [
            {
              judgeId: "111-A",
              name: "A. First",
              link: "https://qoj.ac/contest/111/problem/A",
              solves: 1
            },
            {
              judgeId: "111-B",
              name: "B. Second",
              link: "https://qoj.ac/contest/111/problem/B",
              solves: 1
            }
          ],
          stars: 0
        }),
        getUser: (handle) => Effect.succeed({ handle }),
        getSubmissions: () => Effect.succeed([
          {
            judgeId: "first",
            judgeProblemId: "111-A",
            problemName: "A. First",
            verdict: SUBMISSION_STATUSES.AC,
            submittedAt: new Date("2025-02-01T00:00:00.000Z")
          },
          {
            judgeId: "second",
            judgeProblemId: "111-A",
            problemName: "A. First",
            verdict: SUBMISSION_STATUSES.WA,
            submittedAt: new Date("2025-02-01T00:10:00.000Z")
          }
        ])
      };

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj", appUserId }));

      expect(events).toContainEqual(expectStepEvent(JudgeSyncStep.Contests, {
        current: "111",
        stepStatus: SyncStepStatus.Completed
      }));
      await expect(database.db.select().from(contests).all()).resolves.toEqual([
        expect.objectContaining({
          judgeId: "111",
          judge: JUDGES.Qoj
        })
      ]);
      await expect(database.db.select().from(userContestStates).all()).resolves.toEqual([
        expect.objectContaining({
          distinctProblemCount: 1,
          simulated: false
        })
      ]);
      await expect(database.db.select().from(submissions).all()).resolves.toHaveLength(2);
      expect(events.at(-1)).toMatchObject({
        type: "completed",
        summary: {
          contestsSynced: 1,
          submissionsInserted: 2,
          errors: 0
        }
      });
    }, { saveCredentials: false });
  });

  it("skips already simulated QOJ profile contests on later syncs", async () => {
    await withDatabase(async (database, appUserId) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      await database.db.insert(users).values({
        username: "qoj-user",
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      await attachTeamUser(database, appUserId, "qoj-user", JUDGES.Qoj);

      const getContest = vi.fn((contestId: string) => Effect.succeed({
        judgeId: contestId,
        name: `QOJ Contest ${contestId}`,
        participants: 1,
        problems: [
          {
            judgeId: "111-A",
            name: "A. First",
            link: "https://qoj.ac/contest/111/problem/A",
            solves: 1
          },
          {
            judgeId: "111-B",
            name: "B. Second",
            link: "https://qoj.ac/contest/111/problem/B",
            solves: 1
          }
        ],
        stars: 0
      }));
      const qojJudge: TestJudge = {
        getContests: () => Effect.succeed([
          { judgeId: "111", name: "QOJ Contest 111" }
        ]),
        getContest,
        getUser: (handle) => Effect.succeed({ handle }),
        getSubmissions: () => Effect.succeed([
          {
            judgeId: "first",
            judgeProblemId: "111-A",
            problemName: "A. First",
            verdict: SUBMISSION_STATUSES.AC,
            submittedAt: new Date("2025-02-01T00:00:00.000Z")
          },
          {
            judgeId: "second",
            judgeProblemId: "111-B",
            problemName: "B. Second",
            verdict: SUBMISSION_STATUSES.WA,
            submittedAt: new Date("2025-02-01T00:10:00.000Z")
          }
        ])
      };

      await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj", appUserId }));
      const secondEvents = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj", appUserId }));

      expect(getContest).toHaveBeenCalledTimes(1);
      expect(secondEvents).toContainEqual(expectStepEvent(JudgeSyncStep.Contests, {
        stepStatus: SyncStepStatus.Completed,
        total: 0,
        processed: 0
      }));
      expect(secondEvents).not.toContainEqual(expect.objectContaining({
        type: JudgeSyncEventType.Step,
        step: JudgeSyncStep.Contests,
        current: "111"
      }));
      await expect(database.db.select().from(contests).all()).resolves.toEqual([
        expect.objectContaining({
          judgeId: "111",
          judge: JUDGES.Qoj
        })
      ]);
      await expect(database.db.select().from(userContestStates).all()).resolves.toEqual([
        expect.objectContaining({
          distinctProblemCount: 2,
          simulated: true
        })
      ]);
    }, { saveCredentials: false });
  });

  it("does not sync QOJ profile contests that are already simulated", async () => {
    await withDatabase(async (database, appUserId) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      await database.db.insert(users).values({
        username: "qoj-user",
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      await attachTeamUser(database, appUserId, "qoj-user", JUDGES.Qoj);
      await database.db.insert(contests).values({
        judgeId: "111",
        judge: JUDGES.Qoj,
        name: "QOJ Contest 111",
        link: "https://qoj.ac/contest/111",
        participants: 1,
        stars: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const seededUser = await database.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, "qoj-user"), eq(users.judge, JUDGES.Qoj)))
        .get();
      const seededContest = await database.db
        .select({ id: contests.id })
        .from(contests)
        .where(and(eq(contests.judgeId, "111"), eq(contests.judge, JUDGES.Qoj)))
        .get();
      if (seededUser === undefined || seededContest === undefined) {
        throw new Error("Expected seeded QOJ user and contest.");
      }
      await database.db.insert(userContestStates).values({
        userId: seededUser.id,
        contestId: seededContest.id,
        submissionCount: 2,
        acceptedCount: 1,
        distinctProblemCount: 2,
        simulated: true,
        lastSubmissionAt: timestamp,
        updatedAt: timestamp
      }).run();

      const getContest = vi.fn((contestId: string) => Effect.succeed({
        judgeId: contestId,
        name: `QOJ Contest ${contestId}`,
        participants: 1,
        problems: [],
        stars: 0
      }));
      const qojJudge: TestJudge = {
        getContests: () => Effect.succeed([
          { judgeId: "111", name: "QOJ Contest 111" },
          { judgeId: "222", name: "QOJ Contest 222" }
        ]),
        getContest,
        getUser: (handle) => Effect.succeed({ handle }),
        getSubmissions: () => Effect.succeed([])
      };

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj", appUserId }));

      expect(getContest).toHaveBeenCalledTimes(1);
      expect(getContest).toHaveBeenCalledWith("222");
      expect(events).not.toContainEqual(expect.objectContaining({
        type: JudgeSyncEventType.Step,
        step: JudgeSyncStep.Contests,
        current: "111"
      }));
      expect(events).toContainEqual(expectStepEvent(JudgeSyncStep.Contests, {
        stepStatus: SyncStepStatus.Running,
        total: 1,
        processed: 0
      }));
    }, { saveCredentials: false });
  });

  it("emits an error when a simulated contest does not include the pending problem", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 49644212,
            contestId: 100566,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 100566, index: "A", name: "Matching Names" },
            verdict: "OK"
          },
          {
            id: 49644213,
            contestId: 100566,
            creationTimeSeconds: 1450000300,
            problem: { contestId: 100566, index: "C", name: "Third Problem" },
            verdict: "WRONG_ANSWER"
          }
        ]);
      }

      return codeforcesResponse({
        contest: {
          id: 100566,
          name: "Testing Round #100566",
          type: "ICPC",
          phase: "FINISHED",
          difficulty: 2
        },
        problems: [
          { contestId: 100566, index: "B", name: "Replicating Processes" }
        ],
        rows: [
          { party: {}, rank: 1, points: 1, penalty: 0, problemResults: [{ points: 1 }] }
        ]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const events = await withDatabase(async (database, appUserId) =>
      await collect(createSyncService(database).sync({ provider: "codeforces", appUserId }))
    );

    expect(events).toContainEqual(expect.objectContaining({
      type: "error",
      phase: "database",
      message: {
        code: "sync_operation_failed",
        params: { judge: "codeforces" },
        technicalDetail: "Problem 100566A from contest 100566 was not found after contest sync."
      }
    }));
    expect(events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        errors: 2
      }
    });
  });

  it("does not retry pending submissions for contests that failed to sync", async () => {
    const timestamp = new Date("2025-01-01T00:00:00.000Z");
    const qojJudge: TestJudge = {
      getContests: () => Effect.succeed([{ judgeId: "333", name: "QOJ Contest 333" }]),
      getContest: (contestId) => Effect.fail(new JudgeAPIError({
        judgeId: contestId,
        cause: "contest request failed"
      })),
      getUser: (handle) => Effect.succeed({ handle }),
      getSubmissions: () => Effect.succeed([
        {
          judgeId: "failed-contest-submission",
          judgeProblemId: "333-A",
          problemName: "A. Missing",
          verdict: SUBMISSION_STATUSES.AC,
          submittedAt: new Date("2025-02-01T00:00:00.000Z")
        }
      ])
    };

    const events = await withDatabase(async (database, appUserId) => {
      await database.db.insert(users).values({
        username: "qoj-user",
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      await attachTeamUser(database, appUserId, "qoj-user", JUDGES.Qoj);

      return await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj", appUserId }));
    }, { saveCredentials: false });

    expect(events.filter((event) => event.type === "error")).toHaveLength(1);
    expect(events).toContainEqual(expect.objectContaining({
      type: "error",
      phase: "contests",
      contestJudgeId: "333"
    }));
    expect(events).not.toContainEqual(expect.objectContaining({
      type: "error",
      phase: "database",
      judgeId: "failed-contest-submission"
    }));
    expect(events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        submissionsSkipped: 1,
        submissionsInserted: 0,
        errors: 1
      }
    });
  });
});
