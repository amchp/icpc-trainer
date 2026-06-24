import { type JudgeSyncEvent, type JudgeSyncInput } from "@icpc-trainer/api";
import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES } from "@icpc-trainer/shared";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

import type { JudgePlaygroundClient, JudgeRegularCatalogContest, JudgeRegularCatalogProblem } from "../judges.js";
import { isNormalRegularCodeforcesContestName } from "../codeforces.js";
import {
  createJudgeSyncRunner,
  emptySummary,
  finalEvent,
  findProblem,
  getSyncUsers,
  insertSubmission,
  providerJudge,
  runJudgeOperation,
  submissionContext,
  syncContest,
  syncOperationErrorEvent,
  syncUserSubmissions,
  type EmitSyncEvent,
  type PendingSubmission,
  type SyncOperationError,
  SyncOperationError as SyncOperationErrorClass,
  type UpsertSubmissionResult
} from "./sync.js";
import { estimateContestStarsFromName, estimateProblemRating } from "./problemRating.js";

const CODEFORCES_CONTEST_URL = "https://codeforces.com/contest";
const CODEFORCES_GYM_CONTEST_ID_MIN = 100000;
const CODEFORCES_GYM_CONTEST_ID_MAX = 200000;

const { contests, problems, problemTags } = schema;

interface RegularCatalogImportResult {
  readonly importedContestIds: ReadonlySet<string>;
  readonly contestsImported: number;
  readonly problemsImported: number;
}

const isGymContestJudgeId = (contestJudgeId: string): boolean => {
  const contestId = Number(contestJudgeId);
  return Number.isInteger(contestId) &&
    contestId >= CODEFORCES_GYM_CONTEST_ID_MIN &&
    contestId <= CODEFORCES_GYM_CONTEST_ID_MAX;
};

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

