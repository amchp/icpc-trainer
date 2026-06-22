import { appRouter, type JudgeSyncEvent } from "@icpc-trainer/api";
import { type DatabaseService, DatabaseLive, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeCodeforcesJudge } from "../judges/codeforces.js";
import { JudgeAPIError, type Judge } from "../judges/judges.js";
import { createCodeforcesJudgeSync } from "../judges/sync/sync_codeforces.js";
import { createQojJudgeSync } from "../judges/sync/sync_qoj.js";
import { createJudgeSyncService } from "../judges/sync/sync.js";

const { contests, problems, submissions, users } = schema;

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

const nextTick = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const withDatabase = async <A>(
  run: (database: DatabaseService) => Promise<A>,
  options: { readonly saveCredentials?: boolean } = {}
): Promise<A> => {
  process.env.ICPC_TRAINER_CREDENTIAL_KEY = Buffer.alloc(32, 7).toString("base64");

  const program = Effect.gen(function* () {
    const database = yield* DatabaseServiceTag;
    yield* database.migrate;
    if (options.saveCredentials !== false) {
      const caller = appRouter.createCaller({
        database,
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

    return yield* Effect.promise(() => run(database));
  });

  return await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive({ filename: ":memory:" }))));
};

const codeforcesResponse = (result: unknown): Response =>
  jsonResponse({ status: "OK", result });

type TestJudge = Omit<Judge, "sync">;

const withTestSync = (
  database: DatabaseService,
  provider: "codeforces" | "qoj",
  judge: TestJudge | Judge
): Judge => {
  if ("sync" in judge) {
    return judge;
  }

  let syncedJudge: Judge;
  syncedJudge = {
    ...judge,
    sync: (input) => provider === "codeforces"
      ? createCodeforcesJudgeSync(database, input, syncedJudge)
      : createQojJudgeSync(database, input, syncedJudge)
  };

  return syncedJudge;
};

