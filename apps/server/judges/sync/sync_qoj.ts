import {
  type JudgeSyncEvent,
  type JudgeSyncInput,
  JudgeSyncStep
} from "@icpc-trainer/api";
import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

import type { JudgeContest, JudgePreviewContest, JudgeSubmission } from "../judges.js";
import type { QojPlaygroundClient } from "../qoj.js";
import { upsertExistingContestParticipations } from "../contestParticipation.js";
import {
  emptySummary,
  finalEvent,
  runJudgeOperation,
  syncOperationErrorEvent,
  type SyncOperationError
} from "./events.js";
import {
  getSyncUsers,
  syncUserSubmissions,
  upsertFetchedContest,
  type SyncUser
} from "./persistence.js";
import { createJudgeSyncRunner } from "./runtime.js";
import {
  createSyncStepProgress,
  startedEvent,
  type EmitSyncEvent
} from "./progress.js";

const { contests } = schema;
const QOJ_CONTEST_URL = "https://qoj.ac/contest";

interface QojUserSyncData {
  readonly user: SyncUser;
  readonly submissions: ReadonlyArray<JudgeSubmission>;
  readonly contests: ReadonlyArray<JudgePreviewContest>;
}

const getUserContestIds = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: QojPlaygroundClient,
  user: SyncUser
): Effect.Effect<ReadonlyArray<JudgePreviewContest>, SyncOperationError> =>
  runJudgeOperation(database, {
    provider,
    phase: "contests",
    step: "contests",
    action: `contests for user ${user.username}`,
    userHandle: user.username
  }, judge.getContests({ userHandle: user.username }));

const getUserSubmissions = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: QojPlaygroundClient,
  user: SyncUser
): Effect.Effect<ReadonlyArray<JudgeSubmission>, SyncOperationError> =>
  runJudgeOperation(database, {
    provider,
    phase: "submissions",
    step: "submissions",
    action: `submissions for user ${user.username}`,
    userHandle: user.username
  }, judge.getSubmissions({ userHandle: user.username }));

const syncedQojContestIds = (
  database: DatabaseService,
  contestIds: ReadonlyArray<string>
): ReadonlySet<string> => {
  if (contestIds.length === 0) {
    return new Set();
  }

  const rows = database.db
    .select({ judgeId: contests.judgeId })
    .from(contests)
    .where(and(
      eq(contests.judge, JUDGES.Qoj),
      eq(contests.simulated, true),
      inArray(contests.judgeId, contestIds)
    ))
    .all();

  return new Set(rows.map((row) => row.judgeId));
};

const qojContestLink = (contestJudgeId: string): string =>
  `${QOJ_CONTEST_URL}/${encodeURIComponent(contestJudgeId)}`;

const withQojContestLink = (contest: JudgeContest): JudgeContest => ({
  ...contest,
  link: contest.link ?? qojContestLink(contest.judgeId)
});

export const syncQojContest = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: QojPlaygroundClient,
  contestJudgeId: string
): Effect.Effect<number, SyncOperationError> =>
  Effect.gen(function* () {
    const contest = yield* runJudgeOperation(database, {
      provider,
      phase: "contests",
      step: "contests",
      action: `contest ${contestJudgeId}`,
      contestJudgeId
    }, judge.getContest(contestJudgeId));

    return yield* upsertFetchedContest(database, provider, JUDGES.Qoj, withQojContestLink(contest));
  });

