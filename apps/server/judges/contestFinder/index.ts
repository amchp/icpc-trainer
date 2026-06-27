import { type DatabaseService, DatabaseServiceTag, schema } from "@icpc-trainer/db";
import { JUDGES, SYNC_OPERATION_PHASES, type JudgeProvider } from "@icpc-trainer/shared";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  JudgeAPIError,
  type JudgeError,
  type JudgePreviewContest
} from "../judges.js";
import {
  ensureCatalogContests,
  upsertExistingContestParticipations,
  type ContestParticipationInput
} from "../contestParticipation.js";
import { syncEffect, type SyncOperationError } from "../sync/sync.js";

const { contests } = schema;

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

export const getContestFinderCatalog = (
  database: DatabaseService,
  provider: ContestFinderProvider,
  judge: JUDGES
): Effect.Effect<ReadonlyMap<string, JudgePreviewContest>, SyncOperationError> =>
  syncEffect({
    provider,
    phase: SYNC_OPERATION_PHASES.Database,
    action: "contest finder catalog"
  }, async () => {
    const rows = await database.db
      .select({
        judgeId: contests.judgeId,
        name: contests.name,
        link: contests.link
      })
      .from(contests)
      .where(eq(contests.judge, judge))
      .all();

    return new Map(
      rows.map((contest): [string, JudgePreviewContest] => [
        contest.judgeId,
        {
          judgeId: contest.judgeId,
          name: contest.name,
          link: contest.link
        }
      ])
    );
  });

export const upsertContestFinderParticipations = (
  database: DatabaseService,
  provider: ContestFinderProvider,
  judge: JUDGES,
  entries: readonly ContestParticipationInput[]
): Effect.Effect<void, JudgeError | SyncOperationError> =>
  entries.length === 0
    ? Effect.void
    : upsertExistingContestParticipations(database, provider, judge, entries).pipe(Effect.asVoid);
