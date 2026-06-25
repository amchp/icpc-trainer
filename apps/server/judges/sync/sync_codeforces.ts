import {
  AppUserIdTag,
  type AppScopedJudgeSyncInput,
  type JudgeSyncEvent,
  type JudgeSyncInput,
  JudgeSyncStep,
  SyncStepStatus
} from "@icpc-trainer/api";
import { type DatabaseService, type DatabaseServiceTag } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, SYNC_OPERATION_PHASES } from "@icpc-trainer/shared";
import { Effect } from "effect";

import type {
  JudgeContest,
  JudgeRegularCatalogContest,
  JudgeRegularCatalogProblem,
  JudgeSubmission
} from "../judges.js";
import {
  upsertExistingContestParticipations,
  type ExistingContestParticipationInput
} from "../contestParticipation.js";
import {
  emptySummary,
  finalEvent,
  runJudgeOperation,
  syncOperationErrorEvent,
  type SyncOperationError
} from "./events.js";
import {
  findProblem,
  getSyncUsers,
  retryPendingSubmission,
  submissionContext,
  syncUserSubmissions,
  upsertFetchedContest,
  type PendingSubmission
} from "./persistence.js";
import {
  createJudgeSyncRunner
} from "./runtime.js";
import {
  createSyncStepProgress,
  startedEvent,
  syncStepEvent,
  type EmitSyncEvent
} from "./progress.js";
import { upsertCodeforcesRegularCatalog } from "./codeforcesRegularCatalog.js";

const CODEFORCES_GYM_CONTEST_ID_MIN = 100000;
const CODEFORCES_GYM_CONTEST_ID_MAX = 200000;
const CODEFORCES_GYM_CONTEST_URL = "https://codeforces.com/gym";
const CODEFORCES_REGULAR_CONTEST_URL = "https://codeforces.com/contest";

export interface CodeforcesSyncOperations {
  readonly getContest: (contestId: string) => Effect.Effect<JudgeContest, unknown, DatabaseServiceTag | AppUserIdTag>;
  readonly getSubmissions: (
    options?: { readonly userHandle: string }
  ) => Effect.Effect<ReadonlyArray<JudgeSubmission>, unknown, DatabaseServiceTag | AppUserIdTag>;
  readonly getRegularContests: () => Effect.Effect<ReadonlyArray<JudgeRegularCatalogContest>, unknown, DatabaseServiceTag | AppUserIdTag>;
  readonly getRegularProblems: () => Effect.Effect<ReadonlyArray<JudgeRegularCatalogProblem>, unknown, DatabaseServiceTag | AppUserIdTag>;
}

const isGymContestJudgeId = (contestJudgeId: string): boolean => {
  const contestId = Number(contestJudgeId);
  return Number.isInteger(contestId) &&
    contestId >= CODEFORCES_GYM_CONTEST_ID_MIN &&
    contestId <= CODEFORCES_GYM_CONTEST_ID_MAX;
};

const hasAcceptedPendingSubmission = (
  pendingSubmissionsByContest: ReadonlyMap<string, readonly PendingSubmission[]>,
  contestJudgeId: string
): boolean =>
  (pendingSubmissionsByContest.get(contestJudgeId) ?? []).some(
    (pending) => pending.submission.verdict === SUBMISSION_STATUSES.AC
  );

const pendingContestParticipations = (
  contestJudgeId: string,
  pendingSubmissions: readonly PendingSubmission[]
): ExistingContestParticipationInput[] => {
  const submissionsByUser = new Map<number, {
    readonly user: PendingSubmission["user"];
    readonly submissions: JudgeSubmission[];
  }>();

  for (const pending of pendingSubmissions) {
    const entry = submissionsByUser.get(pending.user.id) ?? {
      user: pending.user,
      submissions: []
    };
    entry.submissions.push(pending.submission);
    submissionsByUser.set(pending.user.id, entry);
  }

  return [...submissionsByUser.values()].map(({ user, submissions }) => ({
    user,
    contestJudgeId,
    submissions
  }));
};

const getUserSubmissions = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  operations: CodeforcesSyncOperations,
  userHandle: string
): Effect.Effect<ReadonlyArray<JudgeSubmission>, SyncOperationError, AppUserIdTag> =>
  runJudgeOperation(database, {
    provider,
    phase: SYNC_OPERATION_PHASES.Submissions,
    step: JudgeSyncStep.Submissions,
    action: `submissions for user ${userHandle}`,
    userHandle
  }, operations.getSubmissions({ userHandle }));

