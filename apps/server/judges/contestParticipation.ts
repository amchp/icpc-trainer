import { type JudgeSyncInput } from "@icpc-trainer/api";
import { chunks, excludedColumn, SQLITE_BINDING_CHUNK_SIZE, type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, SYNC_OPERATION_PHASES } from "@icpc-trainer/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

import type { JudgeSubmission } from "./judges.js";
import { syncEffect, SyncOperationError, type SyncOperationContext, type SyncUser } from "./sync/sync.js";

const { contests, userContestStates } = schema;

type ContestStateSubmission = Pick<JudgeSubmission, "judgeProblemId" | "verdict" | "submittedAt">;

export interface ContestParticipationInput {
  readonly user: SyncUser;
  readonly contestJudgeId: string;
  readonly contestName?: string;
  readonly contestLink: string;
  readonly submissions: ReadonlyArray<ContestStateSubmission>;
}

export interface ExistingContestParticipationInput {
  readonly user: SyncUser;
  readonly contestJudgeId: string;
  readonly contestName?: string;
  readonly submissions: ReadonlyArray<ContestStateSubmission>;
}

const now = (): Date => new Date();

const contestFallbackName = (judge: JUDGES, contestJudgeId: string): string =>
  `${judge === JUDGES.Codeforces ? "Codeforces" : "QOJ"} Contest ${contestJudgeId}`;

export interface CatalogContestInput {
  readonly contestJudgeId: string;
  readonly contestName?: string;
  readonly contestLink: string;
}

const contestIdsByJudgeId = async (
  database: DatabaseService,
  judge: JUDGES,
  contestJudgeIds: ReadonlyArray<string>
): Promise<ReadonlyMap<string, number>> => {
  const rowsByJudgeId = new Map<string, number>();

  for (const contestJudgeIdChunk of chunks([...new Set(contestJudgeIds)], SQLITE_BINDING_CHUNK_SIZE)) {
    if (contestJudgeIdChunk.length === 0) {
      continue;
    }

    const rows = await database.db
      .select({ id: contests.id, judgeId: contests.judgeId })
      .from(contests)
      .where(and(eq(contests.judge, judge), inArray(contests.judgeId, contestJudgeIdChunk)))
      .all();

    for (const row of rows) {
      rowsByJudgeId.set(row.judgeId, row.id);
    }
  }

  return rowsByJudgeId;
};

export const ensureCatalogContests = (
  database: DatabaseService,
  judge: JUDGES,
  entries: ReadonlyArray<CatalogContestInput>,
  context: SyncOperationContext
): Effect.Effect<ReadonlyMap<string, number>, SyncOperationError> => syncEffect(context, async () => {
  if (entries.length === 0) {
    return new Map<string, number>();
  }

  const byJudgeId = new Map<string, CatalogContestInput>();
  for (const entry of entries) {
    const existing = byJudgeId.get(entry.contestJudgeId);
    const trimmedName = entry.contestName?.trim();
    const existingTrimmedName = existing?.contestName?.trim();
    const hasName = trimmedName !== undefined && trimmedName !== "";
    const existingHasName = existingTrimmedName !== undefined && existingTrimmedName !== "";

    if (existing === undefined || (hasName && !existingHasName)) {
      byJudgeId.set(entry.contestJudgeId, entry);
    }
  }

  const uniqueEntries = [...byJudgeId.values()];
  const existingIds = await contestIdsByJudgeId(
    database,
    judge,
    uniqueEntries.map((entry) => entry.contestJudgeId)
  );
  const timestamp = now();
  const entriesToUpsert = uniqueEntries.filter((entry) => {
    const trimmedName = entry.contestName?.trim();
    return existingIds.get(entry.contestJudgeId) === undefined ||
      (trimmedName !== undefined && trimmedName !== "");
  });

  for (const entryChunk of chunks(entriesToUpsert, SQLITE_BINDING_CHUNK_SIZE)) {
    if (entryChunk.length === 0) {
      continue;
    }

    await database.db
      .insert(contests)
      .values(entryChunk.map((entry) => {
        const trimmedName = entry.contestName?.trim();

        return {
          judgeId: entry.contestJudgeId,
          judge,
          name: trimmedName === undefined || trimmedName === ""
            ? contestFallbackName(judge, entry.contestJudgeId)
            : trimmedName,
          link: entry.contestLink,
          participants: null,
          stars: null,
          createdAt: timestamp,
          updatedAt: timestamp
        };
      }))
      .onConflictDoUpdate({
        target: [contests.judgeId, contests.judge],
        set: {
          name: excludedColumn("name"),
          link: excludedColumn("link"),
          updatedAt: excludedColumn("updated_at")
        }
      })
      .run();
  }

  const nextIds = await contestIdsByJudgeId(
    database,
    judge,
    uniqueEntries.map((entry) => entry.contestJudgeId)
  );

  for (const entry of uniqueEntries) {
    if (nextIds.get(entry.contestJudgeId) === undefined) {
      throw new Error(`Catalog contest ${entry.contestJudgeId} was not found after upsert.`);
    }
  }

  return nextIds;
});

