import { schema } from "@icpc-trainer/db";
import { eq } from "drizzle-orm";
import type { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ApiContext } from "./index.js";
import { getUpsolvingOverview } from "./upsolvingReadModel.js";

const { contests } = schema;

export interface RefetchContestInput {
  readonly provider: "codeforces" | "qoj";
  readonly contestJudgeId: string;
}

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export const createUpsolvingRouter = (t: TrpcInstance) =>
  t.router({
    overview: t.procedure.query(({ ctx }) => getUpsolvingOverview(ctx.database)),
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

export type {
  UpsolvingContestRow,
  UpsolvingOverview,
  UpsolvingProblemRow,
  UpsolvingProblemStatus
} from "./upsolvingReadModel.js";
