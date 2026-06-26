import {
  type JudgeSyncInput,
  JudgeSyncStep
} from "@icpc-trainer/api";
import { chunks, excludedColumn, SQLITE_BINDING_CHUNK_SIZE, type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES, SYNC_OPERATION_PHASES } from "@icpc-trainer/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

import type { JudgeRegularCatalogContest, JudgeRegularCatalogProblem } from "../judges.js";
import { isNormalRegularCodeforcesContestName } from "../codeforces.js";
import { SyncOperationError } from "./events.js";
import { estimateContestStarsFromName, estimateProblemRating } from "./problemRating.js";

const { contests, problems, problemTags } = schema;
const CODEFORCES_CONTEST_URL = "https://codeforces.com/contest";

export interface RegularCatalogImportResult {
  readonly importedContestIds: ReadonlySet<string>;
  readonly contestsImported: number;
  readonly problemsImported: number;
}

const regularContestStars = (contestName: string): number => {
  const divisionMatch = /(?:div\.?|division)\s*([1-4])/i.exec(contestName);
  const division = divisionMatch?.[1];

  switch (division) {
    case "1":
      return 5;
    case "2":
      return 4;
    case "3":
      return 3;
    case "4":
      return 2;
    default:
      return estimateContestStarsFromName(contestName) || 3;
  }
};

const regularSolvePercentage = (solves: number, maxSolvesInContest: number): number =>
  maxSolvesInContest <= 0
    ? 0
    : Math.round(Math.max(0, Math.min(solves / maxSolvesInContest, 1)) * 100);

const regularContestLink = (contest: JudgeRegularCatalogContest): string =>
  contest.link?.trim() || `${CODEFORCES_CONTEST_URL}/${encodeURIComponent(contest.judgeId)}`;

