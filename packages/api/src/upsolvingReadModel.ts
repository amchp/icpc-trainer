import { type DatabaseService, schema } from "@icpc-trainer/db";
import {
  SUBMISSION_STATUSES,
  UPSOLVING_PROBLEM_STATUSES,
  USER_TYPES,
  type JudgeProvider,
  type UpsolvingProblemStatus
} from "@icpc-trainer/shared";
import { and, asc, avg, count, desc, eq, sum } from "drizzle-orm";

const { contests, problems, submissions, users } = schema;
const { appUserJudgeUsers, userContestStates } = schema;

export type { UpsolvingProblemStatus };

export interface UpsolvingProblemRow {
  readonly contestName: string;
  readonly judge: JudgeProvider;
  readonly problemJudgeId: string;
  readonly problemName: string;
  readonly problemLink: string;
  readonly solvePercentage: number;
  readonly rating: number;
  readonly status: UpsolvingProblemStatus;
}

export interface UpsolvingContestRow {
  readonly id: number;
  readonly judge: JudgeProvider;
  readonly judgeId: string;
  readonly name: string;
  readonly link: string;
  readonly problemCount: number;
  readonly solvedCount: number;
  readonly averageSolvePercentage: number | null;
  readonly updatedAt: string;
}

export interface UpsolvingOverview {
  readonly rows: readonly UpsolvingProblemRow[];
  readonly contests: readonly UpsolvingContestRow[];
  readonly summary: {
    readonly contestCount: number;
    readonly problemCount: number;
    readonly solvedCount: number;
    readonly attemptedCount: number;
  };
}

interface SubmissionStatusAccumulator {
  submissionCount: number;
  hasAccepted: boolean;
}

export const getUpsolvingOverview = async (
  database: DatabaseService,
  appUserId: number
): Promise<UpsolvingOverview> => {
  const problemRows = await database.db
    .select({
      contestId: contests.id,
      contestName: contests.name,
      contestUpdatedAt: contests.updatedAt,
      judge: contests.judge,
      problemId: problems.id,
      problemJudgeId: problems.judgeId,
      problemName: problems.name,
      problemLink: problems.link,
      solvePercentage: problems.solvePercentage,
      rating: problems.rating
    })
    .from(userContestStates)
    .innerJoin(appUserJudgeUsers, and(
      eq(appUserJudgeUsers.userId, userContestStates.userId),
      eq(appUserJudgeUsers.appUserId, appUserId),
      eq(appUserJudgeUsers.role, USER_TYPES.Team)
    ))
    .innerJoin(contests, eq(contests.id, userContestStates.contestId))
    .innerJoin(problems, eq(contests.id, problems.contestId))
    .where(eq(userContestStates.simulated, true))
    .groupBy(problems.id)
    .orderBy(desc(contests.updatedAt), asc(contests.name), asc(problems.rating), asc(problems.judgeId))
    .all();

  const submissionStateByProblemId = new Map<number, SubmissionStatusAccumulator>();

  const submissionRows = await database.db
    .select({
      contestId: contests.id,
      problemId: submissions.problemId,
      submissionCount: count(),
      acceptedCount: sum(eq(submissions.status, SUBMISSION_STATUSES.AC)).mapWith(Number)
    })
    .from(submissions)
    .innerJoin(appUserJudgeUsers, and(
      eq(appUserJudgeUsers.userId, submissions.userId),
      eq(appUserJudgeUsers.appUserId, appUserId),
      eq(appUserJudgeUsers.role, USER_TYPES.Team)
    ))
    .innerJoin(users, eq(users.id, submissions.userId))
    .innerJoin(problems, eq(problems.id, submissions.problemId))
    .innerJoin(contests, eq(contests.id, problems.contestId))
    .innerJoin(userContestStates, and(
      eq(userContestStates.userId, submissions.userId),
      eq(userContestStates.contestId, contests.id),
      eq(userContestStates.simulated, true)
    ))
    .groupBy(contests.id, submissions.problemId)
    .all();

  const contestIdsWithSubmissions = new Set<number>();
  for (const row of submissionRows) {
    contestIdsWithSubmissions.add(row.contestId);
    submissionStateByProblemId.set(row.problemId, {
      submissionCount: row.submissionCount,
      hasAccepted: row.acceptedCount > 0
    });
  }

  const rows = problemRows.map<UpsolvingProblemRow>((row) => {
    const submissionState = submissionStateByProblemId.get(row.problemId);
    const submissionCount = submissionState?.submissionCount ?? 0;
    const status: UpsolvingProblemStatus = submissionState?.hasAccepted === true
      ? UPSOLVING_PROBLEM_STATUSES.Solved
      : submissionCount > 0
        ? UPSOLVING_PROBLEM_STATUSES.Attempted
        : contestIdsWithSubmissions.has(row.contestId)
          ? UPSOLVING_PROBLEM_STATUSES.Upsolved
          : UPSOLVING_PROBLEM_STATUSES.New;

    return {
      contestName: row.contestName,
      judge: row.judge,
      problemJudgeId: row.problemJudgeId,
      problemName: row.problemName.trim() || row.problemJudgeId,
      problemLink: row.problemLink,
      solvePercentage: row.solvePercentage,
      rating: row.rating,
      status
    };
  }).filter((row) => row.status !== UPSOLVING_PROBLEM_STATUSES.New);

  const solvedCountByContestId = new Map<number, number>();
  for (const row of problemRows) {
    const submissionState = submissionStateByProblemId.get(row.problemId);
    if (submissionState?.hasAccepted === true) {
      solvedCountByContestId.set(
        row.contestId,
        (solvedCountByContestId.get(row.contestId) ?? 0) + 1
      );
    }
  }

  const contestRows = await database.db
    .select({
      id: contests.id,
      judge: contests.judge,
      judgeId: contests.judgeId,
      name: contests.name,
      link: contests.link,
      updatedAt: contests.updatedAt,
      problemCount: count(problems.id),
      averageSolvePercentage: avg(problems.solvePercentage).mapWith((value) =>
        value === null ? null : Number(value)
      )
    })
    .from(contests)
    .leftJoin(problems, eq(problems.contestId, contests.id))
    .innerJoin(userContestStates, eq(userContestStates.contestId, contests.id))
    .innerJoin(appUserJudgeUsers, and(
      eq(appUserJudgeUsers.userId, userContestStates.userId),
      eq(appUserJudgeUsers.appUserId, appUserId),
      eq(appUserJudgeUsers.role, USER_TYPES.Team)
    ))
    .where(eq(userContestStates.simulated, true))
    .groupBy(contests.id)
    .orderBy(desc(contests.updatedAt), asc(contests.name))
    .all();

  return {
    rows,
    contests: contestRows
      .filter((row) => contestIdsWithSubmissions.has(row.id))
      .map((row) => ({
        id: row.id,
        judge: row.judge,
        judgeId: row.judgeId,
        name: row.name,
        link: row.link,
        problemCount: row.problemCount,
        solvedCount: solvedCountByContestId.get(row.id) ?? 0,
        averageSolvePercentage: row.averageSolvePercentage === null
          ? null
          : Math.round(row.averageSolvePercentage),
        updatedAt: row.updatedAt.toISOString()
      })),
    summary: {
      contestCount: contestIdsWithSubmissions.size,
      problemCount: rows.length,
      solvedCount: rows.filter((row) => row.status === UPSOLVING_PROBLEM_STATUSES.Solved).length,
      attemptedCount: rows.filter((row) => row.status === UPSOLVING_PROBLEM_STATUSES.Attempted).length
    }
  };
};