export const ensureCatalogContest = (
  database: DatabaseService,
  judge: JUDGES,
  contestJudgeId: string,
  name: string | undefined,
  link: string,
  context: SyncOperationContext
): Effect.Effect<number, SyncOperationError> =>
  Effect.gen(function* () {
    const contestIds = yield* ensureCatalogContests(database, judge, [{
      contestJudgeId,
      contestName: name,
      contestLink: link
    }], context);
    const contestId = contestIds.get(contestJudgeId);

    if (contestId === undefined) {
      return yield* Effect.fail(new SyncOperationError({
        ...context,
        cause: new Error(`Catalog contest ${contestJudgeId} was not found after upsert.`)
      }));
    }

    return contestId;
  });

interface UserContestStateInput {
  readonly userId: number;
  readonly contestId: number;
  readonly submissions: ReadonlyArray<ContestStateSubmission>;
}

const userContestStateKey = (userId: number, contestId: number): string => `${userId}:${contestId}`;

const existingUserContestStateKeys = async (
  database: DatabaseService,
  entries: ReadonlyArray<UserContestStateInput>
): Promise<ReadonlySet<string>> => {
  const keys = new Set<string>();
  const userIds = [...new Set(entries.map((entry) => entry.userId))];
  const contestIds = [...new Set(entries.map((entry) => entry.contestId))];

  for (const userIdChunk of chunks(userIds, SQLITE_BINDING_CHUNK_SIZE)) {
    for (const contestIdChunk of chunks(contestIds, SQLITE_BINDING_CHUNK_SIZE)) {
      if (userIdChunk.length === 0 || contestIdChunk.length === 0) {
        continue;
      }

      const rows = await database.db
        .select({ userId: userContestStates.userId, contestId: userContestStates.contestId })
        .from(userContestStates)
        .where(and(
          inArray(userContestStates.userId, userIdChunk),
          inArray(userContestStates.contestId, contestIdChunk)
        ))
        .all();

      for (const row of rows) {
        keys.add(userContestStateKey(row.userId, row.contestId));
      }
    }
  }

  return keys;
};

const mergedUserContestStateInputs = (
  entries: ReadonlyArray<UserContestStateInput>
): ReadonlyArray<UserContestStateInput> => {
  const merged = new Map<string, { userId: number; contestId: number; submissions: ContestStateSubmission[] }>();

  for (const entry of entries) {
    const key = userContestStateKey(entry.userId, entry.contestId);
    const next = merged.get(key) ?? {
      userId: entry.userId,
      contestId: entry.contestId,
      submissions: []
    };
    next.submissions.push(...entry.submissions);
    merged.set(key, next);
  }

  return [...merged.values()];
};

