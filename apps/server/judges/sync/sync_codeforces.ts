import {
  type JudgeSyncEvent,
  type JudgeSyncInput,
  type JudgeSyncService,
  type JudgeSyncSummary
} from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Data, Effect } from "effect";

import type { Judge, JudgeContest, JudgeError, JudgeSubmission } from "../judges.js";

const CODEFORCES_CONTEST_URL = "https://codeforces.com/gym";
const QOJ_CONTEST_URL = "https://qoj.ac/contest";

const { contests, problems, submissions, users } = schema;

type SyncUser = typeof users.$inferSelect;
type ProblemRow = typeof problems.$inferSelect;

interface PendingSubmission {
  readonly user: SyncUser;
  readonly submission: JudgeSubmission;
}

interface UpsertSubmissionResult {
  readonly inserted: number;
  readonly updated: number;
  readonly skipped: number;
}

interface UserSubmissionSyncResult {
  readonly fetched: number;
  readonly inserted: number;
  readonly updated: number;
  readonly skipped: number;
  readonly missingProblems: number;
  readonly pendingSubmissions: ReadonlyArray<PendingSubmission>;
}

interface AsyncEventQueue<T> {
  readonly iterable: AsyncIterable<T>;
  readonly push: (value: T) => void;
  readonly close: () => void;
  readonly fail: (error: unknown) => void;
}

type MutableJudgeSyncSummary = {
  -readonly [Key in keyof JudgeSyncSummary]: JudgeSyncSummary[Key];
};

type JudgeSyncRegistry = Partial<Record<JudgeSyncInput["provider"], Judge>>;

const activeSyncProviders = new Set<JudgeSyncInput["provider"]>();

export async function* notImplementedJudgeSync(input: JudgeSyncInput): AsyncIterable<JudgeSyncEvent> {
  const summary = emptySummary();
  summary.errors = 1;
  yield {
    type: "error",
    provider: input.provider,
    phase: "database",
    message: `${input.provider} sync is not implemented yet.`,
    stepsTotal: 0,
    stepsLeft: 0
  };
  yield finalEvent(input.provider, 0, summary);
}

const createAsyncEventQueue = <T>(): AsyncEventQueue<T> => {
  const values: T[] = [];
  const waiters: Array<{
    readonly resolve: (result: IteratorResult<T>) => void;
    readonly reject: (error: unknown) => void;
  }> = [];
  let closed = false;
  let failure: unknown;

  const next = async (): Promise<IteratorResult<T>> => {
    if (values.length > 0) {
      return { done: false, value: values.shift() as T };
    }

    if (failure !== undefined) {
      throw failure;
    }

    if (closed) {
      return { done: true, value: undefined };
    }

    return await new Promise<IteratorResult<T>>((resolve, reject) => {
      waiters.push({ resolve, reject });
    });
  };

  const push = (value: T): void => {
    const waiter = waiters.shift();
    if (waiter !== undefined) {
      waiter.resolve({ done: false, value });
      return;
    }

    values.push(value);
  };

  const close = (): void => {
    closed = true;
    for (const waiter of waiters.splice(0)) {
      waiter.resolve({ done: true, value: undefined });
    }
  };

  const fail = (error: unknown): void => {
    failure = error;
    closed = true;
    for (const waiter of waiters.splice(0)) {
      waiter.reject(error);
    }
  };

  return {
    iterable: {
      [Symbol.asyncIterator]: () => ({ next })
    },
    push,
    close,
    fail
  };
};

type SyncOperationPhase = "submissions" | "contests" | "database";

interface SyncOperationContext {
  readonly provider: JudgeSyncInput["provider"];
  readonly phase: SyncOperationPhase;
  readonly step?: "submissions" | "contests";
  readonly action: string;
  readonly userHandle?: string;
  readonly contestJudgeId?: string;
  readonly judgeId?: string;
}