const codeforcesContestLink = (contestJudgeId: string): string =>
  isGymContestJudgeId(contestJudgeId)
    ? `${CODEFORCES_GYM_CONTEST_URL}/${encodeURIComponent(contestJudgeId)}`
    : `${CODEFORCES_REGULAR_CONTEST_URL}/${encodeURIComponent(contestJudgeId)}`;

const withCodeforcesContestLink = (contest: JudgeContest): JudgeContest => ({
  ...contest,
  link: contest.link ?? codeforcesContestLink(contest.judgeId)
});

const withCodeforcesRegularContestLink = (
  contest: JudgeRegularCatalogContest
): JudgeRegularCatalogContest => ({
  ...contest,
  link: contest.link ?? codeforcesContestLink(contest.judgeId)
});

export const syncCodeforcesContest = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  contestJudgeId: string,
  operations: CodeforcesSyncOperations
): Effect.Effect<number, SyncOperationError, AppUserIdTag> =>
  Effect.gen(function* () {
    const contest = yield* runJudgeOperation(database, {
      provider,
      phase: SYNC_OPERATION_PHASES.Contests,
      step: JudgeSyncStep.Contests,
      action: `contest ${contestJudgeId}`,
      contestJudgeId
    }, operations.getContest(contestJudgeId));

    return yield* upsertFetchedContest(database, provider, JUDGES.Codeforces, withCodeforcesContestLink(contest));
  });