const upsertUserContestStates = async (
  database: DatabaseService,
  entries: ReadonlyArray<UserContestStateInput>
): Promise<number> => {
  const mergedEntries = mergedUserContestStateInputs(entries);
  if (mergedEntries.length === 0) {
    return 0;
  }

  const existingKeys = await existingUserContestStateKeys(database, mergedEntries);
  const timestamp = now();
  const stateRows = mergedEntries
    .filter((entry) => entry.submissions.length > 0 || !existingKeys.has(userContestStateKey(entry.userId, entry.contestId)))
    .map((entry) => {
      const submittedProblemIds = new Set(entry.submissions.map((submission) => submission.judgeProblemId));
      const distinctProblemCount = submittedProblemIds.size;
      const lastSubmissionAt = entry.submissions.reduce<Date | null>(
        (latest, submission) =>
          latest === null || submission.submittedAt > latest ? submission.submittedAt : latest,
        null
      );
      const acceptedCount = entry.submissions.filter((submission) => submission.verdict === SUBMISSION_STATUSES.AC).length;

      return {
        userId: entry.userId,
        contestId: entry.contestId,
        submissionCount: Math.max(entry.submissions.length, 1),
        acceptedCount,
        distinctProblemCount,
        simulated: distinctProblemCount >= 2,
        lastSubmissionAt,
        updatedAt: timestamp
      };
    });

  for (const stateChunk of chunks(stateRows, SQLITE_BINDING_CHUNK_SIZE)) {
    if (stateChunk.length === 0) {
      continue;
    }

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

  return stateRows.length;
};

export const upsertUserContestState = async (
  database: DatabaseService,
  userId: number,
  contestId: number,
  submissionsForContest: ReadonlyArray<ContestStateSubmission>
): Promise<boolean> => {
  const existing = await database.db
    .select({ userId: userContestStates.userId })
    .from(userContestStates)
    .where(and(eq(userContestStates.userId, userId), eq(userContestStates.contestId, contestId)))
    .get();

  if (submissionsForContest.length === 0 && existing !== undefined) {
    return false;
  }

  const submittedProblemIds = new Set(submissionsForContest.map((submission) => submission.judgeProblemId));
  const distinctProblemCount = submittedProblemIds.size;
  const simulated = distinctProblemCount >= 2;

  const timestamp = now();
  const lastSubmissionAt = submissionsForContest.reduce<Date | null>(
    (latest, submission) =>
      latest === null || submission.submittedAt > latest ? submission.submittedAt : latest,
    null
  );
  const acceptedCount = submissionsForContest.filter((submission) => submission.verdict === SUBMISSION_STATUSES.AC).length;

  await database.db
    .insert(userContestStates)
    .values({
      userId,
      contestId,
      submissionCount: Math.max(submissionsForContest.length, 1),
      acceptedCount,
      distinctProblemCount,
      simulated,
      lastSubmissionAt,
      updatedAt: timestamp
    })
    .onConflictDoUpdate({
      target: [userContestStates.userId, userContestStates.contestId],
      set: {
        submissionCount: Math.max(submissionsForContest.length, 1),
        acceptedCount,
        distinctProblemCount,
        simulated,
        lastSubmissionAt,
        updatedAt: timestamp
      }
    })
    .run();

  return true;
};

export const upsertContestParticipations = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: JUDGES,
  entries: ReadonlyArray<ContestParticipationInput>
): Effect.Effect<number, SyncOperationError> => syncEffect({
  provider,
  phase: SYNC_OPERATION_PHASES.Database,
  action: "contest participation"
}, async () => {
  const contestIds = await Effect.runPromise(ensureCatalogContests(database, judge, entries.map((entry) => ({
    contestJudgeId: entry.contestJudgeId,
    contestName: entry.contestName,
    contestLink: entry.contestLink
  })), {
    provider,
    phase: SYNC_OPERATION_PHASES.Database,
    action: "contest participation contests"
  }));

  return await upsertUserContestStates(database, entries.flatMap((entry) => {
    const contestId = contestIds.get(entry.contestJudgeId);
    return contestId === undefined
      ? []
      : [{
          userId: entry.user.id,
          contestId,
          submissions: entry.submissions
        }];
  }));
});

export const upsertExistingContestParticipations = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judge: JUDGES,
  entries: ReadonlyArray<ExistingContestParticipationInput>
): Effect.Effect<number, SyncOperationError> => syncEffect({
  provider,
  phase: SYNC_OPERATION_PHASES.Database,
  action: "existing contest participation"
}, async () => {
  const contestIds = await contestIdsByJudgeId(
    database,
    judge,
    entries.map((entry) => entry.contestJudgeId)
  );

  return await upsertUserContestStates(database, entries.flatMap((entry) => {
    const contestId = contestIds.get(entry.contestJudgeId);
    return contestId === undefined
      ? []
      : [{
          userId: entry.user.id,
          contestId,
          submissions: entry.submissions
        }];
  }));
});