const upsertRegularCatalog = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  contestCatalog: readonly JudgeRegularCatalogContest[],
  problemCatalog: readonly JudgeRegularCatalogProblem[]
): Effect.Effect<RegularCatalogImportResult, SyncOperationError> =>
  Effect.gen(function* () {
    return yield* Effect.try({
      try: () => {
        const timestamp = new Date();
        const contestNames = new Map(
          contestCatalog
            .filter((contest) => isNormalRegularCodeforcesContestName(contest.name))
            .map((contest) => [contest.judgeId, contest.name])
        );
        const problemsByContest = new Map<string, JudgeRegularCatalogProblem[]>();

        for (const problem of problemCatalog) {
          if (!contestNames.has(problem.judgeContestId)) {
            continue;
          }

          const contestProblems = problemsByContest.get(problem.judgeContestId) ?? [];
          contestProblems.push(problem);
          problemsByContest.set(problem.judgeContestId, contestProblems);
        }

        let problemsImported = 0;
        const importedContestIds = new Set<string>();

        database.db.transaction((tx) => {
          for (const [contestJudgeId, contestProblems] of problemsByContest.entries()) {
            const name = contestNames.get(contestJudgeId);
            if (name === undefined || contestProblems.length === 0) {
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
              : regularContestStars(name);

            tx
              .insert(contests)
              .values({
                judgeId: contestJudgeId,
                judge: JUDGES.Codeforces,
                name,
                link: `${CODEFORCES_CONTEST_URL}/${encodeURIComponent(contestJudgeId)}`,
                participants: existingContest?.participants ?? null,
                stars,
                simulated: true,
                createdAt: timestamp,
                updatedAt: timestamp
              })
              .onConflictDoUpdate({
                target: [contests.judgeId, contests.judge],
                set: {
                  name,
                  link: `${CODEFORCES_CONTEST_URL}/${encodeURIComponent(contestJudgeId)}`,
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
      catch: (cause) => new SyncOperationErrorClass({
        provider,
        phase: "regularCatalog",
        step: "regularCatalog",
        action: "regular catalog import",
        cause
      })
    });
  });

const retryPendingSubmission = (
  database: DatabaseService,
  provider: JudgeSyncInput["provider"],
  judgeId: ReturnType<typeof providerJudge>,
  pending: PendingSubmission
): Effect.Effect<UpsertSubmissionResult, SyncOperationError> =>
  Effect.gen(function* () {
    const context = submissionContext(provider, pending.user, pending.submission);
    const problem = yield* findProblem(database, judgeId, pending.submission.judgeProblemId, context);

    if (problem === undefined) {
      return yield* Effect.fail(new SyncOperationErrorClass({
        ...context,
        cause: new Error(
          pending.submission.judgeContestId === undefined
            ? `Problem ${pending.submission.judgeProblemId} was not found after contest sync.`
            : `Problem ${pending.submission.judgeProblemId} from contest ${pending.submission.judgeContestId} was not found after contest sync.`
        )
      }));
    }

    return yield* insertSubmission(database, judgeId, pending.user, pending.submission, problem, context);
  });

const runCodeforcesSyncProgram = (
  database: DatabaseService,
  input: JudgeSyncInput,
  judge: JudgePlaygroundClient,
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
    const pendingSubmissionsByContest = new Map<string, PendingSubmission[]>();
    const missingProblemIdsByContest = new Map<string, Set<string>>();
    let completedSteps = 0;
    let stepsTotal = syncUsers.length;

    const stepsLeft = (): number => Math.max(stepsTotal - completedSteps, 0);

    yield* emit({
      type: "started",
      provider,
      stepsTotal: 0,
      stepsLeft: 0
    });

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
          queueMissingSubmissions: true
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

        for (const pending of userSyncResult.right.pendingSubmissions) {
          if (pending.submission.judgeContestId === undefined) {
            continue;
          }
          const pendingSubmissions = pendingSubmissionsByContest.get(pending.submission.judgeContestId) ?? [];
          pendingSubmissions.push(pending);
          pendingSubmissionsByContest.set(pending.submission.judgeContestId, pendingSubmissions);

          const missingProblemIds = missingProblemIdsByContest.get(pending.submission.judgeContestId) ?? new Set<string>();
          missingProblemIds.add(pending.submission.judgeProblemId);
          missingProblemIdsByContest.set(pending.submission.judgeContestId, missingProblemIds);
        }
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

    const contestIds = [...missingProblemIdsByContest.entries()]
      .filter(([contestJudgeId]) => isGymContestJudgeId(contestJudgeId))
      .filter(([, problemIds]) => problemIds.size >= 2)
      .map(([contestJudgeId]) => contestJudgeId)
      .sort((left, right) => Number(left) - Number(right));
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

      const pendingSubmissions = pendingSubmissionsByContest.get(contestJudgeId) ?? [];
      pendingSubmissionsByContest.delete(contestJudgeId);
      for (const pending of pendingSubmissions) {
        const retryResult = yield* Effect.either(retryPendingSubmission(database, provider, judgeId, pending));
        if (retryResult._tag === "Left") {
          summary.errors += 1;
          yield* emit(syncOperationErrorEvent(retryResult.left, stepsTotal, stepsLeft()));
        } else {
          summary.submissionsInserted += retryResult.right.inserted;
          summary.submissionsUpdated += retryResult.right.updated;
          summary.submissionsSkipped = Math.max(summary.submissionsSkipped - 1, 0);
        }
      }
    }

    const hasRegularPendingContest = [...pendingSubmissionsByContest.keys()]
      .some((contestJudgeId) => !isGymContestJudgeId(contestJudgeId));

    if (syncUsers.length === 0 || !hasRegularPendingContest) {
      yield* emit(finalEvent(provider, stepsTotal, summary));
      return;
    }

    completedSteps = 0;
    stepsTotal = 2;
    yield* emit({
      type: "regularCatalog.contestsSyncing",
      step: "regularCatalog",
      provider,
      stepsTotal,
      stepsLeft: stepsLeft()
    });

    const regularContestCatalogResult = judge.getRegularContests === undefined
      ? { _tag: "Right" as const, right: [] as readonly JudgeRegularCatalogContest[] }
      : yield* Effect.either(
        runJudgeOperation(
          database,
          {
            provider,
            phase: "regularCatalog",
            step: "regularCatalog",
            action: "regular contest list"
          },
          judge.getRegularContests()
        )
      );

    if (regularContestCatalogResult._tag === "Left") {
      summary.errors += 1;
      yield* emit(syncOperationErrorEvent(regularContestCatalogResult.left, stepsTotal, stepsLeft()));
      yield* emit(finalEvent(provider, stepsTotal, summary));
      return;
    }

    const regularContestCatalog = regularContestCatalogResult.right;
    completedSteps += 1;
    yield* emit({
      type: "regularCatalog.contestsSynced",
      step: "regularCatalog",
      provider,
      contestsTotal: regularContestCatalog.length,
      stepsTotal,
      stepsLeft: stepsLeft()
    });
    yield* emit({
      type: "regularCatalog.problemsSyncing",
      step: "regularCatalog",
      provider,
      contestsTotal: regularContestCatalog.length,
      stepsTotal,
      stepsLeft: stepsLeft()
    });

    const regularProblemCatalogResult = judge.getRegularProblems === undefined
      ? { _tag: "Right" as const, right: [] as readonly JudgeRegularCatalogProblem[] }
      : yield* Effect.either(
        runJudgeOperation(
          database,
          {
            provider,
            phase: "regularCatalog",
            step: "regularCatalog",
            action: "regular problem catalog"
          },
          judge.getRegularProblems()
        )
      );

    if (regularProblemCatalogResult._tag === "Left") {
      summary.errors += 1;
      yield* emit(syncOperationErrorEvent(regularProblemCatalogResult.left, stepsTotal, stepsLeft()));
      yield* emit(finalEvent(provider, stepsTotal, summary));
      return;
    }

    const regularImportResult = yield* Effect.either(
      upsertRegularCatalog(database, provider, regularContestCatalog, regularProblemCatalogResult.right)
    );
    completedSteps += 1;

    if (regularImportResult._tag === "Left") {
      summary.errors += 1;
      yield* emit(syncOperationErrorEvent(regularImportResult.left, stepsTotal, stepsLeft()));
      yield* emit(finalEvent(provider, stepsTotal, summary));
      return;
    }

    summary.regularContestsImported += regularImportResult.right.contestsImported;
    summary.regularProblemsImported += regularImportResult.right.problemsImported;

    let regularPendingSubmissionsRetried = 0;
    for (const contestJudgeId of regularImportResult.right.importedContestIds) {
      const pendingSubmissions = pendingSubmissionsByContest.get(contestJudgeId) ?? [];
      pendingSubmissionsByContest.delete(contestJudgeId);
      for (const pending of pendingSubmissions) {
        const problemResult = yield* Effect.either(
          findProblem(
            database,
            judgeId,
            pending.submission.judgeProblemId,
            submissionContext(provider, pending.user, pending.submission)
          )
        );
        if (problemResult._tag === "Left") {
          summary.errors += 1;
          yield* emit(syncOperationErrorEvent(problemResult.left, stepsTotal, stepsLeft()));
          continue;
        }

        if (problemResult.right === undefined) {
          continue;
        }

        const retryResult = yield* Effect.either(retryPendingSubmission(database, provider, judgeId, pending));
        if (retryResult._tag === "Left") {
          summary.errors += 1;
          yield* emit(syncOperationErrorEvent(retryResult.left, stepsTotal, stepsLeft()));
        } else {
          regularPendingSubmissionsRetried += 1;
          summary.regularPendingSubmissionsRetried += 1;
          summary.submissionsInserted += retryResult.right.inserted;
          summary.submissionsUpdated += retryResult.right.updated;
          summary.submissionsSkipped = Math.max(summary.submissionsSkipped - 1, 0);
        }
      }
    }

    yield* emit({
      type: "regularCatalog.problemsSynced",
      step: "regularCatalog",
      provider,
      contestsImported: regularImportResult.right.contestsImported,
      problemsImported: regularImportResult.right.problemsImported,
      pendingSubmissionsRetried: regularPendingSubmissionsRetried,
      stepsTotal,
      stepsLeft: stepsLeft()
    });

    yield* emit(finalEvent(provider, stepsTotal, summary));
  });

export async function* createCodeforcesJudgeSync(
  database: DatabaseService,
  input: JudgeSyncInput,
  judge: JudgePlaygroundClient
): AsyncIterable<JudgeSyncEvent> {
  yield* createJudgeSyncRunner((emit) =>
    runCodeforcesSyncProgram(database, input, judge, emit)
  );
}