const runCodeforcesSyncProgram = (
  database: DatabaseService,
  input: AppScopedJudgeSyncInput,
  operations: CodeforcesSyncOperations,
  emit: EmitSyncEvent
): Effect.Effect<void, never, AppUserIdTag> =>
  Effect.gen(function* () {
    const provider = input.provider;
    const judgeId = JUDGES.Codeforces;
    const summary = emptySummary();
    const syncUsersResult = yield* Effect.either(getSyncUsers(database, input.appUserId, judgeId, provider));

    if (syncUsersResult._tag === "Left") {
      summary.errors += 1;
      yield* emit(syncOperationErrorEvent(syncUsersResult.left, 0, 0));
      yield* emit(finalEvent(provider, 0, summary));
      return;
    }

    const syncUsers = syncUsersResult.right;
    const pendingSubmissionsByContest = new Map<string, PendingSubmission[]>();
    const missingProblemIdsByContest = new Map<string, Set<string>>();
    yield* emit(startedEvent(provider));

    const submissionProgress = createSyncStepProgress(
      provider,
      JudgeSyncStep.Submissions,
      syncUsers.length,
      emit
    );
    yield* submissionProgress.start();

    for (const [index, user] of syncUsers.entries()) {
      yield* submissionProgress.running(index, user.username);

      const userSubmissionsResult = yield* Effect.either(
        getUserSubmissions(database, provider, operations, user.username)
      );

      if (userSubmissionsResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(
          userSubmissionsResult.left,
          submissionProgress.stepsTotal,
          submissionProgress.stepsLeft()
        ));
        yield* submissionProgress.completeCurrent(user.username);
        continue;
      }

      const userSyncResult = yield* Effect.either(
        syncUserSubmissions(database, provider, judgeId, user, {
          queueMissingSubmissions: true,
          userSubmissions: userSubmissionsResult.right
        })
      );

      if (userSyncResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(
          userSyncResult.left,
          submissionProgress.stepsTotal,
          submissionProgress.stepsLeft()
        ));
      } else {
        summary.usersProcessed += 1;
        summary.submissionsFetched += userSyncResult.right.fetched;
        summary.submissionsInserted += userSyncResult.right.inserted;
        summary.submissionsUpdated += userSyncResult.right.updated;
        summary.submissionsSkipped += userSyncResult.right.skipped;

        for (const pending of userSyncResult.right.pendingSubmissions) {
          if (pending.submission.judgeContestId === undefined) {
            continue;
          }

          const pendingSubmissions = pendingSubmissionsByContest.get(pending.submission.judgeContestId) ?? [];
          pendingSubmissions.push(pending);
          pendingSubmissionsByContest.set(pending.submission.judgeContestId, pendingSubmissions);

          const missingProblemIds = missingProblemIdsByContest.get(pending.submission.judgeContestId) ?? new Set<string>();
          missingProblemIds.add(pending.submission.judgeProblemId);
          missingProblemIdsByContest.set(pending.submission.judgeContestId, missingProblemIds);
        }
      }

      yield* submissionProgress.completeCurrent(user.username);
    }

    const contestIds = [...missingProblemIdsByContest.entries()]
      .filter(([contestJudgeId]) => isGymContestJudgeId(contestJudgeId))
      .filter(([, problemIds]) => problemIds.size >= 2)
      .map(([contestJudgeId]) => contestJudgeId)
      .sort((left, right) => Number(left) - Number(right));
    const contestProgress = createSyncStepProgress(
      provider,
      JudgeSyncStep.Contests,
      contestIds.length,
      emit
    );
    yield* contestProgress.start();

    for (const [index, contestJudgeId] of contestIds.entries()) {
      yield* contestProgress.running(index, contestJudgeId);

      const contestSyncResult = yield* Effect.either(
        syncCodeforcesContest(database, provider, contestJudgeId, operations)
      );

      if (contestSyncResult._tag === "Left") {
        summary.errors += 1;
        yield* contestProgress.completeCurrent(contestJudgeId);
        yield* emit(syncOperationErrorEvent(
          contestSyncResult.left,
          contestProgress.stepsTotal,
          contestProgress.stepsLeft()
        ));
        continue;
      }

      const pendingSubmissions = pendingSubmissionsByContest.get(contestJudgeId) ?? [];
      pendingSubmissionsByContest.delete(contestJudgeId);
      const participationResult = yield* Effect.either(upsertExistingContestParticipations(
        database,
        provider,
        judgeId,
        pendingContestParticipations(contestJudgeId, pendingSubmissions)
      ));
      if (participationResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(
          participationResult.left,
          contestProgress.stepsTotal,
          contestProgress.stepsLeft()
        ));
      }

      for (const pending of pendingSubmissions) {
        const retryResult = yield* Effect.either(retryPendingSubmission(database, provider, judgeId, pending));
        if (retryResult._tag === "Left") {
          summary.errors += 1;
          yield* emit(syncOperationErrorEvent(
            retryResult.left,
            contestProgress.stepsTotal,
            contestProgress.stepsLeft()
          ));
        } else {
          summary.submissionsInserted += retryResult.right.inserted;
          summary.submissionsUpdated += retryResult.right.updated;
          summary.submissionsSkipped = Math.max(summary.submissionsSkipped - 1, 0);
        }
      }

      summary.contestsSynced += 1;
      yield* contestProgress.completeCurrent(contestJudgeId);
    }

    const regularContestIds = [...missingProblemIdsByContest.entries()]
      .filter(([contestJudgeId]) => !isGymContestJudgeId(contestJudgeId))
      .filter(([contestJudgeId, problemIds]) =>
        problemIds.size >= 2 || hasAcceptedPendingSubmission(pendingSubmissionsByContest, contestJudgeId)
      )
      .map(([contestJudgeId]) => contestJudgeId);
    const regularContestIdSet = new Set(regularContestIds);

    if (syncUsers.length === 0 || regularContestIds.length === 0) {
      yield* emit(finalEvent(provider, contestProgress.stepsTotal, summary));
      return;
    }

    let completedRegularSteps = 0;
    const regularStepsTotal = 2;
    const regularStepsLeft = (): number => Math.max(regularStepsTotal - completedRegularSteps, 0);
    yield* emit(syncStepEvent(
      provider,
      JudgeSyncStep.RegularCatalog,
      SyncStepStatus.Running,
      { processed: 0, total: 2, current: "contests", stepsTotal: regularStepsTotal, stepsLeft: regularStepsLeft() }
    ));

    const regularContestCatalogResult = yield* Effect.either(
      runJudgeOperation(
        database,
        {
          provider,
          phase: SYNC_OPERATION_PHASES.RegularCatalog,
          step: JudgeSyncStep.RegularCatalog,
          action: "regular contest list"
        },
        operations.getRegularContests()
      )
    );

    if (regularContestCatalogResult._tag === "Left") {
      summary.errors += 1;
      yield* emit(syncOperationErrorEvent(regularContestCatalogResult.left, regularStepsTotal, regularStepsLeft()));
      yield* emit(finalEvent(provider, regularStepsTotal, summary));
      return;
    }

    const regularContestCatalog = regularContestCatalogResult.right;
    completedRegularSteps += 1;
    yield* emit(syncStepEvent(
      provider,
      JudgeSyncStep.RegularCatalog,
      SyncStepStatus.Running,
      {
        processed: 1,
        total: 2,
        current: `${regularContestCatalog.length} contests`,
        stepsTotal: regularStepsTotal,
        stepsLeft: regularStepsLeft()
      }
    ));
    yield* emit(syncStepEvent(
      provider,
      JudgeSyncStep.RegularCatalog,
      SyncStepStatus.Running,
      { processed: 1, total: 2, current: "problems", stepsTotal: regularStepsTotal, stepsLeft: regularStepsLeft() }
    ));

    const regularProblemCatalogResult = yield* Effect.either(
      runJudgeOperation(
        database,
        {
          provider,
          phase: SYNC_OPERATION_PHASES.RegularCatalog,
          step: JudgeSyncStep.RegularCatalog,
          action: "regular problem catalog"
        },
        operations.getRegularProblems()
      )
    );

    if (regularProblemCatalogResult._tag === "Left") {
      summary.errors += 1;
      yield* emit(syncOperationErrorEvent(regularProblemCatalogResult.left, regularStepsTotal, regularStepsLeft()));
      yield* emit(finalEvent(provider, regularStepsTotal, summary));
      return;
    }

    const regularImportResult = yield* Effect.either(
      upsertCodeforcesRegularCatalog(
        database,
        provider,
        regularContestIdSet,
        regularContestCatalog.map(withCodeforcesRegularContestLink),
        regularProblemCatalogResult.right
      )
    );
    completedRegularSteps += 1;

    if (regularImportResult._tag === "Left") {
      summary.errors += 1;
      yield* emit(syncOperationErrorEvent(regularImportResult.left, regularStepsTotal, regularStepsLeft()));
      yield* emit(finalEvent(provider, regularStepsTotal, summary));
      return;
    }

    summary.regularContestsImported += regularImportResult.right.contestsImported;
    summary.regularProblemsImported += regularImportResult.right.problemsImported;

    for (const contestJudgeId of regularImportResult.right.importedContestIds) {
      const pendingSubmissions = pendingSubmissionsByContest.get(contestJudgeId) ?? [];
      pendingSubmissionsByContest.delete(contestJudgeId);
      const participationResult = yield* Effect.either(upsertExistingContestParticipations(
        database,
        provider,
        judgeId,
        pendingContestParticipations(contestJudgeId, pendingSubmissions)
      ));
      if (participationResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(participationResult.left, regularStepsTotal, regularStepsLeft()));
      }

      for (const pending of pendingSubmissions) {
        const problemResult = yield* Effect.either(
          findProblem(
            database,
            judgeId,
            pending.submission.judgeProblemId,
            submissionContext(provider, pending.user, pending.submission)
          )
        );
        if (problemResult._tag === "Left") {
          summary.errors += 1;
          yield* emit(syncOperationErrorEvent(problemResult.left, regularStepsTotal, regularStepsLeft()));
          continue;
        }

        if (problemResult.right === undefined) {
          continue;
        }

        const retryResult = yield* Effect.either(retryPendingSubmission(database, provider, judgeId, pending));
        if (retryResult._tag === "Left") {
          summary.errors += 1;
          yield* emit(syncOperationErrorEvent(retryResult.left, regularStepsTotal, regularStepsLeft()));
        } else {
          summary.regularPendingSubmissionsRetried += 1;
          summary.submissionsInserted += retryResult.right.inserted;
          summary.submissionsUpdated += retryResult.right.updated;
          summary.submissionsSkipped = Math.max(summary.submissionsSkipped - 1, 0);
        }
      }
    }

    yield* emit(syncStepEvent(
      provider,
      JudgeSyncStep.RegularCatalog,
      SyncStepStatus.Completed,
      {
        processed: 2,
        total: 2,
        current: `${regularImportResult.right.problemsImported} problems`,
        stepsTotal: regularStepsTotal,
        stepsLeft: regularStepsLeft()
      }
    ));

    yield* emit(finalEvent(provider, regularStepsTotal, summary));
  });

export async function* createCodeforcesJudgeSync(
  database: DatabaseService,
  input: AppScopedJudgeSyncInput,
  operations: CodeforcesSyncOperations
): AsyncIterable<JudgeSyncEvent> {
  yield* createJudgeSyncRunner((emit) =>
    runCodeforcesSyncProgram(database, input, operations, emit).pipe(
      Effect.provideService(AppUserIdTag, input.appUserId)
    )
  );
}
