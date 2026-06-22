import { type JudgeSyncEvent, type JudgeSyncInput } from "@icpc-trainer/api";
import { type DatabaseService } from "@icpc-trainer/db";
import { Effect } from "effect";

import type { Judge } from "../judges.js";
import {
  createJudgeSyncRunner,
  emptySummary,
  finalEvent,
  findProblem,
  getSyncUsers,
  insertSubmission,
  providerJudge,
  submissionContext,
  syncContest,
  syncOperationErrorEvent,
  syncUserSubmissions,
  type EmitSyncEvent,
  type PendingSubmission,
  type SyncOperationError,
  SyncOperationError as SyncOperationErrorClass,
  type UpsertSubmissionResult
} from "./sync.js";

const retryPendingSubmission = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judgeId: ReturnType<typeof providerJudge>,
  pending: PendingSubmission
): Effect.Effect<UpsertSubmissionResult, SyncOperationError> =>
  Effect.gen(function* () {
    const context = submissionContext(provider, pending.user, pending.submission);
    const problem = yield* findProblem(database, judgeId, pending.submission.judgeProblemId, context);

    if (problem === undefined) {
      return yield* Effect.fail(new SyncOperationErrorClass({
        ...context,
        cause: new Error(
          pending.submission.judgeContestId === undefined
            ? `Problem ${pending.submission.judgeProblemId} was not found after contest sync.`
            : `Problem ${pending.submission.judgeProblemId} from contest ${pending.submission.judgeContestId} was not found after contest sync.`
        )
      }));
    }

    return yield* insertSubmission(database, judgeId, pending.user, pending.submission, problem, context);
  });

const runCodeforcesSyncProgram = (
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

      const userSyncResult = yield* Effect.either(
        syncUserSubmissions(database, provider, judgeId, judge, user, {
          queueMissingSubmissions: true
        })
      );
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
          if (pending.submission.judgeContestId === undefined) {
            continue;
          }
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
  yield* createJudgeSyncRunner((emit) =>
    runCodeforcesSyncProgram(database, input, judge, emit)
  );
}
