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

const { contests, problems, problemTags, submissions, userContestStates, users } = schema;

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

  it("completes without Codeforces calls when there are no team users", async () => {
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
        simulated: true,
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
        name: "A. Matching Names",
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
      const contestStates = database.db.select().from(userContestStates).all();
      expect(user.username).toBe("tourist");
      expect(rows).toHaveLength(1);
      expect(contestStates).toEqual([
        expect.objectContaining({
          userId: user.id,
          contestId: contest.id,
          submissionCount: 1,
          acceptedCount: 1,
          lastSubmissionAt: new Date(1450000000 * 1000)
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

    await withDatabase(async (database) => {
      database.db.insert(users).values({
        username: "teammate",
        type: USER_TYPES.Team,
        judge: JUDGES.Codeforces,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      database.db.insert(contests).values({
        judgeId: "100566",
        judge: JUDGES.Codeforces,
        name: "Testing Round #100566",
        link: "https://codeforces.com/gym/100566",
        participants: 1,
        stars: 0,
        simulated: true,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();
      const contest = database.db
        .select()
        .from(contests)
        .where(and(eq(contests.judge, JUDGES.Codeforces), eq(contests.judgeId, "100566")))
        .get();
      if (contest === undefined) {
        throw new Error("Expected test contest to be inserted.");
      }
      database.db.insert(problems).values({
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

      const events = await collect(createSyncService(database, { codeforces: judge }).sync({ provider: "codeforces" }));
      const rows = database.db.select().from(submissions).all();

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

    await withDatabase(async (database) => {
      const events = await collect(createSyncService(database).sync({ provider: "codeforces" }));
      const errorEvent = events.find((event) => event.type === "error");

      expect(errorEvent).toMatchObject({
        type: "error",
        provider: "codeforces",
        phase: "submissions",
        step: "submissions",
        message: "Could not sync codeforces submissions for user tourist: Codeforces API is unavailable (HTTP 503): Service unavailable."
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

    await withDatabase(async (database) => {
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Team,
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
        simulated: true,
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
        name: "Archery Tournament",
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
        type: USER_TYPES.Team,
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
        simulated: true,
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
        name: "Archery Tournament",
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
        type: USER_TYPES.Team,
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
      const problemRows = database.db.select().from(problems).all();
      expect(problemRows).toHaveLength(2);
      expect(problemRows).toEqual([
        expect.objectContaining({ judgeId: "100566A", name: "A. Matching Names", solvePercentage: 100, rating: 700 }),
        expect.objectContaining({ judgeId: "100566B", name: "B. Replicating Processes", solvePercentage: 100, rating: 700 })
      ]);
      expect(database.db.select().from(submissions).all()).toHaveLength(2);
      expect(database.db.select().from(contests).get()).toMatchObject({
        judgeId: "100566",
        simulated: true
      });
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

    const result = await withDatabase(async (database) => {
      const events = await collect(createSyncService(database).sync({ provider: "codeforces" }));
      return {
        events,
        contestRows: database.db.select().from(contests).all(),
        contestStateRows: database.db.select().from(userContestStates).all(),
        problemRows: database.db.select().from(problems).all()
      };
    });

    expect(result.events).not.toContainEqual(expect.objectContaining({
      type: "contests.contestSynced",
      contestJudgeId: "100566"
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

  it("records Codeforces participation for an existing unsimulated contest without promoting it", async () => {
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

    const result = await withDatabase(async (database) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      database.db.insert(contests).values({
        judgeId: "100566",
        judge: JUDGES.Codeforces,
        name: "Finder Candidate",
        link: "https://codeforces.com/gym/100566",
        participants: null,
        stars: null,
        simulated: false,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

      const events = await collect(createSyncService(database).sync({ provider: "codeforces" }));
      return {
        events,
        contestRows: database.db.select().from(contests).all(),
        contestStateRows: database.db.select().from(userContestStates).all(),
        problemRows: database.db.select().from(problems).all()
      };
    });

    expect(result.events).not.toContainEqual(expect.objectContaining({
      type: "contests.contestSynced",
      contestJudgeId: "100566"
    }));
    expect(result.contestRows).toEqual([
      expect.objectContaining({
        judgeId: "100566",
        simulated: false
      })
    ]);
    expect(result.contestStateRows).toEqual([
      expect.objectContaining({
        contestId: result.contestRows[0]?.id,
        submissionCount: 1,
        acceptedCount: 1
      })
    ]);
    expect(result.problemRows).toHaveLength(0);
  });

  it("stores Codeforces Contest Finder rows with names from contest.list", async () => {
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

      throw new Error(`Unexpected Codeforces API path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await withDatabase(async (database) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      const [friend] = database.db.insert(users).values({
        username: "friend",
        type: USER_TYPES.Friend,
        judge: JUDGES.Codeforces,
        createdAt: timestamp,
        updatedAt: timestamp
      }).returning().all();

      if (friend === undefined) {
        throw new Error("Expected seeded friend.");
      }

      await Effect.runPromise(
        makeCodeforcesJudge(database).refreshContestFinder({ friends: [friend] }).pipe(
          Effect.provideService(DatabaseServiceTag, database)
        )
      );

      return {
        contestRows: database.db.select().from(contests).all(),
        contestStateRows: database.db.select().from(userContestStates).all()
      };
    });

    expect(result.contestRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        judgeId: "566",
        name: "Codeforces Round 566 (Div. 2)",
        simulated: false
      }),
      expect.objectContaining({
        judgeId: "100566",
        name: "ICPC Training Camp Invitational",
        simulated: false
      })
    ]));
    expect(result.contestRows.map((contest) => contest.judgeId)).not.toContain("568");
    const contestIdByJudgeId = new Map(result.contestRows.map((contest) => [contest.judgeId, contest.id]));
    expect(result.contestStateRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        contestId: contestIdByJudgeId.get("100566"),
        submissionCount: 1,
        acceptedCount: 1
      }),
      expect.objectContaining({
        contestId: contestIdByJudgeId.get("566"),
        submissionCount: 1,
        acceptedCount: 0
      })
    ]));
    expect(result.contestStateRows).toHaveLength(2);
    expect(fetchMock.mock.calls
      .filter((call) => new URL(String(call[0])).pathname === "/api/contest.list")
      .map((call) => new URL(String(call[0])).searchParams.get("gym"))
    ).toEqual(["true", null]);
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

    const events = await withDatabase(async (database) => {
      return await collect(createSyncService(database).sync({ provider: "codeforces" }));
    });

    expect(events).not.toContainEqual(expect.objectContaining({
      type: "contests.contestSynced",
      contestJudgeId: "100566"
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

    const events = await withDatabase(async (database) => {
      return await collect(createSyncService(database).sync({ provider: "codeforces" }));
    });

    expect(events).toContainEqual(expect.objectContaining({
      type: "contests.contestSynced",
      contestJudgeId: "100566",
      problemsSynced: 2
    }));
    expect(events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        submissionsInserted: 2,
        submissionsSkipped: 0,
        contestsSynced: 1,
        errors: 0
      }
    });
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

    await withDatabase(async (database) => {
      await collect(createSyncService(database).sync({ provider: "codeforces" }));

      expect(database.db
        .select({ solvePercentage: problems.solvePercentage, rating: problems.rating })
        .from(problems)
        .all()).toEqual([
        { solvePercentage: 100, rating: 1100 },
        { solvePercentage: 100, rating: 1100 }
      ]);
    });
  });

  it("imports regular Codeforces catalog data after existing Gym sync and retries matching regular pending submissions", async () => {
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

      if (url.pathname === "/api/contest.list") {
        expect(url.searchParams.has("gym")).toBe(false);
        return codeforcesResponse([
          {
            id: 566,
            name: "Codeforces Round 566 (Div. 2)",
            type: "CF",
            phase: "FINISHED"
          },
          {
            id: 567,
            name: "Codeforces Round 567 (Div. 3)",
            type: "CF",
            phase: "FINISHED"
          },
          {
            id: 568,
            name: "Huawei Challenge",
            type: "CF",
            phase: "FINISHED"
          },
          {
            id: 569,
            name: "Codeforces Global Round 1",
            type: "CF",
            phase: "FINISHED"
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
              contestId: 567,
              index: "A",
              name: "Other Contest",
              rating: 900,
              tags: ["implementation"]
            },
            {
              contestId: 568,
              index: "A",
              name: "Skipped Challenge",
              rating: 800,
              tags: ["weird"]
            },
            {
              contestId: 569,
              index: "A",
              name: "Skipped Global",
              rating: 1000,
              tags: ["weird"]
            }
          ],
          problemStatistics: [
            { contestId: 566, index: "A", solvedCount: 100 },
            { contestId: 566, index: "B", solvedCount: 25 },
            { contestId: 567, index: "A", solvedCount: 50 },
            { contestId: 568, index: "A", solvedCount: 40 },
            { contestId: 569, index: "A", solvedCount: 30 }
          ]
        });
      }

      if (url.pathname === "/api/contest.standings") {
        throw new Error("Regular Codeforces contests must not call contest.standings.");
      }

      throw new Error(`Unexpected Codeforces API path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await withDatabase(async (database) => {
      const events = await collect(createSyncService(database).sync({ provider: "codeforces" }));

      const contestRows = database.db.select().from(contests).all();
      const problemRows = database.db.select().from(problems).all();
      const submissionRows = database.db.select().from(submissions).all();
      const tagRows = database.db.select().from(problemTags).all();

      expect(events.findIndex((event) => event.type === "contests.syncing"))
        .toBeLessThan(events.findIndex((event) => event.type === "regularCatalog.contestsSyncing"));
      expect(events).toContainEqual(expect.objectContaining({
        type: "regularCatalog.contestsSynced",
        contestsTotal: 2
      }));
      expect(events).toContainEqual(expect.objectContaining({
        type: "regularCatalog.problemsSynced",
        contestsImported: 2,
        problemsImported: 3,
        pendingSubmissionsRetried: 2
      }));
      expect(events.at(-1)).toMatchObject({
        type: "completed",
        summary: {
          submissionsInserted: 2,
          submissionsSkipped: 0,
          contestsSynced: 0,
          regularContestsImported: 2,
          regularProblemsImported: 3,
          regularPendingSubmissionsRetried: 2,
          errors: 0
        }
      });
      expect(contestRows).toEqual([
        expect.objectContaining({
          judgeId: "566",
          name: "Codeforces Round 566 (Div. 2)",
          link: "https://codeforces.com/contest/566",
          stars: 4,
          participants: null,
          simulated: true
        }),
        expect.objectContaining({
          judgeId: "567",
          name: "Codeforces Round 567 (Div. 3)",
          stars: 3,
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
          solvePercentage: 25
        }),
        expect.objectContaining({
          judgeId: "567A",
          name: "A. Other Contest",
          solves: 50,
          solvePercentage: 100,
          rating: 900
        })
      ]);
      expect(submissionRows).toHaveLength(2);
      expect(tagRows.map((row) => row.tag).sort()).toEqual(["dp", "greedy", "implementation", "math"]);
      expect(fetchMock.mock.calls.map((call) => new URL(String(call[0])).pathname)).toEqual([
        "/api/user.status",
        "/api/contest.list",
        "/api/problemset.problems"
      ]);
    });
  });

  it("does not retry regular pending submissions when their contest was not imported", async () => {
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
          }
        ]);
      }

      if (url.pathname === "/api/contest.list") {
        return codeforcesResponse([
          {
            id: 566,
            name: "Codeforces Round 566 (Div. 2)",
            type: "CF",
            phase: "FINISHED"
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
              tags: []
            }
          ],
          problemStatistics: [
            { contestId: 566, index: "A", solvedCount: 100 }
          ]
        });
      }

      if (url.pathname === "/api/contest.standings") {
        throw new Error("Regular Codeforces contests must not call contest.standings.");
      }

      throw new Error(`Unexpected Codeforces API path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await withDatabase(async (database) => {
      const events = await collect(createSyncService(database).sync({ provider: "codeforces" }));
      return {
        events,
        submissions: database.db.select().from(submissions).all(),
        contests: database.db.select().from(contests).all(),
        problems: database.db.select().from(problems).all()
      };
    });

    expect(result.events).toContainEqual(expect.objectContaining({
      type: "regularCatalog.problemsSynced",
      contestsImported: 1,
      problemsImported: 1,
      pendingSubmissionsRetried: 0
    }));
    expect(result.events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        submissionsInserted: 0,
        submissionsSkipped: 1,
        regularPendingSubmissionsRetried: 0,
        errors: 0
      }
    });
    expect(result.submissions).toHaveLength(0);
    expect(result.contests).toEqual([
      expect.objectContaining({ judgeId: "566", simulated: true })
    ]);
    expect(result.problems).toEqual([
      expect.objectContaining({ judgeId: "566A" })
    ]);
  });

  it("does not error when a regular pending problem is missing from an imported catalog contest", async () => {
    const fetchMock = vi.fn(async (value: unknown) => {
      const url = new URL(String(value));
      if (url.pathname === "/api/user.status") {
        return codeforcesResponse([
          {
            id: 243987789,
            contestId: 569,
            creationTimeSeconds: 1450000000,
            problem: { contestId: 569, index: "E", name: "Missing From Problemset" },
            verdict: "OK"
          }
        ]);
      }

      if (url.pathname === "/api/contest.list") {
        return codeforcesResponse([
          {
            id: 569,
            name: "Codeforces Round 569 (Div. 2)",
            type: "CF",
            phase: "FINISHED"
          }
        ]);
      }

      if (url.pathname === "/api/problemset.problems") {
        return codeforcesResponse({
          problems: [
            {
              contestId: 569,
              index: "A",
              name: "Catalog First",
              tags: []
            }
          ],
          problemStatistics: [
            { contestId: 569, index: "A", solvedCount: 100 }
          ]
        });
      }

      throw new Error(`Unexpected Codeforces API path: ${url.pathname}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await withDatabase(async (database) => {
      const events = await collect(createSyncService(database).sync({ provider: "codeforces" }));
      return {
        events,
        submissions: database.db.select().from(submissions).all(),
        problems: database.db.select().from(problems).all()
      };
    });

    expect(result.events).not.toContainEqual(expect.objectContaining({
      type: "error",
      judgeId: "243987789"
    }));
    expect(result.events.at(-1)).toMatchObject({
      type: "completed",
      summary: {
        submissionsInserted: 0,
        submissionsSkipped: 1,
        regularPendingSubmissionsRetried: 0,
        errors: 0
      }
    });
    expect(result.submissions).toHaveLength(0);
    expect(result.problems).toEqual([
      expect.objectContaining({ judgeId: "569A" })
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

    await withDatabase(async (database) => {
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Team,
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
        simulated: false,
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

  it("syncs eligible QOJ profile contests before importing profile submissions", async () => {
    await withDatabase(async (database) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Team,
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

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));

      expect(events).not.toContainEqual(expect.objectContaining({
        type: "error",
        contestJudgeId: "222"
      }));
      expect(events).toContainEqual(expect.objectContaining({
        type: "contests.contestSynced",
        contestJudgeId: "222"
      }));
      expect(events.slice(0, 3)).toEqual([
        expect.objectContaining({ type: "started", provider: "qoj" }),
        expect.objectContaining({ type: "submissions.syncing", provider: "qoj", usersTotal: 1 }),
        expect.objectContaining({ type: "submissions.userSyncing", provider: "qoj", userHandle: "qoj-user" })
      ]);
      const importSubmissionsIndex = events.findLastIndex(
        (event) => event.type === "submissions.syncing"
      );
      expect(events.findIndex((event) => event.type === "contests.contestSynced" && event.contestJudgeId === "111"))
        .toBeLessThan(importSubmissionsIndex);
      expect(database.db.select().from(submissions).all()).toHaveLength(3);
      expect(database.db.select().from(userContestStates).all()).toEqual([
        expect.objectContaining({
          submissionCount: 1,
          acceptedCount: 0
        }),
        expect.objectContaining({
          submissionCount: 1,
          acceptedCount: 0
        })
      ]);
    }, { saveCredentials: false });
  });

  it("syncs a QOJ profile contest with only one unique submitted problem", async () => {
    await withDatabase(async (database) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Team,
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

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

      const events = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));

      expect(events).toContainEqual(expect.objectContaining({
        type: "contests.contestSynced",
        contestJudgeId: "111"
      }));
      expect(database.db.select().from(contests).all()).toEqual([
        expect.objectContaining({
          judgeId: "111",
          judge: JUDGES.Qoj,
          simulated: true
        })
      ]);
      expect(database.db.select().from(submissions).all()).toHaveLength(2);
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
    await withDatabase(async (database) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Team,
        judge: JUDGES.Qoj,
        createdAt: timestamp,
        updatedAt: timestamp
      }).run();

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
          }
        ])
      };

      await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));
      const secondEvents = await collect(createSyncService(database, { qoj: qojJudge }).sync({ provider: "qoj" }));

      expect(getContest).toHaveBeenCalledTimes(1);
      expect(secondEvents).toContainEqual(expect.objectContaining({
        type: "contests.syncing",
        contestsTotal: 0
      }));
      expect(secondEvents).not.toContainEqual(expect.objectContaining({
        type: "contests.contestSyncing",
        contestJudgeId: "111"
      }));
      expect(database.db.select().from(contests).all()).toEqual([
        expect.objectContaining({
          judgeId: "111",
          judge: JUDGES.Qoj,
          simulated: true
        })
      ]);
    }, { saveCredentials: false });
  });

  it("does not sync QOJ profile contests that are already simulated", async () => {
    await withDatabase(async (database) => {
      const timestamp = new Date("2025-01-01T00:00:00.000Z");
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Team,
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
        simulated: true,
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

    const events = await withDatabase(async (database) => {
      database.db.insert(users).values({
        username: "qoj-user",
        type: USER_TYPES.Team,
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