const createSyncService = (
  database: DatabaseService,
  registry: Partial<Record<"codeforces" | "qoj", TestJudge | Judge>> = {}
) => createJudgeSyncService({
  codeforces: makeCodeforcesJudge(database),
  ...Object.fromEntries(
    Object.entries(registry).map(([provider, judge]) => [
      provider,
      withTestSync(database, provider as "codeforces" | "qoj", judge)
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

  it("completes without Codeforces calls when there are no primary or friend users", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const events = await withDatabase(
      (database) => collect(createSyncService(database).sync({ provider: "codeforces" })),
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

  it("keeps one active sync per provider and replays active events to late observers", async () => {
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
      validateAuthentication: () => Effect.void,
      getContests: () => Effect.succeed([]),
      getContest: (contestId) => Effect.succeed({
        judgeId: contestId,
        name: `Contest ${contestId}`,
        participants: 0,
        problems: [],
        stars: 0
      }),
      getUser: (handle) => Effect.succeed({ handle }),
      getSubmissions: () => Effect.succeed([])
    };

    const service = createJudgeSyncService({ codeforces: judge });
    await service.start({ provider: "codeforces" });
    await service.start({ provider: "codeforces" });
    await nextTick();

    const observer = service.observe({ provider: "codeforces" })[Symbol.asyncIterator]();
    const snapshot = await observer.next();

    expect(runCount).toBe(1);
    expect(snapshot.value).toMatchObject({
      type: "snapshot",
      provider: "codeforces",
      running: true,
      events: [started]
    });

    finish?.();
    const finalEvent = await observer.next();
    expect(finalEvent.value).toEqual(completed);
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

    await withDatabase(async (database) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      const user = database.db.select().from(users).where(eq(users.username, "tourist")).get();
      database.db.insert(contests).values({
        judgeId: "100566",
        judge: JUDGES.Codeforces,
        name: "Testing Round #100566",
        link: "https://codeforces.com/gym/100566",
        participants: 1,
        stars: 0,
        synced: true,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const contest = database.db
        .select()
        .from(contests)
        .where(and(eq(contests.judge, JUDGES.Codeforces), eq(contests.judgeId, "100566")))
        .get();
      if (user === undefined || contest === undefined) {
        throw new Error("Expected test user and contest to be inserted.");
      }
      database.db.insert(problems).values({
        judgeId: "100566A",
        judge: JUDGES.Codeforces,
        link: "https://codeforces.com/gym/100566/problem/A",
        contestId: contest.id,
        solves: 1,
        rating: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      await collect(createSyncService(database).sync({ provider: "codeforces" }));
      const secondEvents = await collect(createSyncService(database).sync({ provider: "codeforces" }));

      const rows = database.db.select().from(submissions).all();
      expect(user.username).toBe("tourist");
      expect(rows).toHaveLength(1);
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

    await withDatabase(async (database) => {
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Primary,
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      database.db.insert(contests).values({
        judgeId: "1113",
        judge: JUDGES.Qoj,
        name: "QOJ Contest 1113",
        link: "https://qoj.ac/contest/1113",
        participants: 1,
        stars: 0,
        synced: true,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const contest = database.db
        .select()
        .from(contests)
        .where(and(eq(contests.judge, JUDGES.Qoj), eq(contests.judgeId, "1113")))
        .get();
      if (contest === undefined) {
        throw new Error("Expected QOJ contest to be inserted.");
      }
      database.db.insert(problems).values({
        judgeId: "11785",
        judge: JUDGES.Qoj,
        link: "https://qoj.ac/contest/1113/problem/11785",
        contestId: contest.id,
        solves: 1,
        rating: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));

      expect(events.at(-1)).toMatchObject({
        type: "completed",
        provider: "qoj",
        summary: {
          usersProcessed: 1,
          submissionsInserted: 1,
          errors: 0
        }
      });
      expect(database.db.select().from(submissions).all()).toEqual([
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

    await withDatabase(async (database) => {
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Primary,
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const user = database.db
        .select()
        .from(users)
        .where(and(eq(users.judge, JUDGES.Qoj), eq(users.username, "qoj-user")))
        .get();
      database.db.insert(contests).values({
        judgeId: "1113",
        judge: JUDGES.Qoj,
        name: "QOJ Contest 1113",
        link: "https://qoj.ac/contest/1113",
        participants: 1,
        stars: 0,
        synced: true,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const contest = database.db
        .select()
        .from(contests)
        .where(and(eq(contests.judge, JUDGES.Qoj), eq(contests.judgeId, "1113")))
        .get();
      if (user === undefined || contest === undefined) {
        throw new Error("Expected QOJ user and contest to be inserted.");
      }
      database.db.insert(problems).values({
        judgeId: "11785",
        judge: JUDGES.Qoj,
        link: "https://qoj.ac/contest/1113/problem/11785",
        contestId: contest.id,
        solves: 1,
        rating: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const problem = database.db
        .select()
        .from(problems)
        .where(and(eq(problems.judge, JUDGES.Qoj), eq(problems.judgeId, "11785")))
        .get();
      if (problem === undefined) {
        throw new Error("Expected QOJ problem to be inserted.");
      }
      database.db.insert(submissions).values({
        judgeId: "98765",
        judge: JUDGES.Qoj,
        problemId: problem.id,
        userId: user.id,
        status: SUBMISSION_STATUSES.WA,
        submittedAt,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));

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
      expect(database.db.select().from(submissions).all()).toEqual([
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

    const events = await withDatabase(async (database) => {
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Primary,
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      return await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));
    }, { saveCredentials: false });

    expect(events).toContainEqual(expect.objectContaining({
      type: "error",
      phase: "submissions",
      step: "submissions",
      userHandle: "qoj-user",
      message: "Could not sync qoj submissions for user qoj-user: Judge API rejected the request for qoj. rate limited"
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

    await withDatabase(async (database) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      const events = await collect(createSyncService(database).sync({ provider: "codeforces" }));

      expect(events).toContainEqual(expect.objectContaining({
        type: "submissions.syncing",
        step: "submissions",
        stepsTotal: 1,
        stepsLeft: 1
      }));
      expect(events).toContainEqual(expect.objectContaining({
        type: "contests.syncing",
        step: "contests",
        stepsTotal: 1,
        stepsLeft: 1
      }));
      expect(events).toContainEqual(expect.objectContaining({
        type: "contests.contestSynced",
        step: "contests",
        contestJudgeId: "100566",
        problemsSynced: 2
      }));
      expect(database.db.select().from(problems).all()).toHaveLength(2);
      expect(database.db.select().from(submissions).all()).toHaveLength(2);
      expect(database.db.select().from(contests).get()).toMatchObject({
        judgeId: "100566",
        synced: true
      });
    });
  });

  it("syncs a contest when one missing problem from that contest is seen", async () => {
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

      return codeforcesResponse({
        contest: {
          id: 100566,
          name: "Testing Round #100566",
          type: "ICPC",
          phase: "FINISHED",
          difficulty: 2
        },
        problems: [
          { contestId: 100566, index: "A", name: "Matching Names" }
        ],
        rows: [
          { party: {}, rank: 1, points: 1, penalty: 0, problemResults: [{ points: 1 }] }
        ]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const events = await withDatabase(async (database) => {
      return await collect(createSyncService(database).sync({ provider: "codeforces" }));
    });

    expect(events).toContainEqual(expect.objectContaining({
      type: "contests.contestSynced",
      contestJudgeId: "100566",
      problemsSynced: 1
    }));
    expect(events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        submissionsInserted: 1,
        submissionsSkipped: 0,
        contestsSynced: 1,
        errors: 0
      }
    });
  });

  it("does not retry unsynced contests unless current user submissions need them", async () => {
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

    await withDatabase(async (database) => {
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Primary,
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      database.db.insert(contests).values({
        judgeId: "stale",
        judge: JUDGES.Qoj,
        name: "Stale contest",
        link: "https://qoj.ac/contest/stale",
        participants: 0,
        stars: 0,
        synced: false,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));

      expect(getContest).not.toHaveBeenCalled();
      expect(events).toContainEqual(expect.objectContaining({
        type: "contests.syncing",
        contestsTotal: 0
      }));
    }, { saveCredentials: false });
  });

  it("syncs QOJ profile contests before importing profile submissions", async () => {
    await withDatabase(async (database) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Primary,
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

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
            problems: [
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
            judgeProblemId: "222-A",
            problemName: "A. Second",
            verdict: SUBMISSION_STATUSES.AC,
            submittedAt: new Date("2025-02-01T00:10:00.000Z")
          }
        ])
      };

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));

      expect(events).not.toContainEqual(expect.objectContaining({
        type: "error",
        contestJudgeId: "222"
      }));
      expect(events.findIndex((event) => event.type === "contests.contestSynced" && event.contestJudgeId === "111"))
        .toBeLessThan(events.findIndex((event) => event.type === "submissions.syncing"));
      expect(database.db.select().from(submissions).all()).toHaveLength(2);
    }, { saveCredentials: false });
  });

  it("does not resync QOJ profile contests that are already synced", async () => {
    await withDatabase(async (database) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Primary,
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      database.db.insert(contests).values({
        judgeId: "111",
        judge: JUDGES.Qoj,
        name: "QOJ Contest 111",
        link: "https://qoj.ac/contest/111",
        participants: 1,
        stars: 0,
        synced: true,
        createdAt: timestamp,
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

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));

      expect(getContest).toHaveBeenCalledTimes(1);
      expect(getContest).toHaveBeenCalledWith("222");
      expect(events).not.toContainEqual(expect.objectContaining({
        type: "contests.contestSyncing",
        contestJudgeId: "111"
      }));
      expect(events).toContainEqual(expect.objectContaining({
        type: "contests.syncing",
        contestsTotal: 1
      }));
    }, { saveCredentials: false });
  });

  it("emits an error when a synced contest does not include the pending problem", async () => {
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

    const events = await withDatabase(async (database) =>
      await collect(createSyncService(database).sync({ provider: "codeforces" }))
    );

    expect(events).toContainEqual(expect.objectContaining({
      type: "error",
      phase: "database",
      message: "Could not sync codeforces submission 49644212 for user tourist: Problem 100566A from contest 100566 was not found after contest sync."
    }));
    expect(events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        errors: 1
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

    const events = await withDatabase(async (database) => {
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Primary,
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      return await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));
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
