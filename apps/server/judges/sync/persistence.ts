import {
  type JudgeSyncInput,
  JudgeSyncStep
} from "@icpc-trainer/api";
import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES, SYNC_OPERATION_PHASES, USER_TYPES } from "@icpc-trainer/shared";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import type { JudgeContest, JudgeSubmission } from "../judges.js";
import { upsertExistingContestParticipations } from "../contestParticipation.js";
import { estimateProblemRating, estimateSolvePercentage } from "./problemRating.js";
import {
  syncEffect,
  SyncOperationError,
  type SyncOperationContext
} from "./events.js";

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

const now = (): Date => new Date();

const requiredContestLink = (contest: JudgeContest): string => {
  if (contest.link === undefined || contest.link.trim() === "") {
    throw new Error(`Simulated contest ${contest.judgeId} is missing a link.`);
  }

  return contest.link;
};

export const getSyncUsers = (
  database: DatabaseService,
  judge: JUDGES,
  provider: JudgeSyncInput["provider"]
): Effect.Effect<ReadonlyArray<SyncUser>, SyncOperationError> =>
  syncEffect({
    provider,
    phase: SYNC_OPERATION_PHASES.Database,
    action: "users to sync"
  }, () =>
    database.db
      .select()
      .from(users)
      .where(and(
        eq(users.judge, judge),
        eq(users.type, USER_TYPES.Team)
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
    phase: SYNC_OPERATION_PHASES.Database,
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
    .where(and(
      eq(submissions.judge, judge),
      eq(submissions.judgeId, submission.judgeId),
      eq(submissions.userId, user.id)
    ))
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
});

export const upsertContest = (
  database: DatabaseService,
  judge: JUDGES,
  contest: JudgeContest,
  context: SyncOperationContext
): Effect.Effect<number, SyncOperationError> => syncEffect(context, () => {
  const timestamp = now();
  const link = requiredContestLink(contest);

  database.db
    .insert(contests)
    .values({
      judgeId: contest.judgeId,
      judge,
      name: contest.name,
      link,
      participants: contest.participants,
      stars: contest.stars,
      simulated: true,
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
        simulated: true,
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
  Effect.gen(function* () {
    const userSubmissions = options.userSubmissions;
    const existingSubmissions = yield* existingSubmissionsByJudgeId(database, judge, user, provider);
    const submissionsByContest = new Map<string, JudgeSubmission[]>();

    for (const submission of userSubmissions) {
      if (submission.judgeContestId === undefined) {
        continue;
      }

      const contestSubmissions = submissionsByContest.get(submission.judgeContestId) ?? [];
      contestSubmissions.push(submission);
      submissionsByContest.set(submission.judgeContestId, contestSubmissions);
    }

    if (submissionsByContest.size > 0) {
      yield* upsertExistingContestParticipations(
        database,
        provider,
        judge,
        [...submissionsByContest.entries()].map(([contestJudgeId, contestSubmissions]) => ({
          user,
          contestJudgeId,
          submissions: contestSubmissions
        }))
      );
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const missingProblems = new Set<string>();
    const pendingSubmissions: PendingSubmission[] = [];

    for (const submission of userSubmissions) {
      const context = submissionContext(provider, user, submission);
      const problem = yield* findProblem(database, judge, submission.judgeProblemId, context);

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

      const result = yield* insertSubmission(database, judge, user, submission, problem, context);
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

    return yield* insertSubmission(database, judge, pending.user, pending.submission, problem, context);
  });
