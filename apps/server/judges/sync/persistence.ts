import {
  type JudgeSyncInput,
  JudgeSyncStep
} from "@icpc-trainer/api";
import { chunks, excludedColumn, SQLITE_BINDING_CHUNK_SIZE, type DatabaseService, schema } from "@icpc-trainer/db";
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
  readonly missingSubmissions: ReadonlyArray<PendingSubmission>;
}

export interface PendingSubmissionRetryResult extends UpsertSubmissionResult {
  readonly processed: number;
  readonly missingSubmissions: ReadonlyArray<PendingSubmission>;
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
  readonly contestId: number;
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
        contestId: problems.contestId,
        userId: submissions.userId,
        status: submissions.status,
        submittedAt: submissions.submittedAt
      })
      .from(submissions)
      .innerJoin(problems, eq(problems.id, submissions.problemId))
      .where(and(eq(submissions.judge, judge), eq(submissions.userId, user.id)))
      .all();

    return new Map(rows.map((row) => [row.judgeId, row]));
  });

interface SubmissionWrite {
  readonly user: SyncUser;
  readonly submission: JudgeSubmission;
  readonly problem: ProblemRow;
  readonly existing: ExistingSubmissionRow | undefined;
}

const sameSubmissionRow = (
  existing: ExistingSubmissionRow | undefined,
  user: SyncUser,
  submission: JudgeSubmission,
  problem: ProblemRow
): boolean =>
  existing !== undefined &&
  existing.problemId === problem.id &&
  existing.userId === user.id &&
  existing.status === submission.verdict &&
  existing.submittedAt.getTime() === submission.submittedAt.getTime();