export const upsertCodeforcesRegularCatalog = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  candidateContestIds: ReadonlySet<string>,
  contestCatalog: readonly JudgeRegularCatalogContest[],
  problemCatalog: readonly JudgeRegularCatalogProblem[]
): Effect.Effect<RegularCatalogImportResult, SyncOperationError> =>
  Effect.gen(function* () {
    return yield* Effect.tryPromise({
      try: async () => {
        const timestamp = new Date();
        const contestCatalogById = new Map<string, JudgeRegularCatalogContest>();
        const problemsByContest = new Map<string, JudgeRegularCatalogProblem[]>();
        const seenProblemIds = new Set<string>();

        for (const contest of contestCatalog) {
          if (
            !candidateContestIds.has(contest.judgeId) ||
            !isNormalRegularCodeforcesContestName(contest.name) ||
            contestCatalogById.has(contest.judgeId)
          ) {
            continue;
          }

          contestCatalogById.set(contest.judgeId, contest);
        }

        for (const problem of problemCatalog) {
          const contestJudgeId = problem.judgeContestId;
          if (
            contestJudgeId === undefined ||
            !contestCatalogById.has(contestJudgeId) ||
            seenProblemIds.has(problem.judgeId)
          ) {
            continue;
          }

          seenProblemIds.add(problem.judgeId);
          const contestProblems = problemsByContest.get(contestJudgeId) ?? [];
          contestProblems.push(problem);
          problemsByContest.set(contestJudgeId, contestProblems);
        }

        const contestJudgeIds = [...problemsByContest.entries()]
          .filter(([contestJudgeId, contestProblems]) =>
            contestCatalogById.has(contestJudgeId) && contestProblems.length > 0
          )
          .map(([contestJudgeId]) => contestJudgeId);
        const importedContestIds = new Set<string>(contestJudgeIds);
        const existingContestsByJudgeId = new Map<string, {
          readonly id: number;
          readonly judgeId: string;
          readonly participants: number | null;
          readonly stars: number | null;
        }>();

        for (const contestJudgeIdChunk of chunks(contestJudgeIds, SQLITE_BINDING_CHUNK_SIZE)) {
          if (contestJudgeIdChunk.length === 0) {
            continue;
          }

          const rows = await database.db
            .select({
              id: contests.id,
              judgeId: contests.judgeId,
              participants: contests.participants,
              stars: contests.stars
            })
            .from(contests)
            .where(and(eq(contests.judge, JUDGES.Codeforces), inArray(contests.judgeId, contestJudgeIdChunk)))
            .all();

          for (const row of rows) {
            existingContestsByJudgeId.set(row.judgeId, row);
          }
        }

        const contestRows = contestJudgeIds.map((contestJudgeId) => {
          const contest = contestCatalogById.get(contestJudgeId);
          if (contest === undefined) {
            throw new Error(`Regular Codeforces contest ${contestJudgeId} was not found in catalog.`);
          }

          const existingContest = existingContestsByJudgeId.get(contestJudgeId);
          const standingsGrade = existingContest?.participants !== null && existingContest?.participants !== undefined;
          const stars = standingsGrade && existingContest?.stars !== null && existingContest?.stars !== undefined
            ? existingContest.stars
            : regularContestStars(contest.name);

          return {
            judgeId: contestJudgeId,
            judge: JUDGES.Codeforces,
            name: contest.name,
            link: regularContestLink(contest),
            participants: existingContest?.participants ?? null,
            stars,
            createdAt: timestamp,
            updatedAt: timestamp
          };
        });
        const contestInputRowsByJudgeId = new Map(contestRows.map((row) => [row.judgeId, row]));

        for (const contestRowChunk of chunks(contestRows, SQLITE_BINDING_CHUNK_SIZE)) {
          if (contestRowChunk.length === 0) {
            continue;
          }

          await database.db
            .insert(contests)
            .values(contestRowChunk)
            .onConflictDoUpdate({
              target: [contests.judgeId, contests.judge],
              set: {
                name: excludedColumn("name"),
                link: excludedColumn("link"),
                participants: excludedColumn("participants"),
                stars: excludedColumn("stars"),
                updatedAt: excludedColumn("updated_at")
              }
            })
            .run();
        }

        const contestRowsByJudgeId = new Map<string, {
          readonly id: number;
          readonly judgeId: string;
          readonly participants: number | null;
        }>();

        for (const contestJudgeIdChunk of chunks(contestJudgeIds, SQLITE_BINDING_CHUNK_SIZE)) {
          if (contestJudgeIdChunk.length === 0) {
            continue;
          }

          const rows = await database.db
            .select({
              id: contests.id,
              judgeId: contests.judgeId,
              participants: contests.participants
            })
            .from(contests)
            .where(and(eq(contests.judge, JUDGES.Codeforces), inArray(contests.judgeId, contestJudgeIdChunk)))
            .all();

          for (const row of rows) {
            contestRowsByJudgeId.set(row.judgeId, row);
          }
        }

        for (const contestJudgeId of contestJudgeIds) {
          if (contestRowsByJudgeId.get(contestJudgeId) === undefined) {
            throw new Error(`Regular Codeforces contest ${contestJudgeId} was not found after upsert.`);
          }
        }

        const problemJudgeIds = contestJudgeIds.flatMap((contestJudgeId) =>
          problemsByContest.get(contestJudgeId)?.map((problem) => problem.judgeId) ?? []
        );
        const existingProblemsByJudgeId = new Map<string, {
          readonly id: number;
          readonly judgeId: string;
          readonly solvePercentage: number;
          readonly rating: number;
        }>();

        for (const problemJudgeIdChunk of chunks(problemJudgeIds, SQLITE_BINDING_CHUNK_SIZE)) {
          if (problemJudgeIdChunk.length === 0) {
            continue;
          }

          const rows = await database.db
            .select({
              id: problems.id,
              judgeId: problems.judgeId,
              solvePercentage: problems.solvePercentage,
              rating: problems.rating
            })
            .from(problems)
            .where(and(eq(problems.judge, JUDGES.Codeforces), inArray(problems.judgeId, problemJudgeIdChunk)))
            .all();

          for (const row of rows) {
            existingProblemsByJudgeId.set(row.judgeId, row);
          }
        }

        const problemRows: {
          readonly judgeId: string;
          readonly judge: JUDGES.Codeforces;
          readonly name: string;
          readonly link: string;
          readonly contestId: number;
          readonly solves: number;
          readonly solvePercentage: number;
          readonly rating: number;
          readonly createdAt: Date;
          readonly updatedAt: Date;
        }[] = [];
        const tagsByProblemJudgeId = new Map<string, readonly string[]>();

        for (const contestJudgeId of contestJudgeIds) {
          const contest = contestCatalogById.get(contestJudgeId);
          const contestRow = contestRowsByJudgeId.get(contestJudgeId);
          const contestProblems = problemsByContest.get(contestJudgeId) ?? [];

          if (contest === undefined || contestRow === undefined) {
            continue;
          }

          const stars = contestInputRowsByJudgeId.get(contestJudgeId)?.stars ?? regularContestStars(contest.name);
          const maxSolvesInContest = Math.max(0, ...contestProblems.map((problem) => problem.solves));
          const preserveSolvePercentage = contestRow.participants !== null;

          for (const problem of contestProblems) {
            const existingProblem = existingProblemsByJudgeId.get(problem.judgeId);
            const fallbackRating = estimateProblemRating({
              stars,
              participants: maxSolvesInContest,
              solves: problem.solves,
              maxSolvesInContest
            });
            const rating = problem.rating ?? existingProblem?.rating ?? fallbackRating;
            const solvePercentage = preserveSolvePercentage && existingProblem !== undefined
              ? existingProblem.solvePercentage
              : regularSolvePercentage(problem.solves, maxSolvesInContest);

            problemRows.push({
              judgeId: problem.judgeId,
              judge: JUDGES.Codeforces,
              name: problem.name,
              link: problem.link,
              contestId: contestRow.id,
              solves: problem.solves,
              solvePercentage,
              rating,
              createdAt: timestamp,
              updatedAt: timestamp
            });
            tagsByProblemJudgeId.set(problem.judgeId, [
              ...new Set((problem.tags ?? []).map((value) => value.trim()).filter(Boolean))
            ]);
          }
        }

        for (const problemRowChunk of chunks(problemRows, SQLITE_BINDING_CHUNK_SIZE)) {
          if (problemRowChunk.length === 0) {
            continue;
          }

          await database.db
            .insert(problems)
            .values(problemRowChunk)
            .onConflictDoUpdate({
              target: [problems.judgeId, problems.judge],
              set: {
                name: excludedColumn("name"),
                link: excludedColumn("link"),
                contestId: excludedColumn("contest_id"),
                solves: excludedColumn("solves"),
                solvePercentage: excludedColumn("solve_percentage"),
                rating: excludedColumn("rating"),
                updatedAt: excludedColumn("updated_at")
              }
            })
            .run();
        }

        const problemIdsByJudgeId = new Map<string, number>();
        for (const problemJudgeIdChunk of chunks(problemJudgeIds, SQLITE_BINDING_CHUNK_SIZE)) {
          if (problemJudgeIdChunk.length === 0) {
            continue;
          }

          const rows = await database.db
            .select({ id: problems.id, judgeId: problems.judgeId })
            .from(problems)
            .where(and(eq(problems.judge, JUDGES.Codeforces), inArray(problems.judgeId, problemJudgeIdChunk)))
            .all();

          for (const row of rows) {
            problemIdsByJudgeId.set(row.judgeId, row.id);
          }
        }

        for (const problemJudgeId of problemJudgeIds) {
          if (problemIdsByJudgeId.get(problemJudgeId) === undefined) {
            throw new Error(`Regular Codeforces problem ${problemJudgeId} was not found after upsert.`);
          }
        }

        const problemIds = [...problemIdsByJudgeId.values()];
        for (const problemIdChunk of chunks(problemIds, SQLITE_BINDING_CHUNK_SIZE)) {
          if (problemIdChunk.length === 0) {
            continue;
          }

          await database.db.delete(problemTags).where(inArray(problemTags.problemId, problemIdChunk)).run();
        }

        const tagRows = problemRows.flatMap((problem) => {
          const problemId = problemIdsByJudgeId.get(problem.judgeId);
          return problemId === undefined
            ? []
            : (tagsByProblemJudgeId.get(problem.judgeId) ?? []).map((tag) => ({
                problemId,
                tag
              }));
        });

        for (const tagRowChunk of chunks(tagRows, SQLITE_BINDING_CHUNK_SIZE)) {
          if (tagRowChunk.length === 0) {
            continue;
          }

          await database.db.insert(problemTags).values(tagRowChunk).onConflictDoNothing().run();
        }

        return {
          importedContestIds,
          contestsImported: importedContestIds.size,
          problemsImported: problemRows.length
        };
      },
      catch: (cause) => new SyncOperationError({
        provider,
        phase: SYNC_OPERATION_PHASES.RegularCatalog,
        step: JudgeSyncStep.RegularCatalog,
        action: "regular catalog import",
        cause
      })
    });
  });
