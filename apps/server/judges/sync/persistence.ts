import {
  type JudgeSyncInput,
  JudgeSyncStep
} from "@icpc-trainer/api";
import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, SYNC_OPERATION_PHASES, USER_TYPES } from "@icpc-trainer/shared";
import { and, count, countDistinct, eq, inArray, max, sum } from "drizzle-orm";
import { Effect } from "effect";

import type { JudgeContest, JudgeSubmission } from "../judges.js";
import { estimateProblemRating, estimateSolvePercentage } from "./problemRating.js";
import {
  syncEffect,
  SyncOperationError,
  type SyncOperationContext
} from "./events.js";

const { appUserJudgeUsers, contests, problems, submissions, userContestStates, users } = schema;
const SQLITE_BINDING_CHUNK_SIZE = 500;

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

export interface PendingSubmissionRetryResult extends UpsertSubmissionResult {
  readonly processed: number;
}

const now = (): Date => new Date();

const requiredContestLink = (contest: JudgeContest): string => {
  if (contest.link === undefined || contest.link.trim() === "") {
    throw new Error(`Simulated contest ${contest.judgeId} is missing a link.`);
  }

  return contest.link;
};

export const getSyncUsers = (
  database: DatabaseService,
  appUserId: number,
  judge: JUDGES,
  provider: JudgeSyncInput["provider"]
): Effect.Effect<ReadonlyArray<SyncUser>, SyncOperationError> =>
  syncEffect({
    provider,
    phase: SYNC_OPERATION_PHASES.Database,
    action: "users to sync"
  }, async () =>
    (await database.db
      .select()
      .from(appUserJudgeUsers)
      .innerJoin(users, eq(users.id, appUserJudgeUsers.userId))
      .where(and(
        eq(appUserJudgeUsers.appUserId, appUserId),
        eq(appUserJudgeUsers.role, USER_TYPES.Team),
        eq(users.judge, judge),
      ))
      .all())
      .map((row) => row.users)
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

const chunks = <T>(values: ReadonlyArray<T>, size: number): T[][] => {
  const result: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    result.push([...values.slice(index, index + size)]);
  }

  return result;
};

export const findProblemsByJudgeId = (
  database: DatabaseService,
  judge: JUDGES,
  judgeProblemIds: ReadonlyArray<string>,
  context: SyncOperationContext
): Effect.Effect<ReadonlyMap<string, ProblemRow>, SyncOperationError> =>
  syncEffect(context, async () => {
    const uniqueProblemIds = [...new Set(judgeProblemIds)];
    const rowsByJudgeId = new Map<string, ProblemRow>();

    for (const problemIdChunk of chunks(uniqueProblemIds, SQLITE_BINDING_CHUNK_SIZE)) {
      if (problemIdChunk.length === 0) {
        continue;
      }

      const rows = await database.db
        .select()
        .from(problems)
        .where(and(eq(problems.judge, judge), inArray(problems.judgeId, problemIdChunk)))
        .all();

      for (const row of rows) {
        rowsByJudgeId.set(row.judgeId, row);
      }
    }

    return rowsByJudgeId;
  });

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
    phase: SYNC_OPERATION_PHASES.Database,
    action: `existing submissions for user ${user.username}`,
    userHandle: user.username
  }, async () => {
    const rows = await database.db
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
): Effect.Effect<UpsertSubmissionResult, SyncOperationError> => syncEffect(context, async () => {
  const timestamp = now();
  const existing = await database.db
    .select({
      judgeId: submissions.judgeId,
      problemId: submissions.problemId,
      userId: submissions.userId,
      status: submissions.status,
      submittedAt: submissions.submittedAt
    })
    .from(submissions)
    .where(and(
      eq(submissions.judge, judge),
      eq(submissions.judgeId, submission.judgeId),
      eq(submissions.userId, user.id)
    ))
    .get();

  return await upsertSubmissionRow(database, judge, user, submission, problem, existing, timestamp);
});

const upsertSubmissionRow = async (
  database: DatabaseService,
  judge: JUDGES,
  user: SyncUser,
  submission: JudgeSubmission,
  problem: ProblemRow,
  existing: ExistingSubmissionRow | undefined,
  timestamp: Date
): Promise<UpsertSubmissionResult> => {
  if (
    existing !== undefined &&
    existing.problemId === problem.id &&
    existing.userId === user.id &&
    existing.status === submission.verdict &&
    existing.submittedAt.getTime() === submission.submittedAt.getTime()
  ) {
    return { inserted: 0, updated: 0, skipped: 1 };
  }

  await database.db
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
      target: [submissions.judgeId, submissions.judge, submissions.userId],
      set: {
        problemId: problem.id,
        status: submission.verdict,
        submittedAt: submission.submittedAt,
        updatedAt: timestamp
      }
    })
    .run();

  return existing === undefined
    ? { inserted: 1, updated: 0, skipped: 0 }
    : { inserted: 0, updated: 1, skipped: 0 };
};