const upsertSubmissionRows = async (
  database: DatabaseService,
  judge: JUDGES,
  writes: ReadonlyArray<SubmissionWrite>,
  timestamp: Date
): Promise<UpsertSubmissionResult> => {
  if (writes.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  for (const writeChunk of chunks(writes, SQLITE_BINDING_CHUNK_SIZE)) {
    await database.db
      .insert(submissions)
      .values(writeChunk.map(({ user, submission, problem }) => ({
        judgeId: submission.judgeId,
        judge,
        problemId: problem.id,
        userId: user.id,
        status: submission.verdict,
        submittedAt: submission.submittedAt,
        createdAt: timestamp,
        updatedAt: timestamp
      })))
      .onConflictDoUpdate({
        target: [submissions.judgeId, submissions.judge, submissions.userId],
        set: {
          problemId: excludedColumn("problem_id"),
          status: excludedColumn("status"),
          submittedAt: excludedColumn("submitted_at"),
          updatedAt: excludedColumn("updated_at")
        }
      })
      .run();
  }

  return {
    inserted: writes.filter((write) => write.existing === undefined).length,
    updated: writes.filter((write) => write.existing !== undefined).length,
    skipped: 0
  };
};

export const refreshUserContestStatesFromSubmissions = (
  database: DatabaseService,
  user: SyncUser,
  contestIds: ReadonlyArray<number>,
  context: SyncOperationContext
): Effect.Effect<void, SyncOperationError> => syncEffect(context, async () => {
  const uniqueContestIds = [...new Set(contestIds)];
  if (uniqueContestIds.length === 0) {
    return;
  }

  const timestamp = now();
  const rowsByContestId = new Map<number, {
    readonly contestId: number;
    readonly submissionCount: number;
    readonly acceptedCount: number | null;
    readonly distinctProblemCount: number;
    readonly lastSubmissionAt: Date | string | number | null;
  }>();

  for (const contestIdChunk of chunks(uniqueContestIds, SQLITE_BINDING_CHUNK_SIZE)) {
    const rows = await database.db
      .select({
        contestId: problems.contestId,
        submissionCount: count(submissions.id),
        acceptedCount: sum(eq(submissions.status, SUBMISSION_STATUSES.AC)).mapWith(Number),
        distinctProblemCount: countDistinct(submissions.problemId),
        lastSubmissionAt: max(submissions.submittedAt)
      })
      .from(submissions)
      .innerJoin(problems, eq(problems.id, submissions.problemId))
      .where(and(eq(submissions.userId, user.id), inArray(problems.contestId, contestIdChunk)))
      .groupBy(problems.contestId)
      .all();

    for (const row of rows) {
      rowsByContestId.set(row.contestId, row);
    }
  }

  const stateRows = uniqueContestIds.map((contestId) => {
    const row = rowsByContestId.get(contestId);
    const distinctProblemCount = row?.distinctProblemCount ?? 0;
    const lastSubmissionAt = row?.lastSubmissionAt instanceof Date
      ? row.lastSubmissionAt
      : row?.lastSubmissionAt === null || row?.lastSubmissionAt === undefined
        ? null
        : new Date(row.lastSubmissionAt);

    return {
      userId: user.id,
      contestId,
      submissionCount: row?.submissionCount ?? 0,
      acceptedCount: row?.acceptedCount ?? 0,
      distinctProblemCount,
      simulated: distinctProblemCount >= 2,
      lastSubmissionAt,
      updatedAt: timestamp
    };
  });

  for (const stateChunk of chunks(stateRows, SQLITE_BINDING_CHUNK_SIZE)) {
    await database.db
      .insert(userContestStates)
      .values(stateChunk)
      .onConflictDoUpdate({
        target: [userContestStates.userId, userContestStates.contestId],
        set: {
          submissionCount: excludedColumn("submission_count"),
          acceptedCount: excludedColumn("accepted_count"),
          distinctProblemCount: excludedColumn("distinct_problem_count"),
          simulated: excludedColumn("simulated"),
          lastSubmissionAt: excludedColumn("last_submission_at"),
          updatedAt: excludedColumn("updated_at")
        }
      })
      .run();
  }
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
  const problemRows = contest.problems.map((problem) => {
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

    return {
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
    };
  });

  for (const problemRowChunk of chunks(problemRows, SQLITE_BINDING_CHUNK_SIZE)) {
    if (problemRowChunk.length === 0) {
      continue;
    }

    await database.db
      .insert(problems)
      .values(problemRowChunk)
      .onConflictDoUpdate({
        target: [problems.judgeId, problems.judge],
        set: {
          name: excludedColumn("name"),
          link: excludedColumn("link"),
          contestId: excludedColumn("contest_id"),
          solves: excludedColumn("solves"),
          solvePercentage: excludedColumn("solve_percentage"),
          rating: excludedColumn("rating"),
          updatedAt: excludedColumn("updated_at")
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
  contestId: number | string
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
    const missingSubmissions: PendingSubmission[] = [];
    const submissionWrites: SubmissionWrite[] = [];
    const affectedContestIds = new Set<number>();
    const timestamp = now();

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
        } else {
          missingSubmissions.push({ user, submission });
        }
        if (options.countMissingAsSkipped) {
          skipped += 1;
        }
        continue;
      }

      const existing = existingSubmissions.get(submission.judgeId);
      affectedContestIds.add(problem.contestId);
      if (existing !== undefined && existing.contestId !== problem.contestId) {
        affectedContestIds.add(existing.contestId);
      }
      existingSubmissions.set(submission.judgeId, {
        judgeId: submission.judgeId,
        problemId: problem.id,
        contestId: problem.contestId,
        userId: user.id,
        status: submission.verdict,
        submittedAt: submission.submittedAt
      });
      if (sameSubmissionRow(existing, user, submission, problem)) {
        skipped += 1;
      } else {
        submissionWrites.push({ user, submission, problem, existing });
      }
    }

    const writeResult = yield* syncEffect(
      userSubmissionBatchContext(provider, user),
      () => upsertSubmissionRows(database, judge, submissionWrites, timestamp)
    );
    inserted += writeResult.inserted;
    updated += writeResult.updated;
    skipped += writeResult.skipped;

    yield* refreshUserContestStatesFromSubmissions(
      database,
      user,
      [...affectedContestIds],
      userContestStateContext(provider, user, [...affectedContestIds].join(", "))
    );

    return {
      fetched: userSubmissions.length,
      inserted,
      updated,
      skipped,
      missingProblems: missingProblems.size,
      pendingSubmissions,
      missingSubmissions
    };
  });

export const missingProblemAfterContestSyncError = (
  provider: JudgeSyncInput["provider"],
  pending: PendingSubmission
): SyncOperationError => {
  const context = submissionContext(provider, pending.user, pending.submission);

  return new SyncOperationError({
    ...context,
    cause: new Error(
      pending.submission.judgeContestId === undefined
        ? `Problem ${pending.submission.judgeProblemId} was not found after contest sync.`
        : `Problem ${pending.submission.judgeProblemId} from contest ${pending.submission.judgeContestId} was not found after contest sync.`
    )
  });
};

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
    const missingSubmissions: PendingSubmission[] = [];

    for (const { user, submissions: userSubmissions } of pendingByUser.values()) {
      const result = yield* syncUserSubmissionRows(database, provider, judge, user, {
        userSubmissions,
        queueMissingSubmissions: false,
        countMissingAsSkipped: false
      });

      inserted += result.inserted;
      updated += result.updated;
      skipped += result.skipped;
      missingSubmissions.push(...result.missingSubmissions);
    }

    return {
      inserted,
      updated,
      skipped,
      processed: inserted + updated + skipped,
      missingSubmissions
    };
  });
