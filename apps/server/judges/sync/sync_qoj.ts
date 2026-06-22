import { type JudgeSyncEvent, type JudgeSyncInput } from "@icpc-trainer/api";
import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

import type { Judge } from "../judges.js";
import {
  createJudgeSyncRunner,
  emptySummary,
  finalEvent,
  getSyncUsers,
  providerJudge,
  runJudgeOperation,
  syncContest,
  syncOperationErrorEvent,
  syncUserSubmissions,
  type EmitSyncEvent,
  type SyncOperationError,
  type SyncUser
} from "./sync.js";

const { contests } = schema;

const getUserContestIds = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: Judge,
  user: SyncUser
): Effect.Effect<ReadonlyArray<string>, SyncOperationError> =>
  runJudgeOperation(database, {
    provider,
    phase: "contests",
    step: "contests",
    action: `contests for user ${user.username}`,
    userHandle: user.username
  }, judge.getContests({ userHandle: user.username })).pipe(
    Effect.map((contestList) => [...new Set(contestList.map((contest) => contest.judgeId))])
  );

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
      eq(contests.synced, true),
      inArray(contests.judgeId, contestIds)
    ))
    .all();

  return new Set(rows.map((row) => row.judgeId));
};

const runQojSyncProgram = (
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

    for (const user of syncUsers) {
      const userContestsResult = yield* Effect.either(getUserContestIds(database, provider, judge, user));
      if (userContestsResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(userContestsResult.left, stepsTotal, stepsLeft()));
        continue;
      }

      for (const contestJudgeId of userContestsResult.right) {
        contestsToSync.add(contestJudgeId);
      }
    }

    const discoveredContestIds = [...contestsToSync].sort((left, right) => Number(left) - Number(right));
    const alreadySyncedContestIds = syncedQojContestIds(database, discoveredContestIds);
    const contestIds = discoveredContestIds.filter((contestId) => !alreadySyncedContestIds.has(contestId));
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
    }

    completedSteps = 0;
    stepsTotal = syncUsers.length;

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
          queueMissingSubmissions: false
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

    yield* emit(finalEvent(provider, stepsTotal, summary));
  });

export async function* createQojJudgeSync(
  database: DatabaseService,
  input: JudgeSyncInput,
  judge: Judge
): AsyncIterable<JudgeSyncEvent> {
  yield* createJudgeSyncRunner(database, input, (emit) =>
    runQojSyncProgram(database, input, judge, emit)
  );
}