const insertSubmissionWithExisting = (
  database: DatabaseService,
  judge: JUDGES,
  user: SyncUser,
  submission: JudgeSubmission,
  problem: ProblemRow,
  existing: ExistingSubmissionRow | undefined,
  context: SyncOperationContext
): Effect.Effect<UpsertSubmissionResult, SyncOperationError> =>
  syncEffect(context, () =>
    upsertSubmissionRow(database, judge, user, submission, problem, existing, now())
  );

export const refreshUserContestStateFromSubmissions = (
  database: DatabaseService,
  user: SyncUser,
  contestId: number,
  context: SyncOperationContext
): Effect.Effect<void, SyncOperationError> => syncEffect(context, async () => {
  const timestamp = now();
  const row = await database.db
    .select({
      submissionCount: count(submissions.id),
      acceptedCount: sum(eq(submissions.status, SUBMISSION_STATUSES.AC)).mapWith(Number),
      distinctProblemCount: countDistinct(submissions.problemId),
      lastSubmissionAt: max(submissions.submittedAt)
    })
    .from(submissions)
    .innerJoin(problems, eq(problems.id, submissions.problemId))
    .where(and(eq(submissions.userId, user.id), eq(problems.contestId, contestId)))
    .get();
  const distinctProblemCount = row?.distinctProblemCount ?? 0;
  const lastSubmissionAt = row?.lastSubmissionAt instanceof Date
    ? row.lastSubmissionAt
    : row?.lastSubmissionAt === null || row?.lastSubmissionAt === undefined
      ? null
      : new Date(row.lastSubmissionAt);

  await database.db
    .insert(userContestStates)
    .values({
      userId: user.id,
      contestId,
      submissionCount: row?.submissionCount ?? 0,
      acceptedCount: row?.acceptedCount ?? 0,
      distinctProblemCount,
      simulated: distinctProblemCount >= 2,
      lastSubmissionAt,
      updatedAt: timestamp
    })
    .onConflictDoUpdate({
      target: [userContestStates.userId, userContestStates.contestId],
      set: {
        submissionCount: row?.submissionCount ?? 0,
        acceptedCount: row?.acceptedCount ?? 0,
        distinctProblemCount,
        simulated: distinctProblemCount >= 2,
        lastSubmissionAt,
        updatedAt: timestamp
      }
    })
    .run();
});

