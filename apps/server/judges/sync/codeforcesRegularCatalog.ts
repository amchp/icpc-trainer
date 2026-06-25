import {
  type JudgeSyncInput
} from "@icpc-trainer/api";
import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
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
    return yield* Effect.try({
      try: () => {
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
          if (!contestCatalogById.has(problem.judgeContestId) || seenProblemIds.has(problem.judgeId)) {
            continue;
          }

          seenProblemIds.add(problem.judgeId);
          const contestProblems = problemsByContest.get(problem.judgeContestId) ?? [];
          contestProblems.push(problem);
          problemsByContest.set(problem.judgeContestId, contestProblems);
        }

        let problemsImported = 0;
        const importedContestIds = new Set<string>();

        database.db.transaction((tx) => {
          for (const [contestJudgeId, contestProblems] of problemsByContest.entries()) {
            const contest = contestCatalogById.get(contestJudgeId);
            if (contest === undefined || contestProblems.length === 0) {
              continue;
            }

            const existingContest = tx
              .select({
                id: contests.id,
                participants: contests.participants,
                stars: contests.stars
              })
              .from(contests)
              .where(and(eq(contests.judge, JUDGES.Codeforces), eq(contests.judgeId, contestJudgeId)))
              .get();
            const standingsGrade = existingContest?.participants !== null && existingContest?.participants !== undefined;
            const stars = standingsGrade && existingContest?.stars !== null && existingContest?.stars !== undefined
              ? existingContest.stars
              : regularContestStars(contest.name);
            const link = regularContestLink(contest);

            tx
              .insert(contests)
              .values({
                judgeId: contestJudgeId,
                judge: JUDGES.Codeforces,
                name: contest.name,
                link,
                participants: existingContest?.participants ?? null,
                stars,
                simulated: true,
                createdAt: timestamp,
                updatedAt: timestamp
              })
              .onConflictDoUpdate({
                target: [contests.judgeId, contests.judge],
                set: {
                  name: contest.name,
                  link,
                  participants: existingContest?.participants ?? null,
                  stars,
                  simulated: true,
                  updatedAt: timestamp
                }
              })
              .run();

            const contestRow = tx
              .select({
                id: contests.id,
                participants: contests.participants
              })
              .from(contests)
              .where(and(eq(contests.judge, JUDGES.Codeforces), eq(contests.judgeId, contestJudgeId)))
              .get();

            if (contestRow === undefined) {
              throw new Error(`Regular Codeforces contest ${contestJudgeId} was not found after upsert.`);
            }

            const problemJudgeIds = contestProblems.map((problem) => problem.judgeId);
            const existingProblems = problemJudgeIds.length === 0
              ? []
              : tx
                .select({
                  id: problems.id,
                  judgeId: problems.judgeId,
                  solvePercentage: problems.solvePercentage,
                  rating: problems.rating
                })
                .from(problems)
                .where(and(
                  eq(problems.judge, JUDGES.Codeforces),
                  inArray(problems.judgeId, problemJudgeIds)
                ))
                .all();
            const existingProblemsByJudgeId = new Map(existingProblems.map((problem) => [problem.judgeId, problem]));
            const maxSolvesInContest = Math.max(0, ...contestProblems.map((problem) => problem.solves));
            const preserveSolvePercentage = contestRow.participants !== null;
            importedContestIds.add(contestJudgeId);

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

              const [problemRow] = tx
                .insert(problems)
                .values({
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
                })
                .onConflictDoUpdate({
                  target: [problems.judgeId, problems.judge],
                  set: {
                    name: problem.name,
                    link: problem.link,
                    contestId: contestRow.id,
                    solves: problem.solves,
                    solvePercentage,
                    rating,
                    updatedAt: timestamp
                  }
                })
                .returning({ id: problems.id })
                .all();

              if (problemRow === undefined) {
                throw new Error(`Regular Codeforces problem ${problem.judgeId} was not found after upsert.`);
              }

              tx.delete(problemTags).where(eq(problemTags.problemId, problemRow.id)).run();
              for (const tag of [...new Set(problem.tags.map((value) => value.trim()).filter(Boolean))]) {
                tx.insert(problemTags).values({
                  problemId: problemRow.id,
                  tag
                }).onConflictDoNothing().run();
              }

              problemsImported += 1;
            }
          }
        });

        return {
          importedContestIds,
          contestsImported: importedContestIds.size,
          problemsImported
        };
      },
      catch: (cause) => new SyncOperationError({
        provider,
        phase: "regularCatalog",
        step: "regularCatalog",
        action: "regular catalog import",
        cause
      })
    });
  });
