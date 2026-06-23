import { type JudgeSyncInput } from "@icpc-trainer/api";
import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES } from "@icpc-trainer/shared";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";

import type { JudgeSubmission } from "./judges.js";
import { syncEffect, type SyncOperationContext, type SyncOperationError, type SyncUser } from "./sync/sync.js";

const CODEFORCES_CONTEST_URL = "https://codeforces.com/gym";
const QOJ_CONTEST_URL = "https://qoj.ac/contest";

const { contests, userContestStates } = schema;

export interface ContestParticipationInput {
  readonly user: SyncUser;
  readonly contestJudgeId: string;
  readonly contestName?: string;
  readonly submissions: ReadonlyArray<Pick<JudgeSubmission, "verdict" | "submittedAt">>;
}

const now = (): Date => new Date();

const contestLink = (judge: JUDGES, contestJudgeId: string): string => {
  const baseUrl = judge === JUDGES.Codeforces ? CODEFORCES_CONTEST_URL : QOJ_CONTEST_URL;
  return `${baseUrl}/${encodeURIComponent(contestJudgeId)}`;
};

export const ensureCatalogContest = (
  database: DatabaseService,
  judge: JUDGES,
  contestJudgeId: string,
  name: string | undefined,
  context: SyncOperationContext
): Effect.Effect<number, SyncOperationError> => syncEffect(context, () => {
  const timestamp = now();
  const trimmedName = name?.trim();
  const fallbackName = `${judge === JUDGES.Codeforces ? "Codeforces" : "QOJ"} Contest ${contestJudgeId}`;
  const existing = database.db
    .select({ id: contests.id, simulated: contests.simulated })
    .from(contests)
    .where(and(eq(contests.judge, judge), eq(contests.judgeId, contestJudgeId)))
    .get();

  if (existing !== undefined && (trimmedName === undefined || trimmedName === "")) {
    return existing.id;
  }

  database.db
    .insert(contests)
    .values({
      judgeId: contestJudgeId,
      judge,
      name: trimmedName === undefined || trimmedName === "" ? fallbackName : trimmedName,
      link: contestLink(judge, contestJudgeId),
      participants: null,
      stars: null,
      simulated: false,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .onConflictDoUpdate({
      target: [contests.judgeId, contests.judge],
      set: {
        name: trimmedName === undefined || trimmedName === "" ? fallbackName : trimmedName,
        link: contestLink(judge, contestJudgeId),
        updatedAt: timestamp
      }
    })
    .run();

  const row = database.db
    .select({ id: contests.id })
    .from(contests)
    .where(and(eq(contests.judge, judge), eq(contests.judgeId, contestJudgeId)))
    .get();

  if (row === undefined) {
    throw new Error(`Catalog contest ${contestJudgeId} was not found after upsert.`);
  }

  return row.id;
});

export const upsertUserContestState = (
  database: DatabaseService,
  userId: number,
  contestId: number,
  submissionsForContest: ReadonlyArray<Pick<JudgeSubmission, "verdict" | "submittedAt">>
): void => {
  const timestamp = now();
  const lastSubmissionAt = submissionsForContest.reduce<Date | null>(
    (latest, submission) =>
      latest === null || submission.submittedAt > latest ? submission.submittedAt : latest,
    null
  );
  const acceptedCount = submissionsForContest.filter((submission) => submission.verdict === SUBMISSION_STATUSES.AC).length;

  database.db
    .insert(userContestStates)
    .values({
      userId,
      contestId,
      submissionCount: Math.max(submissionsForContest.length, 1),
      acceptedCount,
      lastSubmissionAt,
      updatedAt: timestamp
    })
    .onConflictDoUpdate({
      target: [userContestStates.userId, userContestStates.contestId],
      set: {
        submissionCount: Math.max(submissionsForContest.length, 1),
        acceptedCount,
        lastSubmissionAt,
        updatedAt: timestamp
      }
    })
    .run();
};

export const upsertContestParticipations = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: JUDGES,
  entries: ReadonlyArray<ContestParticipationInput>
): Effect.Effect<number, SyncOperationError> => syncEffect({
  provider,
  phase: "database",
  action: "contest participation"
}, () => {
  let upserted = 0;

  for (const entry of entries) {
    const contestId = Effect.runSync(ensureCatalogContest(database, judge, entry.contestJudgeId, entry.contestName, {
      provider,
      phase: "database",
      action: `contest ${entry.contestJudgeId} participation`,
      userHandle: entry.user.username,
      contestJudgeId: entry.contestJudgeId
    }));
    upsertUserContestState(database, entry.user.id, contestId, entry.submissions);
    upserted += 1;
  }

  return upserted;
});

export const upsertExistingContestParticipations = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: JUDGES,
  entries: ReadonlyArray<ContestParticipationInput>
): Effect.Effect<number, SyncOperationError> => syncEffect({
  provider,
  phase: "database",
  action: "existing contest participation"
}, () => {
  let upserted = 0;

  for (const entry of entries) {
    const contest = database.db
      .select({ id: contests.id })
      .from(contests)
      .where(and(eq(contests.judge, judge), eq(contests.judgeId, entry.contestJudgeId)))
      .get();

    if (contest === undefined) {
      continue;
    }

    upsertUserContestState(database, entry.user.id, contest.id, entry.submissions);
    upserted += 1;
  }

  return upserted;
});
