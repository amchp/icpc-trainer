import { type JudgeSyncEvent, type JudgeSyncInput } from "@icpc-trainer/api";
import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

import type { Judge, JudgeContest, JudgeSubmission } from "../judges.js";
import {
  createJudgeSyncRunner,
  emptySummary,
  finalEvent,
  getSyncUsers,
  providerJudge,
  runJudgeOperation,
  syncOperationErrorEvent,
  syncUserSubmissions,
  upsertContest,
  upsertContestProblems,
  type EmitSyncEvent,
  type SyncOperationError,
  type SyncUser
} from "./sync.js";

const { contests } = schema;
const MIN_UNIQUE_SUBMITTED_PROBLEMS_FOR_CONTEST_SYNC = 2;

interface QojUserSyncData {
  readonly user: SyncUser;
  readonly submissions: ReadonlyArray<JudgeSubmission>;
}

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

const getUserSubmissions = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: Judge,
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
      eq(contests.synced, true),
      inArray(contests.judgeId, contestIds)
    ))
    .all();

  return new Set(rows.map((row) => row.judgeId));
};

const countSubmittedContestProblems = (
  contest: JudgeContest,
  submittedProblemIds: ReadonlySet<string>
): number =>
  new Set(
    contest.problems
      .map((problem) => problem.judgeId)
      .filter((problemId) => submittedProblemIds.has(problemId))
  ).size;

const syncQojContestIfEligible = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judgeId: ReturnType<typeof providerJudge>,
  judge: Judge,
  contestJudgeId: string,
  submittedProblemIds: ReadonlySet<string>
): Effect.Effect<number | undefined, SyncOperationError> =>
  Effect.gen(function* () {
    const contestContext = {
      provider,
      phase: "contests" as const,
      step: "contests" as const,
      action: `contest ${contestJudgeId}`,
      contestJudgeId
    };
    const contest = yield* runJudgeOperation(database, contestContext, judge.getContest(contestJudgeId));

    if (countSubmittedContestProblems(contest, submittedProblemIds) < MIN_UNIQUE_SUBMITTED_PROBLEMS_FOR_CONTEST_SYNC) {
      return undefined;
    }

    const contestId = yield* upsertContest(database, judgeId, contest, contestContext);
    return yield* upsertContestProblems(database, judgeId, contest, contestId, contestContext);
  });

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
    const submittedProblemIds = new Set<string>();
    const userSyncData: QojUserSyncData[] = [];
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

      const userSubmissionsResult = yield* Effect.either(getUserSubmissions(database, provider, judge, user));
      if (userSubmissionsResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(userSubmissionsResult.left, stepsTotal, stepsLeft()));
        continue;
      }

      userSyncData.push({ user, submissions: userSubmissionsResult.right });
      for (const submission of userSubmissionsResult.right) {
        submittedProblemIds.add(submission.judgeProblemId);
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

      const contestSyncResult = yield* Effect.either(
        syncQojContestIfEligible(database, provider, judgeId, judge, contestJudgeId, submittedProblemIds)
      );
      completedSteps += 1;

      if (contestSyncResult._tag === "Left") {
        summary.errors += 1;
        yield* emit(syncOperationErrorEvent(contestSyncResult.left, stepsTotal, stepsLeft()));
        continue;
      }

      if (contestSyncResult.right !== undefined) {
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
    }

    completedSteps = 0;
    stepsTotal = userSyncData.length;

    yield* emit({
      type: "submissions.syncing",
      step: "submissions",
      provider,
      usersTotal: userSyncData.length,
      stepsTotal,
      stepsLeft: stepsLeft()
    });

    for (const [index, userData] of userSyncData.entries()) {
      const { user } = userData;
      yield* emit({
        type: "submissions.userSyncing",
        step: "submissions",
        provider,
        userHandle: user.username,
        userIndex: index + 1,
        usersTotal: userSyncData.length,
        stepsTotal,
        stepsLeft: stepsLeft()
      });

      const userSyncResult = yield* Effect.either(
        syncUserSubmissions(database, provider, judgeId, judge, user, {
          queueMissingSubmissions: false,
          userSubmissions: userData.submissions
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
  yield* createJudgeSyncRunner((emit) =>
    runQojSyncProgram(database, input, judge, emit)
  );
}
