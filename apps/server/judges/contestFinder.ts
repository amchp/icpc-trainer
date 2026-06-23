import { type DatabaseService, DatabaseServiceTag } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { Effect } from "effect";

import type {
  JudgeError,
  JudgePreviewContest,
  JudgeSubmission,
  RefreshContestFinderInput,
  RefreshContestFinderResult
} from "./judges.js";
import {
  ensureCatalogContest,
  upsertContestParticipations,
  type ContestParticipationInput,
} from "./contestParticipation.js";
import { type SyncOperationError, type SyncUser } from "./sync/sync.js";

export const upsertContestFinderCatalog = (
  database: DatabaseService,
  provider: "codeforces" | "qoj",
  judge: JUDGES,
  contests: readonly JudgePreviewContest[]
): Effect.Effect<number, JudgeError | SyncOperationError, DatabaseServiceTag> =>
  Effect.gen(function* () {
    let upserted = 0;

    for (const contest of contests) {
      yield* ensureCatalogContest(database, judge, contest.judgeId, contest.name, {
        provider,
        phase: "database",
        action: `catalog contest ${contest.judgeId}`,
        contestJudgeId: contest.judgeId
      });
      upserted += 1;
    }

    return upserted;
  });

export const codeforcesContestParticipations = (
  user: SyncUser,
  submissions: readonly JudgeSubmission[],
  contestNames: ReadonlyMap<string, string> = new Map()
): readonly ContestParticipationInput[] => {
  const byContest = new Map<string, JudgeSubmission[]>();
  for (const submission of submissions) {
    if (submission.judgeContestId === undefined) {
      continue;
    }
    const entries = byContest.get(submission.judgeContestId) ?? [];
    entries.push(submission);
    byContest.set(submission.judgeContestId, entries);
  }

  return [...byContest.entries()].map(([contestJudgeId, contestSubmissions]) => ({
    user,
    contestJudgeId,
    contestName: contestNames.get(contestJudgeId),
    submissions: contestSubmissions
  }));
};

export const qojContestParticipations = (
  user: SyncUser,
  contests: readonly JudgePreviewContest[]
): readonly ContestParticipationInput[] =>
  [...new Map(contests.map((contest) => [contest.judgeId, contest])).values()].map((contest) => ({
    user,
    contestJudgeId: contest.judgeId,
    contestName: contest.name,
    submissions: []
  }));

export const upsertContestFinderParticipations = (
  database: DatabaseService,
  provider: "codeforces" | "qoj",
  judge: JUDGES,
  entries: readonly ContestParticipationInput[]
): Effect.Effect<void, JudgeError | SyncOperationError> =>
  entries.length === 0
    ? Effect.void
    : upsertContestParticipations(database, provider, judge, entries).pipe(Effect.asVoid);

export const emptyContestFinderRefresh = (): RefreshContestFinderResult => ({
  contestsUpserted: 0,
  friendsProcessed: 0
});

export type ContestFinderRefreshImplementation = (
  input: RefreshContestFinderInput
) => Effect.Effect<RefreshContestFinderResult, unknown, DatabaseServiceTag>;
