import { type DatabaseService, schema } from "@icpc-trainer/db";
import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { and, asc, eq, notExists } from "drizzle-orm";

const { appUserJudgeUsers, contests, problems, problemTags, submissions } = schema;

export interface FindProblemRow {
  readonly contestName: string;
  readonly contestLink: string;
  readonly problemJudgeId: string;
  readonly problemName: string;
  readonly problemLink: string;
  readonly rating: number;
  readonly solvePercentage: number;
  readonly tags: readonly string[];
}

export interface FindProblemsOverview {
  readonly rows: readonly FindProblemRow[];
  readonly tags: readonly {
    readonly name: string;
    readonly count: number;
  }[];
  readonly ratingRange: {
    readonly min: number | null;
    readonly max: number | null;
  };
}

export const getFindProblemsOverview = async (
  database: DatabaseService,
  appUserId: number
): Promise<FindProblemsOverview> => {
  const problemRows = await database.db
    .select({
      problemId: problems.id,
      contestName: contests.name,
      contestLink: contests.link,
      problemJudgeId: problems.judgeId,
      problemName: problems.name,
      problemLink: problems.link,
      rating: problems.rating,
      solvePercentage: problems.solvePercentage,
      tag: problemTags.tag
    })
    .from(problems)
    .innerJoin(contests, eq(contests.id, problems.contestId))
    .leftJoin(problemTags, eq(problemTags.problemId, problems.id))
    .where(and(
      eq(problems.judge, JUDGES.Codeforces),
      notExists(
        database.db
          .select({ id: submissions.id })
          .from(submissions)
          .innerJoin(appUserJudgeUsers, eq(appUserJudgeUsers.userId, submissions.userId))
          .where(and(
            eq(submissions.problemId, problems.id),
            eq(appUserJudgeUsers.appUserId, appUserId),
            eq(appUserJudgeUsers.role, USER_TYPES.Team),
            eq(submissions.status, SUBMISSION_STATUSES.AC)
          ))
      )
    ))
    .orderBy(asc(problems.rating), asc(contests.name), asc(problems.judgeId), asc(problemTags.tag))
    .all();

  const rowsByProblemId = new Map<number, FindProblemRow & { tags: string[] }>();
  const problemIdsByTag = new Map<string, Set<number>>();

  for (const row of problemRows) {
    const existing = rowsByProblemId.get(row.problemId);
    if (existing === undefined) {
      rowsByProblemId.set(row.problemId, {
        contestName: row.contestName,
        contestLink: row.contestLink,
        problemJudgeId: row.problemJudgeId,
        problemName: row.problemName.trim() || row.problemJudgeId,
        problemLink: row.problemLink,
        rating: row.rating,
        solvePercentage: row.solvePercentage,
        tags: []
      });
    }

    if (row.tag !== null) {
      const problemRow = rowsByProblemId.get(row.problemId);
      if (problemRow !== undefined && !problemRow.tags.includes(row.tag)) {
        problemRow.tags.push(row.tag);
      }

      const problemIds = problemIdsByTag.get(row.tag) ?? new Set<number>();
      problemIds.add(row.problemId);
      problemIdsByTag.set(row.tag, problemIds);
    }
  }

  const visibleRatings = [...rowsByProblemId.values()].map((row) => row.rating);

  return {
    rows: [...rowsByProblemId.values()].map((row) => ({
      ...row,
      tags: [...row.tags].sort((a, b) => a.localeCompare(b))
    })),
    tags: [...problemIdsByTag.entries()]
      .map(([name, problemIds]) => ({
        name,
        count: problemIds.size
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    ratingRange: {
      min: visibleRatings.length === 0 ? null : Math.min(...visibleRatings),
      max: visibleRatings.length === 0 ? null : Math.max(...visibleRatings)
    }
  };
};