export const upsertContest = (
  database: DatabaseService,
  judge: JUDGES,
  contest: JudgeContest,
  context: SyncOperationContext
): Effect.Effect<number, SyncOperationError> => syncEffect(context, async () => {
  const timestamp = now();
  const link = requiredContestLink(contest);

  await database.db
    .insert(contests)
    .values({
      judgeId: contest.judgeId,
      judge,
      name: contest.name,
      link,
      participants: contest.participants,
      stars: contest.stars,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoUpdate({
      target: [contests.judgeId, contests.judge],
      set: {
        name: contest.name,
        link,
        participants: contest.participants,
        stars: contest.stars,
        updatedAt: timestamp
      }
    })
    .run();

  const row = await database.db
    .select({ id: contests.id })
    .from(contests)
    .where(and(eq(contests.judge, judge), eq(contests.judgeId, contest.judgeId)))
    .get();

  if (row === undefined) {
    throw new Error(`Simulated contest ${contest.judgeId} was not found after upsert.`);
  }

  return row.id;
});

export const upsertContestProblems = (
  database: DatabaseService,
  judge: JUDGES,
  contest: JudgeContest,
  contestId: number,
  context: SyncOperationContext
): Effect.Effect<number, SyncOperationError> => syncEffect(context, async () => {
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

    await database.db
      .insert(problems)
      .values({
        judgeId: problem.judgeId,
        judge,
        name: problem.name,
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
          name: problem.name,
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

export const upsertFetchedContest = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: JUDGES,
  contest: JudgeContest
): Effect.Effect<number, SyncOperationError> =>
  Effect.gen(function* () {
    const contestContext = {
      provider,
      phase: SYNC_OPERATION_PHASES.Contests as const,
      step: JudgeSyncStep.Contests,
      action: `contest ${contest.judgeId}`,
      contestJudgeId: contest.judgeId
    };
    const contestId = yield* upsertContest(database, judge, contest, contestContext);
    return yield* upsertContestProblems(database, judge, contest, contestId, contestContext);
  });

export const submissionContext = (
  provider: JudgeSyncInput["provider"],
  user: SyncUser,
  submission: JudgeSubmission
): SyncOperationContext => ({
  provider,
  phase: SYNC_OPERATION_PHASES.Database,
  action: `submission ${submission.judgeId} for user ${user.username}`,
  userHandle: user.username,
  judgeId: submission.judgeId,
  contestJudgeId: submission.judgeContestId
});

const userSubmissionBatchContext = (
  provider: JudgeSyncInput["provider"],
  user: SyncUser
): SyncOperationContext => ({
  provider,
  phase: SYNC_OPERATION_PHASES.Database,
  action: `known problems for user ${user.username}`,
  userHandle: user.username
});

const userContestStateContext = (
  provider: JudgeSyncInput["provider"],
  user: SyncUser,
  contestId: number
): SyncOperationContext => ({
  provider,
  phase: SYNC_OPERATION_PHASES.Database,
  action: `contest state ${contestId} for user ${user.username}`,
  userHandle: user.username
});

const syncUserSubmissionRows = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: JUDGES,
  user: SyncUser,
  options: {
    readonly userSubmissions: ReadonlyArray<JudgeSubmission>;
    readonly queueMissingSubmissions: boolean;
    readonly countMissingAsSkipped: boolean;
  }
): Effect.Effect<UserSubmissionSyncResult, SyncOperationError> =>
  Effect.gen(function* () {
    const userSubmissions = options.userSubmissions;
    const existingSubmissions = new Map(yield* existingSubmissionsByJudgeId(database, judge, user, provider));
    const problemRows = yield* findProblemsByJudgeId(
      database,
      judge,
      userSubmissions.map((submission) => submission.judgeProblemId),
      userSubmissionBatchContext(provider, user)
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const missingProblems = new Set<string>();
    const pendingSubmissions: PendingSubmission[] = [];
    const affectedContestIds = new Set<number>();

    for (const submission of userSubmissions) {
      const context = submissionContext(provider, user, submission);
      const problem = problemRows.get(submission.judgeProblemId);

      if (problem === undefined) {
        if (existingSubmissions.has(submission.judgeId)) {
          if (options.countMissingAsSkipped) {
            skipped += 1;
          }
          continue;
        }

        if (options.queueMissingSubmissions && submission.judgeContestId !== undefined) {
          pendingSubmissions.push({ user, submission });
          missingProblems.add(submission.judgeProblemId);
        }
        if (options.countMissingAsSkipped) {
          skipped += 1;
        }
        continue;
      }

      const result = yield* insertSubmissionWithExisting(
        database,
        judge,
        user,
        submission,
        problem,
        existingSubmissions.get(submission.judgeId),
        context
      );
      affectedContestIds.add(problem.contestId);
      existingSubmissions.set(submission.judgeId, {
        judgeId: submission.judgeId,
        problemId: problem.id,
        userId: user.id,
        status: submission.verdict,
        submittedAt: submission.submittedAt
      });
      inserted += result.inserted;
      updated += result.updated;
      skipped += result.skipped;
    }

    for (const contestId of affectedContestIds) {
      yield* refreshUserContestStateFromSubmissions(
        database,
        user,
        contestId,
        userContestStateContext(provider, user, contestId)
      );
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

export const syncUserSubmissions = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: JUDGES,
  user: SyncUser,
  options: {
    readonly queueMissingSubmissions: boolean;
    readonly userSubmissions: ReadonlyArray<JudgeSubmission>;
  }
): Effect.Effect<UserSubmissionSyncResult, SyncOperationError> =>
  syncUserSubmissionRows(database, provider, judge, user, {
    ...options,
    countMissingAsSkipped: true
  });

export const retryPendingSubmission = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: JUDGES,
  pending: PendingSubmission
): Effect.Effect<UpsertSubmissionResult, SyncOperationError> =>
  Effect.gen(function* () {
    const context = submissionContext(provider, pending.user, pending.submission);
    const problem = yield* findProblem(database, judge, pending.submission.judgeProblemId, context);

    if (problem === undefined) {
      return yield* Effect.fail(new SyncOperationError({
        ...context,
        cause: new Error(
          pending.submission.judgeContestId === undefined
            ? `Problem ${pending.submission.judgeProblemId} was not found after contest sync.`
            : `Problem ${pending.submission.judgeProblemId} from contest ${pending.submission.judgeContestId} was not found after contest sync.`
        )
      }));
    }

    const result = yield* insertSubmission(database, judge, pending.user, pending.submission, problem, context);
    yield* refreshUserContestStateFromSubmissions(database, pending.user, problem.contestId, context);
    return result;
  });

export const retryPendingSubmissions = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: JUDGES,
  pendingSubmissions: ReadonlyArray<PendingSubmission>
): Effect.Effect<PendingSubmissionRetryResult, SyncOperationError> =>
  Effect.gen(function* () {
    const pendingByUser = new Map<number, { readonly user: SyncUser; readonly submissions: JudgeSubmission[] }>();

    for (const pending of pendingSubmissions) {
      const entry = pendingByUser.get(pending.user.id) ?? {
        user: pending.user,
        submissions: []
      };
      entry.submissions.push(pending.submission);
      pendingByUser.set(pending.user.id, entry);
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const { user, submissions: userSubmissions } of pendingByUser.values()) {
      const result = yield* syncUserSubmissionRows(database, provider, judge, user, {
        userSubmissions,
        queueMissingSubmissions: false,
        countMissingAsSkipped: false
      });

      inserted += result.inserted;
      updated += result.updated;
      skipped += result.skipped;
    }

    return {
      inserted,
      updated,
      skipped,
      processed: inserted + updated + skipped
    };
  });
