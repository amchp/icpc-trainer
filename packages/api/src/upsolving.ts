import { schema } from "@icpc-trainer/db";
import {
  SUBMISSION_STATUSES,
  USER_TYPES
} from "@icpc-trainer/shared";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { initTRPC } from "@trpc/server";

import type { ApiContext } from "./index.js";

const { contests, problems, submissions, users } = schema;

export type UpsolvingProblemStatus = "new" | "attempted" | "solved";

export interface UpsolvingProblemRow {
  readonly contestName: string;
  readonly judge: "codeforces" | "qoj";
  readonly problemJudgeId: string;
  readonly problemName: string;
  readonly problemLink: string;
  readonly solvePercentage: number;
  readonly rating: number;
  readonly status: UpsolvingProblemStatus;
}

export interface UpsolvingOverview {
  readonly rows: readonly UpsolvingProblemRow[];
  readonly summary: {
    readonly contestCount: number;
    readonly problemCount: number;
    readonly solvedCount: number;
    readonly attemptedCount: number;
  };
}

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

interface SubmissionStatusAccumulator {
  submissionCount: number;
  hasAccepted: boolean;
}

export const createUpsolvingRouter = (t: TrpcInstance) =>
  t.router({
    overview: t.procedure.query(({ ctx }): UpsolvingOverview => {
      const problemRows = ctx.database.db
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
        .from(problems)
        .innerJoin(contests, eq(contests.id, problems.contestId))
        .where(eq(contests.synced, true))
        .orderBy(desc(contests.updatedAt), asc(contests.name), asc(problems.rating), asc(problems.judgeId))
        .all();

      const submissionStateByProblemId = new Map<number, SubmissionStatusAccumulator>();

      const submissionRows = ctx.database.db
        .select({
          problemId: submissions.problemId,
          submissionCount: sql<number>`count(*)`,
          acceptedCount: sql<number>`sum(case when ${submissions.status} = ${SUBMISSION_STATUSES.AC} then 1 else 0 end)`
        })
        .from(submissions)
        .innerJoin(users, eq(users.id, submissions.userId))
        .innerJoin(problems, eq(problems.id, submissions.problemId))
        .innerJoin(contests, eq(contests.id, problems.contestId))
        .where(and(
          eq(contests.synced, true),
          inArray(users.type, [USER_TYPES.Primary, USER_TYPES.Team])
        ))
        .groupBy(submissions.problemId)
        .all();

      for (const row of submissionRows) {
        submissionStateByProblemId.set(row.problemId, {
          submissionCount: row.submissionCount,
          hasAccepted: row.acceptedCount > 0
        });
      }

      const rows = problemRows.map<UpsolvingProblemRow>((row) => {
        const submissionState = submissionStateByProblemId.get(row.problemId);
        const submissionCount = submissionState?.submissionCount ?? 0;
        const status: UpsolvingProblemStatus = submissionState?.hasAccepted
          ? "solved"
          : submissionCount > 0
            ? "attempted"
            : "new";

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
      });

      return {
        rows,
        summary: {
          contestCount: new Set(problemRows.map((row) => row.contestId)).size,
          problemCount: rows.length,
          solvedCount: rows.filter((row) => row.status === "solved").length,
          attemptedCount: rows.filter((row) => row.status === "attempted").length
        }
      };
    })
  });
