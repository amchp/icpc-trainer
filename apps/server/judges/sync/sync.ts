import {
  type JudgeSyncEvent,
  type JudgeSyncInput,
  type JudgeSyncObserveEvent,
  type JudgeSyncService,
  type JudgeSyncSummary
} from "@icpc-trainer/api";
import { type DatabaseService, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Data, Effect } from "effect";

import type { Judge, JudgeContest, JudgeError, JudgeSubmission } from "../judges.js";
import { createAsyncEventHub, type AsyncEventHub } from "../../src/asyncEventHub.js";
import { estimateProblemRating, estimateSolvePercentage } from "./problemRating.js";

const CODEFORCES_CONTEST_URL = "https://codeforces.com/gym";
const QOJ_CONTEST_URL = "https://qoj.ac/contest";

const { contests, problems, submissions, users } = schema;

export type SyncUser = typeof users.$inferSelect;
type ProblemRow = typeof problems.$inferSelect;

export interface PendingSubmission {
  readonly user: SyncUser;
  readonly submission: JudgeSubmission;
}

export interface UpsertSubmissionResult {
  readonly inserted: number;
  readonly updated: number;
  readonly skipped: number;
}

export interface UserSubmissionSyncResult {
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

export type MutableJudgeSyncSummary = {
  -readonly [Key in keyof JudgeSyncSummary]: JudgeSyncSummary[Key];
};

type JudgeSyncRegistry = Partial<Record<JudgeSyncInput["provider"], Judge>>;

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

export type SyncOperationPhase = "submissions" | "contests" | "database";

export interface SyncOperationContext {
  readonly provider: JudgeSyncInput["provider"];
  readonly phase: SyncOperationPhase;
  readonly step?: "submissions" | "contests";
  readonly action: string;
  readonly userHandle?: string;
  readonly contestJudgeId?: string;
  readonly judgeId?: string;
}

export class SyncOperationError extends Data.TaggedError("SyncOperationError")<SyncOperationContext & {
  readonly cause: unknown;
}> {}

export const emptySummary = (): MutableJudgeSyncSummary => ({
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

export const syncOperationErrorEvent = (
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

export const syncEffect = <A>(
  context: SyncOperationContext,
  run: () => A
): Effect.Effect<A, SyncOperationError> =>
  Effect.try({
    try: run,
    catch: (cause) => new SyncOperationError({ ...context, cause })
  });

const now = (): Date => new Date();

export const providerJudge = (provider: JudgeSyncInput["provider"]): JUDGES =>
  provider === JUDGES.Codeforces ? JUDGES.Codeforces : JUDGES.Qoj;

const judgeFor = (provider: JudgeSyncInput["provider"], registry: JudgeSyncRegistry): Judge | undefined =>
  registry[provider];

const contestLink = (judge: JUDGES, contestJudgeId: string): string => {
  const baseUrl = judge === JUDGES.Codeforces ? CODEFORCES_CONTEST_URL : QOJ_CONTEST_URL;
  return `${baseUrl}/${encodeURIComponent(contestJudgeId)}`;
};

export const runJudgeOperation = <A>(
  database: DatabaseService,
  context: SyncOperationContext,
  effect: Effect.Effect<A, unknown, DatabaseServiceTag>
): Effect.Effect<A, SyncOperationError> =>
  Effect.provideService(effect, DatabaseServiceTag, database).pipe(
    Effect.mapError((cause) => new SyncOperationError({ ...context, cause }))
  );

export const getSyncUsers = (
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

export const findProblem = (
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

export const existingSubmissionsByJudgeId = (
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

export const insertSubmission = (
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

export const upsertContest = (
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

export const upsertContestProblems = (
  database: DatabaseService,
  judge: JUDGES,
  contest: JudgeContest,
  contestId: number,
  context: SyncOperationContext
): Effect.Effect<number, SyncOperationError> => syncEffect(context, () => {
  const timestamp = now();
  const maxSolvesInContest = Math.max(0, ...contest.problems.map((problem) => problem.solves));

  for (const problem of contest.problems) {
    const rating = estimateProblemRating({
      stars: contest.stars,
      participants: contest.participants,
      solves: problem.solves,
      maxSolvesInContest
    });
    const solvePercentage = estimateSolvePercentage({
      participants: contest.participants,
      solves: problem.solves,
      maxSolvesInContest
    });

    database.db
      .insert(problems)
      .values({
        judgeId: problem.judgeId,
        judge,
        link: problem.link,
        contestId,
        solves: problem.solves,
        solvePercentage,
        rating,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .onConflictDoUpdate({
        target: [problems.judgeId, problems.judge],
        set: {
          link: problem.link,
          contestId,
          solves: problem.solves,
          solvePercentage,
          rating,
          updatedAt: timestamp
        }
      })
      .run();
  }

  return contest.problems.length;
});

export const submissionContext = (
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

export const syncUserSubmissions = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judgeId: JUDGES,
  judge: Judge,
  user: SyncUser,
  options: { readonly queueMissingSubmissions: boolean }
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

        if (options.queueMissingSubmissions && submission.judgeContestId !== undefined) {
          pendingSubmissions.push({ user, submission });
          missingProblems.add(submission.judgeProblemId);
        }
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

export const syncContest = (
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

export const finalEvent = (
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

export type EmitSyncEvent = (event: JudgeSyncEvent) => Effect.Effect<void>;

export async function* createJudgeSyncRunner(
  runProgram: (emit: EmitSyncEvent) => Effect.Effect<void>
): AsyncIterable<JudgeSyncEvent> {
  const queue = createAsyncEventQueue<JudgeSyncEvent>();
  const emit: EmitSyncEvent = (event) => Effect.sync(() => queue.push(event));
  Effect.runPromise(
    runProgram(emit).pipe(
      Effect.ensuring(Effect.sync(() => {
        queue.close();
      }))
    )
  ).catch((error: unknown) => queue.fail(error));

  yield* queue.iterable;
}

interface ActiveJudgeSyncState {
  running: boolean;
  events: JudgeSyncEvent[];
  hub: AsyncEventHub<JudgeSyncObserveEvent>;
}

const createProviderState = (): ActiveJudgeSyncState => ({
  running: false,
  events: [],
  hub: createAsyncEventHub<JudgeSyncObserveEvent>()
});

const syncFailureEvent = (
  provider: JudgeSyncInput["provider"],
  error: unknown
): JudgeSyncEvent => ({
  type: "error",
  provider,
  phase: "database",
  message: error instanceof Error ? error.message : String(error),
  stepsTotal: 0,
  stepsLeft: 0
});

const failedSyncCompletedEvent = (provider: JudgeSyncInput["provider"]): JudgeSyncEvent => {
  const summary = emptySummary();
  summary.errors = 1;
  return finalEvent(provider, 0, summary);
};

export const createJudgeSyncService = (
  registry: JudgeSyncRegistry
): JudgeSyncService & {
  readonly sync: (input: JudgeSyncInput) => AsyncIterable<JudgeSyncEvent>;
} => {
  const states: Record<JudgeSyncInput["provider"], ActiveJudgeSyncState> = {
    codeforces: createProviderState(),
    qoj: createProviderState()
  };

  return {
    start: async (input) => {
      const state = states[input.provider];
      if (state.running) {
        return;
      }

      const judge = judgeFor(input.provider, registry);
      const iterable = judge?.sync(input) ?? notImplementedJudgeSync(input);
      state.running = true;
      state.events = [];

      void (async () => {
        try {
          for await (const event of iterable) {
            state.events.push(event);
            state.hub.publish(event);
          }
        } catch (error) {
          const event = syncFailureEvent(input.provider, error);
          const completed = failedSyncCompletedEvent(input.provider);
          state.events.push(event, completed);
          state.hub.publish(event);
          state.hub.publish(completed);
        } finally {
          state.running = false;
          state.events = [];
        }
      })();
    },
    observe: async function* (input) {
      const state = states[input.provider];
      const eventsSubscription = state.hub.subscribe();
      const events = state.running ? [...state.events] : [];
      yield {
        type: "snapshot",
        provider: input.provider,
        running: state.running,
        events
      };
      yield* eventsSubscription;
    },
    sync: (input) => {
      const judge = judgeFor(input.provider, registry);
      return judge?.sync(input) ?? notImplementedJudgeSync(input);
    }
  };
};