const runQojSyncProgram = (
  database: DatabaseService,
  input: JudgeSyncInput,
  judge: QojPlaygroundClient,
  emit: EmitSyncEvent
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const provider = input.provider;
    const judgeId = JUDGES.Qoj;
    const summary = emptySummary();
    const syncUsersResult = yield* Effect.either(getSyncUsers(database, judgeId, provider));

    if (syncUsersResult._tag === "Left") {
      summary.errors += 1;
      yield* emit(syncOperationErrorEvent(syncUsersResult.left, 0, 0));
      yield* emit(finalEvent(provider, 0, summary));
      return;
    }

    const syncUsers = syncUsersResult.right;
    const contestsToSync = new Set<string>();
    const userSyncData: QojUserSyncData[] = [];

    yield* emit(startedEvent(provider));

    const discoveryProgress = createSyncStepProgress(
      provider,
      JudgeSyncStep.Submissions,
      syncUsers.length,
      emit
    );
    yield* discoveryProgress.start();

    for (const [index, user] of syncUsers.entries()) {
      yield* discoveryProgress.running(index, user.username);

      const userContestsResult = yield* Effect.either(getUserContestIds(database, provider, judge, user));
      if (userContestsResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(
          userContestsResult.left,
          discoveryProgress.stepsTotal,
          discoveryProgress.stepsLeft()
        ));
        yield* discoveryProgress.completeCurrent(user.username);
        continue;
      }

      const uniqueUserContests = [...new Map(userContestsResult.right.map((contest) => [contest.judgeId, contest])).values()];

      for (const contestJudgeId of uniqueUserContests.map((contest) => contest.judgeId)) {
        contestsToSync.add(contestJudgeId);
      }

      const userSubmissionsResult = yield* Effect.either(getUserSubmissions(database, provider, judge, user));
      if (userSubmissionsResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(
          userSubmissionsResult.left,
          discoveryProgress.stepsTotal,
          discoveryProgress.stepsLeft()
        ));
        yield* discoveryProgress.completeCurrent(user.username);
        continue;
      }

      userSyncData.push({ user, submissions: userSubmissionsResult.right, contests: uniqueUserContests });
      yield* discoveryProgress.completeCurrent(user.username);
    }

    const discoveredContestIds = [...contestsToSync].sort((left, right) => Number(left) - Number(right));
    const alreadySyncedContestIds = syncedQojContestIds(database, discoveredContestIds);
    const contestIds = discoveredContestIds.filter((contestId) => !alreadySyncedContestIds.has(contestId));
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
        syncQojContest(database, provider, judge, contestJudgeId)
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

      summary.contestsSynced += 1;
      yield* contestProgress.completeCurrent(contestJudgeId);
    }

    const importProgress = createSyncStepProgress(
      provider,
      JudgeSyncStep.Submissions,
      userSyncData.length,
      emit
    );
    yield* importProgress.start();

    for (const [index, userData] of userSyncData.entries()) {
      const { user } = userData;
      yield* importProgress.running(index, user.username);

      const userSyncResult = yield* Effect.either(
        syncUserSubmissions(database, provider, judgeId, user, {
          queueMissingSubmissions: false,
          userSubmissions: userData.submissions
        })
      );
      const participationResult = yield* Effect.either(upsertExistingContestParticipations(
        database,
        provider,
        judgeId,
        userData.contests.map((contest) => ({
          user,
          contestJudgeId: contest.judgeId,
          contestName: contest.name,
          submissions: []
        }))
      ));

      if (userSyncResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(
          userSyncResult.left,
          importProgress.stepsTotal,
          importProgress.stepsLeft()
        ));
      } else {
        summary.usersProcessed += 1;
        summary.submissionsFetched += userSyncResult.right.fetched;
        summary.submissionsInserted += userSyncResult.right.inserted;
        summary.submissionsUpdated += userSyncResult.right.updated;
        summary.submissionsSkipped += userSyncResult.right.skipped;
      }
      if (participationResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(
          participationResult.left,
          importProgress.stepsTotal,
          importProgress.stepsLeft()
        ));
      }

      yield* importProgress.completeCurrent(user.username);
    }

    yield* emit(finalEvent(provider, importProgress.stepsTotal, summary));
  });

export async function* createQojJudgeSync(
  database: DatabaseService,
  input: JudgeSyncInput,
  judge: QojPlaygroundClient
): AsyncIterable<JudgeSyncEvent> {
  yield* createJudgeSyncRunner((emit) =>
    runQojSyncProgram(database, input, judge, emit)
  );
}
