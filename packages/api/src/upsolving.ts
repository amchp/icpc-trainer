import { schema } from "@icpc-trainer/db";
import {
  SUBMISSION_STATUSES,
  USER_TYPES
} from "@icpc-trainer/shared";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ApiContext } from "./index.js";

const { contests, problems, submissions, users } = schema;

export type UpsolvingProblemStatus = "new" | "upsolved" | "attempted" | "solved";

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

export interface UpsolvingContestRow {
  readonly id: number;
  readonly judge: "codeforces" | "qoj";
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

export interface RefetchContestInput {
  readonly provider: "codeforces" | "qoj";
  readonly contestJudgeId: string;
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
        .where(eq(contests.simulated, true))
        .orderBy(desc(contests.updatedAt), asc(contests.name), asc(problems.rating), asc(problems.judgeId))
        .all();

      const submissionStateByProblemId = new Map<number, SubmissionStatusAccumulator>();

      const submissionRows = ctx.database.db
        .select({
          contestId: contests.id,
          problemId: submissions.problemId,
          submissionCount: sql<number>`count(*)`,
          acceptedCount: sql<number>`sum(case when ${submissions.status} = ${SUBMISSION_STATUSES.AC} then 1 else 0 end)`
        })
        .from(submissions)
        .innerJoin(users, eq(users.id, submissions.userId))
        .innerJoin(problems, eq(problems.id, submissions.problemId))
        .innerJoin(contests, eq(contests.id, problems.contestId))
        .where(and(
          eq(contests.simulated, true),
          eq(users.type, USER_TYPES.Team)
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
          ? "solved"
          : submissionCount > 0
            ? "attempted"
            : contestIdsWithSubmissions.has(row.contestId)
              ? "upsolved"
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
      }).filter((row) => row.status !== "new");

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

      const contestRows = ctx.database.db
        .select({
          id: contests.id,
          judge: contests.judge,
          judgeId: contests.judgeId,
          name: contests.name,
          link: contests.link,
          updatedAt: contests.updatedAt,
          problemCount: sql<number>`count(${problems.id})`,
          averageSolvePercentage: sql<number | null>`avg(${problems.solvePercentage})`
        })
        .from(contests)
        .leftJoin(problems, eq(problems.contestId, contests.id))
        .where(eq(contests.simulated, true))
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
          solvedCount: rows.filter((row) => row.status === "solved").length,
          attemptedCount: rows.filter((row) => row.status === "attempted").length
        }
      };
    }),
    refetchContest: t.procedure.input(z.object({
      contestId: z.number().int().positive()
    })).mutation(async ({ ctx, input }): Promise<{ readonly ok: true }> => {
      const contest = ctx.database.db
        .select({
          judge: contests.judge,
          judgeId: contests.judgeId
        })
        .from(contests)
        .where(eq(contests.id, input.contestId))
        .get();

      if (contest === undefined) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Contest ${input.contestId} was not found.`
        });
      }

      if (ctx.judges.refetchContest === undefined) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Contest refetch is not configured."
        });
      }

      try {
        await ctx.judges.refetchContest({
          provider: contest.judge,
          contestJudgeId: contest.judgeId
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : String(error),
          cause: error
        });
      }

      return { ok: true };
    })
  });