class SyncOperationError extends Data.TaggedError("SyncOperationError")<SyncOperationContext & {
  readonly cause: unknown;
}> {}

const emptySummary = (): MutableJudgeSyncSummary => ({
  usersProcessed: 0,
  submissionsFetched: 0,
  submissionsInserted: 0,
  submissionsUpdated: 0,
  submissionsSkipped: 0,
  contestsSynced: 0,
  errors: 0
});

const causeMessage = (cause: unknown): string | undefined => {
  if (cause === undefined || cause === null) {
    return undefined;
  }

  if (typeof cause === "string") {
    return cause;
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  if (typeof cause === "object" && "comment" in cause && typeof cause.comment === "string") {
    return cause.comment;
  }

  return String(cause);
};

const isJudgeError = (error: unknown): error is JudgeError => {
  if (typeof error !== "object" || error === null || !("_tag" in error)) {
    return false;
  }

  return [
    "JudgeCredentialError",
    "JudgeNotFoundError",
    "JudgeAPIError",
    "JudgeUnavailableError"
  ].includes(String(error._tag));
};

const formatSyncJudgeError = (error: JudgeError): string => {
  const detail = "cause" in error ? causeMessage(error.cause) : undefined;
  const suffix = detail === undefined || detail === "" ? "" : ` ${detail}`;

  switch (error._tag) {
    case "JudgeCredentialError":
      return `Credential error for ${error.judgeId}.${suffix}`;
    case "JudgeNotFoundError":
      return `${error.resource === "contest" ? "Contest" : "User"} not found on judge: ${error.judgeId}.`;
    case "JudgeAPIError":
      return `Judge API rejected the request for ${error.judgeId}.${suffix}`;
    case "JudgeUnavailableError":
      return `Judge is unavailable for ${error.judgeId}.${suffix}`;
  }
};

const rawErrorMessage = (error: unknown): string => {
  if (isJudgeError(error)) {
    return formatSyncJudgeError(error);
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error === undefined || error === null || String(error).trim() === "") {
    return "Unknown error.";
  }

  return String(error);
};

const syncErrorMessage = (
  provider: JudgeSyncInput["provider"],
  action: string,
  error: unknown
): string => `Could not sync ${provider} ${action}: ${rawErrorMessage(error)}`;

const syncOperationErrorEvent = (
  error: SyncOperationError,
  stepsTotal: number,
  stepsLeft: number
): JudgeSyncEvent => ({
  type: "error",
  provider: error.provider,
  phase: error.phase,
  step: error.step,
  message: syncErrorMessage(error.provider, error.action, error.cause),
  userHandle: error.userHandle,
  contestJudgeId: error.contestJudgeId,
  judgeId: error.judgeId,
  stepsTotal,
  stepsLeft
});

const syncEffect = <A>(
  context: SyncOperationContext,
  run: () => A
): Effect.Effect<A, SyncOperationError> =>
  Effect.try({
    try: run,
    catch: (cause) => new SyncOperationError({ ...context, cause })
  });

const now = (): Date => new Date();

const providerJudge = (provider: JudgeSyncInput["provider"]): JUDGES =>
  provider === JUDGES.Codeforces ? JUDGES.Codeforces : JUDGES.Qoj;

const judgeFor = (provider: JudgeSyncInput["provider"], registry: JudgeSyncRegistry): Judge | undefined =>
  registry[provider];

const contestLink = (judge: JUDGES, contestJudgeId: string): string => {
  const baseUrl = judge === JUDGES.Codeforces ? CODEFORCES_CONTEST_URL : QOJ_CONTEST_URL;
  return `${baseUrl}/${encodeURIComponent(contestJudgeId)}`;
};

const runJudgeOperation = <A>(
  database: DatabaseService,
  context: SyncOperationContext,
  effect: Effect.Effect<A, unknown, DatabaseServiceTag>
): Effect.Effect<A, SyncOperationError> =>
  Effect.provideService(effect, DatabaseServiceTag, database).pipe(
    Effect.mapError((cause) => new SyncOperationError({ ...context, cause }))
  );

const getSyncUsers = (
  database: DatabaseService,
  judge: JUDGES,
  provider: JudgeSyncInput["provider"]
): Effect.Effect<ReadonlyArray<SyncUser>, SyncOperationError> =>
  syncEffect({
    provider,
    phase: "database",
    action: "users to sync"
  }, () =>
    database.db
      .select()
      .from(users)
      .where(and(
        eq(users.judge, judge),
        inArray(users.type, [USER_TYPES.Primary, USER_TYPES.Friend])
      ))
      .all()
  );

const findProblem = (
  database: DatabaseService,
  judge: JUDGES,
  judgeProblemId: string,
  context: SyncOperationContext
): Effect.Effect<ProblemRow | undefined, SyncOperationError> =>
  syncEffect(context, () =>
    database.db
      .select()
      .from(problems)
      .where(and(eq(problems.judge, judge), eq(problems.judgeId, judgeProblemId)))
      .get()
  );

interface ExistingSubmissionRow {
  readonly judgeId: string;
  readonly problemId: number;
  readonly userId: number;
  readonly status: JudgeSubmission["verdict"];
  readonly submittedAt: Date;
}

const existingSubmissionsByJudgeId = (
  database: DatabaseService,
  judge: JUDGES,
  user: SyncUser,
  provider: JudgeSyncInput["provider"]
): Effect.Effect<ReadonlyMap<string, ExistingSubmissionRow>, SyncOperationError> =>
  syncEffect({
    provider,
    phase: "database",
    action: `existing submissions for user ${user.username}`,
    userHandle: user.username
  }, () => {
    const rows = database.db
      .select({
        judgeId: submissions.judgeId,
        problemId: submissions.problemId,
        userId: submissions.userId,
        status: submissions.status,
        submittedAt: submissions.submittedAt
      })
      .from(submissions)
      .where(and(eq(submissions.judge, judge), eq(submissions.userId, user.id)))
      .all();

    return new Map(rows.map((row) => [row.judgeId, row]));
  });

const insertSubmission = (
  database: DatabaseService,
  judge: JUDGES,
  user: SyncUser,
  submission: JudgeSubmission,
  problem: ProblemRow,
  context: SyncOperationContext
): Effect.Effect<UpsertSubmissionResult, SyncOperationError> => syncEffect(context, () => {
  const timestamp = now();
  const existing = database.db
    .select({
      problemId: submissions.problemId,
      userId: submissions.userId,
      status: submissions.status,
      submittedAt: submissions.submittedAt
    })
    .from(submissions)
    .where(and(eq(submissions.judge, judge), eq(submissions.judgeId, submission.judgeId)))
    .get();

  if (
    existing !== undefined &&
    existing.problemId === problem.id &&
    existing.userId === user.id &&
    existing.status === submission.verdict &&
    existing.submittedAt.getTime() === submission.submittedAt.getTime()
  ) {
    return { inserted: 0, updated: 0, skipped: 1 };
  }

  database.db
    .insert(submissions)
    .values({
      judgeId: submission.judgeId,
      judge,
      problemId: problem.id,
      userId: user.id,
      status: submission.verdict,
      submittedAt: submission.submittedAt,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoUpdate({
      target: [submissions.judgeId, submissions.judge],
      set: {
        problemId: problem.id,
        userId: user.id,
        status: submission.verdict,
        submittedAt: submission.submittedAt,
        updatedAt: timestamp
      }
    })
    .run();

  return existing === undefined
    ? { inserted: 1, updated: 0, skipped: 0 }
    : { inserted: 0, updated: 1, skipped: 0 };
});

const upsertContest = (
  database: DatabaseService,
  judge: JUDGES,
  contest: JudgeContest,
  context: SyncOperationContext
): Effect.Effect<number, SyncOperationError> => syncEffect(context, () => {
  const timestamp = now();

  database.db
    .insert(contests)
    .values({
      judgeId: contest.judgeId,
      judge,
      name: contest.name,
      link: contestLink(judge, contest.judgeId),
      participants: contest.participants,
      stars: contest.stars,
      synced: true,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoUpdate({
      target: [contests.judgeId, contests.judge],
      set: {
        name: contest.name,
        link: contestLink(judge, contest.judgeId),
        participants: contest.participants,
        stars: contest.stars,
        synced: true,
        updatedAt: timestamp
      }
    })
    .run();

  const row = database.db
    .select({ id: contests.id })
    .from(contests)
    .where(and(eq(contests.judge, judge), eq(contests.judgeId, contest.judgeId)))
    .get();

  if (row === undefined) {
    throw new Error(`Synced contest ${contest.judgeId} was not found after upsert.`);
  }

  return row.id;
});

const upsertContestProblems = (
  database: DatabaseService,
  judge: JUDGES,
  contest: JudgeContest,
  contestId: number,
  context: SyncOperationContext
): Effect.Effect<number, SyncOperationError> => syncEffect(context, () => {
  const timestamp = now();

  for (const problem of contest.problems) {
    database.db
      .insert(problems)
      .values({
        judgeId: problem.judgeId,
        judge,
        link: problem.link,
        contestId,
        solves: problem.solves,
        rating: 0,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .onConflictDoUpdate({
        target: [problems.judgeId, problems.judge],
        set: {
          link: problem.link,
          contestId,
          solves: problem.solves,
          rating: 0,
          updatedAt: timestamp
        }
      })
      .run();
  }

  return contest.problems.length;
});

const submissionContext = (
  provider: JudgeSyncInput["provider"],
  user: SyncUser,
  submission: JudgeSubmission
): SyncOperationContext => ({
  provider,
  phase: "database",
  action: `submission ${submission.judgeId} for user ${user.username}`,
  userHandle: user.username,
  judgeId: submission.judgeId,
  contestJudgeId: submission.judgeContestId
});

const retryPendingSubmission = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judgeId: JUDGES,
  pending: PendingSubmission
): Effect.Effect<UpsertSubmissionResult, SyncOperationError> =>
  Effect.gen(function* () {
    const context = submissionContext(provider, pending.user, pending.submission);
    const problem = yield* findProblem(database, judgeId, pending.submission.judgeProblemId, context);

    if (problem === undefined) {
      return yield* Effect.fail(new SyncOperationError({
        ...context,
        cause: new Error(
          `Problem ${pending.submission.judgeProblemId} from contest ${pending.submission.judgeContestId} was not found after contest sync.`
        )
      }));
    }

    return yield* insertSubmission(database, judgeId, pending.user, pending.submission, problem, context);
  });

const syncUserSubmissions = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judgeId: JUDGES,
  judge: Judge,
  user: SyncUser
): Effect.Effect<UserSubmissionSyncResult, SyncOperationError> =>
  Effect.gen(function* () {
    const userSubmissions = yield* runJudgeOperation(database, {
      provider,
      phase: "submissions",
      step: "submissions",
      action: `submissions for user ${user.username}`,
      userHandle: user.username
    }, judge.getSubmissions({ userHandle: user.username }));
    const existingSubmissions = yield* existingSubmissionsByJudgeId(database, judgeId, user, provider);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const missingProblems = new Set<string>();
    const pendingSubmissions: PendingSubmission[] = [];

    for (const submission of userSubmissions) {
      const context = submissionContext(provider, user, submission);
      const problem = yield* findProblem(database, judgeId, submission.judgeProblemId, context);

      if (problem === undefined) {
        if (existingSubmissions.has(submission.judgeId)) {
          skipped += 1;
          continue;
        }

        pendingSubmissions.push({ user, submission });
        missingProblems.add(submission.judgeProblemId);
        skipped += 1;
        continue;
      }

      const result = yield* insertSubmission(database, judgeId, user, submission, problem, context);
      inserted += result.inserted;
      updated += result.updated;
      skipped += result.skipped;
    }

    return {
      fetched: userSubmissions.length,
      inserted,
      updated,
      skipped,
      missingProblems: missingProblems.size,
      pendingSubmissions
    };
  });

const syncContest = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judgeId: JUDGES,
  judge: Judge,
  contestJudgeId: string
): Effect.Effect<number, SyncOperationError> =>
  Effect.gen(function* () {
    const contestContext = {
      provider,
      phase: "contests" as const,
      step: "contests" as const,
      action: `contest ${contestJudgeId}`,
      contestJudgeId
    };
    const contest = yield* runJudgeOperation(database, contestContext, judge.getContest(contestJudgeId));
    const contestId = yield* upsertContest(database, judgeId, contest, contestContext);
    return yield* upsertContestProblems(database, judgeId, contest, contestId, contestContext);
  });

const finalEvent = (
  provider: JudgeSyncInput["provider"],
  stepsTotal: number,
  summary: JudgeSyncSummary
): JudgeSyncEvent => ({
  type: "completed",
  provider,
  stepsTotal,
  stepsLeft: 0,
  summary
});

type EmitSyncEvent = (event: JudgeSyncEvent) => Effect.Effect<void>;

const runJudgeSyncProgram = (
  database: DatabaseService,
  input: JudgeSyncInput,
  judge: Judge,
  emit: EmitSyncEvent
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const provider = input.provider;
    const judgeId = providerJudge(provider);
    const summary = emptySummary();
    const syncUsersResult = yield* Effect.either(getSyncUsers(database, judgeId, provider));

    if (syncUsersResult._tag === "Left") {
      summary.errors += 1;
      yield* emit(syncOperationErrorEvent(syncUsersResult.left, 0, 0));
      yield* emit(finalEvent(provider, 0, summary));
      return;
    }

    const syncUsers = syncUsersResult.right;
    const pendingSubmissionsByContest = new Map<string, PendingSubmission[]>();
    const contestsToSync = new Set<string>();
    let completedSteps = 0;
    let stepsTotal = syncUsers.length;

    const stepsLeft = (): number => Math.max(stepsTotal - completedSteps, 0);

    yield* emit({
      type: "started",
      provider,
      stepsTotal: 0,
      stepsLeft: 0
    });

    yield* emit({
      type: "submissions.syncing",
      step: "submissions",
      provider,
      usersTotal: syncUsers.length,
      stepsTotal,
      stepsLeft: stepsLeft()
    });

    for (const [index, user] of syncUsers.entries()) {
      yield* emit({
        type: "submissions.userSyncing",
        step: "submissions",
        provider,
        userHandle: user.username,
        userIndex: index + 1,
        usersTotal: syncUsers.length,
        stepsTotal,
        stepsLeft: stepsLeft()
      });

      const userSyncResult = yield* Effect.either(syncUserSubmissions(database, provider, judgeId, judge, user));
      let fetched = 0;
      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      let missingProblems = 0;

      if (userSyncResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(userSyncResult.left, stepsTotal, stepsLeft()));
      } else {
        fetched = userSyncResult.right.fetched;
        inserted = userSyncResult.right.inserted;
        updated = userSyncResult.right.updated;
        skipped = userSyncResult.right.skipped;
        missingProblems = userSyncResult.right.missingProblems;

        summary.usersProcessed += 1;
        summary.submissionsFetched += fetched;
        summary.submissionsInserted += inserted;
        summary.submissionsUpdated += updated;
        summary.submissionsSkipped += skipped;

        for (const pending of userSyncResult.right.pendingSubmissions) {
          const pendingSubmissions = pendingSubmissionsByContest.get(pending.submission.judgeContestId) ?? [];
          pendingSubmissions.push(pending);
          pendingSubmissionsByContest.set(pending.submission.judgeContestId, pendingSubmissions);
          contestsToSync.add(pending.submission.judgeContestId);
        }
      }

      completedSteps += 1;
      yield* emit({
        type: "submissions.userSynced",
        step: "submissions",
        provider,
        userHandle: user.username,
        fetched,
        inserted,
        updated,
        skipped,
        missingProblems,
        stepsTotal,
        stepsLeft: stepsLeft()
      });
    }

    const contestIds = [...contestsToSync].sort((left, right) => Number(left) - Number(right));
    completedSteps = 0;
    stepsTotal = contestIds.length;

    yield* emit({
      type: "contests.syncing",
      step: "contests",
      provider,
      contestsTotal: contestIds.length,
      contestsLeft: contestIds.length,
      stepsTotal,
      stepsLeft: stepsLeft()
    });

    for (const [index, contestJudgeId] of contestIds.entries()) {
      const contestsLeft = contestIds.length - index;

      yield* emit({
        type: "contests.contestSyncing",
        step: "contests",
        provider,
        contestJudgeId,
        contestsLeft,
        contestsTotal: contestIds.length,
        stepsTotal,
        stepsLeft: stepsLeft()
      });

      const contestSyncResult = yield* Effect.either(syncContest(database, provider, judgeId, judge, contestJudgeId));
      completedSteps += 1;

      if (contestSyncResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(contestSyncResult.left, stepsTotal, stepsLeft()));
        continue;
      }

      summary.contestsSynced += 1;
      yield* emit({
        type: "contests.contestSynced",
        step: "contests",
        provider,
        contestJudgeId,
        problemsSynced: contestSyncResult.right,
        stepsTotal,
        stepsLeft: stepsLeft()
      });

      const pendingSubmissions = pendingSubmissionsByContest.get(contestJudgeId) ?? [];
      pendingSubmissionsByContest.delete(contestJudgeId);
      for (const pending of pendingSubmissions) {
        const retryResult = yield* Effect.either(retryPendingSubmission(database, provider, judgeId, pending));
        if (retryResult._tag === "Left") {
          summary.errors += 1;
          yield* emit(syncOperationErrorEvent(retryResult.left, stepsTotal, stepsLeft()));
        } else {
          summary.submissionsInserted += retryResult.right.inserted;
          summary.submissionsUpdated += retryResult.right.updated;
          summary.submissionsSkipped = Math.max(summary.submissionsSkipped - 1, 0);
        }
      }
    }

    yield* emit(finalEvent(provider, stepsTotal, summary));
  });

export async function* createCodeforcesJudgeSync(
  database: DatabaseService,
  input: JudgeSyncInput,
  judge: Judge
): AsyncIterable<JudgeSyncEvent> {
  const provider = input.provider;

  if (activeSyncProviders.has(provider)) {
    const summary = emptySummary();
    summary.errors = 1;
    yield {
      type: "error",
      provider,
      phase: "concurrency",
      message: `A ${provider} sync is already running.`,
      stepsTotal: 0,
      stepsLeft: 0
    };
    yield finalEvent(provider, 0, summary);
    return;
  }

  activeSyncProviders.add(provider);
  const queue = createAsyncEventQueue<JudgeSyncEvent>();
  const emit: EmitSyncEvent = (event) => Effect.sync(() => queue.push(event));
  Effect.runPromise(
    runJudgeSyncProgram(database, input, judge, emit).pipe(
      Effect.ensuring(Effect.sync(() => {
        activeSyncProviders.delete(provider);
        queue.close();
      }))
    )
  ).catch((error: unknown) => queue.fail(error));

  yield* queue.iterable;
}

export const createJudgeSyncService = (
  registry: JudgeSyncRegistry
): JudgeSyncService => ({
  sync: (input) => {
    const judge = judgeFor(input.provider, registry);
    return judge?.sync(input) ?? notImplementedJudgeSync(input);
  }
});
