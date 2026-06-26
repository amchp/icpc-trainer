import { type DatabaseService, DatabaseServiceTag } from "@icpc-trainer/db";
import { JUDGES, SYNC_OPERATION_PHASES, type JudgeProvider } from "@icpc-trainer/shared";
import { Effect } from "effect";

import {
  JudgeAPIError,
  type JudgeError,
  type JudgePreviewContest
} from "../judges.js";
import {
  ensureCatalogContests,
  upsertContestParticipations,
  type ContestParticipationInput
} from "../contestParticipation.js";
import { type SyncOperationError } from "../sync/sync.js";

export type ContestFinderProvider = JudgeProvider;

const requiredContestLink = (
  provider: ContestFinderProvider,
  contest: JudgePreviewContest
): Effect.Effect<string, JudgeAPIError> => {
  const link = contest.link?.trim();

  return link === undefined || link === ""
    ? Effect.fail(new JudgeAPIError({
        judgeId: contest.judgeId,
        cause: `${provider} Contest Finder catalog entries must include a link.`
      }))
    : Effect.succeed(link);
};

export const upsertContestFinderCatalog = (
  database: DatabaseService,
  provider: ContestFinderProvider,
  judge: JUDGES,
  contests: readonly JudgePreviewContest[]
): Effect.Effect<number, JudgeError | SyncOperationError, DatabaseServiceTag> =>
  Effect.gen(function* () {
    const catalogEntries: {
      readonly contestJudgeId: string;
      readonly contestName: string | undefined;
      readonly contestLink: string;
    }[] = [];

    for (const contest of contests) {
      const link = yield* requiredContestLink(provider, contest);
      catalogEntries.push({
        contestJudgeId: contest.judgeId,
        contestName: contest.name,
        contestLink: link
      });
    }

    yield* ensureCatalogContests(database, judge, catalogEntries, {
      provider,
      phase: SYNC_OPERATION_PHASES.Database,
      action: "contest finder catalog"
    });

    return catalogEntries.length;
  });

export const upsertContestFinderParticipations = (
  database: DatabaseService,
  provider: ContestFinderProvider,
  judge: JUDGES,
  entries: readonly ContestParticipationInput[]
): Effect.Effect<void, JudgeError | SyncOperationError> =>
  entries.length === 0
    ? Effect.void
    : upsertContestParticipations(database, provider, judge, entries).pipe(Effect.asVoid);
